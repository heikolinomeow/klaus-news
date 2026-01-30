"""Background scheduler for periodic tasks (post ingestion, archival)"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import logging

scheduler = AsyncIOScheduler()
logger = logging.getLogger('klaus_news.scheduler')


# V-28: Dynamic job rescheduling functions
def reschedule_ingest_job(new_interval_minutes: int):
    """Reschedule ingestion job with new interval (V-28)"""
    try:
        scheduler.reschedule_job(
            'ingest_posts',
            trigger='interval',
            minutes=new_interval_minutes
        )
        logger.info(f"Rescheduled ingest job", extra={'interval_minutes': new_interval_minutes})
    except Exception as e:
        logger.error(f"Failed to reschedule ingest job", exc_info=True, extra={'interval_minutes': new_interval_minutes})


def reschedule_archive_job(new_hour: int):
    """Reschedule archive job with new time (V-28)"""
    try:
        scheduler.reschedule_job(
            'archive_posts',
            trigger='cron',
            hour=new_hour
        )
        logger.info(f"Rescheduled archive job", extra={'hour': new_hour})
    except Exception as e:
        logger.error(f"Failed to reschedule archive job", exc_info=True, extra={'hour': new_hour})


async def ingest_posts_job(trigger_source: str = "scheduled"):
    """Periodic job: Fetch posts from configured X lists

    Args:
        trigger_source: Source of trigger - "scheduled" or "manual"

    Returns:
        dict: Stats about the ingestion run
    """
    from app.services.x_client import x_client
    from app.services.openai_client import openai_client
    from app.models.post import Post
    from app.models.list_metadata import ListMetadata
    from app.database import SessionLocal
    from sqlalchemy import select
    from app.services.settings_service import SettingsService  # V-27
    from app.services.progress_tracker import progress_tracker

    logger.info(f"Starting {trigger_source} post ingestion job", extra={'trigger_source': trigger_source})

    db = SessionLocal()

    # Initialize stats tracking
    stats = {
        'lists_processed': 0,
        'posts_fetched': 0,
        'new_posts_added': 0,
        'duplicates_skipped': 0,
        'low_worthiness_skipped': 0,
        'api_errors': 0,
        'last_api_error': None  # Store most recent API error details
    }

    try:
        # V-27: Read settings from database
        settings_svc = SettingsService(db)
        posts_per_fetch = settings_svc.get('posts_per_fetch', 5)
        scheduler_paused = settings_svc.get('scheduler_paused', False)

        # V-16: Check if scheduler is paused (manual triggers bypass pause)
        if scheduler_paused and trigger_source == "scheduled":
            logger.info("Scheduler paused, skipping scheduled ingestion")
            return stats

        # V-3: Check if auto-fetch is enabled (default: disabled)
        auto_fetch_enabled = settings_svc.get('auto_fetch_enabled', False)
        if not auto_fetch_enabled and trigger_source == "scheduled":
            logger.info("Auto-fetch disabled, skipping scheduled ingestion")
            return stats

        # 1. Get enabled list IDs from database (V-8: respect enabled flag)
        enabled_lists = db.execute(
            select(ListMetadata).where(ListMetadata.enabled == True)
        ).scalars().all()

        # Start progress tracking
        progress_tracker.start(trigger_source, len(enabled_lists))

        for list_idx, list_meta in enumerate(enabled_lists, 1):
            stats['lists_processed'] += 1
            list_id = list_meta.list_id
            since_id = list_meta.last_tweet_id

            # Update progress: current list
            progress_tracker.set_current_list(list_idx, list_meta.list_name or f"List {list_id}")

            # 2. Fetch posts from each list (V-27: use dynamic posts_per_fetch)
            try:
                progress_tracker.set_step("fetching")
                raw_posts = await x_client.fetch_posts_from_list(
                    list_id,
                    max_results=posts_per_fetch,
                    since_id=since_id
                )
                stats['posts_fetched'] += len(raw_posts)
            except Exception as e:
                # Catch X API errors (402 Payment Required, etc.)
                from app.services.x_client import XAPIError
                if isinstance(e, XAPIError):
                    stats['api_errors'] += 1
                    stats['last_api_error'] = {
                        'status_code': e.status_code,
                        'message': str(e)
                    }
                    progress_tracker.error()
                    logger.warning(f"X API error for list {list_id}, skipping", extra={
                        'list_id': list_id,
                        'status_code': e.status_code
                    })
                    continue  # Skip this list and move to next
                else:
                    # Re-raise unexpected errors
                    raise

            # Client-side filtering: only process posts newer than last_tweet_id
            # Use integer comparison since tweet IDs are numeric strings
            if since_id is not None:
                raw_posts = [p for p in raw_posts if int(p["id"]) > int(since_id)]

            # Update last_tweet_id if we got new posts
            if raw_posts:
                max_tweet_id = max(raw_posts, key=lambda p: int(p["id"]))["id"]
                list_meta.last_tweet_id = max_tweet_id

            # Update progress: posts to process
            progress_tracker.set_posts_to_process(len(raw_posts))

            for post_idx, raw_post in enumerate(raw_posts, 1):
                # Update progress: start processing this post
                progress_tracker.start_post(post_idx)

                # Check if post_id already exists (skip duplicates)
                existing = db.execute(
                    select(Post).where(Post.post_id == raw_post['id'])
                ).scalar_one_or_none()

                if existing:
                    stats['duplicates_skipped'] += 1
                    progress_tracker.post_skipped()
                    continue

                # Skip link-only posts (URLs with minimal text content)
                import re
                post_text = raw_post['text']
                # Remove URLs from text to check remaining content
                text_without_urls = re.sub(r'https?://\S+', '', post_text).strip()
                # Skip if remaining text is too short (< 20 chars = likely just "Check this out" or similar)
                if len(text_without_urls) < 20:
                    logger.info("Skipping link-only post", extra={
                        'post_id': raw_post['id'],
                        'original_length': len(post_text),
                        'text_without_urls': text_without_urls[:50]
                    })
                    stats['duplicates_skipped'] += 1  # Count as skipped
                    progress_tracker.post_skipped()
                    continue

                # 3. Process each post: categorize, generate title/summary, score
                progress_tracker.set_step("categorizing")
                cat_result = await openai_client.categorize_post(raw_post['text'])

                progress_tracker.set_step("generating")
                gen_result = await openai_client.generate_title_and_summary(raw_post['text'])

                # V-6: Use AI worthiness scoring (with static fallback)
                progress_tracker.set_step("scoring")
                try:
                    worthiness = await openai_client.score_worthiness(raw_post['text'], db=db)
                except Exception as e:
                    print(f"AI worthiness failed, using default 0.5: {e}")
                    worthiness = 0.5

                # Skip posts below minimum worthiness threshold (default 0.3)
                min_worthiness = settings_svc.get('min_worthiness_threshold', 0.3)
                if worthiness < min_worthiness:
                    logger.info("Skipping low-worthiness post", extra={
                        'post_id': raw_post['id'],
                        'worthiness': worthiness,
                        'threshold': min_worthiness
                    })
                    stats['low_worthiness_skipped'] += 1
                    progress_tracker.post_skipped()
                    continue

                # 3b. Topic grouping via AI semantic title comparison
                progress_tracker.set_step("grouping")
                # Read duplicate threshold from settings
                duplicate_threshold = settings_svc.get('duplicate_threshold', 0.85)

                # V-4: Get ALL groups by category for matching (including archived)
                from app.models.group import Group
                category_match = cat_result['category']
                all_groups = db.execute(
                    select(Group).where(Group.category == category_match)
                ).scalars().all()  # No archived filter! Query ALL groups

                # V-4: AI semantic comparison against group.representative_title
                group_id = None
                matched_group = None

                for group in all_groups:
                    if not group.representative_title:
                        continue
                    try:
                        similarity_score = await openai_client.compare_titles_semantic(
                            new_title=gen_result['title'],
                            existing_title=group.representative_title
                        )
                        if similarity_score >= duplicate_threshold:
                            group_id = group.id
                            matched_group = group
                            break
                    except Exception as e:
                        print(f"AI title comparison failed for group {group.id}: {e}")
                        continue

                # V-4: Create or update Group record
                if matched_group is not None:
                    # Existing group found - increment post_count (V-5: do NOT change archived status)
                    matched_group.post_count += 1
                else:
                    # No match found - create new Group with V-4 required fields
                    new_group = Group(
                        representative_title=gen_result['title'],
                        representative_summary=gen_result['summary'],  # V-4: Set representative_summary
                        category=cat_result['category'],
                        first_seen=raw_post['created_at'],
                        post_count=1,
                        archived=False,  # V-4: Initialize archived=false
                        selected=False   # V-4: Initialize selected=false
                    )
                    db.add(new_group)
                    db.flush()  # Get the new group ID
                    group_id = new_group.id

                # 4. Store in database
                progress_tracker.set_step("storing")
                new_post = Post(
                    post_id=raw_post['id'],
                    original_text=raw_post['text'],
                    author=raw_post.get('author'),
                    created_at=raw_post['created_at'],
                    category=cat_result['category'],
                    categorization_score=cat_result['confidence'],
                    ai_title=gen_result['title'],
                    ai_summary=gen_result['summary'],
                    worthiness_score=worthiness,
                    group_id=group_id
                )
                db.add(new_post)
                stats['new_posts_added'] += 1
                progress_tracker.post_added()

        db.commit()

        # Log completion with stats
        logger.info(f"{trigger_source.capitalize()} ingestion completed", extra={
            'trigger_source': trigger_source,
            'lists_processed': stats['lists_processed'],
            'posts_fetched': stats['posts_fetched'],
            'new_posts_added': stats['new_posts_added'],
            'duplicates_skipped': stats['duplicates_skipped'],
            'low_worthiness_skipped': stats['low_worthiness_skipped']
        })

        # Mark progress as finished
        progress_tracker.finish()

        return stats
    except Exception as e:
        progress_tracker.finish()
        raise
    finally:
        db.close()


async def archive_posts_job():
    """Periodic job: Archive old unselected groups (V-3: archiving is now group-level)"""
    from app.models.group import Group
    from app.database import SessionLocal
    from sqlalchemy import update
    from datetime import datetime, timedelta, timezone
    from app.services.settings_service import SettingsService  # V-27

    db = SessionLocal()
    try:
        # V-27: Read archive age from settings
        settings_svc = SettingsService(db)
        archive_age_days = settings_svc.get('archive_age_days', 7)
        scheduler_paused = settings_svc.get('scheduler_paused', False)

        # V-16: Check if scheduler is paused
        if scheduler_paused:
            return  # Skip execution if paused

        # V-3: Archive groups (not posts) older than archive_age_days
        # Groups are archived if first_seen < cutoff AND not selected AND not already archived
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=archive_age_days)

        db.execute(
            update(Group)
            .where(Group.first_seen < cutoff_date)
            .where(Group.selected == False)
            .where(Group.archived == False)
            .values(archived=True)
        )

        db.commit()
    finally:
        db.close()


async def cleanup_logs_job():
    """Periodic job: Delete system logs older than retention period"""
    from app.models.system_log import SystemLog
    from app.database import SessionLocal
    from sqlalchemy import delete
    from datetime import datetime, timedelta, timezone
    from app.services.settings_service import SettingsService

    logger.info("Starting scheduled log cleanup job")

    db = SessionLocal()
    try:
        # Read log retention setting (default 7 days)
        settings_svc = SettingsService(db)
        retention_days = settings_svc.get('log_retention_days', 7)
        scheduler_paused = settings_svc.get('scheduler_paused', False)

        # Check if scheduler is paused
        if scheduler_paused:
            logger.info("Scheduler paused, skipping log cleanup")
            return

        # Calculate cutoff date
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)

        # Delete old logs
        result = db.execute(
            delete(SystemLog).where(SystemLog.timestamp < cutoff_date)
        )

        deleted_count = result.rowcount
        db.commit()

        logger.info("Log cleanup completed", extra={
            'retention_days': retention_days,
            'deleted_count': deleted_count,
            'cutoff_date': cutoff_date.isoformat()
        })
    except Exception as e:
        logger.error("Log cleanup job failed", exc_info=True)
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    """Start background scheduler with configured jobs (V-27: read from DB, V-16: respect pause state)"""
    from app.services.settings_service import SettingsService

    # V-27: Read initial settings from database
    settings_svc = SettingsService()
    ingest_interval = settings_svc.get('ingest_interval_minutes', 30)
    archive_hour = settings_svc.get('archive_time_hour', 3)
    scheduler_paused = settings_svc.get('scheduler_paused', False)

    # V-16: Only start jobs if scheduler is not paused
    if not scheduler_paused:
        # Run post ingestion with dynamic interval
        scheduler.add_job(ingest_posts_job, 'interval', minutes=ingest_interval, id='ingest_posts')

        # Run archival with dynamic hour
        scheduler.add_job(archive_posts_job, 'cron', hour=archive_hour, id='archive_posts')

        # Run log cleanup daily at 4 AM
        scheduler.add_job(cleanup_logs_job, 'cron', hour=4, id='cleanup_logs')

    scheduler.start()


def shutdown_scheduler():
    """Shutdown scheduler gracefully"""
    scheduler.shutdown()

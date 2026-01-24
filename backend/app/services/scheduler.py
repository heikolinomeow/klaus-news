"""Background scheduler for periodic tasks (post ingestion, archival)"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()


# V-28: Dynamic job rescheduling functions
def reschedule_ingest_job(new_interval_minutes: int):
    """Reschedule ingestion job with new interval (V-28)"""
    try:
        scheduler.reschedule_job(
            'ingest_posts',
            trigger='interval',
            minutes=new_interval_minutes
        )
    except Exception as e:
        print(f"Failed to reschedule ingest job: {e}")


def reschedule_archive_job(new_hour: int):
    """Reschedule archive job with new time (V-28)"""
    try:
        scheduler.reschedule_job(
            'archive_posts',
            trigger='cron',
            hour=new_hour
        )
    except Exception as e:
        print(f"Failed to reschedule archive job: {e}")


async def ingest_posts_job():
    """Periodic job: Fetch posts from configured X lists"""
    from app.services.x_client import x_client
    from app.services.openai_client import openai_client
    from app.models.post import Post
    from app.models.list_metadata import ListMetadata
    from app.database import SessionLocal
    from sqlalchemy import select
    from app.services.scoring import calculate_worthiness_score
    from app.services.duplicate_detection import compute_content_hash, assign_group_id
    from app.services.settings_service import SettingsService  # V-27

    db = SessionLocal()
    try:
        # V-27: Read settings from database
        settings_svc = SettingsService(db)
        posts_per_fetch = settings_svc.get('posts_per_fetch', 5)
        duplicate_threshold = settings_svc.get('duplicate_threshold', 0.85)
        scheduler_paused = settings_svc.get('scheduler_paused', False)

        # V-16: Check if scheduler is paused
        if scheduler_paused:
            return  # Skip execution if paused

        # V-3: Check if auto-fetch is enabled
        auto_fetch_enabled = settings_svc.get('auto_fetch_enabled', True)
        if not auto_fetch_enabled:
            return  # Skip ingestion if disabled

        # 1. Get enabled list IDs from database (V-8: respect enabled flag)
        enabled_lists = db.execute(
            select(ListMetadata).where(ListMetadata.enabled == True)
        ).scalars().all()

        for list_meta in enabled_lists:
            list_id = list_meta.list_id
            since_id = list_meta.last_tweet_id

            # 2. Fetch posts from each list (V-27: use dynamic posts_per_fetch)
            raw_posts = await x_client.fetch_posts_from_list(
                list_id,
                max_results=posts_per_fetch,
                since_id=since_id
            )

            # Update last_tweet_id if we got new posts
            if raw_posts:
                max_tweet_id = max(post["id"] for post in raw_posts)
                list_meta.last_tweet_id = max_tweet_id

            for raw_post in raw_posts:
                # Check if post_id already exists (skip duplicates)
                existing = db.execute(
                    select(Post).where(Post.post_id == raw_post['id'])
                ).scalar_one_or_none()

                if existing:
                    continue

                # 3. Process each post: categorize, generate title/summary, score
                cat_result = await openai_client.categorize_post(raw_post['text'])
                gen_result = await openai_client.generate_title_and_summary(raw_post['text'])

                # V-6: Use AI worthiness scoring (with fallback to algorithmic)
                try:
                    worthiness = await openai_client.score_worthiness(raw_post['text'])
                except Exception as e:
                    print(f"AI worthiness failed, using algorithmic fallback: {e}")
                    worthiness = calculate_worthiness_score(
                        cat_result['confidence'],
                        raw_post['text'],
                        raw_post['created_at']
                    )

                # 3b. Topic grouping: compute content hash and group_id
                content_hash = compute_content_hash(raw_post['text'])

                # Get existing non-archived posts for similarity comparison
                existing_posts = db.execute(
                    select(Post).where(Post.archived == False)
                ).scalars().all()

                existing_data = [
                    {
                        "text": p.original_text,
                        "content_hash": p.content_hash,
                        "group_id": p.group_id
                    }
                    for p in existing_posts
                    if p.content_hash and p.group_id
                ]

                # V-7: AI-based duplicate detection (up to 50 recent posts)
                group_id = None
                recent_for_check = existing_posts[:50]  # Limit to 50 posts for cost control

                for existing_post in recent_for_check:
                    try:
                        is_duplicate = await openai_client.detect_duplicate(
                            new_post_text=raw_post['text'],
                            existing_post_text=existing_post.original_text
                        )
                        if is_duplicate:
                            group_id = existing_post.group_id
                            break
                    except Exception as e:
                        print(f"AI duplicate detection failed for post: {e}")
                        continue

                # Fallback: assign new group if no match found
                if group_id is None:
                    group_id = assign_group_id(raw_post['text'], content_hash, existing_data, duplicate_threshold)

                # 4. Store in database
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
                    content_hash=content_hash,
                    group_id=group_id
                )
                db.add(new_post)

        db.commit()
    finally:
        db.close()


async def archive_posts_job():
    """Periodic job: Archive old unselected posts"""
    from app.models.post import Post
    from app.database import SessionLocal
    from sqlalchemy import update, text
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

        # Find posts older than archive_age_days AND selected=False AND archived=False
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=archive_age_days)

        db.execute(
            update(Post)
            .where(Post.created_at < cutoff_date)
            .where(Post.selected == False)
            .where(Post.archived == False)
            .values(archived=True)
        )

        db.commit()
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

    scheduler.start()


def shutdown_scheduler():
    """Shutdown scheduler gracefully"""
    scheduler.shutdown()

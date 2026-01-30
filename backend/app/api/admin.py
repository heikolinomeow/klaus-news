"""Admin API endpoints for manual operations and system control (V-15)"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter()


@router.post("/trigger-ingestion")
async def trigger_ingestion_manually(db: Session = Depends(get_db)):
    """Manually trigger post ingestion job (V-15)

    This endpoint runs the ingestion job immediately without waiting for the scheduler.
    Useful for testing or when you want fresh posts immediately.

    **Use this when:**
    - You just added a new list and want to fetch posts right away
    - You want to test if ingestion is working
    - You need fresh posts immediately without waiting for the scheduled run

    **Returns:**
    - Status of the manual ingestion run
    - Detailed stats about posts fetched and added
    """
    try:
        from app.services.scheduler import ingest_posts_job

        # Run ingestion job directly with "manual" trigger source
        stats = await ingest_posts_job(trigger_source="manual")

        # Build descriptive message based on results
        if stats['new_posts_added'] == 0:
            if stats['api_errors'] > 0:
                # X API errors occurred
                error_detail = stats.get('last_api_error', {})
                status_code = error_detail.get('status_code', 'unknown')
                if status_code == 402:
                    message = "X API error: Payment Required (402) - API credits depleted"
                else:
                    message = f"X API error ({status_code}) - check System Logs for details"
            elif stats['posts_fetched'] == 0:
                message = "No new posts found (no posts fetched from X)"
            else:
                skipped_parts = []
                if stats['duplicates_skipped'] > 0:
                    skipped_parts.append(f"{stats['duplicates_skipped']} duplicates")
                if stats.get('low_worthiness_skipped', 0) > 0:
                    skipped_parts.append(f"{stats['low_worthiness_skipped']} low-worthiness")
                message = f"No new posts added ({', '.join(skipped_parts)} skipped)"
        else:
            message = f"Added {stats['new_posts_added']} new post(s) from {stats['lists_processed']} list(s)"
            if stats.get('low_worthiness_skipped', 0) > 0:
                message += f" ({stats['low_worthiness_skipped']} low-worthiness skipped)"

        return {
            "message": message,
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@router.post("/trigger-archive")
async def trigger_archive_manually(db: Session = Depends(get_db)):
    """Manually trigger post archival job (V-15)

    This endpoint runs the archival job immediately to clean up old posts.

    **Use this when:**
    - You want to free up database space immediately
    - You just changed archive settings and want to apply them now
    - You want to test if archival is working correctly

    **Returns:**
    - Status of the manual archival run
    - Number of posts archived (if successful)
    """
    try:
        from app.services.scheduler import archive_posts_job

        # Run archive job directly
        await archive_posts_job()

        return {
            "message": "Manual archival completed",
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Archival failed: {str(e)}")


@router.get("/scheduler-status")
async def get_scheduler_status(db: Session = Depends(get_db)):
    """Get current scheduler status and job information (V-15)

    This endpoint returns information about scheduled jobs including:
    - Next run times for each job
    - Current pause state
    - Job configurations

    **Returns:**
    - List of jobs with their next run times and settings
    - Scheduler pause state
    """
    try:
        from app.services.scheduler import scheduler
        from app.services.settings_service import SettingsService

        settings_svc = SettingsService(db)
        scheduler_paused = settings_svc.get('scheduler_paused', False)

        jobs = []
        for job in scheduler.get_jobs():
            next_run = job.next_run_time.isoformat() if job.next_run_time else None
            jobs.append({
                "id": job.id,
                "name": job.name or job.id,
                "next_run_time": next_run,
                "trigger": str(job.trigger)
            })

        return {
            "paused": scheduler_paused,
            "jobs": jobs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get scheduler status: {str(e)}")


@router.post("/pause-scheduler")
async def pause_scheduler(db: Session = Depends(get_db)):
    """Pause the background scheduler (V-16)

    This endpoint pauses all scheduled jobs. The jobs will not run until resumed.
    Useful for maintenance or when you want to temporarily stop automated operations.

    **What happens:**
    - Sets scheduler_paused flag to true in settings
    - Jobs will skip execution until resumed
    - Manual triggers still work

    **Returns:**
    - Confirmation message
    """
    try:
        from app.services.settings_service import SettingsService
        from sqlalchemy import update
        from app.models.system_settings import SystemSettings
        from datetime import datetime

        # Update settings
        db.execute(
            update(SystemSettings)
            .where(SystemSettings.key == 'scheduler_paused')
            .values(value='true')
        )

        # Record pause timestamp
        db.execute(
            update(SystemSettings)
            .where(SystemSettings.key == 'pause_timestamp')
            .values(value=datetime.now().isoformat())
        )

        db.commit()

        # Invalidate cache
        SettingsService().invalidate_cache('scheduler_paused')
        SettingsService().invalidate_cache('pause_timestamp')

        return {
            "message": "Scheduler paused",
            "status": "paused"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to pause scheduler: {str(e)}")


@router.post("/resume-scheduler")
async def resume_scheduler(db: Session = Depends(get_db)):
    """Resume the background scheduler (V-16)

    This endpoint resumes all scheduled jobs after they were paused.

    **What happens:**
    - Sets scheduler_paused flag to false in settings
    - Jobs will resume executing on their normal schedule

    **Returns:**
    - Confirmation message
    """
    try:
        from app.services.settings_service import SettingsService
        from sqlalchemy import update
        from app.models.system_settings import SystemSettings

        # Update settings
        db.execute(
            update(SystemSettings)
            .where(SystemSettings.key == 'scheduler_paused')
            .values(value='false')
        )

        db.commit()

        # Invalidate cache
        SettingsService().invalidate_cache('scheduler_paused')

        return {
            "message": "Scheduler resumed",
            "status": "running"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to resume scheduler: {str(e)}")


@router.get("/ingestion-progress")
async def get_ingestion_progress():
    """Get real-time progress of current ingestion job

    This endpoint returns detailed progress information for any running
    ingestion job, allowing the frontend to display a progress bar.

    **Returns:**
    - is_running: Whether an ingestion is currently running
    - progress_percent: Overall progress (0-100)
    - current_step: Current processing step (categorizing, scoring, etc.)
    - posts_added: Running total of posts added
    - And more detailed progress info
    """
    from app.services.progress_tracker import progress_tracker

    return progress_tracker.get_status()


@router.get("/archive-preview")
async def get_archive_preview(db: Session = Depends(get_db)):
    """Get count of posts that would be archived with current settings (V-17)

    This endpoint returns how many posts are currently eligible for archival
    based on the archive_age_days setting. Use this to preview the impact
    before running manual archival.

    **Returns:**
    - Count of posts that would be archived
    - Current archive age threshold
    """
    try:
        from app.models.group import Group
        from app.services.settings_service import SettingsService
        from sqlalchemy import select, func
        from datetime import datetime, timedelta, timezone

        settings_svc = SettingsService(db)
        archive_age_days = settings_svc.get('archive_age_days', 7)

        cutoff_date = datetime.now(timezone.utc) - timedelta(days=archive_age_days)

        count = db.execute(
            select(func.count(Group.id))
            .where(Group.first_seen < cutoff_date)
            .where(Group.selected == False)
            .where(Group.archived == False)
        ).scalar()

        return {
            "count": count,
            "archive_age_days": archive_age_days,
            "cutoff_date": cutoff_date.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get archive preview: {str(e)}")

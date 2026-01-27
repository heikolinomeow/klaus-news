"""Logs API endpoints for viewing and managing system logs"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func, delete
from datetime import datetime, timedelta

from app.database import get_db
from app.models.system_log import SystemLog

router = APIRouter()


@router.get("/")
async def get_logs(
    level: Optional[str] = None,
    category: Optional[str] = None,
    logger_name: Optional[str] = None,
    search: Optional[str] = None,
    hours: int = Query(24, ge=1, le=168),  # Last 24 hours by default, max 1 week
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get system logs with filtering and pagination

    Args:
        level: Filter by log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        category: Filter by category (api, scheduler, external_api, database)
        logger_name: Filter by specific logger
        search: Search in message text
        hours: Time window in hours (default 24, max 168)
        limit: Maximum number of logs to return (default 100, max 1000)
        offset: Number of logs to skip for pagination

    Returns:
        Paginated logs with total count
    """
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)

    query = select(SystemLog).where(SystemLog.timestamp >= cutoff_time)

    # Apply filters
    if level:
        query = query.where(SystemLog.level == level.upper())
    if category:
        query = query.where(SystemLog.category == category)
    if logger_name:
        query = query.where(SystemLog.logger_name == logger_name)
    if search:
        query = query.where(SystemLog.message.ilike(f'%{search}%'))

    # Get total count for pagination
    count_query = select(func.count(SystemLog.id)).where(SystemLog.timestamp >= cutoff_time)
    if level:
        count_query = count_query.where(SystemLog.level == level.upper())
    if category:
        count_query = count_query.where(SystemLog.category == category)
    if logger_name:
        count_query = count_query.where(SystemLog.logger_name == logger_name)
    if search:
        count_query = count_query.where(SystemLog.message.ilike(f'%{search}%'))

    total = db.execute(count_query).scalar()

    # Get paginated logs
    logs = db.execute(
        query.order_by(desc(SystemLog.timestamp))
        .limit(limit)
        .offset(offset)
    ).scalars().all()

    return {
        "logs": [
            {
                "id": log.id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "level": log.level,
                "logger_name": log.logger_name,
                "message": log.message,
                "category": log.category,
                "exception_type": log.exception_type,
                "exception_message": log.exception_message,
                "context": log.context,
                "correlation_id": log.correlation_id
            }
            for log in logs
        ],
        "total": total,
        "offset": offset,
        "limit": limit
    }


@router.get("/stats")
async def get_log_stats(
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db)
):
    """Get log statistics for dashboard display

    Args:
        hours: Time window in hours (default 24, max 168)

    Returns:
        Statistics including total logs, error count, counts by level and category
    """
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)

    # Count by level
    level_counts = db.execute(
        select(SystemLog.level, func.count(SystemLog.id))
        .where(SystemLog.timestamp >= cutoff_time)
        .group_by(SystemLog.level)
    ).all()

    # Count by category
    category_counts = db.execute(
        select(SystemLog.category, func.count(SystemLog.id))
        .where(SystemLog.timestamp >= cutoff_time)
        .group_by(SystemLog.category)
    ).all()

    # Error count
    error_count = db.execute(
        select(func.count(SystemLog.id))
        .where(SystemLog.timestamp >= cutoff_time)
        .where(SystemLog.level.in_(['ERROR', 'CRITICAL']))
    ).scalar()

    return {
        "time_window_hours": hours,
        "total_logs": sum(count for _, count in level_counts),
        "error_count": error_count,
        "by_level": {level: count for level, count in level_counts},
        "by_category": {cat: count for cat, count in category_counts if cat}
    }


@router.get("/{log_id}")
async def get_log_detail(
    log_id: int,
    db: Session = Depends(get_db)
):
    """Get full log details including stack trace

    Args:
        log_id: ID of the log entry

    Returns:
        Complete log entry with all fields
    """
    log = db.execute(
        select(SystemLog).where(SystemLog.id == log_id)
    ).scalar_one_or_none()

    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    return {
        "id": log.id,
        "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        "level": log.level,
        "logger_name": log.logger_name,
        "message": log.message,
        "category": log.category,
        "exception_type": log.exception_type,
        "exception_message": log.exception_message,
        "stack_trace": log.stack_trace,
        "context": log.context,
        "correlation_id": log.correlation_id
    }


@router.delete("/cleanup")
async def cleanup_old_logs(
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db)
):
    """Delete logs older than specified days

    Args:
        days: Number of days to retain (minimum 7, maximum 90, default 30)

    Returns:
        Number of deleted logs
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    result = db.execute(
        delete(SystemLog).where(SystemLog.timestamp < cutoff_date)
    )

    db.commit()

    return {
        "message": f"Deleted logs older than {days} days",
        "deleted_count": result.rowcount
    }

"""Settings API endpoints for system configuration (V-23)"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Path, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.system_settings import SystemSettings
from app.services.settings_service import SettingsService

router = APIRouter()


class SettingUpdateRequest(BaseModel):
    value: str


class BatchUpdateRequest(BaseModel):
    updates: List[Dict[str, str]]  # [{"key": "...", "value": "..."}]


@router.get("/")
async def get_all_settings(db: Session = Depends(get_db)):
    """Get all settings grouped by category (V-23)"""
    settings = db.execute(
        select(SystemSettings).order_by(SystemSettings.category, SystemSettings.key)
    ).scalars().all()

    # Group by category
    grouped = {}
    for setting in settings:
        category = setting.category or "uncategorized"
        if category not in grouped:
            grouped[category] = []
        grouped[category].append({
            "key": setting.key,
            "value": setting.value,
            "value_type": setting.value_type,
            "description": setting.description,
            "min_value": setting.min_value,
            "max_value": setting.max_value,
            "updated_at": setting.updated_at.isoformat() if setting.updated_at else None
        })

    return grouped


@router.get("/{key}")
async def get_setting(
    key: str = Path(..., description="Setting key"),
    db: Session = Depends(get_db)
):
    """Get single setting by key (V-23)"""
    setting = db.execute(
        select(SystemSettings).where(SystemSettings.key == key)
    ).scalar_one_or_none()

    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")

    return {
        "key": setting.key,
        "value": setting.value,
        "value_type": setting.value_type,
        "description": setting.description,
        "category": setting.category,
        "min_value": setting.min_value,
        "max_value": setting.max_value,
        "updated_at": setting.updated_at.isoformat() if setting.updated_at else None
    }


@router.put("/{key}")
async def update_setting(
    key: str = Path(..., description="Setting key"),
    request: SettingUpdateRequest = ...,
    db: Session = Depends(get_db)
):
    """Update single setting value (V-23)"""
    from sqlalchemy import update

    setting = db.execute(
        select(SystemSettings).where(SystemSettings.key == key)
    ).scalar_one_or_none()

    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")

    # Validate numeric ranges
    if setting.value_type in ('int', 'float'):
        try:
            numeric_value = float(request.value)
            if setting.min_value is not None and numeric_value < setting.min_value:
                raise HTTPException(status_code=400, detail=f"Value below minimum ({setting.min_value})")
            if setting.max_value is not None and numeric_value > setting.max_value:
                raise HTTPException(status_code=400, detail=f"Value above maximum ({setting.max_value})")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid numeric value")

    # Update value
    db.execute(
        update(SystemSettings)
        .where(SystemSettings.key == key)
        .values(value=request.value)
    )
    db.commit()

    # Invalidate cache (V-26)
    SettingsService().invalidate_cache(key)

    # V-28: Trigger dynamic rescheduling if needed
    if key == 'ingest_interval_minutes':
        from app.services.scheduler import reschedule_ingest_job
        reschedule_ingest_job(int(request.value))
    elif key == 'archive_time_hour':
        from app.services.scheduler import reschedule_archive_job
        reschedule_archive_job(int(request.value))

    return {"message": "Setting updated successfully", "key": key, "value": request.value}


@router.post("/batch")
async def batch_update_settings(
    request: BatchUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update multiple settings atomically (V-23)"""
    from sqlalchemy import update

    try:
        for item in request.updates:
            key = item["key"]
            value = item["value"]

            db.execute(
                update(SystemSettings)
                .where(SystemSettings.key == key)
                .values(value=value)
            )

        db.commit()

        # Invalidate entire cache
        SettingsService().invalidate_cache()

        return {"message": f"Updated {len(request.updates)} settings successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.post("/reset")
async def reset_all_settings(db: Session = Depends(get_db)):
    """Reset all settings to default values (V-23)"""
    from sqlalchemy import update

    # Default values from V-21
    defaults = {
        'ingest_interval_minutes': '30',
        'archive_age_days': '7',
        'archive_time_hour': '3',
        'posts_per_fetch': '5',
        'worthiness_threshold': '0.6',
        'duplicate_threshold': '0.85',
        'enabled_categories': '["Technology","Politics","Business","Science","Health","Other"]',
        'scheduler_paused': 'false'
    }

    for key, value in defaults.items():
        db.execute(
            update(SystemSettings)
            .where(SystemSettings.key == key)
            .values(value=value)
        )

    db.commit()

    # Invalidate cache
    SettingsService().invalidate_cache()

    return {"message": "All settings reset to defaults"}


@router.get("/validate/{key}")
async def validate_setting(
    key: str = Path(..., description="Setting key"),
    value: str = ...,
    db: Session = Depends(get_db)
):
    """Validate value before saving (V-23)"""
    setting = db.execute(
        select(SystemSettings).where(SystemSettings.key == key)
    ).scalar_one_or_none()

    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")

    # Validate type and range
    try:
        if setting.value_type == 'int':
            numeric_value = int(value)
        elif setting.value_type == 'float':
            numeric_value = float(value)
        else:
            return {"valid": True, "message": "Value is valid"}

        if setting.min_value is not None and numeric_value < setting.min_value:
            return {"valid": False, "message": f"Value below minimum ({setting.min_value})"}
        if setting.max_value is not None and numeric_value > setting.max_value:
            return {"valid": False, "message": f"Value above maximum ({setting.max_value})"}

        return {"valid": True, "message": "Value is valid"}
    except ValueError:
        return {"valid": False, "message": "Invalid value type"}

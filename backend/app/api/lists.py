"""Lists API endpoints for X/Twitter list management"""
from typing import List
from fastapi import APIRouter, Depends, Path, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.list_metadata import ListMetadata
from app.services.x_client import x_client

router = APIRouter()


class ListCreateRequest(BaseModel):
    list_id: str
    list_name: str = None
    description: str = None


class ListUpdateRequest(BaseModel):
    enabled: bool = None
    list_name: str = None
    description: str = None


@router.get("/")
async def get_all_lists(db: Session = Depends(get_db)):
    """Get all X lists with metadata (V-24)"""
    lists = db.execute(
        select(ListMetadata).order_by(ListMetadata.created_at.desc())
    ).scalars().all()

    return {"lists": [{
        "id": lst.id,
        "list_id": lst.list_id,
        "list_name": lst.list_name,
        "description": lst.description,
        "enabled": lst.enabled,
        "last_tweet_id": lst.last_tweet_id,
        "created_at": lst.created_at.isoformat() if lst.created_at else None,
        "updated_at": lst.updated_at.isoformat() if lst.updated_at else None
    } for lst in lists]}


@router.get("/export")
async def export_lists(db: Session = Depends(get_db)):
    """Export all lists to JSON format (V-2)"""
    from datetime import datetime

    lists = db.execute(
        select(ListMetadata).order_by(ListMetadata.created_at.desc())
    ).scalars().all()

    export_data = {
        "export_version": "2.0",
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "lists": [{
            "list_id": lst.list_id,
            "list_name": lst.list_name,
            "enabled": lst.enabled,
            "fetch_frequency_minutes": 30  # Default value
        } for lst in lists]
    }

    return export_data


@router.post("/import")
async def import_lists(
    import_data: dict,
    db: Session = Depends(get_db)
):
    """Import lists from JSON format (V-2)"""
    if "lists" not in import_data:
        raise HTTPException(status_code=400, detail="Invalid import format: missing 'lists' key")

    imported_count = 0
    for list_item in import_data["lists"]:
        existing = db.execute(
            select(ListMetadata).where(ListMetadata.list_id == list_item["list_id"])
        ).scalar_one_or_none()

        if existing:
            existing.list_name = list_item.get("list_name")
            existing.enabled = list_item.get("enabled", False)
        else:
            new_list = ListMetadata(
                list_id=list_item["list_id"],
                list_name=list_item.get("list_name"),
                enabled=list_item.get("enabled", False)
            )
            db.add(new_list)

        imported_count += 1

    db.commit()
    return {"imported": imported_count}


async def get_all_lists_old(db: Session = Depends(get_db)):
    """Get all X lists with metadata (V-24)"""
    lists = db.execute(
        select(ListMetadata).order_by(ListMetadata.created_at.desc())
    ).scalars().all()

    return {"lists": [{
        "id": lst.id,
        "list_id": lst.list_id,
        "list_name": lst.list_name,
        "description": lst.description,
        "enabled": lst.enabled,
        "last_tweet_id": lst.last_tweet_id,
        "created_at": lst.created_at.isoformat() if lst.created_at else None,
        "updated_at": lst.updated_at.isoformat() if lst.updated_at else None
    } for lst in lists]}


@router.post("/")
async def create_list(
    request: ListCreateRequest,
    db: Session = Depends(get_db)
):
    """Add new X list to configuration (V-24)"""
    # Check if list_id already exists
    existing = db.execute(
        select(ListMetadata).where(ListMetadata.list_id == request.list_id)
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="List ID already exists")

    # Create new list metadata
    new_list = ListMetadata(
        list_id=request.list_id,
        list_name=request.list_name or f"List {request.list_id}",
        description=request.description,
        enabled=True
    )

    db.add(new_list)
    db.commit()
    db.refresh(new_list)

    return {
        "message": "List added successfully",
        "list": {
            "id": new_list.id,
            "list_id": new_list.list_id,
            "list_name": new_list.list_name,
            "description": new_list.description,
            "enabled": new_list.enabled
        }
    }


@router.put("/{list_id}")
async def update_list(
    list_id: int = Path(..., description="Database ID of the list"),
    request: ListUpdateRequest = ...,
    db: Session = Depends(get_db)
):
    """Update list properties (enable/disable, rename) (V-24)"""
    lst = db.execute(
        select(ListMetadata).where(ListMetadata.id == list_id)
    ).scalar_one_or_none()

    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    # Update fields if provided
    if request.enabled is not None:
        lst.enabled = request.enabled
    if request.list_name is not None:
        lst.list_name = request.list_name
    if request.description is not None:
        lst.description = request.description

    db.commit()
    db.refresh(lst)

    return {
        "message": "List updated successfully",
        "list": {
            "id": lst.id,
            "list_id": lst.list_id,
            "list_name": lst.list_name,
            "description": lst.description,
            "enabled": lst.enabled
        }
    }


@router.delete("/{list_id}")
async def delete_list(
    list_id: int = Path(..., description="Database ID of the list"),
    db: Session = Depends(get_db)
):
    """Remove list from configuration (V-24)"""
    lst = db.execute(
        select(ListMetadata).where(ListMetadata.id == list_id)
    ).scalar_one_or_none()

    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    db.delete(lst)
    db.commit()

    return {"message": "List removed successfully"}


@router.post("/{list_id}/test")
async def test_list_connectivity(
    list_id: int = Path(..., description="Database ID of the list"),
    db: Session = Depends(get_db)
):
    """Test list connectivity to X API (V-24)"""
    lst = db.execute(
        select(ListMetadata).where(ListMetadata.id == list_id)
    ).scalar_one_or_none()

    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    try:
        # Test connectivity by fetching 1 post
        posts = await x_client.fetch_posts_from_list(lst.list_id, max_results=1)
        return {
            "valid": True,
            "message": f"List is accessible (found {len(posts)} recent posts)"
        }
    except Exception as e:
        return {
            "valid": False,
            "message": f"Connection failed: {str(e)}"
        }


@router.get("/{list_id}/stats")
async def get_list_stats(
    list_id: int = Path(..., description="Database ID of the list"),
    db: Session = Depends(get_db)
):
    """Get fetch statistics for list (V-24)"""
    from app.models.post import Post

    lst = db.execute(
        select(ListMetadata).where(ListMetadata.id == list_id)
    ).scalar_one_or_none()

    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    # Count posts from this list (assuming post.author or metadata tracks source)
    # Note: Current schema doesn't track which list a post came from
    # This would require adding list_id foreign key to Post model

    return {
        "list_id": lst.list_id,
        "list_name": lst.list_name,
        "last_tweet_id": lst.last_tweet_id,
        "last_fetch": lst.updated_at.isoformat() if lst.updated_at else None,
        "note": "Post count per list not available in current schema"
    }

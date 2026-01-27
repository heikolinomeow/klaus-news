"""Groups API endpoints (V-5)"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.group import Group
from app.models.post import Post

router = APIRouter()


@router.get("/")
async def get_all_groups(db: Session = Depends(get_db)):
    """Get all active (non-archived) groups with representative titles and post counts (V-6)"""
    groups = db.execute(
        select(Group).where(Group.archived == False).order_by(Group.first_seen.desc())
    ).scalars().all()

    return {"groups": [{
        "id": g.id,
        "representative_title": g.representative_title,
        "representative_summary": g.representative_summary,
        "category": g.category,
        "first_seen": g.first_seen.isoformat() if g.first_seen else None,
        "post_count": g.post_count,
        "archived": g.archived,
        "selected": g.selected
    } for g in groups]}


@router.get("/archived")
async def get_archived_groups(db: Session = Depends(get_db)):
    """Get all archived groups (V-14)"""
    groups = db.execute(
        select(Group).where(Group.archived == True).order_by(Group.first_seen.desc())
    ).scalars().all()

    return {"groups": [{
        "id": g.id,
        "representative_title": g.representative_title,
        "representative_summary": g.representative_summary,
        "category": g.category,
        "first_seen": g.first_seen.isoformat() if g.first_seen else None,
        "post_count": g.post_count,
        "archived": g.archived,
        "selected": g.selected
    } for g in groups]}


@router.get("/{group_id}/posts")
async def get_posts_by_group(group_id: int, db: Session = Depends(get_db)):
    """Get all posts belonging to a specific group (V-3: visibility inherited from group)"""
    posts = db.execute(
        select(Post)
        .where(Post.group_id == group_id)
        .order_by(Post.created_at.desc())
    ).scalars().all()

    return {"posts": [{
        "id": p.id,
        "post_id": p.post_id,
        "original_text": p.original_text,
        "author": p.author,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "ai_title": p.ai_title,
        "ai_summary": p.ai_summary,
        "category": p.category,
        "worthiness_score": p.worthiness_score
    } for p in posts]}


@router.post("/{group_id}/select")
async def select_group(group_id: int, db: Session = Depends(get_db)):
    """Select a group for article generation (V-8)"""
    from sqlalchemy import update

    result = db.execute(
        update(Group).where(Group.id == group_id).values(selected=True)
    )
    db.commit()

    if result.rowcount == 0:
        return {"error": "Group not found"}

    return {"message": "Group selected for article generation"}


@router.post("/{group_id}/archive")
async def archive_group(group_id: int, db: Session = Depends(get_db)):
    """Archive a group - hide from active views but keep for future matching (V-9)"""
    from sqlalchemy import update

    result = db.execute(
        update(Group).where(Group.id == group_id).values(archived=True)
    )
    db.commit()

    if result.rowcount == 0:
        return {"error": "Group not found"}

    return {"message": "Group archived"}


@router.post("/{group_id}/unarchive")
async def unarchive_group(group_id: int, db: Session = Depends(get_db)):
    """Unarchive a group - restore to active view (V-9)"""
    from sqlalchemy import update

    result = db.execute(
        update(Group).where(Group.id == group_id).values(archived=False)
    )
    db.commit()

    if result.rowcount == 0:
        return {"error": "Group not found"}

    return {"message": "Group unarchived"}


@router.post("/{group_id}/transition")
async def transition_group_state(
    group_id: int,
    target_state: str,
    db: Session = Depends(get_db)
):
    """Transition group to a new workflow state (V-3)

    Valid transitions:
    - NEW → COOKING (when user starts working on article)
    - COOKING → REVIEW (when article is generated)
    - REVIEW → PUBLISHED (when article is published)
    - REVIEW → COOKING (when user wants to re-research)
    """
    from sqlalchemy import update
    from fastapi import HTTPException

    VALID_STATES = {'NEW', 'COOKING', 'REVIEW', 'PUBLISHED'}
    VALID_TRANSITIONS = {
        'NEW': ['COOKING'],
        'COOKING': ['REVIEW'],
        'REVIEW': ['PUBLISHED', 'COOKING'],
        'PUBLISHED': []
    }

    if target_state not in VALID_STATES:
        raise HTTPException(status_code=400, detail=f"Invalid state: {target_state}")

    group = db.execute(select(Group).where(Group.id == group_id)).scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    current_state = getattr(group, 'state', 'NEW')
    if target_state not in VALID_TRANSITIONS.get(current_state, []):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition from {current_state} to {target_state}"
        )

    db.execute(
        update(Group).where(Group.id == group_id).values(state=target_state)
    )
    db.commit()

    return {"message": f"Group transitioned to {target_state}", "group_id": group_id, "state": target_state}

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
    """Get all groups with representative titles and post counts"""
    groups = db.execute(
        select(Group).order_by(Group.first_seen.desc())
    ).scalars().all()

    return {"groups": [{
        "id": g.id,
        "representative_title": g.representative_title,
        "category": g.category,
        "first_seen": g.first_seen.isoformat() if g.first_seen else None,
        "post_count": g.post_count
    } for g in groups]}


@router.get("/{group_id}/posts")
async def get_posts_by_group(group_id: int, db: Session = Depends(get_db)):
    """Get all posts belonging to a specific group"""
    posts = db.execute(
        select(Post)
        .where(Post.group_id == group_id)
        .where(Post.archived == False)
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

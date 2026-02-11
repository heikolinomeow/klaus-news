"""Groups API endpoints (V-5)"""
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.models.group import Group
from app.models.post import Post

router = APIRouter()


def _build_x_post_url(author: str | None, post_id: str | None) -> str | None:
    """Build X post URL from available post metadata."""
    if not post_id:
        return None
    if author:
        return f"https://x.com/{author}/status/{post_id}"
    return f"https://x.com/i/web/status/{post_id}"


@router.get("/")
async def get_all_groups(db: Session = Depends(get_db)):
    """Get all active (non-archived) groups with representative titles and post counts (V-6)"""
    # Subquery to compute max worthiness per group
    max_worthiness_subq = (
        select(Post.group_id, func.max(Post.worthiness_score).label('max_worthiness'))
        .group_by(Post.group_id)
        .subquery()
    )

    # Subquery to pick one representative source post per group for external linking.
    representative_post_subq = (
        select(
            Post.group_id.label('group_id'),
            Post.post_id.label('source_post_id'),
            Post.author.label('source_author'),
            func.row_number().over(
                partition_by=Post.group_id,
                order_by=[func.coalesce(Post.worthiness_score, 0).desc(), Post.created_at.desc()]
            ).label('rn')
        )
        .subquery()
    )

    # Query groups with max_worthiness + representative source post via left joins
    stmt = (
        select(
            Group,
            max_worthiness_subq.c.max_worthiness,
            representative_post_subq.c.source_post_id,
            representative_post_subq.c.source_author,
        )
        .outerjoin(max_worthiness_subq, Group.id == max_worthiness_subq.c.group_id)
        .outerjoin(
            representative_post_subq,
            (Group.id == representative_post_subq.c.group_id) &
            (representative_post_subq.c.rn == 1)
        )
        .where(Group.archived == False)
        .order_by(Group.first_seen.desc())
    )
    results = db.execute(stmt).all()

    return {"groups": [{
        "id": g.id,
        "representative_title": g.representative_title,
        "representative_summary": g.representative_summary,
        "category": g.category,
        "first_seen": g.first_seen.isoformat() if g.first_seen else None,
        "post_count": g.post_count,
        "max_worthiness": max_w,
        "source_post_id": source_post_id,
        "source_author": source_author,
        "source_url": _build_x_post_url(source_author, source_post_id),
        "archived": g.archived,
        "selected": g.selected,
        "state": g.state or 'NEW'
    } for g, max_w, source_post_id, source_author in results]}


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
        "selected": g.selected,
        "state": g.state or 'NEW'
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
    target_state: str = Body(..., embed=True),
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
        'COOKING': ['REVIEW', 'NEW'],  # NEW allows "remove from cooking"
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

    # Validate COOKING → REVIEW transition requires at least one article
    if current_state == 'COOKING' and target_state == 'REVIEW':
        from app.models.group_articles import GroupArticle
        article_count = db.execute(
            select(GroupArticle).where(GroupArticle.group_id == group_id)
        ).scalars().all()
        if len(article_count) == 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot move to Serving. Please generate at least one article first."
            )

    db.execute(
        update(Group).where(Group.id == group_id).values(state=target_state)
    )
    db.commit()

    return {"message": f"Group transitioned to {target_state}", "group_id": group_id, "state": target_state}

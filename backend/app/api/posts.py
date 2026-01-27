"""Posts API endpoints"""
from typing import List
from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.post import Post
from app.services.settings_service import SettingsService

router = APIRouter()


@router.get("/")
async def get_all_posts(db: Session = Depends(get_db)):
    """
    Retrieve all posts from the database (Frontend → Backend)

    This endpoint fetches posts that have already been ingested from X/Twitter
    and stored in the PostgreSQL database. It does NOT fetch new posts from X.

    **Use this when:**
    - Displaying all available posts in the frontend
    - Reviewing the complete post history

    **Filters applied:**
    - Excludes archived posts (old/irrelevant posts)
    - Ordered by ingestion date (newest first)

    **Returns:**
    - Post text, author, timestamps
    - AI-generated title, summary, category
    - Worthiness score (0.0-1.0)
    - Selection status
    """
    from sqlalchemy import select
    from app.models.group import Group

    # V-3: Posts inherit visibility from their group - JOIN to filter by Group.archived
    posts = db.execute(
        select(Post)
        .join(Group, Post.group_id == Group.id)
        .where(Group.archived == False)
        .order_by(Post.ingested_at.desc())
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
        "categorization_score": p.categorization_score,
        "worthiness_score": p.worthiness_score,
        "group_id": p.group_id
    } for p in posts]}


@router.get("/recommended")
async def get_recommended_posts(db: Session = Depends(get_db)):
    """
    Get AI-filtered recommended posts for article generation (Frontend → Backend)

    This endpoint returns posts that the AI has scored as "newsworthy" (worthiness_score > 0.6)
    and groups them by category for easier review. These are the best candidates for
    turning into news articles.

    **Use this when:**
    - User wants to see only high-quality posts
    - Generating the daily news article
    - Reviewing AI recommendations

    **Filters applied:**
    - Worthiness score > 0.6 (AI determined newsworthy)
    - Not archived (still relevant)
    - Not yet selected (available for article creation)
    - Grouped by category (Product, Engineering, HR, etc.)

    **Returns:**
    - Grouped by category (dict with category names as keys)
    - Sorted by worthiness score within each category (best first)
    - Same post data as `/api/posts/` endpoint

    **Difference from `/api/posts/`:**
    - `/api/posts/` = All posts (unfiltered)
    - `/recommended` = AI-filtered high-quality posts only
    """
    from sqlalchemy import select

    # V-13: Read worthiness threshold from settings
    settings_svc = SettingsService(db)
    worthiness_threshold = settings_svc.get('worthiness_threshold', 0.6)

    from app.models.group import Group

    # V-3: Posts inherit visibility from their group - JOIN to filter by Group.archived/selected
    posts = db.execute(
        select(Post)
        .join(Group, Post.group_id == Group.id)
        .where(Post.worthiness_score > worthiness_threshold)
        .where(Group.archived == False)
        .where(Group.selected == False)
        .order_by(Post.category, Post.worthiness_score.desc())
    ).scalars().all()

    # Group by category
    grouped = {}
    for post in posts:
        category = post.category or "Uncategorized"
        if category not in grouped:
            grouped[category] = []
        grouped[category].append({
            "id": post.id,
            "post_id": post.post_id,
            "original_text": post.original_text,
            "author": post.author,
            "created_at": post.created_at.isoformat() if post.created_at else None,
            "ai_title": post.ai_title,
            "ai_summary": post.ai_summary,
            "category": post.category,
            "categorization_score": post.categorization_score,
            "worthiness_score": post.worthiness_score,
            "group_id": post.group_id
        })

    return grouped


@router.get("/{post_id}")
async def get_post(
    post_id: int = Path(..., description="Database ID of the post (integer)"),
    db: Session = Depends(get_db)
):
    """
    Get a single post by database ID (Frontend → Backend)

    Retrieves detailed information about a specific post from the database.

    **Use this when:**
    - Viewing detailed information about a specific post
    - Fetching post data before generating an article

    **Parameters:**
    - `post_id`: Database ID (integer), NOT the X/Twitter post ID (string)

    **Returns:**
    - Complete post data including AI analysis
    - Returns null if post not found
    """
    # TODO: Implement query logic
    return {"post": None}



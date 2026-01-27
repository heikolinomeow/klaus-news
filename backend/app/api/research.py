"""Research API endpoints (V-6, V-19)"""
from fastapi import APIRouter, Depends, Path, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.models.group import Group


router = APIRouter()


class RunResearchRequest(BaseModel):
    mode: str = "agentic"  # quick, agentic, deep


class UpdateResearchRequest(BaseModel):
    edited_output: str


@router.post("/{group_id}/research/")
async def run_research(
    group_id: int = Path(..., description="Group ID"),
    request: RunResearchRequest = ...,
    db: Session = Depends(get_db)
):
    """Run AI research on a group (V-6, V-19)

    Triggers research with specified mode (quick/agentic/deep).
    Saves results to group_research table.
    """
    from app.services.openai_client import research_client
    from app.models.group_research import GroupResearch
    from app.models.post import Post
    import json

    # Validate group exists
    group = db.execute(select(Group).where(Group.id == group_id)).scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Get posts for research context
    posts = db.execute(
        select(Post).where(Post.group_id == group_id)
    ).scalars().all()

    # Build research prompt
    prompt = f"""Research the following news topic thoroughly.

Topic: {group.representative_title}
Summary: {group.representative_summary or 'N/A'}
Category: {group.category}

Source posts:
"""
    for i, post in enumerate(posts, 1):
        prompt += f"\n{i}. {post.original_text[:500]}"

    prompt += """

Please provide:
## Background
Brief context about this topic.

## Key Facts Verified
Bullet points of verified facts with source numbers.

## Related Context
Industry context and implications.

## Sources
Numbered list of source URLs."""

    # Run research based on mode
    if request.mode == "quick":
        result = await research_client.quick_research(prompt)
    elif request.mode == "deep":
        result = await research_client.deep_research(prompt)
    else:  # agentic (default)
        result = await research_client.agentic_research(prompt)

    # Save to database
    research = GroupResearch(
        group_id=group_id,
        research_mode=request.mode,
        original_output=result["output"],
        sources=json.dumps(result["sources"]),
        model_used=result["model_used"]
    )
    db.add(research)
    db.commit()
    db.refresh(research)

    return {
        "research": {
            "id": research.id,
            "group_id": research.group_id,
            "research_mode": research.research_mode,
            "original_output": research.original_output,
            "edited_output": research.edited_output,
            "sources": result["sources"],
            "model_used": research.model_used,
            "created_at": research.created_at.isoformat() if research.created_at else None
        }
    }


@router.get("/{group_id}/research/")
async def get_research(
    group_id: int = Path(..., description="Group ID"),
    db: Session = Depends(get_db)
):
    """Get current research for a group (V-19)"""
    from app.models.group_research import GroupResearch
    import json

    research = db.execute(
        select(GroupResearch)
        .where(GroupResearch.group_id == group_id)
        .order_by(GroupResearch.created_at.desc())
    ).scalar_one_or_none()

    if not research:
        raise HTTPException(status_code=404, detail="No research found for this group")

    sources = json.loads(research.sources) if research.sources else []

    return {
        "research": {
            "id": research.id,
            "group_id": research.group_id,
            "research_mode": research.research_mode,
            "original_output": research.original_output,
            "edited_output": research.edited_output,
            "sources": sources,
            "model_used": research.model_used,
            "created_at": research.created_at.isoformat() if research.created_at else None,
            "updated_at": research.updated_at.isoformat() if research.updated_at else None
        }
    }


@router.put("/{group_id}/research/")
async def update_research(
    group_id: int = Path(..., description="Group ID"),
    request: UpdateResearchRequest = ...,
    db: Session = Depends(get_db)
):
    """Save edited research output (V-8, V-19)"""
    from app.models.group_research import GroupResearch
    from sqlalchemy import update

    research = db.execute(
        select(GroupResearch)
        .where(GroupResearch.group_id == group_id)
        .order_by(GroupResearch.created_at.desc())
    ).scalar_one_or_none()

    if not research:
        raise HTTPException(status_code=404, detail="No research found for this group")

    db.execute(
        update(GroupResearch)
        .where(GroupResearch.id == research.id)
        .values(edited_output=request.edited_output)
    )
    db.commit()

    return {"message": "Research updated", "group_id": group_id}

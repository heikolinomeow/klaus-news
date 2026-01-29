"""Group Articles API endpoints (V-11, V-12, V-19)"""
from fastapi import APIRouter, Depends, Path, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.models.group import Group


router = APIRouter()


class GenerateArticleRequest(BaseModel):
    style: str = "news_brief"  # news_brief, full_article, executive_summary, analysis, custom
    custom_prompt: Optional[str] = None


class RefineArticleRequest(BaseModel):
    instruction: str


class UpdateArticleRequest(BaseModel):
    content: str
    title: Optional[str] = None


@router.post("/{group_id}/article/")
async def generate_article(
    group_id: int = Path(..., description="Group ID"),
    request: GenerateArticleRequest = ...,
    db: Session = Depends(get_db)
):
    """Generate article from group with optional research (V-11, V-19)

    If research exists, uses posts + research as context.
    If no research, uses posts only for simpler output.
    """
    from app.services.openai_client import openai_client
    from app.models.group_research import GroupResearch
    from app.models.group_articles import GroupArticle
    from app.models.post import Post
    from app.models.system_settings import SystemSettings
    from openai import AsyncOpenAI

    # Validate group
    group = db.execute(select(Group).where(Group.id == group_id)).scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Get posts
    posts = db.execute(select(Post).where(Post.group_id == group_id)).scalars().all()
    if not posts:
        raise HTTPException(status_code=400, detail="No posts in group")

    # Get research if exists (get most recent)
    research = db.execute(
        select(GroupResearch)
        .where(GroupResearch.group_id == group_id)
        .order_by(GroupResearch.created_at.desc())
    ).scalars().first()

    # Get prompt based on style
    if request.style == "custom":
        if not request.custom_prompt:
            raise HTTPException(status_code=400, detail="Custom prompt required for custom style")
        style_prompt = request.custom_prompt
    else:
        key = f'article_prompt_{request.style}'
        setting = db.execute(
            select(SystemSettings).where(SystemSettings.key == key)
        ).scalar_one_or_none()
        style_prompt = setting.value if setting else "Write a news article based on the provided sources."

    # Build generation prompt
    context = f"""Topic: {group.representative_title}
Category: {group.category}

Source Posts:
"""
    for i, post in enumerate(posts, 1):
        context += f"\n{i}. @{post.author or 'unknown'}: {post.original_text}"

    if research:
        research_text = research.edited_output or research.original_output
        context += f"\n\nResearch Findings:\n{research_text}"

    full_prompt = f"""{style_prompt}

{context}

Output format: Plain text with paragraphs (will be published to Teams).
Start with a compelling headline, then write the article content."""

    # Generate article
    # NOTE: gpt-5-mini is a reasoning model - does NOT support temperature parameter
    # See GOTCHAS.md "gpt-5-mini Temperature Limitation" section
    client = AsyncOpenAI(api_key=openai_client.api_key)
    response = await client.chat.completions.create(
        model="gpt-5-mini",
        messages=[{"role": "user", "content": full_prompt}],
        max_completion_tokens=2000
    )

    content = response.choices[0].message.content.strip()

    # Extract title from first line if it looks like a headline
    title = None
    lines = content.split('\n', 1)
    if len(lines) > 0:
        first_line = lines[0].strip()
        # Use first line as title if it's short enough and doesn't start with markdown list markers
        if len(first_line) <= 200 and not first_line.startswith(('-', '*', '1.', '2.', '3.')):
            title = first_line.strip('#').strip()  # Remove markdown header symbols

    # Save article
    article = GroupArticle(
        group_id=group_id,
        research_id=research.id if research else None,
        style=request.style,
        prompt_used=style_prompt,
        title=title,
        content=content
    )
    db.add(article)

    # Transition group to REVIEW state (V-3)
    from sqlalchemy import update
    db.execute(update(Group).where(Group.id == group_id).values(state='REVIEW'))

    db.commit()
    db.refresh(article)

    return {
        "article": {
            "id": article.id,
            "group_id": article.group_id,
            "style": article.style,
            "title": article.title,
            "content": article.content,
            "created_at": article.created_at.isoformat() if article.created_at else None
        }
    }


@router.get("/{group_id}/articles/")
async def get_all_articles(
    group_id: int = Path(..., description="Group ID"),
    db: Session = Depends(get_db)
):
    """Get all articles for a group, ordered by creation date descending"""
    from app.models.group_articles import GroupArticle

    articles = db.execute(
        select(GroupArticle)
        .where(GroupArticle.group_id == group_id)
        .order_by(GroupArticle.created_at.desc())
    ).scalars().all()

    return {
        "articles": [
            {
                "id": a.id,
                "group_id": a.group_id,
                "style": a.style,
                "title": a.title,
                "content": a.content,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "updated_at": a.updated_at.isoformat() if a.updated_at else None
            }
            for a in articles
        ],
        "count": len(articles)
    }


@router.get("/{group_id}/article/")
async def get_article(
    group_id: int = Path(..., description="Group ID"),
    db: Session = Depends(get_db)
):
    """Get most recent article for a group (V-19)"""
    from app.models.group_articles import GroupArticle

    article = db.execute(
        select(GroupArticle)
        .where(GroupArticle.group_id == group_id)
        .order_by(GroupArticle.updated_at.desc())
    ).scalars().first()

    if not article:
        raise HTTPException(status_code=404, detail="No article found for this group")

    return {
        "article": {
            "id": article.id,
            "group_id": article.group_id,
            "style": article.style,
            "title": article.title,
            "content": article.content,
            "created_at": article.created_at.isoformat() if article.created_at else None,
            "updated_at": article.updated_at.isoformat() if article.updated_at else None
        }
    }


@router.put("/{group_id}/article/{article_id}/")
async def update_article(
    group_id: int = Path(..., description="Group ID"),
    article_id: int = Path(..., description="Article ID"),
    request: UpdateArticleRequest = ...,
    db: Session = Depends(get_db)
):
    """Directly update a specific article's content (manual editing)"""
    from app.models.group_articles import GroupArticle
    from sqlalchemy import update

    # Get specific article and verify it belongs to the group
    article = db.execute(
        select(GroupArticle)
        .where(GroupArticle.id == article_id, GroupArticle.group_id == group_id)
    ).scalars().first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Update article content and title
    update_values = {"content": request.content}
    if request.title is not None:
        update_values["title"] = request.title

    db.execute(
        update(GroupArticle)
        .where(GroupArticle.id == article_id)
        .values(**update_values)
    )
    db.commit()
    db.refresh(article)

    return {
        "article": {
            "id": article.id,
            "group_id": article.group_id,
            "style": article.style,
            "title": article.title,
            "content": request.content
        }
    }


@router.put("/{group_id}/article/{article_id}/refine/")
async def refine_article(
    group_id: int = Path(..., description="Group ID"),
    article_id: int = Path(..., description="Article ID"),
    request: RefineArticleRequest = ...,
    db: Session = Depends(get_db)
):
    """Refine a specific article with instruction (V-12, V-19)

    Uses specified article + research + posts + instruction to generate refined version.
    Updates the article in place.
    """
    from app.services.openai_client import openai_client
    from app.models.group_articles import GroupArticle
    from app.models.group_research import GroupResearch
    from app.models.post import Post
    from openai import AsyncOpenAI
    from sqlalchemy import update

    # Get specific article and verify it belongs to the group
    article = db.execute(
        select(GroupArticle)
        .where(GroupArticle.id == article_id, GroupArticle.group_id == group_id)
    ).scalars().first()

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Get group
    group = db.execute(select(Group).where(Group.id == group_id)).scalar_one_or_none()

    # Get posts
    posts = db.execute(select(Post).where(Post.group_id == group_id)).scalars().all()

    # Get research if exists (get most recent)
    research = db.execute(
        select(GroupResearch)
        .where(GroupResearch.group_id == group_id)
        .order_by(GroupResearch.created_at.desc())
    ).scalars().first()

    # Build refinement prompt
    context = f"""Current Article:
{article.content}

User Instruction: {request.instruction}

Original Sources:
"""
    for i, post in enumerate(posts, 1):
        context += f"\n{i}. @{post.author or 'unknown'}: {post.original_text[:300]}"

    if research:
        research_text = research.edited_output or research.original_output
        context += f"\n\nResearch Context:\n{research_text[:1000]}"

    refine_prompt = f"""Refine the article according to the user's instruction.
Maintain the article's factual accuracy while addressing the requested changes.

{context}

Output the refined article as plain text with paragraphs."""

    # Generate refined article
    # NOTE: gpt-5-mini is a reasoning model - does NOT support temperature parameter
    # See GOTCHAS.md "gpt-5-mini Temperature Limitation" section
    client = AsyncOpenAI(api_key=openai_client.api_key)
    response = await client.chat.completions.create(
        model="gpt-5-mini",
        messages=[{"role": "user", "content": refine_prompt}],
        max_completion_tokens=2000
    )

    new_content = response.choices[0].message.content.strip()

    # Extract title from refined content
    new_title = None
    lines = new_content.split('\n', 1)
    if len(lines) > 0:
        first_line = lines[0].strip()
        if len(first_line) <= 200 and not first_line.startswith(('-', '*', '1.', '2.', '3.')):
            new_title = first_line.strip('#').strip()

    # Update article in place (V-12: no multiple drafts)
    db.execute(
        update(GroupArticle)
        .where(GroupArticle.id == article.id)
        .values(content=new_content, title=new_title)
    )
    db.commit()
    db.refresh(article)

    return {
        "article": {
            "id": article.id,
            "group_id": article.group_id,
            "style": article.style,
            "title": article.title,
            "content": new_content
        }
    }

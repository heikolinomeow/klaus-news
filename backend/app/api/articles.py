"""Articles API endpoints"""
from fastapi import APIRouter, Depends, Path
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.article import Article

router = APIRouter()


class CreateArticleRequest(BaseModel):
    """Request body for creating an article (V-13: group-based generation)"""
    group_id: int = Field(..., description="Database ID of the group to generate article from", example=1)


class UpdateArticleRequest(BaseModel):
    """Request body for updating an article"""
    content: str = Field(..., description="Updated article content (markdown format)")


@router.get("/")
async def get_all_articles(db: Session = Depends(get_db)):
    """
    Retrieve all generated articles from the database (Frontend → Backend)

    Returns all news articles that have been generated from posts, including
    both published and unpublished articles.

    **Use this when:**
    - Displaying article history in the frontend
    - Reviewing previously generated articles
    - Checking which articles have been published to Teams

    **Returns:**
    - Article title and full content (markdown format)
    - Generation count (how many times regenerated)
    - Posted to Teams timestamp (null if not published yet)
    - Associated post ID
    """
    # TODO: Implement query logic
    return {"articles": []}


@router.post("/")
async def create_article(request: CreateArticleRequest, db: Session = Depends(get_db)):
    """
    Generate a news article from a GROUP using OpenAI (V-13: group-based generation)

    This endpoint takes a group and uses all posts within it as source material
    to generate a comprehensive news article with multiple perspectives.

    **What happens (backend flow):**
    1. Fetch group and all its posts from database
    2. Combine group context + all posts' content as source material
    3. Call OpenAI API with combined prompt
    4. Mark group as selected=true
    5. Save article to database
    6. Return generated article

    **Request body:**
    ```json
    {
      "group_id": 1
    }
    ```
    """
    from sqlalchemy import select, update
    from app.models.post import Post
    from app.models.group import Group
    from app.services.openai_client import openai_client

    # 1. Get group by ID
    group = db.execute(select(Group).where(Group.id == request.group_id)).scalar_one_or_none()
    if not group:
        return {"error": "Group not found"}

    # 2. Get all posts in the group (V-13: gather all posts as source material)
    posts = db.execute(
        select(Post).where(Post.group_id == request.group_id).order_by(Post.created_at.desc())
    ).scalars().all()

    if not posts:
        return {"error": "No posts found in group"}

    # 3. Combine content for AI (V-13: group context + all posts)
    combined_content = f"""
Topic: {group.representative_title}
Summary: {group.representative_summary or 'N/A'}
Category: {group.category}
Number of sources: {len(posts)}

Sources:
"""
    for i, post in enumerate(posts, 1):
        combined_content += f"""
--- Source {i} ---
Author: {post.author or 'Unknown'}
Original text: {post.original_text}
AI Summary: {post.ai_summary or 'N/A'}
"""

    # 4. Generate article via OpenAI with combined content
    content = await openai_client.generate_article(combined_content)

    # Extract title (first line of markdown)
    title_line = content.split('\n')[0].replace('#', '').strip()

    # 5. Mark group as selected (V-13)
    db.execute(update(Group).where(Group.id == request.group_id).values(selected=True))

    # 6. Store in database (use first post's id for backward compatibility)
    new_article = Article(
        post_id=posts[0].id,
        title=title_line,
        content=content,
        generation_count=1
    )
    db.add(new_article)
    db.commit()
    db.refresh(new_article)

    return {"article": {
        "id": new_article.id,
        "group_id": request.group_id,
        "post_id": new_article.post_id,
        "title": new_article.title,
        "content": new_article.content,
        "generation_count": new_article.generation_count,
        "posted_to_teams": new_article.posted_to_teams.isoformat() if new_article.posted_to_teams else None
    }}


@router.put("/{article_id}")
async def update_article(
    article_id: int = Path(..., description="Database ID of the article to update"),
    request: UpdateArticleRequest = None,
    db: Session = Depends(get_db)
):
    """
    Update article content after user edits (Frontend → Backend)

    Allows users to manually edit the AI-generated article content before
    publishing to Teams. Useful for fixing errors, adding context, or
    adjusting tone.

    **Use this when:**
    - User edits article in the frontend editor
    - Making corrections to AI-generated content
    - Adding additional information before publishing

    **What happens:**
    - Updates article content in database
    - Preserves generation count and other metadata
    - Does not re-extract title (keeps existing title)

    **Request body:**
    ```json
    {
      "content": "# Updated Title\\n\\nUpdated article content..."
    }
    ```

    **Parameters:**
    - `article_id`: Database ID of the article

    **Returns:**
    - Updated article with new content
    - All other fields unchanged
    """
    from sqlalchemy import select, update

    db.execute(
        update(Article).where(Article.id == article_id).values(content=request.content)
    )
    db.commit()

    article = db.execute(select(Article).where(Article.id == article_id)).scalar_one_or_none()

    return {"article": {
        "id": article.id,
        "post_id": article.post_id,
        "title": article.title,
        "content": article.content,
        "generation_count": article.generation_count,
        "posted_to_teams": article.posted_to_teams.isoformat() if article.posted_to_teams else None
    } if article else None}


@router.post("/{article_id}/regenerate")
async def regenerate_article(
    article_id: int = Path(..., description="Database ID of the article to regenerate"),
    db: Session = Depends(get_db)
):
    """
    Regenerate article with improved AI prompts (Frontend → Backend → OpenAI)

    If the user is unsatisfied with the generated article (too short, too technical,
    wrong tone, etc.), this endpoint regenerates it from the original post using
    an improved prompt that asks for adjustments.

    **Use this when:**
    - User clicks "Regenerate" button in frontend
    - AI-generated article quality is unsatisfactory
    - Need different tone, length, or focus

    **What happens (backend flow):**
    1. Fetch existing article and source post from database
    2. Call OpenAI API with improved prompt (mentions previous issues)
    3. Parse new response and extract title
    4. Update article content in database
    5. Increment generation_count (tracks how many times regenerated)
    6. Return updated article

    **Parameters:**
    - `article_id`: Database ID of the article to regenerate

    **Response:**
    - Updated article with new content
    - Incremented generation_count
    - New title extracted from content

    **Performance:**
    - ⏱️ Takes 3-10 seconds (OpenAI API call)
    - 💰 Costs ~$0.01-0.05 per regeneration

    **Note:**
    - Each regeneration adds to generation_count
    - Can regenerate unlimited times (but costs add up)
    - Previous content is overwritten (not versioned)
    """
    from sqlalchemy import select, update
    from app.models.post import Post
    from app.services.openai_client import openai_client
    from openai import AsyncOpenAI

    article = db.execute(select(Article).where(Article.id == article_id)).scalar_one_or_none()
    if not article:
        return {"error": "Article not found"}

    post = db.execute(select(Post).where(Post.id == article.post_id)).scalar_one_or_none()
    if not post:
        return {"error": "Source post not found"}

    # Regenerate with improved prompt
    client = AsyncOpenAI(api_key=openai_client.api_key)
    improved_prompt = f"Write a comprehensive news article based on this post: {post.original_text}. Requirements: Informative headline, 3-5 paragraphs, Objective tone, Include context and background. Format as markdown. Previous version was too short/long/technical - adjust accordingly."

    response = await client.chat.completions.create(
        model=openai_client.model,
        messages=[{"role": "user", "content": improved_prompt}],
        temperature=0.7,
        max_tokens=1000
    )

    new_content = response.choices[0].message.content.strip()
    new_title = new_content.split('\n')[0].replace('#', '').strip()

    # Increment generation_count and update
    db.execute(
        update(Article)
        .where(Article.id == article_id)
        .values(
            content=new_content,
            title=new_title,
            generation_count=article.generation_count + 1
        )
    )
    db.commit()

    article = db.execute(select(Article).where(Article.id == article_id)).scalar_one_or_none()

    return {"article": {
        "id": article.id,
        "post_id": article.post_id,
        "title": article.title,
        "content": article.content,
        "generation_count": article.generation_count,
        "posted_to_teams": article.posted_to_teams.isoformat() if article.posted_to_teams else None
    }}



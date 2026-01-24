# API Documentation Improvement Guide

## Problem
The current API documentation at `/docs` has ambiguous descriptions like "Get all posts" which doesn't clarify:
- Does this fetch posts from X/Twitter?
- Does it get posts from the database?
- What's the difference between this and other endpoints?

## Solution
FastAPI automatically generates documentation from:
1. **Function docstrings** - Displayed as endpoint descriptions
2. **Parameter descriptions** - Shows what each parameter does
3. **Response models** - Defines what data is returned

---

## Current vs Improved Documentation

### **Example 1: Posts Endpoints**

#### ❌ Current (Ambiguous)
```python
@router.get("/")
async def get_all_posts(db: Session = Depends(get_db)):
    """Get all posts (excluding archived)"""
```

**What users see in /docs:**
> "Get all posts (excluding archived)"

**User confusion:**
- Does this fetch from X/Twitter API?
- What are "archived" posts?
- When would I use this vs `/recommended`?

#### ✅ Improved (Clear Context)
```python
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
```

**What users see in /docs:**
> Clear explanation that this is database → frontend, not X API → backend
> Context about what archived means
> Guidance on when to use this endpoint

---

### **Example 2: Recommended Posts**

#### ❌ Current (Ambiguous)
```python
@router.get("/recommended")
async def get_recommended_posts(db: Session = Depends(get_db)):
    """Get recommended posts (high worthiness score, organized by category)"""
```

#### ✅ Improved (Clear Context)
```python
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
    - Same post data as `/api/posts` endpoint

    **Difference from `/api/posts`:**
    - `/api/posts` = All posts (unfiltered)
    - `/recommended` = AI-filtered high-quality posts only
    """
```

---

### **Example 3: Select Post**

#### ❌ Current (Ambiguous)
```python
@router.post("/{post_id}/select")
async def select_post(post_id: int, db: Session = Depends(get_db)):
    """Mark post as selected (user clicked)"""
```

**User confusion:**
- What does "selected" mean?
- What happens after selection?
- Is this for article generation?

#### ✅ Improved (Clear Context)
```python
from fastapi import Path

@router.post("/{post_id}/select")
async def select_post(
    post_id: int = Path(
        ...,
        description="The database ID of the post to mark as selected (not the X/Twitter post ID)"
    ),
    db: Session = Depends(get_db)
):
    """
    Mark a post as selected for article generation (Frontend → Backend)

    When a user chooses a post to turn into an article, this endpoint marks it
    as "selected" in the database. This prevents the post from appearing in
    future recommendations until the article is published.

    **Use this when:**
    - User clicks "Generate Article" on a post
    - User manually marks a post for later processing

    **What happens:**
    - Sets `selected=true` in database
    - Post removed from `/recommended` endpoint results
    - Post is now ready for article generation via `/api/articles`

    **Parameters:**
    - `post_id`: Database ID (integer), NOT the Twitter post ID (string)

    **Workflow:**
    1. User views recommended posts → `GET /api/posts/recommended`
    2. User picks a post → `POST /api/posts/{id}/select`
    3. Generate article from selected post → `POST /api/articles` with `post_id`
    """
```

---

### **Example 4: Create Article**

#### ❌ Current (Ambiguous)
```python
@router.post("/")
async def create_article(post_id: int, db: Session = Depends(get_db)):
    """Generate article from selected post"""
```

**User confusion:**
- Does this call OpenAI?
- How long does it take?
- What format is the article?

#### ✅ Improved (Clear Context)
```python
from pydantic import BaseModel, Field

class CreateArticleRequest(BaseModel):
    post_id: int = Field(
        ...,
        description="Database ID of the post to generate article from"
    )

@router.post("/")
async def create_article(request: CreateArticleRequest, db: Session = Depends(get_db)):
    """
    Generate a news article from a post using OpenAI (Frontend → Backend → OpenAI)

    This endpoint takes a post and uses OpenAI's GPT model to transform it into
    a full news article with proper structure, context, and formatting.

    **Use this when:**
    - User wants to create an article from a selected post
    - Converting raw X/Twitter content into publishable news

    **What happens (backend flow):**
    1. Fetch post from database by ID
    2. Call OpenAI API with article generation prompt
    3. Parse response (extract title from first markdown line)
    4. Save article to database
    5. Return generated article

    **Request body:**
    ```json
    {
      "post_id": 1  // Database ID (from /api/posts or /api/posts/recommended)
    }
    ```

    **Response:**
    - Article title (extracted from content)
    - Full article content (markdown format)
    - Generation count (starts at 1)
    - Posted to Teams timestamp (null until published)

    **Performance:**
    - ⏱️ Takes 3-10 seconds (OpenAI API call)
    - 💰 Costs ~$0.01-0.05 per article (OpenAI pricing)

    **Error cases:**
    - Post not found → Returns error
    - OpenAI API failure → Will timeout/error

    **Next steps:**
    - Edit article → `PUT /api/articles/{id}`
    - Regenerate if unsatisfied → `POST /api/articles/{id}/regenerate`
    - Publish to Teams → `POST /api/articles/{id}/post-to-teams`
    """
```

---

### **Example 5: Post to Teams**

#### ❌ Current (Ambiguous)
```python
@router.post("/{article_id}/post-to-teams")
async def post_to_teams(article_id: int, db: Session = Depends(get_db)):
    """Post article to Teams channel"""
```

#### ✅ Improved (Clear Context)
```python
@router.post("/{article_id}/post-to-teams")
async def post_to_teams(
    article_id: int = Path(
        ...,
        description="Database ID of the article to publish"
    ),
    db: Session = Depends(get_db)
):
    """
    Publish article to Microsoft Teams channel (Frontend → Backend → Teams Webhook)

    Sends the generated article to your company's Teams channel using a webhook.
    This is the final step in the workflow - making the news article visible to
    the entire team.

    **Use this when:**
    - Article has been reviewed and approved
    - Ready to share with the team

    **What happens (backend flow):**
    1. Fetch article from database
    2. Format as Teams message card
    3. POST to Teams webhook URL (from environment variable)
    4. If successful, set `posted_to_teams` timestamp
    5. Save timestamp to database

    **Request:**
    - Only requires article ID (no body needed)

    **Response:**
    - Success: `{"message": "Posted to Teams"}`
    - Failure: `{"error": "Failed to post to Teams"}` or `{"error": "Article not found"}`

    **Important notes:**
    - ⚠️ Can be called multiple times (no duplicate protection yet)
    - ⚠️ Requires `TEAMS_WEBHOOK_URL` environment variable to be set
    - ⏱️ Takes 1-3 seconds (Teams API call)

    **After publishing:**
    - Article's `posted_to_teams` field shows publication timestamp
    - Visible in Teams channel immediately
    - Team members can read/discuss in Teams

    **Troubleshooting:**
    - If fails, check TEAMS_WEBHOOK_URL is correct
    - Verify webhook has permissions to post to channel
    - Check Teams channel settings allow external webhooks
    """
```

---

## How to Implement These Changes

### **Step 1: Update Posts API**

**File:** `backend/app/api/posts.py`

Replace the minimal docstrings with the detailed ones shown above:
- `get_all_posts()` - Lines 12-37
- `get_recommended_posts()` - Lines 40-75
- `get_post()` - Line 78-82
- `select_post()` - Lines 85-95

### **Step 2: Update Articles API**

**File:** `backend/app/api/articles.py`

Replace the minimal docstrings with the detailed ones shown above:
- `get_all_articles()` - Lines 11-15
- `create_article()` - Lines 18-56
- `update_article()` - Lines 59-78
- `regenerate_article()` - Lines 81-132
- `post_to_teams()` - Lines 135-159

### **Step 3: Add Parameter Descriptions**

Import FastAPI parameter helpers:
```python
from fastapi import Path, Query, Body
```

Add descriptions to path parameters:
```python
post_id: int = Path(..., description="Database ID of the post (integer)")
```

Add descriptions to query parameters:
```python
limit: int = Query(10, description="Maximum number of posts to return")
```

### **Step 4: Add Request/Response Models**

Create Pydantic models with field descriptions:
```python
from pydantic import BaseModel, Field

class CreateArticleRequest(BaseModel):
    post_id: int = Field(..., description="Database ID of the post")

class ArticleResponse(BaseModel):
    id: int = Field(..., description="Article database ID")
    title: str = Field(..., description="Article headline")
    content: str = Field(..., description="Full article content (markdown)")
    generation_count: int = Field(..., description="How many times regenerated")
```

---

## Benefits After Implementation

### **Before (Current State):**
```
GET /api/posts
  Description: "Get all posts (excluding archived)"
```

### **After (Improved):**
```
GET /api/posts
  Description:
    "Retrieve all posts from the database (Frontend → Backend)

    This endpoint fetches posts that have already been ingested from
    X/Twitter and stored in PostgreSQL. It does NOT fetch new posts.

    Use this when:
    - Displaying all available posts in the frontend
    - Reviewing complete post history

    Filters applied:
    - Excludes archived posts
    - Ordered by ingestion date (newest first)

    Returns:
    - Post text, author, timestamps
    - AI-generated title, summary, category
    - Worthiness score (0.0-1.0)"
```

---

## Testing the Improvements

1. **Make the changes** to `posts.py` and `articles.py`
2. **Restart backend:** `docker-compose restart backend`
3. **Open docs:** http://localhost:8000/docs
4. **Click any endpoint** - See the detailed descriptions
5. **Share with team** - They can understand the API without asking questions

---

## Additional Documentation Features

### **Add Examples to Request Bodies**

```python
class CreateArticleRequest(BaseModel):
    post_id: int = Field(
        ...,
        description="Database ID of the post",
        example=1
    )
```

### **Add Tags with Descriptions**

In `main.py`:
```python
from fastapi import FastAPI

app = FastAPI(
    title="Klaus News API",
    description="""
    Backend API for Klaus News - Internal company news aggregation tool.

    **Data Flow:**
    1. X/Twitter posts → Ingested by background scheduler → PostgreSQL
    2. Frontend requests posts → This API → Returns from database
    3. User selects post → This API → OpenAI generates article
    4. User publishes → This API → Teams webhook

    **Key Concepts:**
    - **Posts**: Raw X/Twitter content stored in database
    - **Articles**: AI-generated news articles from posts
    - **Worthiness Score**: AI-determined newsworthiness (0.0-1.0)
    - **Selected**: Posts marked for article generation
    - **Archived**: Old/irrelevant posts hidden from view
    """,
    version="1.0.0",
    openapi_tags=[
        {
            "name": "posts",
            "description": "Operations on X/Twitter posts (fetch from DB, recommend, select)"
        },
        {
            "name": "articles",
            "description": "Article generation and publishing (create, edit, publish to Teams)"
        }
    ]
)
```

### **Add Response Examples**

```python
from fastapi import APIRouter
from fastapi.responses import JSONResponse

@router.get(
    "/",
    responses={
        200: {
            "description": "Successfully retrieved posts",
            "content": {
                "application/json": {
                    "example": {
                        "posts": [
                            {
                                "id": 1,
                                "post_id": "1234567890",
                                "original_text": "Exciting news: We're launching...",
                                "author": "CompanyAccount",
                                "created_at": "2024-01-15T10:30:00Z",
                                "ai_title": "Company Launches New Product",
                                "ai_summary": "Brief summary...",
                                "category": "Product",
                                "worthiness_score": 0.85,
                                "selected": False,
                                "archived": False
                            }
                        ]
                    }
                }
            }
        }
    }
)
async def get_all_posts(db: Session = Depends(get_db)):
    """..."""
```

---

## Summary: What to Change

| File | Changes | Impact |
|------|---------|--------|
| `backend/app/api/posts.py` | Expand docstrings (5 functions) | Clearer post endpoint documentation |
| `backend/app/api/articles.py` | Expand docstrings (5 functions) | Clearer article endpoint documentation |
| `backend/app/main.py` | Add app description and tag descriptions | Better overview of entire API |
| (Optional) Create Pydantic models | Add request/response schemas | Validated, documented request bodies |

**Estimated time:** 30-45 minutes to write better docstrings

**Result:** Team members can use `/docs` to understand the API without asking you questions!

---

## Example: Complete File Change

Here's what `posts.py` would look like with all improvements:

```python
"""Posts API endpoints"""
from typing import List
from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.post import Post

router = APIRouter()


@router.get("/")
async def get_all_posts(
    db: Session = Depends(get_db),
    limit: int = Query(None, description="Maximum number of posts to return (optional)"),
    archived: bool = Query(False, description="Include archived posts")
):
    """
    Retrieve all posts from the database (Frontend → Backend)

    This endpoint fetches posts that have already been ingested from X/Twitter
    and stored in the PostgreSQL database. It does NOT fetch new posts from X.

    **Use this when:**
    - Displaying all available posts in the frontend
    - Reviewing the complete post history

    **Filters applied:**
    - Excludes archived posts by default (set archived=true to include)
    - Ordered by ingestion date (newest first)

    **Returns:**
    - Post text, author, timestamps
    - AI-generated title, summary, category
    - Worthiness score (0.0-1.0)
    - Selection status
    """
    from sqlalchemy import select

    query = select(Post)

    if not archived:
        query = query.where(Post.archived == False)

    query = query.order_by(Post.ingested_at.desc())

    if limit:
        query = query.limit(limit)

    posts = db.execute(query).scalars().all()

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
        "group_id": p.group_id,
        "archived": p.archived,
        "selected": p.selected
    } for p in posts]}

# ... (continue for other endpoints)
```

---

**Would you like me to create a full example file showing all the improved docstrings ready to copy-paste?**

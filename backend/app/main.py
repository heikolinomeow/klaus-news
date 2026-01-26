"""FastAPI application entry point"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import posts, articles
from app.database import engine, Base, initialize_default_settings
from app.models import Post, Article, ListMetadata, SystemSettings


def seed_prompts_if_empty():
    """Auto-seed prompts table on startup if empty (V-22)"""
    from sqlalchemy.orm import Session
    from sqlalchemy import select, func
    from app.models.prompt import Prompt

    db = Session(bind=engine)
    try:
        existing_count = db.execute(select(func.count(Prompt.id))).scalar()
        if existing_count == 0:
            defaults = [
                {"prompt_key": "categorize_post", "prompt_text": "Analyze this X/Twitter post and assign it to ONE category: Technology, Politics, Business, Science, Health, or Other. Return ONLY the category name.", "model": "gpt-4-turbo", "temperature": 0.3, "max_tokens": 50, "description": "Post categorization prompt"},
                {"prompt_key": "generate_title", "prompt_text": "Generate a concise, engaging title (max 80 chars) for this X/Twitter thread. Focus on the main insight or takeaway.", "model": "gpt-4-turbo", "temperature": 0.7, "max_tokens": 100, "description": "Article title generation"},
                {"prompt_key": "generate_article", "prompt_text": "Transform this X/Twitter thread into a professional blog article. Preserve key insights, add context where needed, maintain the author's voice.", "model": "gpt-4-turbo", "temperature": 0.7, "max_tokens": 1500, "description": "Full article generation"},
                {"prompt_key": "score_worthiness", "prompt_text": "Rate this post's worthiness for article generation (0.0-1.0). Consider: insight quality, topic relevance, completeness, engagement potential. Return ONLY a number between 0.0 and 1.0.", "model": "gpt-4-turbo", "temperature": 0.3, "max_tokens": 50, "description": "AI worthiness scoring (V-6)"},
                {"prompt_key": "detect_duplicate", "prompt_text": "Rate how similar these two news headlines are on a scale from 0.0 to 1.0, where 0.0 means completely different topics and 1.0 means they describe the exact same news story. Return ONLY a number.", "model": "gpt-4o-mini", "temperature": 0.0, "max_tokens": 10, "description": "AI duplicate detection (returns similarity score 0.0-1.0)"},
                {"prompt_key": "suggest_improvements", "prompt_text": "Suggest 3 specific improvements for this draft article. Focus on clarity, structure, and reader value.", "model": "gpt-4-turbo", "temperature": 0.7, "max_tokens": 500, "description": "Article improvement suggestions"}
            ]
            for prompt_data in defaults:
                db.add(Prompt(**prompt_data))
            db.commit()
            print("✓ Auto-seeded 6 default prompts (V-22)")
    finally:
        db.close()

app = FastAPI(
    title=settings.app_name,
    description="""
    Backend API for Klaus News - Internal company news aggregation and article generation tool.

    ## Data Flow

    **1. Ingestion (Background Process)**
    - X/Twitter posts → Scheduler fetches periodically → PostgreSQL database
    - AI categorizes and scores posts for newsworthiness

    **2. Review (Frontend ↔ Backend)**
    - Frontend requests posts → This API → Returns from database
    - User browses recommended high-quality posts

    **3. Generation (Backend → OpenAI)**
    - User selects post → This API → OpenAI generates article
    - AI transforms raw post into structured news article

    **4. Publishing (Backend → Teams)**
    - User approves article → This API → Microsoft Teams webhook
    - Team sees news in Teams channel

    ## Key Concepts

    - **Posts**: Raw X/Twitter content stored in database (already fetched, not live)
    - **Articles**: AI-generated news articles created from posts
    - **Worthiness Score**: AI-determined newsworthiness (0.0-1.0)
    - **Selected**: Posts marked for article generation
    - **Archived**: Old/irrelevant posts hidden from view
    - **Generation Count**: Number of times an article has been regenerated

    ## Authentication

    Currently no authentication required (internal tool, trusted network).
    """,
    version="1.0.0",
    openapi_tags=[
        {
            "name": "posts",
            "description": "Operations on X/Twitter posts - fetch from database, get recommendations, mark as selected. Does NOT fetch from X API, only returns already-ingested posts."
        },
        {
            "name": "articles",
            "description": "Article generation and publishing - create articles from posts using OpenAI, edit content, regenerate with improved prompts, publish to Teams."
        },
        {
            "name": "lists",
            "description": "X/Twitter list management - add, remove, enable/disable lists through UI."
        },
        {
            "name": "admin",
            "description": "Manual operations and system control - trigger jobs, pause/resume scheduler, view status."
        }
    ]
)

# Start background scheduler
from app.services.scheduler import start_scheduler

@app.on_event("startup")
async def startup_event():
    # Create database tables
    Base.metadata.create_all(bind=engine)
    # Initialize default settings (V-21)
    initialize_default_settings()
    # Auto-seed prompts (V-22)
    seed_prompts_if_empty()
    # Start scheduler
    start_scheduler()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Nginx production build
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(posts.router, prefix="/api/posts", tags=["posts"])
app.include_router(articles.router, prefix="/api/articles", tags=["articles"])

# V-8: Lists management router
from app.api import lists
app.include_router(lists.router, prefix="/api/lists", tags=["lists"])

# V-10, V-23: Settings management router
from app.api import settings as settings_api
app.include_router(settings_api.router, prefix="/api/settings", tags=["settings"])

# V-15, V-16, V-17: Admin operations router
from app.api import admin
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


# V-4: Prompts management router
from app.api import prompts
app.include_router(prompts.router, tags=["prompts"])

# V-5: Groups management router
from app.api import groups
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "app": settings.app_name}


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": f"Welcome to {settings.app_name} API"}

"""FastAPI application entry point"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import posts, articles
from app.database import engine, Base, initialize_default_settings
from app.models import Post, Article, ListMetadata, SystemSettings
from app.models.group_research import GroupResearch
from app.models.group_articles import GroupArticle


def seed_or_upgrade_prompts():
    """Auto-seed prompts table on startup if empty (V-22)"""
    from sqlalchemy.orm import Session
    from sqlalchemy import select, func
    from app.models.prompt import Prompt

    RESEARCH_PROMPT_TEXT = """Research this story to help write an article that answers: "How does this help me work better with AI?"

**Story:** {{TITLE}}
**Details:** {{SUMMARY}}

Use web search to find:
- What's actually new or different here
- Real-world examples of people/companies benefiting
- Step-by-step applications if any exist
- Honest assessment of limitations
- Links to try it yourself (tools, demos, papers)

Write for someone with 5 minutes who wants to know if this matters."""

    db = Session(bind=engine)
    try:
        existing_count = db.execute(select(func.count(Prompt.id))).scalar()
        if existing_count == 0:
            defaults = [
                {"prompt_key": "categorize_post", "prompt_text": "You are categorizing social media posts about AI. Read the post carefully and assign it to exactly ONE category based on the primary topic. Consider the main subject matter, not peripheral mentions.\n\nCategorize into one of the following categories:\n{{CATEGORIES}}\n\nReturn ONLY the category name, nothing else.", "model": "gpt-5-mini", "temperature": 0.3, "max_tokens": 50, "description": "Post categorization prompt (uses {{CATEGORIES}} placeholder)"},
                {"prompt_key": "score_worthiness", "prompt_text": "Rate this post's value for an e-commerce team improving their AI skills (0.0-1.0). High scores for: new AI models/tools, practical AI applications, actionable AI techniques, breaking AI news. Low scores for: opinion pieces, hype without substance, non-actionable content. Return ONLY a number.", "model": "gpt-5-mini", "temperature": 0.3, "max_tokens": 50, "description": "AI worthiness scoring for e-commerce AI upskilling"},
                {"prompt_key": "detect_duplicate", "prompt_text": "Rate how similar these two news headlines are on a scale from 0.0 to 1.0, where 0.0 means completely different topics and 1.0 means they describe the exact same news story. Return ONLY a number.", "model": "gpt-5-mini", "temperature": 0.0, "max_tokens": 10, "description": "AI duplicate detection (returns similarity score 0.0-1.0)"},
                {"prompt_key": "research_prompt", "prompt_text": RESEARCH_PROMPT_TEXT, "model": "gpt-5-search-api", "temperature": 0.7, "max_tokens": 4000, "description": "Research prompt for web search (uses {{TITLE}} and {{SUMMARY}} placeholders)"}
            ]
            for prompt_data in defaults:
                db.add(Prompt(**prompt_data))
            db.commit()
            print("✓ Auto-seeded 4 default prompts")
        else:
            # FIX-2: Check and upgrade stale categorize_post prompt
            categorize_prompt = db.execute(
                select(Prompt).where(Prompt.prompt_key == "categorize_post")
            ).scalar_one_or_none()
            if categorize_prompt and "{{CATEGORIES}}" not in categorize_prompt.prompt_text:
                categorize_prompt.prompt_text = "You are categorizing social media posts about AI. Read the post carefully and assign it to exactly ONE category based on the primary topic. Consider the main subject matter, not peripheral mentions.\n\nCategorize into one of the following categories:\n{{CATEGORIES}}\n\nReturn ONLY the category name, nothing else."
                categorize_prompt.model = "gpt-5-mini"
                categorize_prompt.description = "Post categorization prompt (uses {{CATEGORIES}} placeholder)"
                db.commit()
                print("✓ Upgraded categorize_post prompt to use {{CATEGORIES}} placeholder")

            # Ensure research_prompt exists (for existing installs)
            research_prompt = db.execute(
                select(Prompt).where(Prompt.prompt_key == "research_prompt")
            ).scalar_one_or_none()
            if not research_prompt:
                db.add(Prompt(
                    prompt_key="research_prompt",
                    prompt_text=RESEARCH_PROMPT_TEXT,
                    model="gpt-5-search-api",
                    temperature=0.7,
                    max_tokens=4000,
                    description="Research prompt for web search (uses {{TITLE}} and {{SUMMARY}} placeholders)"
                ))
                db.commit()
                print("✓ Added research_prompt to existing prompts")
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
from app.services.logging_config import setup_logging

@app.on_event("startup")
async def startup_event():
    # Create database tables
    Base.metadata.create_all(bind=engine)
    # Initialize default settings (V-21)
    initialize_default_settings()
    # Auto-seed prompts (V-22)
    seed_or_upgrade_prompts()
    # Setup logging
    setup_logging()
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

# Logs management router
from app.api import logs
app.include_router(logs.router, prefix="/api/logs", tags=["logs"])

# V-4: Prompts management router
from app.api import prompts
app.include_router(prompts.router, tags=["prompts"])

# V-5: Groups management router
from app.api import groups
app.include_router(groups.router, prefix="/api/groups", tags=["groups"])

# V-6, V-19: Research router (nested under groups)
from app.api import research
app.include_router(research.router, prefix="/api/groups", tags=["research"])

# V-11, V-12, V-19: Group articles router (nested under groups)
from app.api import group_articles
app.include_router(group_articles.router, prefix="/api/groups", tags=["group-articles"])

# Teams integration router (V-15)
from app.api import teams
app.include_router(teams.router, prefix="/api/teams", tags=["teams"])


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "app": settings.app_name}


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": f"Welcome to {settings.app_name} API"}

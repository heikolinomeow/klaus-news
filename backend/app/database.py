"""Database setup and session management"""
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for FastAPI to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """Run any pending database migrations"""
    db = SessionLocal()
    try:
        # Add preview column to group_articles if it doesn't exist
        try:
            db.execute(text("SELECT preview FROM group_articles LIMIT 1"))
        except Exception:
            db.execute(text("ALTER TABLE group_articles ADD COLUMN preview TEXT"))
            db.commit()

        # V-8: Add article-related columns to posts table if they don't exist
        try:
            db.execute(text("SELECT content_type FROM posts LIMIT 1"))
        except Exception:
            db.execute(text("ALTER TABLE posts ADD COLUMN content_type VARCHAR DEFAULT 'post' NOT NULL"))
            db.execute(text("ALTER TABLE posts ADD COLUMN source_post_id VARCHAR"))
            db.execute(text("ALTER TABLE posts ADD COLUMN quoted_post_id VARCHAR"))
            db.execute(text("ALTER TABLE posts ADD COLUMN article_id VARCHAR"))
            db.execute(text("ALTER TABLE posts ADD COLUMN article_title VARCHAR"))
            db.execute(text("ALTER TABLE posts ADD COLUMN article_subtitle VARCHAR"))
            db.execute(text("ALTER TABLE posts ADD COLUMN article_text TEXT"))
            db.execute(text("ALTER TABLE posts ADD COLUMN article_entities TEXT"))
            db.execute(text("ALTER TABLE posts ADD COLUMN ingestion_fallback_reason VARCHAR"))
            db.commit()

        # V-11: Add article_pipeline_enabled feature flag default
        try:
            result = db.execute(text("SELECT value FROM system_settings WHERE key = 'article_pipeline_enabled'"))
            if not result.fetchone():
                db.execute(text(
                    "INSERT INTO system_settings (key, value, description) "
                    "VALUES ('article_pipeline_enabled', 'false', 'Enable article detection and routing pipeline (V-11)')"
                ))
                db.commit()
        except Exception:
            # Setting already exists or system_settings table issue
            pass
    except Exception:
        db.rollback()
    finally:
        db.close()


def initialize_default_settings():
    """Initialize system_settings table with default values (V-21)"""
    from app.models.system_settings import SystemSettings
    from app.models.group_research import GroupResearch
    from app.models.group_articles import GroupArticle

    db = SessionLocal()
    try:
        # Get existing setting keys to avoid overwriting
        existing_keys = {s.key for s in db.query(SystemSettings.key).all()}

        # Insert default settings
        default_settings = [
            SystemSettings(
                key='ingest_interval_minutes',
                value='30',
                value_type='int',
                description='Minutes between post ingestion runs',
                category='scheduling',
                min_value=5.0,
                max_value=360.0
            ),
            SystemSettings(
                key='archive_age_days',
                value='7',
                value_type='int',
                description='Days before archiving unselected posts',
                category='scheduling',
                min_value=1.0,
                max_value=30.0
            ),
            SystemSettings(
                key='archive_time_hour',
                value='3',
                value_type='int',
                description='Hour of day (0-23) to run archival job',
                category='scheduling',
                min_value=0.0,
                max_value=23.0
            ),
            SystemSettings(
                key='posts_per_fetch',
                value='5',
                value_type='int',
                description='Number of posts to fetch per list',
                category='scheduling',
                min_value=1.0,
                max_value=100.0
            ),
            SystemSettings(
                key='auto_fetch_enabled',
                value='true',
                value_type='bool',
                description='Enable/disable automatic post fetching',
                category='scheduling',
                min_value=None,
                max_value=None
            ),
            SystemSettings(
                key='worthiness_threshold',
                value='0.6',
                value_type='float',
                description='Minimum score for recommended posts',
                category='filtering',
                min_value=0.3,
                max_value=0.9
            ),
            SystemSettings(
                key='min_worthiness_threshold',
                value='0.3',
                value_type='float',
                description='Posts below this score are discarded during ingestion',
                category='filtering',
                min_value=0.0,
                max_value=0.5
            ),
            SystemSettings(
                key='duplicate_threshold',
                value='0.85',
                value_type='float',
                description='Similarity threshold for duplicate detection',
                category='filtering',
                min_value=0.7,
                max_value=0.95
            ),
            SystemSettings(
                key='scheduler_paused',
                value='false',
                value_type='bool',
                description='Whether background scheduler is paused',
                category='system',
                min_value=None,
                max_value=None
            ),
            SystemSettings(
                key='pause_timestamp',
                value='',
                value_type='string',
                description='Timestamp when scheduler was paused',
                category='system',
                min_value=None,
                max_value=None
            )
            ,
            SystemSettings(
                key='categories',
                value='[{"id":"cat-1","name":"News","description":"Breaking announcements and high-impact industry news: major AI model releases, significant product launches, company acquisitions, large funding rounds, executive changes, partnership announcements. Time-sensitive stories with broad relevance.","order":1},{"id":"cat-2","name":"Automation","description":"Practical AI applications for business workflows: process automation, productivity tools, no-code/low-code AI platforms, AI assistants for non-technical users, RPA with AI, business process optimization. Focus on immediate practical value for general business users.","order":2},{"id":"cat-3","name":"Coding","description":"Developer-focused AI tools and technical content: code generation, AI coding assistants, IDE integrations, APIs, SDKs, developer experience, technical tutorials, programming language models, debugging tools. For software engineers and developers.","order":3},{"id":"cat-4","name":"Content","description":"AI tools for media creation: image generation, video synthesis, audio/voice generation, copywriting assistants, design tools, music generation, 3D modeling, marketing content creation. Focus on creative output and media production.","order":4},{"id":"cat-5","name":"Research","description":"Academic and scientific AI advances: new papers, arxiv publications, benchmark results, novel architectures, theoretical breakthroughs, dataset releases, model evaluations, scientific methodology. Technical depth for researchers and ML engineers.","order":5},{"id":"cat-6","name":"Policy","description":"AI governance, ethics, and regulation: legislation, compliance requirements, safety frameworks, bias and fairness discussions, copyright and IP issues, content moderation policies, international AI agreements, responsible AI guidelines.","order":6},{"id":"cat-7","name":"Agents","description":"Autonomous AI systems and agentic architectures: AI agents, tool use, function calling, multi-agent systems, orchestration frameworks, MCP, autonomous workflows, reasoning chains, agent benchmarks. Focus on AI systems that act independently.","order":7},{"id":"cat-8","name":"Opensource","description":"Open-source AI ecosystem: community models, Hugging Face releases, local/self-hosted AI, fine-tuning guides, model weights, open datasets, community projects, democratized AI tools. Non-commercial and community-driven developments.","order":8},{"id":"cat-9","name":"Infrastructure","description":"AI hardware and compute: GPUs, TPUs, custom AI chips, cloud provider offerings, inference optimization, edge deployment, data centers, pricing changes, performance benchmarks, MLOps platforms. The technical foundation layer.","order":9},{"id":"cat-10","name":"Enterprise","description":"Corporate AI adoption and strategy: case studies, ROI analysis, digital transformation, vendor evaluations, implementation stories, organizational change, AI maturity, industry-specific deployments. Business decision-maker perspective.","order":10}]',
                value_type='json',
                description='User-defined categories for post categorization',
                category='filtering',
                min_value=None,
                max_value=None
            ),
            SystemSettings(
                key='category_mismatches',
                value='[]',
                value_type='json',
                description='Log of category matching failures for monitoring',
                category='filtering',
                min_value=None,
                max_value=None
            )
            ,
            # Article style prompts (length-based, Teams-formatted)
            SystemSettings(
                key='article_prompt_very_short',
                value='Write a quick news alert for Teams. Format:\n\n**[Headline in bold]**\nOne sentence on what happened. One sentence on why it matters.\n\nKeep it under 50 words. No fluff.',
                value_type='string',
                description='Very Short (~50 words) - Quick alert format',
                category='articles',
                min_value=None,
                max_value=None
            ),
            SystemSettings(
                key='article_prompt_short',
                value='Write a short Teams update. Format:\n\n**[Headline]**\nOne intro sentence.\n\n• Key point 1\n• Key point 2\n• Key point 3\n\nOne closing sentence with takeaway.\n\nKeep it punchy. ~100 words max.',
                value_type='string',
                description='Short (~100 words) - Bullet points format',
                category='articles',
                min_value=None,
                max_value=None
            ),
            SystemSettings(
                key='article_prompt_medium',
                value='Write a Teams news post. Format:\n\n**[Headline]**\n\nBrief intro paragraph (2-3 sentences).\n\n**What\'s New:**\n• Point 1\n• Point 2\n• Point 3\n\n**Why It Matters:**\n1-2 sentences on impact.\n\n**Links:** Include source links if available.',
                value_type='string',
                description='Medium (~200 words) - Structured sections',
                category='articles',
                min_value=None,
                max_value=None
            ),
            SystemSettings(
                key='article_prompt_long',
                value='Write a detailed Teams article. Format:\n\n**[Headline]**\n\n**TL;DR:** One sentence summary.\n\n**The News:**\n2-3 paragraphs explaining what happened.\n\n**Key Details:**\n• Detail 1\n• Detail 2\n• Detail 3\n\n**What This Means:**\n1-2 paragraphs on implications.\n\n**Sources:** List sources with links.',
                value_type='string',
                description='Long (~400 words) - Full article with sections',
                category='articles',
                min_value=None,
                max_value=None
            ),
            SystemSettings(
                key='log_retention_days',
                value='7',
                value_type='int',
                description='Number of days to retain system logs',
                category='system',
                min_value=7.0,
                max_value=90.0
            )
        ]

        for setting in default_settings:
            if setting.key not in existing_keys:
                db.add(setting)

        db.commit()
    finally:
        db.close()

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


def initialize_default_settings():
    """Initialize system_settings table with default values (V-21)"""
    from app.models.system_settings import SystemSettings
    from app.models.group_research import GroupResearch
    from app.models.group_articles import GroupArticle

    db = SessionLocal()
    try:
        # Check if settings already exist
        existing = db.query(SystemSettings).first()
        if existing:
            return  # Already initialized

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
                key='worthiness_threshold',
                value='0.6',
                value_type='float',
                description='Minimum score for recommended posts',
                category='filtering',
                min_value=0.3,
                max_value=0.9
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
                value='[{"id":"cat-1","name":"Major News","description":"Breaking announcements and significant industry news: new AI model releases, major product launches, company acquisitions, funding rounds, policy changes. High-impact news that everyone should know about.","order":1},{"id":"cat-2","name":"Automation","description":"Practical tips on using AI to improve everyday work: workflow automation, productivity hacks, business process improvements, no-code tools, AI assistants. For general business users.","order":2},{"id":"cat-3","name":"Coding","description":"Developer-focused content: AI coding assistants, code generation, IDE integrations, APIs, technical implementations. For engineers and developers.","order":3},{"id":"cat-4","name":"Content Creation","description":"AI tools for creating media: image generation, video, copywriting, voice synthesis, design tools, marketing materials.","order":4}]',
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
            # V-9, V-10: Article style prompts
            SystemSettings(
                key='article_prompt_news_brief',
                value='Write a short, factual news brief (2-3 paragraphs) based on the provided sources. Focus on the key facts, use objective language, and keep it concise for quick consumption.',
                value_type='string',
                description='Prompt template for News Brief style articles',
                category='articles',
                min_value=None,
                max_value=None
            ),
            SystemSettings(
                key='article_prompt_full_article',
                value='Write a comprehensive news article with multiple sections based on the provided sources. Include background context, detailed analysis, expert perspectives, and implications. Use clear headings and maintain journalistic objectivity.',
                value_type='string',
                description='Prompt template for Full Article style',
                category='articles',
                min_value=None,
                max_value=None
            ),
            SystemSettings(
                key='article_prompt_executive_summary',
                value='Write a business-focused executive summary based on the provided sources. Lead with key takeaways, include business impact, and end with actionable insights. Keep it suitable for leadership briefings.',
                value_type='string',
                description='Prompt template for Executive Summary style',
                category='articles',
                min_value=None,
                max_value=None
            ),
            SystemSettings(
                key='article_prompt_analysis',
                value='Write an analytical opinion piece based on the provided sources. Explore the implications, provide commentary on what this means for the industry, and offer a balanced perspective on different viewpoints. Suitable for thought leadership.',
                value_type='string',
                description='Prompt template for Analysis style',
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
            db.add(setting)

        db.commit()
    finally:
        db.close()

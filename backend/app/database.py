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
                key='enabled_categories',
                value='["Technology","Politics","Business","Science","Health","Other"]',
                value_type='json',
                description='Visible categories in UI',
                category='filtering',
                min_value=None,
                max_value=None
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
        ]

        for setting in default_settings:
            db.add(setting)

        db.commit()
    finally:
        db.close()

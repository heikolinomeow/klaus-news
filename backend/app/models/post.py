"""Post model (X/Twitter posts from curated lists)"""
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, func

from app.database import Base


class Post(Base):
    """Post from X API (curated lists)"""
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)

    # X API fields
    post_id = Column(String, unique=True, nullable=False, index=True)
    original_text = Column(Text, nullable=False)
    author = Column(String)
    created_at = Column(DateTime, nullable=False)

    # AI-generated fields
    ai_title = Column(String)
    ai_summary = Column(Text)

    # Categorization
    category = Column(String)  # Technology, Politics, Business, Science, Health, Other

    # Evaluation scores
    categorization_score = Column(Float)
    worthiness_score = Column(Float)

    # Topic grouping (group posts about same topic via AI title comparison)
    group_id = Column(Integer, index=True)  # FK to Groups.id

    # State
    archived = Column(Boolean, default=False, index=True)
    selected = Column(Boolean, default=False)  # User clicked/selected

    # Timestamps
    ingested_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

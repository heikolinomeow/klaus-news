"""Post model (X/Twitter posts from curated lists)"""
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, func

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

    # Article support (V-8)
    content_type = Column(String, default='post', nullable=False)  # post | article | quote_article
    source_post_id = Column(String, nullable=True)  # X post ID for traceability
    quoted_post_id = Column(String, nullable=True)  # X quoted post ID if QUOTE_ARTICLE
    article_id = Column(String, nullable=True)  # X article ID if present
    article_title = Column(String, nullable=True)
    article_subtitle = Column(String, nullable=True)
    article_text = Column(Text, nullable=True)
    article_entities = Column(Text, nullable=True)  # JSON-serialized entities
    ingestion_fallback_reason = Column(String, nullable=True)  # Why article content unavailable

    # Timestamps
    ingested_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    @property
    def is_article(self) -> bool:
        """Derived boolean: true when content_type is article or quote_article (V-8)"""
        return self.content_type in ('article', 'quote_article')

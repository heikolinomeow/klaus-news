"""Article model (AI-generated articles from selected posts)"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.database import Base


class Article(Base):
    """AI-generated article from a selected post"""
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)

    # Link to source post
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)

    # Article content
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)  # Rich text / Markdown

    # Generation metadata
    research_summary = Column(Text)  # Summary of research conducted (future)
    generation_count = Column(Integer, default=1)  # How many times regenerated

    # Teams integration
    posted_to_teams = Column(DateTime)  # When posted to Teams (null if not posted)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

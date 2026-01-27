"""Group model (news story grouping entity)"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, func, Index

from app.database import Base


class Group(Base):
    """Group representing a news story (collection of related posts)"""
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)

    # Representative content
    representative_title = Column(String, nullable=False)  # Canonical title for the story
    category = Column(String, nullable=False)  # Same taxonomy as posts

    # Metadata
    first_seen = Column(DateTime, nullable=False)  # When first post was ingested
    post_count = Column(Integer, default=1, nullable=False)  # Number of posts in group

    # Representative content (NEW - V-2)
    representative_summary = Column(Text, nullable=True)  # AI-generated summary for richer matching

    # User state (NEW - V-2)
    archived = Column(Boolean, default=False, nullable=False, index=True)  # User archived this group
    selected = Column(Boolean, default=False, nullable=False)  # User selected for article

    # State machine (NEW → COOKING → REVIEW → PUBLISHED)
    state = Column(String, default='NEW', nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

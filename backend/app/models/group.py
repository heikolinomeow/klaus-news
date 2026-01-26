"""Group model (news story grouping entity)"""
from sqlalchemy import Column, Integer, String, DateTime, func

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

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

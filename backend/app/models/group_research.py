"""GroupResearch model for storing AI research results (V-18)"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func

from app.database import Base


class GroupResearch(Base):
    """Research data for a group (V-18)"""
    __tablename__ = "group_research"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)

    # Research metadata
    research_mode = Column(String, nullable=False)  # 'quick', 'agentic', 'deep'
    model_used = Column(String, nullable=False)

    # Research content
    original_output = Column(Text, nullable=False)  # AI-generated research
    edited_output = Column(Text, nullable=True)     # User-edited version
    sources = Column(Text, nullable=True)           # JSON array of source URLs

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

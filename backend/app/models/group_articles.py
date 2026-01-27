"""GroupArticle model for storing generated articles (V-18)"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func

from app.database import Base


class GroupArticle(Base):
    """Generated article for a group (V-18)"""
    __tablename__ = "group_articles"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    research_id = Column(Integer, ForeignKey("group_research.id"), nullable=True)  # NULL if generated without research

    # Article metadata
    style = Column(String, nullable=False)  # 'news_brief', 'full_article', 'executive_summary', 'analysis', 'custom'
    prompt_used = Column(Text, nullable=False)  # The actual prompt used

    # Article content
    content = Column(Text, nullable=False)  # Plain text article

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

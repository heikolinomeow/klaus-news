"""Prompt model for storing AI prompts"""
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, func
from app.database import Base


class Prompt(Base):
    """AI prompts stored in database for runtime editing"""
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True)
    prompt_key = Column(String(100), unique=True, nullable=False, index=True)
    prompt_text = Column(Text, nullable=False)
    model = Column(String(50), default='gpt-5.1')
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=500)
    version = Column(Integer, default=1)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

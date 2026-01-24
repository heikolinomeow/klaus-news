"""SystemSettings model for storing configuration values"""
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, func

from app.database import Base


class SystemSettings(Base):
    """System configuration settings stored in database"""
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    value_type = Column(String, nullable=False)  # 'int', 'float', 'string', 'bool', 'json'
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)  # 'scheduling', 'filtering', 'system'
    min_value = Column(Float, nullable=True)  # For numeric validation
    max_value = Column(Float, nullable=True)  # For numeric validation
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    updated_by = Column(String, nullable=True)  # Future: track who changed settings

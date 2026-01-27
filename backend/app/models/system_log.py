"""SystemLog model for storing application logs"""
from sqlalchemy import Column, Integer, String, Text, DateTime, func, Index

from app.database import Base


class SystemLog(Base):
    """System logs for tracking application operations and errors"""
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Log metadata
    timestamp = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    level = Column(String, nullable=False, index=True)  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    logger_name = Column(String, nullable=False, index=True)  # e.g., 'klaus_news.x_client'

    # Log content
    message = Column(Text, nullable=False)

    # Context (optional structured data stored as JSON)
    context = Column(Text, nullable=True)  # JSON string with additional context

    # Error tracking
    exception_type = Column(String, nullable=True)
    exception_message = Column(Text, nullable=True)
    stack_trace = Column(Text, nullable=True)

    # Request correlation (for tracing API calls)
    correlation_id = Column(String, nullable=True, index=True)

    # Categorization for filtering
    category = Column(String, nullable=True, index=True)  # 'api', 'scheduler', 'database', 'external_api'


# Composite indexes for common queries
Index('idx_timestamp_level', SystemLog.timestamp, SystemLog.level)
Index('idx_category_timestamp', SystemLog.category, SystemLog.timestamp)

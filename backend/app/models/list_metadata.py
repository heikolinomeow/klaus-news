"""ListMetadata model for tracking last fetched tweet per list"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, func

from app.database import Base


class ListMetadata(Base):
    """Metadata for each X list to track last fetched tweet"""
    __tablename__ = "list_metadata"

    id = Column(Integer, primary_key=True, index=True)

    # X list ID
    list_id = Column(String, unique=True, nullable=False, index=True)

    # Last tweet ID fetched from this list (for since_id parameter)
    last_tweet_id = Column(String, nullable=True)

    # V-8: List management columns
    enabled = Column(Boolean, nullable=False, default=True)
    list_name = Column(String, nullable=True)  # User-friendly name
    description = Column(Text, nullable=True)  # Optional notes

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

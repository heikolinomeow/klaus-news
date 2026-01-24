"""Settings service with caching (V-26)"""
from typing import Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.system_settings import SystemSettings
from app.database import SessionLocal


class SettingsService:
    """Load settings from DB with caching (V-26)"""

    _cache: dict[str, tuple[Any, datetime]] = {}
    _cache_expiry_seconds = 60  # Cache expiry: 60 seconds

    def __init__(self, db: Optional[Session] = None):
        self.db = db or SessionLocal()
        self._should_close_db = db is None

    def get(self, key: str, default: Any = None) -> Any:
        """Get setting value with caching

        Args:
            key: Setting key
            default: Default value if not found

        Returns:
            Setting value (type-casted based on value_type)
        """
        # Check cache
        if key in self._cache:
            value, cached_at = self._cache[key]
            if datetime.now() - cached_at < timedelta(seconds=self._cache_expiry_seconds):
                return value

        # Query database
        setting = self.db.execute(
            select(SystemSettings).where(SystemSettings.key == key)
        ).scalar_one_or_none()

        if not setting:
            return default

        # Type-cast value
        value = self._cast_value(setting.value, setting.value_type)

        # Update cache
        self._cache[key] = (value, datetime.now())

        return value

    def _cast_value(self, value: str, value_type: str) -> Any:
        """Cast string value to appropriate type"""
        if value_type == 'int':
            return int(value)
        elif value_type == 'float':
            return float(value)
        elif value_type == 'bool':
            return value.lower() in ('true', '1', 'yes')
        elif value_type == 'json':
            import json
            return json.loads(value)
        else:
            return value

    def invalidate_cache(self, key: Optional[str] = None):
        """Clear cache for specific key or all keys

        Args:
            key: Setting key to invalidate, or None to clear all
        """
        if key:
            self._cache.pop(key, None)
        else:
            self._cache.clear()

    def __del__(self):
        """Close database session if we created it"""
        if self._should_close_db and hasattr(self, 'db'):
            self.db.close()


# Global instance for convenience
settings_service = SettingsService()

"""Custom logging handler that writes to system_logs database table"""
import logging
import json
import traceback
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings


class DatabaseLogHandler(logging.Handler):
    """Custom logging handler that writes logs to system_logs table"""

    def __init__(self, category=None):
        super().__init__()
        self.category = category
        # Use separate engine for logging to avoid interference with main app
        self.engine = create_engine(settings.database_url, pool_pre_ping=True)
        self.SessionLocal = sessionmaker(bind=self.engine)

    def emit(self, record):
        """Write log record to database"""
        try:
            from app.models.system_log import SystemLog

            db = self.SessionLocal()
            try:
                # Extract exception info if present
                exception_type = None
                exception_message = None
                stack_trace = None

                if record.exc_info:
                    exc_type, exc_value, exc_tb = record.exc_info
                    exception_type = exc_type.__name__ if exc_type else None
                    exception_message = str(exc_value) if exc_value else None
                    stack_trace = ''.join(traceback.format_exception(exc_type, exc_value, exc_tb))

                # Build context from extra fields
                context = {}
                for key, value in record.__dict__.items():
                    if key not in ['name', 'msg', 'args', 'created', 'filename', 'funcName',
                                   'levelname', 'levelno', 'lineno', 'module', 'msecs',
                                   'message', 'pathname', 'process', 'processName',
                                   'relativeCreated', 'thread', 'threadName', 'exc_info',
                                   'exc_text', 'stack_info']:
                        try:
                            json.dumps(value)  # Test serializability
                            context[key] = value
                        except (TypeError, ValueError):
                            context[key] = str(value)

                log_entry = SystemLog(
                    timestamp=datetime.utcnow(),
                    level=record.levelname,
                    logger_name=record.name,
                    message=record.getMessage(),
                    context=json.dumps(context) if context else None,
                    exception_type=exception_type,
                    exception_message=exception_message,
                    stack_trace=stack_trace,
                    correlation_id=context.get('correlation_id'),
                    category=self.category or context.get('category')
                )

                db.add(log_entry)
                db.commit()
            finally:
                db.close()
        except Exception:
            # Silently fail - logging should never break the application
            self.handleError(record)

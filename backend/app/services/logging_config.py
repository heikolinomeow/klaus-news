"""Logging configuration for Klaus News application"""
import logging

from app.services.logging_handler import DatabaseLogHandler


def setup_logging():
    """Configure application logging with database handler"""

    # Root logger configuration
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),  # Keep console output
        ]
    )

    # Add database handler to specific loggers
    loggers_config = [
        ('klaus_news.x_client', 'external_api'),
        ('klaus_news.openai_client', 'external_api'),
        ('klaus_news.teams_client', 'external_api'),
        ('klaus_news.scheduler', 'scheduler'),
        ('klaus_news.api', 'api'),
        ('klaus_news.database', 'database'),
    ]

    for logger_name, category in loggers_config:
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.INFO)

        # Check if DatabaseLogHandler already exists to prevent duplicates
        has_db_handler = any(isinstance(h, DatabaseLogHandler) for h in logger.handlers)
        if not has_db_handler:
            db_handler = DatabaseLogHandler(category=category)
            db_handler.setLevel(logging.INFO)
            logger.addHandler(db_handler)

    return logging.getLogger('klaus_news')

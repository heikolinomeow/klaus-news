"""Application configuration (loads from environment variables)"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # API Keys
    x_api_key: str = "placeholder_x_api_key"
    x_api_secret: str = "placeholder_x_api_secret"
    # Note: X list IDs are stored in database (list_metadata table), not in config
    openai_api_key: str = "placeholder_openai_api_key"
    teams_webhook_url: str = "placeholder_teams_webhook_url"

    # Database
    database_url: str = "postgresql://postgres:postgres@postgres:5432/klaus_news"

    # App Config
    app_name: str = "Klaus News"
    debug: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

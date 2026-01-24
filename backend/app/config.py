"""Application configuration (loads from environment variables)"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # API Keys
    x_api_key: str = "placeholder_x_api_key"
    x_api_secret: str = "placeholder_x_api_secret"
    x_list_ids: str = "placeholder_list_id_1,placeholder_list_id_2,placeholder_list_id_3"
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

    def get_x_list_ids(self) -> list[str]:
        """Parse X_LIST_IDS from comma-separated string to list"""
        return [lid.strip() for lid in self.x_list_ids.split(",") if lid.strip()]


settings = Settings()

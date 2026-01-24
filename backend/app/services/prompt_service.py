"""Service for accessing AI prompts from database"""
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.prompt import Prompt


class PromptService:
    """Database-backed prompt access"""

    def __init__(self, db: Session):
        self.db = db

    def get_prompt(self, prompt_key: str) -> dict:
        """Get prompt by key, returns dict with prompt_text, model, temperature, max_tokens"""
        prompt = self.db.execute(
            select(Prompt).where(Prompt.prompt_key == prompt_key)
        ).scalar_one_or_none()

        if not prompt:
            raise ValueError(f"Prompt not found: {prompt_key}")

        return {
            "prompt_text": prompt.prompt_text,
            "model": prompt.model,
            "temperature": prompt.temperature,
            "max_tokens": prompt.max_tokens
        }

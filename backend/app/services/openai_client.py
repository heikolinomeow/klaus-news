"""OpenAI API client for AI generation (titles, summaries, categorization)"""
from typing import Dict, Any

from app.config import settings


class OpenAIClient:
    """Client for OpenAI API with database-backed prompt support (V-4)

    NOTE: The db parameter is optional. When db=None, _get_prompt() falls back
    to hardcoded prompts, ensuring backward compatibility with existing singleton usage.
    The scheduler imports the module-level singleton (line 104) which has db=None.
    """

    def __init__(self, db=None):
        self.api_key = settings.openai_api_key
        self.model = "gpt-4-turbo"  # Default model
        self.db = db
        # Import here to avoid circular dependencies
        if db:
            from app.services.prompt_service import PromptService
            self.prompt_service = PromptService(db)
        else:
            self.prompt_service = None

    def _get_prompt(self, prompt_key: str) -> dict:
        """Get prompt from database or fallback to hardcoded

        This method ensures safe operation even when db=None:
        - If prompt_service exists: try database lookup, fallback on error
        - If prompt_service is None: use hardcoded fallback prompts
        - If prompt_key not found: return safe defaults
        """
        if self.prompt_service:
            try:
                return self.prompt_service.get_prompt(prompt_key)
            except (ValueError, Exception):
                pass  # Fallback to hardcoded

        # Hardcoded fallback prompts (used when db=None or prompt not found)
        fallback_prompts = {
            "categorize_post": {
                "prompt_text": "Analyze this X/Twitter post and assign it to ONE category: Technology, Politics, Business, Science, Health, or Other. Return ONLY the category name.",
                "model": "gpt-4-turbo",
                "temperature": 0.3,
                "max_tokens": 50
            },
            "generate_title": {
                "prompt_text": "Generate a concise, engaging title (max 80 chars) for this X/Twitter thread.",
                "model": "gpt-4-turbo",
                "temperature": 0.7,
                "max_tokens": 100
            },
            "generate_article": {
                "prompt_text": "Transform this X/Twitter thread into a professional blog article.",
                "model": "gpt-4-turbo",
                "temperature": 0.7,
                "max_tokens": 1500
            },
            "score_worthiness": {
                "prompt_text": "Rate this post's worthiness for article generation (0.0-1.0). Return ONLY a number.",
                "model": "gpt-4-turbo",
                "temperature": 0.3,
                "max_tokens": 50
            },
            "detect_duplicate": {
                "prompt_text": "Compare these two posts. Are they about the same topic? Return ONLY: YES or NO.",
                "model": "gpt-3.5-turbo",
                "temperature": 0.0,
                "max_tokens": 10
            }
        }
        return fallback_prompts.get(prompt_key, {
            "prompt_text": "",
            "model": "gpt-4-turbo",
            "temperature": 0.7,
            "max_tokens": 500
        })

    async def generate_title_and_summary(self, post_text: str) -> Dict[str, str]:
        """Generate AI title and summary for a post

        Args:
            post_text: Original post text

        Returns:
            Dict with keys: title, summary
        """
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.api_key)

        title_prompt = f"Generate a concise, informative title (maximum 100 characters) for this post: {post_text}. Return only the title, nothing else."
        summary_prompt = f"Summarize this post in 2-3 sentences: {post_text}. Return only the summary, nothing else."

        title_response = await client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": title_prompt}],
            temperature=0.5,
            max_tokens=30
        )

        summary_response = await client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": summary_prompt}],
            temperature=0.5,
            max_tokens=100
        )

        title = title_response.choices[0].message.content.strip()[:100]
        summary = summary_response.choices[0].message.content.strip()

        return {"title": title, "summary": summary}

    async def categorize_post(self, post_text: str) -> dict:
        """Categorize post using AI

        Args:
            post_text: Post text to categorize

        Returns:
            Dict with keys: category (str), confidence (float)
        """
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.api_key)

        prompt = f"Classify this post into exactly one category: Technology, Politics, Business, Science, Health, or Other. Post text: {post_text}. Return only the category name, nothing else."

        response = await client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=20
        )

        category = response.choices[0].message.content.strip()
        confidence = 1.0 if hasattr(response.choices[0], 'logprobs') else 0.8

        return {"category": category, "confidence": confidence}

    async def generate_article(self, post_text: str, research_summary: str = "") -> str:
        """Generate full article from post and research

        Args:
            post_text: Source post text
            research_summary: Additional research context (optional)

        Returns:
            Generated article content (markdown)
        """
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.api_key)

        prompt = f"Write a comprehensive news article based on this post: {post_text}. Requirements: Informative headline, 3-5 paragraphs, Objective tone, Include context and background. Format as markdown."

        response = await client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1000
        )

        article = response.choices[0].message.content.strip()
        return article


    async def score_worthiness(self, post_text: str) -> float:
        """Score post worthiness using AI (V-6)

        Uses database prompts when available (via _get_prompt), falls back
        to hardcoded prompts when db=None or prompt not found.

        STCC-8 Safety: Works with or without V-4's _get_prompt method via hasattr check.
        """
        from openai import AsyncOpenAI

        # Get prompt config with fallback to hardcoded (safe without V-4)
        if hasattr(self, '_get_prompt'):
            prompt_config = self._get_prompt("score_worthiness")
        else:
            # Fallback prompt config when _get_prompt doesn't exist yet
            prompt_config = {
                "prompt_text": "Rate this post's worthiness for article generation (0.0-1.0). Consider: insight quality, topic relevance, completeness, engagement potential. Return ONLY a number between 0.0 and 1.0.",
                "model": "gpt-4-turbo",
                "temperature": 0.3,
                "max_tokens": 50
            }

        client = AsyncOpenAI(api_key=self.api_key)

        response = await client.chat.completions.create(
            model=prompt_config["model"],
            messages=[
                {"role": "system", "content": prompt_config["prompt_text"]},
                {"role": "user", "content": post_text}
            ],
            temperature=prompt_config["temperature"],
            max_tokens=prompt_config["max_tokens"]
        )

        score_text = response.choices[0].message.content.strip()
        try:
            score = float(score_text)
            return max(0.0, min(1.0, score))  # Clamp to [0.0, 1.0]
        except ValueError:
            return 0.5  # Default if parsing fails


    async def detect_duplicate(self, new_post_text: str, existing_post_text: str) -> bool:
        """Detect if two posts are duplicates using AI (V-7)

        Uses database prompts when available (via _get_prompt), falls back
        to hardcoded prompts when db=None or prompt not found.

        STCC-8 Safety: Works with or without V-4's _get_prompt method via hasattr check.
        """
        from openai import AsyncOpenAI

        # Get prompt config with fallback to hardcoded (safe without V-4)
        if hasattr(self, '_get_prompt'):
            prompt_config = self._get_prompt("detect_duplicate")
        else:
            # Fallback prompt config when _get_prompt doesn't exist yet
            prompt_config = {
                "prompt_text": "Compare these two posts. Are they about the same topic/story? Return ONLY: YES or NO.",
                "model": "gpt-3.5-turbo",
                "temperature": 0.0,
                "max_tokens": 10
            }

        client = AsyncOpenAI(api_key=self.api_key)

        combined_text = f"Post 1: {new_post_text}\n\nPost 2: {existing_post_text}"

        response = await client.chat.completions.create(
            model=prompt_config["model"],
            messages=[
                {"role": "system", "content": prompt_config["prompt_text"]},
                {"role": "user", "content": combined_text}
            ],
            temperature=prompt_config["temperature"],
            max_tokens=prompt_config["max_tokens"]
        )

        answer = response.choices[0].message.content.strip().upper()
        return answer == "YES"


openai_client = OpenAIClient()

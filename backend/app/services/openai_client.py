"""OpenAI API client for AI generation (titles, summaries, categorization)"""
from typing import Dict, Any
import logging

from app.config import settings

logger = logging.getLogger('klaus_news.openai_client')


class OpenAIClient:
    """Client for OpenAI API with database-backed prompt support (V-4)

    NOTE: The db parameter is optional. When db=None, _get_prompt() falls back
    to hardcoded prompts, ensuring backward compatibility with existing singleton usage.
    The scheduler imports the module-level singleton (line 104) which has db=None.
    """

    def __init__(self, db=None):
        self.api_key = settings.openai_api_key
        self.model = "gpt-4o"  # Default model
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
        # NOTE: gpt-5-mini is a reasoning model that only supports temperature=1 (default)
        fallback_prompts = {
            "categorize_post": {
                "prompt_text": "You are categorizing social media posts about AI. Read the post carefully and assign it to exactly ONE category based on the primary topic. Consider the main subject matter, not peripheral mentions.\n\nCategorize into one of the following categories:\n{{CATEGORIES}}\n\nReturn ONLY the category name, nothing else.",
                "model": "gpt-5-mini",  # Cost-effective reasoning model for classification
                "max_completion_tokens": 1000  # Reasoning models need extra tokens for internal thinking
                # No temperature - gpt-5-mini only supports default (1)
            },
            "score_worthiness": {
                "prompt_text": "Rate this post's value for an e-commerce team improving their AI skills (0.0-1.0). High scores for: new AI models/tools, practical AI applications, actionable AI techniques, breaking AI news. Low scores for: opinion pieces, hype without substance, non-actionable content. Return ONLY a number.",
                "model": "gpt-5-mini",  # Cost-effective reasoning model for scoring
                "max_completion_tokens": 1000  # Reasoning models need extra tokens for internal thinking
                # No temperature - gpt-5-mini only supports default (1)
            },
            "detect_duplicate": {
                "prompt_text": "Rate how similar these two news headlines are on a scale from 0.0 to 1.0, where 0.0 means completely different topics and 1.0 means they describe the exact same news story. Return ONLY a number.",
                "model": "gpt-5-mini",  # Cost-effective reasoning model for similarity check
                "max_completion_tokens": 5000  # Reasoning models need extra tokens for internal thinking
                # No temperature - gpt-5-mini only supports default (1)
            }
        }
        return fallback_prompts.get(prompt_key, {
            "prompt_text": "",
            "model": "gpt-5.1",
            "temperature": 0.7,
            "max_completion_tokens": 500
        })

    async def generate_title_and_summary(self, post_text: str) -> Dict[str, str]:
        """Generate AI title and summary for a post

        Args:
            post_text: Original post text

        Returns:
            Dict with keys: title, summary
        """
        from openai import AsyncOpenAI, APIError

        client = AsyncOpenAI(api_key=self.api_key)

        title_prompt = f"Generate a concise, informative title (maximum 100 characters) for this post: {post_text}. Return only the title, nothing else. Do not wrap the title in quotation marks."
        summary_prompt = f"Summarize this post in 2-3 sentences: {post_text}. Return only the summary, nothing else."

        logger.info("Generating title and summary", extra={
            'operation': 'generate_title_and_summary',
            'model': self.model,
            'post_text_length': len(post_text)
        })

        try:
            title_response = await client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": title_prompt}],
                temperature=0.5,
                max_completion_tokens=30
            )

            summary_response = await client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": summary_prompt}],
                temperature=0.5,
                max_completion_tokens=100
            )

            title = title_response.choices[0].message.content.strip().strip('"').strip("'")[:100]
            summary = summary_response.choices[0].message.content.strip()

            logger.info("Title and summary generated successfully", extra={
                'operation': 'generate_title_and_summary',
                'title_length': len(title),
                'summary_length': len(summary)
            })

            return {"title": title, "summary": summary}

        except APIError as e:
            logger.error("OpenAI API error in generate_title_and_summary", extra={
                'operation': 'generate_title_and_summary',
                'model': self.model,
                'status_code': e.status_code,
                'error_message': str(e.message) if hasattr(e, 'message') else str(e),
                'error_body': str(e.body) if hasattr(e, 'body') else None
            })
            raise
        except Exception as e:
            logger.error("Unexpected error in generate_title_and_summary", extra={
                'operation': 'generate_title_and_summary',
                'model': self.model,
                'error_type': type(e).__name__,
                'error_message': str(e)
            }, exc_info=True)
            raise

    async def categorize_post(self, post_text: str, db=None) -> dict:
        """Categorize post using AI with modular category system.

        Reference: V-2, V-11, V-13 — Modular prompt + matching

        Args:
            post_text: Post text to categorize
            db: Optional database session for settings lookup

        Returns:
            Dict with keys: category (str), confidence (float)
        """
        from openai import AsyncOpenAI, APIError

        client = AsyncOpenAI(api_key=self.api_key)

        # V-13: Build prompt with assembled categories (with safety fallback)
        if hasattr(self, 'build_categorization_prompt'):
            prompt = self.build_categorization_prompt(db)
            full_prompt = f"{prompt}\n\nPost text: {post_text}"
        else:
            # Fallback if V-2 not applied yet
            full_prompt = f"Classify this post into exactly one category: Technology, Politics, Business, Science, Health, or Other. Post text: {post_text}. Return only the category name, nothing else."

        # Get prompt config
        prompt_config = self._get_prompt("categorize_post")
        model = prompt_config.get("model", "gpt-4o-mini")

        logger.info("Categorizing post", extra={
            'operation': 'categorize_post',
            'model': model,
            'post_text_length': len(post_text)
        })

        try:
            # Build kwargs - only include temperature if specified (reasoning models don't support it)
            create_kwargs = {
                "model": model,
                "messages": [{"role": "user", "content": full_prompt}],
                "max_completion_tokens": prompt_config.get("max_completion_tokens", prompt_config.get("max_tokens", 50))
            }
            if "temperature" in prompt_config:
                create_kwargs["temperature"] = prompt_config["temperature"]

            response = await client.chat.completions.create(**create_kwargs)

            ai_response = response.choices[0].message.content.strip()
            confidence = 1.0 if hasattr(response.choices[0], 'logprobs') else 0.8

            logger.info("Post categorized successfully", extra={
                'operation': 'categorize_post',
                'model': model,
                'ai_response': ai_response,
                'confidence': confidence
            })

            # V-11: Match category with fallback logic (with safety fallback)
            if hasattr(self, 'get_valid_category_names') and hasattr(self, 'match_category'):
                valid_categories = self.get_valid_category_names(db)
                matched_category, was_exact = self.match_category(ai_response, valid_categories, post_text, db)
                return {"category": matched_category, "confidence": confidence if was_exact else 0.5}
            else:
                # Fallback if V-2/V-11 not applied yet
                return {"category": ai_response, "confidence": confidence}

        except APIError as e:
            logger.error("OpenAI API error in categorize_post", extra={
                'operation': 'categorize_post',
                'model': model,
                'status_code': e.status_code,
                'error_message': str(e.message) if hasattr(e, 'message') else str(e),
                'error_body': str(e.body) if hasattr(e, 'body') else None
            })
            raise
        except Exception as e:
            logger.error("Unexpected error in categorize_post", extra={
                'operation': 'categorize_post',
                'model': model,
                'error_type': type(e).__name__,
                'error_message': str(e)
            }, exc_info=True)
            raise

    async def generate_article(self, post_text: str, research_summary: str = "") -> str:
        """Generate full article from post and research

        Args:
            post_text: Source post text
            research_summary: Additional research context (optional)

        Returns:
            Generated article content (markdown)
        """
        from openai import AsyncOpenAI, APIError

        client = AsyncOpenAI(api_key=self.api_key)

        prompt = f"Write a comprehensive news article based on this post: {post_text}. Requirements: Informative headline, 3-5 paragraphs, Objective tone, Include context and background. Format as markdown."

        logger.info("Generating article", extra={
            'operation': 'generate_article',
            'model': self.model,
            'post_text_length': len(post_text),
            'has_research': bool(research_summary)
        })

        try:
            response = await client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_completion_tokens=1000
            )

            article = response.choices[0].message.content.strip()

            logger.info("Article generated successfully", extra={
                'operation': 'generate_article',
                'article_length': len(article)
            })

            return article

        except APIError as e:
            logger.error("OpenAI API error in generate_article", extra={
                'operation': 'generate_article',
                'model': self.model,
                'status_code': e.status_code,
                'error_message': str(e.message) if hasattr(e, 'message') else str(e),
                'error_body': str(e.body) if hasattr(e, 'body') else None
            })
            raise
        except Exception as e:
            logger.error("Unexpected error in generate_article", extra={
                'operation': 'generate_article',
                'model': self.model,
                'error_type': type(e).__name__,
                'error_message': str(e)
            }, exc_info=True)
            raise


    async def score_worthiness(self, post_text: str, db=None) -> float:
        """Score post worthiness using AI (V-6)

        Uses database prompts when available (via _get_prompt), falls back
        to hardcoded prompts when db=None or prompt not found.

        STCC-8 Safety: Works with or without V-4's _get_prompt method via hasattr check.
        """
        from openai import AsyncOpenAI, APIError

        # Get prompt config - try database first, then fallback to hardcoded
        prompt_config = None

        # Try to get from database if db is provided and no existing prompt_service
        if db is not None and self.prompt_service is None:
            try:
                from app.services.prompt_service import PromptService
                temp_prompt_service = PromptService(db)
                prompt_config = temp_prompt_service.get_prompt("score_worthiness")
            except Exception:
                pass  # Fall through to other methods

        # Try existing prompt_service if no config yet
        if prompt_config is None and self.prompt_service is not None:
            try:
                prompt_config = self.prompt_service.get_prompt("score_worthiness")
            except Exception:
                pass

        # Fall back to hardcoded if still no config
        if prompt_config is None:
            prompt_config = {
                "prompt_text": "Rate this post's value for an e-commerce team improving their AI skills (0.0-1.0). High scores for: new AI models/tools, practical AI applications, actionable AI techniques, breaking AI news. Low scores for: opinion pieces, hype without substance, non-actionable content. CRITICAL: Give 0.0 for error messages, broken content, inaccessible URLs, or anything that says 'Sorry, I can't access' or similar - these are system errors, not content. Return ONLY a number.",
                "model": "gpt-5-mini",
                "max_completion_tokens": 1000
            }

        # CRITICAL: Override fixed constraints regardless of database values
        # score_worthiness MUST use: gpt-5-mini, no temperature, max_completion_tokens=1000
        prompt_config["model"] = "gpt-5-mini"
        prompt_config["max_completion_tokens"] = 1000
        if "temperature" in prompt_config:
            del prompt_config["temperature"]

        model = prompt_config["model"]
        client = AsyncOpenAI(api_key=self.api_key)

        logger.info("Scoring post worthiness", extra={
            'operation': 'score_worthiness',
            'model': model,
            'post_text_length': len(post_text)
        })

        try:
            # Build kwargs - only include temperature if specified (reasoning models don't support it)
            create_kwargs = {
                "model": model,
                "messages": [
                    {"role": "system", "content": prompt_config["prompt_text"]},
                    {"role": "user", "content": post_text}
                ],
                "max_completion_tokens": prompt_config.get("max_completion_tokens", prompt_config.get("max_tokens", 50))
            }
            if "temperature" in prompt_config:
                create_kwargs["temperature"] = prompt_config["temperature"]

            response = await client.chat.completions.create(**create_kwargs)

            score_text = response.choices[0].message.content.strip()
            try:
                score = float(score_text)
                score = max(0.0, min(1.0, score))  # Clamp to [0.0, 1.0]
            except ValueError:
                score = 0.5  # Default if parsing fails
                logger.warning("Failed to parse worthiness score, using default", extra={
                    'operation': 'score_worthiness',
                    'raw_response': score_text
                })

            logger.info("Worthiness score calculated", extra={
                'operation': 'score_worthiness',
                'score': score
            })

            return score

        except APIError as e:
            logger.error("OpenAI API error in score_worthiness", extra={
                'operation': 'score_worthiness',
                'model': model,
                'status_code': e.status_code,
                'error_message': str(e.message) if hasattr(e, 'message') else str(e),
                'error_body': str(e.body) if hasattr(e, 'body') else None
            })
            raise
        except Exception as e:
            logger.error("Unexpected error in score_worthiness", extra={
                'operation': 'score_worthiness',
                'model': model,
                'error_type': type(e).__name__,
                'error_message': str(e)
            }, exc_info=True)
            raise


    async def detect_duplicate(self, new_post_text: str, existing_post_text: str) -> float:
        """Detect similarity between two posts using AI

        Uses database prompts when available (via _get_prompt), falls back
        to hardcoded prompts when db=None or prompt not found.

        Returns:
            Similarity score between 0.0 (completely different) and 1.0 (same story)
        """
        from openai import AsyncOpenAI, APIError

        # Get prompt config with fallback to hardcoded
        if hasattr(self, '_get_prompt'):
            prompt_config = self._get_prompt("detect_duplicate")
        else:
            prompt_config = {
                "prompt_text": "Rate how similar these two news headlines are on a scale from 0.0 to 1.0, where 0.0 means completely different topics and 1.0 means they describe the exact same news story. Return ONLY a number.",
                "model": "gpt-4o-mini",  # Cost-effective for similarity check
                "temperature": 0.0,
                "max_completion_tokens": 10
            }

        model = prompt_config["model"]
        client = AsyncOpenAI(api_key=self.api_key)

        combined_text = f"Post 1: {new_post_text}\n\nPost 2: {existing_post_text}"

        logger.debug("Detecting duplicate posts", extra={
            'operation': 'detect_duplicate',
            'model': model,
            'new_post_length': len(new_post_text),
            'existing_post_length': len(existing_post_text)
        })

        try:
            # Build kwargs - only include temperature if specified (reasoning models don't support it)
            create_kwargs = {
                "model": model,
                "messages": [
                    {"role": "system", "content": prompt_config["prompt_text"]},
                    {"role": "user", "content": combined_text}
                ],
                "max_completion_tokens": prompt_config.get("max_completion_tokens", prompt_config.get("max_tokens", 10))
            }
            if "temperature" in prompt_config:
                create_kwargs["temperature"] = prompt_config["temperature"]

            response = await client.chat.completions.create(**create_kwargs)

            score_text = response.choices[0].message.content.strip()
            try:
                score = float(score_text)
                return max(0.0, min(1.0, score))  # Clamp to [0.0, 1.0]
            except ValueError:
                logger.warning("Failed to parse duplicate score", extra={
                    'operation': 'detect_duplicate',
                    'raw_response': score_text
                })
                return 0.0  # Default to no match if parsing fails

        except APIError as e:
            logger.error("OpenAI API error in detect_duplicate", extra={
                'operation': 'detect_duplicate',
                'model': model,
                'status_code': e.status_code,
                'error_message': str(e.message) if hasattr(e, 'message') else str(e),
                'error_body': str(e.body) if hasattr(e, 'body') else None
            })
            raise
        except Exception as e:
            logger.error("Unexpected error in detect_duplicate", extra={
                'operation': 'detect_duplicate',
                'model': model,
                'error_type': type(e).__name__,
                'error_message': str(e)
            }, exc_info=True)
            raise

    async def compare_titles_semantic(self, new_title: str, existing_title: str) -> float:
        """Compare two AI-generated titles semantically for duplicate detection

        Args:
            new_title: AI-generated title of new post
            existing_title: AI-generated title of existing post

        Returns:
            Similarity score between 0.0 (completely different) and 1.0 (same story)
        """
        from openai import AsyncOpenAI, APIError

        # Get prompt config with fallback to hardcoded
        if hasattr(self, '_get_prompt'):
            prompt_config = self._get_prompt("detect_duplicate")
        else:
            prompt_config = {
                "prompt_text": "Rate how similar these two news headlines are on a scale from 0.0 to 1.0, where 0.0 means completely different topics and 1.0 means they describe the exact same news story. Return ONLY a number.",
                "model": "gpt-4o-mini",  # Cost-effective for similarity check
                "temperature": 0.0,
                "max_completion_tokens": 10
            }

        model = prompt_config["model"]
        client = AsyncOpenAI(api_key=self.api_key)

        combined_text = f"Title 1: {new_title}\n\nTitle 2: {existing_title}"

        logger.debug("Comparing titles semantically", extra={
            'operation': 'compare_titles_semantic',
            'model': model,
            'new_title': new_title[:50],
            'existing_title': existing_title[:50]
        })

        try:
            # Build kwargs - only include temperature if specified (reasoning models don't support it)
            create_kwargs = {
                "model": model,
                "messages": [
                    {"role": "system", "content": prompt_config["prompt_text"]},
                    {"role": "user", "content": combined_text}
                ],
                "max_completion_tokens": prompt_config.get("max_completion_tokens", prompt_config.get("max_tokens", 10))
            }
            if "temperature" in prompt_config:
                create_kwargs["temperature"] = prompt_config["temperature"]

            response = await client.chat.completions.create(**create_kwargs)

            score_text = response.choices[0].message.content.strip()
            try:
                score = float(score_text)
                return max(0.0, min(1.0, score))  # Clamp to [0.0, 1.0]
            except ValueError:
                logger.warning("Failed to parse similarity score", extra={
                    'operation': 'compare_titles_semantic',
                    'raw_response': score_text
                })
                return 0.0  # Default to no match if parsing fails

        except APIError as e:
            logger.error("OpenAI API error in compare_titles_semantic", extra={
                'operation': 'compare_titles_semantic',
                'model': model,
                'status_code': e.status_code,
                'error_message': str(e.message) if hasattr(e, 'message') else str(e),
                'error_body': str(e.body) if hasattr(e, 'body') else None
            })
            raise
        except Exception as e:
            logger.error("Unexpected error in compare_titles_semantic", extra={
                'operation': 'compare_titles_semantic',
                'model': model,
                'error_type': type(e).__name__,
                'error_message': str(e)
            }, exc_info=True)
            raise


    def build_categorization_prompt(self, db=None) -> str:
        """Build the full categorization prompt by combining:
        1. Prompt skeleton (from prompts table)
        2. User-defined categories (from settings)
        3. Hardcoded "Other" category

        Reference: V-2, V-13 — Prompt Assembly
        """
        from app.services.settings_service import SettingsService

        # Get prompt skeleton
        skeleton_config = self._get_prompt("categorize_post")
        skeleton = skeleton_config.get("prompt_text", "")

        # Get user categories from settings
        settings_service = SettingsService(db) if db else SettingsService()
        categories = settings_service.get("categories") or []

        # Sort by order field and format as bullet list
        sorted_categories = sorted(categories, key=lambda x: x.get("order", 0))
        lines = [f"- {cat['name']}: {cat['description']}" for cat in sorted_categories]

        # Add hardcoded "Other" (always last)
        lines.append("- Other: Posts that don't clearly fit the above categories")

        formatted = "\n".join(lines)

        # Replace placeholder with formatted category list
        return skeleton.replace("{{CATEGORIES}}", formatted)

    def get_valid_category_names(self, db=None) -> list:
        """Get list of valid category names for matching.

        Reference: V-13 — get list of valid category names
        """
        from app.services.settings_service import SettingsService

        settings_service = SettingsService(db) if db else SettingsService()
        categories = settings_service.get("categories") or []
        names = [cat["name"] for cat in categories]
        names.append("Other")  # Always include Other
        return names


    def match_category(self, ai_response: str, valid_categories: list, post_text: str = "", db=None) -> tuple:
        """Match AI response to a valid category.

        Reference: V-11 — Category Matching Algorithm

        Returns:
            tuple: (matched_category, was_exact_match)
            - was_exact_match=True means exact or partial match found
            - was_exact_match=False means fell back to "Other" (log this)
        """
        response = ai_response.strip()

        # 1. Exact match (case-insensitive)
        for cat in valid_categories:
            if response.lower() == cat.lower():
                return (cat, True)

        # 2. Partial match - AI returned substring or category contains response
        #    e.g., AI returns "Content" but category is "Content Creation"
        #    e.g., AI returns "Major News Update" but category is "Major News"
        for cat in valid_categories:
            if response.lower() in cat.lower() or cat.lower() in response.lower():
                return (cat, True)

        # 3. No match found - fallback to "Other" and log mismatch
        #    Safety: Only call log_category_mismatch if method exists (V-12 dependency)
        if post_text and hasattr(self, 'log_category_mismatch'):
            self.log_category_mismatch(ai_response, valid_categories, post_text, db)

        return ("Other", False)


    def log_category_mismatch(self, ai_response: str, valid_categories: list, post_text: str, db=None):
        """Log a category mismatch for monitoring.

        Reference: V-12 — Logging Mismatches

        Uses direct database operations (not SettingsService.update which doesn't exist).
        Session management: Always rollback on error to maintain session integrity.
        """
        from datetime import datetime
        from sqlalchemy import select, update
        from app.models.system_settings import SystemSettings
        from app.database import SessionLocal
        import json

        # Get or create database session
        session = db if db else SessionLocal()
        should_close = db is None

        try:
            # Query current mismatches
            setting = session.execute(
                select(SystemSettings).where(SystemSettings.key == 'category_mismatches')
            ).scalar_one_or_none()

            if not setting:
                # Setting doesn't exist yet, skip logging
                return

            mismatches = json.loads(setting.value) if setting.value else []

            # Add new mismatch
            mismatches.append({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "ai_response": ai_response,
                "valid_categories": valid_categories,
                "post_snippet": post_text[:100] + "..." if len(post_text) > 100 else post_text,
                "assigned_category": "Other"
            })

            # Cap at 100 entries (remove oldest)
            if len(mismatches) > 100:
                mismatches = mismatches[-100:]

            # Update in database
            session.execute(
                update(SystemSettings)
                .where(SystemSettings.key == 'category_mismatches')
                .values(value=json.dumps(mismatches))
            )
            session.commit()
        except Exception:
            # Silently fail - logging should not break categorization
            # Always rollback to maintain session integrity (even for passed-in sessions)
            session.rollback()
        finally:
            if should_close:
                session.close()


openai_client = OpenAIClient()


class ResearchClient:
    """Client for AI research operations with multiple depth modes"""

    def __init__(self):
        self.api_key = settings.openai_api_key

    async def quick_research(self, prompt: str) -> dict:
        """Quick research mode - single OpenAI call, fast response

        Args:
            prompt: Research prompt with topic and source posts

        Returns:
            dict with keys:
                - output (str): Research findings in markdown
                - sources (list): List of dicts with url and title keys
                - model_used (str): Model name used
        """
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.api_key)

        # NOTE: gpt-5-search-api is currently returning 500 errors (OpenAI issue as of Jan 2026)
        # Using gpt-5.1 with web_search tool as workaround
        # See GOTCHAS.md "OpenAI Search Models" section for details
        response = await client.responses.create(
            model="gpt-5.1",
            tools=[{"type": "web_search"}],
            input=prompt
        )

        return self._parse_research_response(response, "gpt-5.1")

    async def agentic_research(self, prompt: str) -> dict:
        """Agentic research mode - multi-step reasoning, moderate depth

        Args:
            prompt: Research prompt with topic and source posts

        Returns:
            dict with keys:
                - output (str): Research findings in markdown
                - sources (list): List of dicts with url and title keys
                - model_used (str): Model name used
        """
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.api_key)

        # NOTE: gpt-5-search-api does NOT support reasoning parameter
        # For agentic search with reasoning, use gpt-5.1 + web_search tool
        # See GOTCHAS.md "OpenAI Search Models" section for details
        response = await client.responses.create(
            model="gpt-5.1",
            tools=[{"type": "web_search"}],
            reasoning={"effort": "high"},
            input=prompt
        )

        return self._parse_research_response(response, "gpt-5.1")

    async def deep_research(self, prompt: str) -> dict:
        """Deep research mode - comprehensive research, multiple perspectives

        Args:
            prompt: Research prompt with topic and source posts

        Returns:
            dict with keys:
                - output (str): Research findings in markdown
                - sources (list): List of dicts with url and title keys
                - model_used (str): Model name used
        """
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=self.api_key)

        # NOTE: o4-mini-deep-research has web search BUILT-IN - do NOT pass tools=[{"type": "web_search"}]
        # See GOTCHAS.md "OpenAI Search Models" section for details
        response = await client.responses.create(
            model="o4-mini-deep-research",
            input=prompt
        )

        return self._parse_research_response(response, "o4-mini-deep-research")

    def _parse_research_response(self, response, model_used: str) -> dict:
        """Parse OpenAI response into research result format

        Args:
            response: OpenAI responses.create API response object
            model_used: Model name used for the request

        Returns:
            dict with keys:
                - output (str): Research findings text
                - sources (list): List of source dicts
                - model_used (str): Model name
        """
        output = response.output_text

        # Extract sources from response.citations
        sources = []
        if hasattr(response, 'citations') and response.citations:
            for citation in response.citations:
                sources.append({
                    "url": citation.url,
                    "title": citation.title if hasattr(citation, 'title') else citation.url
                })

        return {
            "output": output,
            "sources": sources,
            "model_used": model_used
        }


research_client = ResearchClient()

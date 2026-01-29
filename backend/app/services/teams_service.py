"""Teams integration service for multi-channel webhook support (V-14)"""
import json
import logging
import httpx
from typing import Optional
from app.config import settings

logger = logging.getLogger('klaus_news.teams_service')


def get_channels() -> list[dict]:
    """
    Get configured Teams channels from environment.
    Returns list of {name: str} (no webhook URLs exposed).
    """
    try:
        channels_json = settings.teams_channels
        if not channels_json or channels_json == "[]":
            return []

        channels = json.loads(channels_json)
        # Return only names, never expose webhookUrl
        return [{"name": ch.get("name", "")} for ch in channels if ch.get("name")]
    except json.JSONDecodeError:
        logger.error("Failed to parse TEAMS_CHANNELS JSON")
        return []


def _get_channel_webhook(channel_name: str) -> Optional[str]:
    """Internal: Get webhook URL for channel name (never expose to frontend)"""
    try:
        channels_json = settings.teams_channels
        if not channels_json or channels_json == "[]":
            return None

        channels = json.loads(channels_json)
        for ch in channels:
            if ch.get("name") == channel_name:
                return ch.get("webhookUrl")
        return None
    except json.JSONDecodeError:
        return None


def build_payload(title: str, summary: str, full_text: str | None = None):
    full_text = full_text or summary  # fallback

    return {
        "type": "message",
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "contentUrl": None,
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.3",
                    "msteams": {"width": "Full"},
                    "body": [
                        # Header band (small JSON, big visual improvement)
                        {
                            "type": "Container",
                            "style": "emphasis",
                            "bleed": True,
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "text": "🤖  Klaus News",
                                    "weight": "Bolder",
                                    "size": "Medium",
                                    "spacing": "None"
                                }
                            ]
                        },

                        # Title
                        {
                            "type": "TextBlock",
                            "text": title,
                            "weight": "Bolder",
                            "size": "Large",
                            "wrap": True,
                            "spacing": "Medium"
                        },

                        # Short preview (prevents ugly truncation)
                        {
                            "type": "TextBlock",
                            "text": summary,
                            "wrap": True,
                            "maxLines": 3,
                            "spacing": "Small"
                        },

                        # Hidden details block (expand)
                        {
                            "type": "Container",
                            "id": "details",
                            "isVisible": False,
                            "spacing": "Medium",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "text": full_text,
                                    "wrap": True
                                }
                            ]
                        }
                    ],
                    "actions": [
                        {
                            "type": "Action.ToggleVisibility",
                            "title": "Show details",
                            "targetElements": ["details"]
                        }
                    ]
                }
            }
        ]
    }


async def send_to_teams(article_id: str, channel_name: str, db) -> dict:
    """
    Send article to specified Teams channel.
    Returns {success: bool, message: str} or {success: bool, error: str}
    """
    from sqlalchemy import select
    from app.models.post import Post
    from app.models.group import Group
    from app.models.group_articles import GroupArticle

    # Validate channel exists
    webhook_url = _get_channel_webhook(channel_name)
    if not webhook_url:
        return {"success": False, "error": "Channel not found"}

    # Helper to construct X (Twitter) URL from post data
    def _build_post_url(post: Post) -> str:
        """Construct X URL from author and post_id. Post model has no URL field."""
        if post.author and post.post_id:
            return f"https://x.com/{post.author}/status/{post.post_id}"
        return ""

    # Try to find article - first as GroupArticle (Cooking page), then fallback to Group/Post
    try:
        # First try as GroupArticle ID (from Cooking page)
        group_article = db.execute(
            select(GroupArticle).where(GroupArticle.id == int(article_id))
        ).scalar_one_or_none()

        if group_article:
            # Get related Group for title
            group = db.execute(
                select(Group).where(Group.id == group_article.group_id)
            ).scalar_one_or_none()

            # Truncate content for summary (max 500 chars)
            content = group_article.content or ""
            summary = content[:500] + "..." if len(content) > 500 else content

            article_data = {
                "title": group.representative_title if group else "Untitled",
                "summary": summary,
                "full_text": content,  # Pass full content for expandable view
                "category": group.category if group else None,
                "source": "Klaus News",
                "url": ""
            }
        else:
            # Fallback: try as group ID
            group = db.execute(
                select(Group).where(Group.id == int(article_id))
            ).scalar_one_or_none()

            if group:
                # Get representative post for the group
                post = db.execute(
                    select(Post).where(Post.group_id == group.id).order_by(Post.created_at.desc())
                ).scalars().first()

                if not post:
                    return {"success": False, "error": "Article not found"}

                article_data = {
                    "title": group.representative_title or post.ai_title,
                    "summary": post.ai_summary or post.original_text,
                    "category": group.category or post.category,
                    "source": post.author,
                    "url": _build_post_url(post)
                }
            else:
                # Fallback: try as post ID
                post = db.execute(
                    select(Post).where(Post.id == int(article_id))
                ).scalar_one_or_none()

                if not post:
                    return {"success": False, "error": "Article not found"}

                article_data = {
                    "title": post.ai_title,
                    "summary": post.ai_summary or post.original_text,
                    "category": post.category,
                    "source": post.author,
                    "url": _build_post_url(post)
                }
    except (ValueError, TypeError):
        return {"success": False, "error": "Article not found"}

    # Build and send card
    card_payload = build_payload(
        title=article_data["title"],
        summary=article_data["summary"],
        full_text=article_data.get("full_text")
    )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=card_payload, timeout=30.0)

            # Accept both 200 (OK) and 202 (Accepted) as success
            # Power Automate workflows return 202 when message is queued for delivery
            if response.status_code in (200, 202):
                logger.info(f"Article sent to Teams channel #{channel_name}")
                return {"success": True, "message": f"Article sent to #{channel_name}"}
            else:
                logger.error(f"Teams webhook failed: {response.status_code} - {response.text[:200]}")
                return {"success": False, "error": "Failed to send to Teams"}
    except Exception as e:
        logger.error(f"Teams send error: {str(e)}", exc_info=True)
        return {"success": False, "error": "Failed to send to Teams"}

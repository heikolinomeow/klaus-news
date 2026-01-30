"""Teams integration service for multi-channel webhook support (V-14)"""
import json
import logging
import httpx
import re
from html import unescape
from typing import Optional
from app.config import settings

logger = logging.getLogger('klaus_news.teams_service')


def html_to_plain_text(html: str) -> str:
    """Convert HTML content to plain text suitable for Teams Adaptive Cards.

    Preserves semantic structure:
    - <strong>/<b> → **bold**
    - <em>/<i> → _italic_
    - <p> → double newline
    - <br> → single newline
    - <li> → bullet point
    - <h1-h6> → **Header**
    """
    if not html or '<' not in html:
        return html  # No HTML tags, return as-is

    text = html

    # Convert headers to bold markdown
    text = re.sub(r'<h[1-6][^>]*>(.*?)</h[1-6]>', r'**\1**\n', text, flags=re.IGNORECASE | re.DOTALL)

    # Convert bold tags to markdown
    text = re.sub(r'<(strong|b)[^>]*>(.*?)</\1>', r'**\2**', text, flags=re.IGNORECASE | re.DOTALL)

    # Convert italic tags to markdown
    text = re.sub(r'<(em|i)[^>]*>(.*?)</\1>', r'_\2_', text, flags=re.IGNORECASE | re.DOTALL)

    # Convert list items to bullet points
    text = re.sub(r'<li[^>]*>(.*?)</li>', r'• \1\n', text, flags=re.IGNORECASE | re.DOTALL)

    # Convert paragraph and div to double newline
    text = re.sub(r'</p>\s*', '\n\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<p[^>]*>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</div>\s*', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<div[^>]*>', '', text, flags=re.IGNORECASE)

    # Convert br to single newline
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)

    # Remove remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)

    # Decode HTML entities
    text = unescape(text)

    # Clean up excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' +', ' ', text)

    return text.strip()


def parse_article_content(content: str) -> list[dict]:
    """Parse article content into structured blocks for Adaptive Card rendering.

    Detects:
    - Headers: **Text** or **Text:** patterns
    - Bullets: lines starting with •, -, or *
    - Regular paragraphs

    Returns list of blocks: {type: 'header'|'paragraph'|'bullets', content: str|list}
    """
    blocks = []
    lines = content.split('\n')
    current_bullets = []

    def flush_bullets():
        nonlocal current_bullets
        if current_bullets:
            blocks.append({'type': 'bullets', 'content': current_bullets})
            current_bullets = []

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Skip empty lines
        if not line:
            flush_bullets()
            i += 1
            continue

        # Check for header pattern: **Header** or **Header:**
        header_match = re.match(r'^\*\*(.+?)\*\*:?\s*$', line)
        if header_match:
            flush_bullets()
            blocks.append({'type': 'header', 'content': header_match.group(1).strip()})
            i += 1
            continue

        # Check for inline header at start of paragraph: **Header:** rest of text
        inline_header_match = re.match(r'^\*\*(.+?):\*\*\s*(.+)$', line)
        if inline_header_match:
            flush_bullets()
            blocks.append({'type': 'header', 'content': inline_header_match.group(1).strip()})
            # Add the rest as a paragraph
            rest = inline_header_match.group(2).strip()
            if rest:
                blocks.append({'type': 'paragraph', 'content': rest})
            i += 1
            continue

        # Check for bullet point
        bullet_match = re.match(r'^[•\-\*]\s*(.+)$', line)
        if bullet_match:
            current_bullets.append(bullet_match.group(1).strip())
            i += 1
            continue

        # Regular paragraph - collect consecutive non-empty, non-bullet lines
        flush_bullets()
        para_lines = [line]
        i += 1
        while i < len(lines):
            next_line = lines[i].strip()
            # Stop if empty, bullet, or header
            if not next_line or re.match(r'^[•\-\*]\s', next_line) or re.match(r'^\*\*.+\*\*', next_line):
                break
            para_lines.append(next_line)
            i += 1

        blocks.append({'type': 'paragraph', 'content': ' '.join(para_lines)})

    flush_bullets()
    return blocks


def build_adaptive_card_body(blocks: list[dict]) -> list[dict]:
    """Convert parsed blocks into Adaptive Card body elements."""
    body = []

    for i, block in enumerate(blocks):
        spacing = "Medium" if i > 0 else "None"

        if block['type'] == 'header':
            body.append({
                "type": "TextBlock",
                "text": block['content'],
                "weight": "Bolder",
                "size": "Medium",
                "wrap": True,
                "spacing": spacing
            })

        elif block['type'] == 'paragraph':
            body.append({
                "type": "TextBlock",
                "text": block['content'],
                "wrap": True,
                "spacing": "Small" if i > 0 else "None"
            })

        elif block['type'] == 'bullets':
            # Create a container for bullet items
            bullet_items = []
            for j, item in enumerate(block['content']):
                bullet_items.append({
                    "type": "ColumnSet",
                    "spacing": "Small" if j > 0 else "None",
                    "columns": [
                        {
                            "type": "Column",
                            "width": "auto",
                            "items": [{
                                "type": "TextBlock",
                                "text": "•",
                                "spacing": "None"
                            }]
                        },
                        {
                            "type": "Column",
                            "width": "stretch",
                            "items": [{
                                "type": "TextBlock",
                                "text": item,
                                "wrap": True,
                                "spacing": "None"
                            }]
                        }
                    ]
                })

            body.append({
                "type": "Container",
                "spacing": spacing,
                "items": bullet_items
            })

    return body


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

    # Convert HTML to plain text before parsing (content may contain HTML from editor)
    plain_text = html_to_plain_text(full_text)
    summary = html_to_plain_text(summary)

    # Parse the full article content into structured blocks
    parsed_blocks = parse_article_content(plain_text)
    article_body = build_adaptive_card_body(parsed_blocks)

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
                        # Header band with visual hierarchy
                        {
                            "type": "Container",
                            "style": "accent",
                            "bleed": True,
                            "items": [
                                {
                                    "type": "ColumnSet",
                                    "columns": [
                                        {
                                            "type": "Column",
                                            "width": "auto",
                                            "items": [
                                                {
                                                    "type": "TextBlock",
                                                    "text": "📰",
                                                    "size": "Large",
                                                    "spacing": "None"
                                                }
                                            ]
                                        },
                                        {
                                            "type": "Column",
                                            "width": "stretch",
                                            "items": [
                                                {
                                                    "type": "TextBlock",
                                                    "text": "Klaus News",
                                                    "weight": "Bolder",
                                                    "size": "Medium",
                                                    "color": "Light",
                                                    "spacing": "None"
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },

                        # Title with more prominence
                        {
                            "type": "TextBlock",
                            "text": title,
                            "weight": "Bolder",
                            "size": "ExtraLarge",
                            "wrap": True,
                            "spacing": "Medium"
                        },

                        # Preview with subtle background
                        {
                            "type": "Container",
                            "style": "emphasis",
                            "spacing": "Medium",
                            "items": [
                                {
                                    "type": "TextBlock",
                                    "text": summary,
                                    "wrap": True,
                                    "maxLines": 3,
                                    "isSubtle": True,
                                    "spacing": "Small"
                                }
                            ]
                        },

                        # Separator line
                        {
                            "type": "Container",
                            "separator": True,
                            "spacing": "Small",
                            "items": []
                        },

                        # Hidden details block (expandable) - now with parsed content
                        {
                            "type": "Container",
                            "id": "details",
                            "isVisible": False,
                            "spacing": "Medium",
                            "items": article_body
                        }
                    ],
                    "actions": [
                        {
                            "type": "Action.ToggleVisibility",
                            "title": "📖 Read Full Article",
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
            # Get related Group for fallback title
            group = db.execute(
                select(Group).where(Group.id == group_article.group_id)
            ).scalar_one_or_none()

            content = group_article.content or ""
            # Use preview if set, otherwise fall back to truncated content
            if group_article.preview:
                summary = group_article.preview
            else:
                summary = content[:500] + "..." if len(content) > 500 else content

            article_data = {
                "title": group_article.title or (group.representative_title if group else "Untitled"),
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
                # Update GroupArticle posted_to_teams timestamp if applicable
                if group_article:
                    from datetime import datetime
                    group_article.posted_to_teams = datetime.now()

                    # Transition group to PUBLISHED so it disappears from Serving
                    # (group and posts remain in DB for duplicate detection)
                    if group:
                        group.state = 'PUBLISHED'

                    db.commit()

                logger.info(f"Article sent to Teams channel #{channel_name}")
                return {"success": True, "message": f"Article sent to #{channel_name}"}
            else:
                logger.error(f"Teams webhook failed: {response.status_code} - {response.text[:200]}")
                return {"success": False, "error": "Failed to send to Teams"}
    except Exception as e:
        logger.error(f"Teams send error: {str(e)}", exc_info=True)
        return {"success": False, "error": "Failed to send to Teams"}

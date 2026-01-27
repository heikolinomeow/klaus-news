"""Microsoft Teams webhook client for posting articles"""
import logging
import httpx
from app.config import settings

logger = logging.getLogger('klaus_news.teams_client')


class TeamsClient:
    """Client for Microsoft Teams webhook integration"""

    def __init__(self):
        self.webhook_url = settings.teams_webhook_url

    async def post_article(self, title: str, content: str) -> bool:
        """Post article to Teams channel via webhook

        Args:
            title: Article title
            content: Article content (markdown)

        Returns:
            True if posted successfully, False otherwise
        """
        logger.info("Posting article to Teams channel", extra={'title': title})

        # Adaptive card wrapper for markdown
        payload = {
            "type": "message",
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "content": {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.2",
                        "body": [
                            {
                                "type": "TextBlock",
                                "text": title,
                                "weight": "bolder",
                                "size": "large"
                            },
                            {
                                "type": "TextBlock",
                                "text": content,
                                "wrap": True
                            }
                        ]
                    }
                }
            ]
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.webhook_url, json=payload)

                if response.status_code == 200:
                    logger.info("Article posted to Teams successfully", extra={'title': title})
                    return True
                else:
                    logger.error("Teams webhook request failed", extra={
                        'title': title,
                        'status_code': response.status_code,
                        'response_body': response.text[:500]
                    })
                    return False
        except Exception as e:
            logger.error("Failed to post article to Teams", exc_info=True, extra={'title': title})
            return False


teams_client = TeamsClient()

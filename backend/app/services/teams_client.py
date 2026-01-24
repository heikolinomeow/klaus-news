"""Microsoft Teams webhook client for posting articles"""
import httpx
from app.config import settings


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

        async with httpx.AsyncClient() as client:
            response = await client.post(self.webhook_url, json=payload)
            return response.status_code == 200


teams_client = TeamsClient()

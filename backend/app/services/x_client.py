"""X (Twitter) API client for fetching posts from curated lists"""
from typing import List, Dict, Any

from app.config import settings


class XClient:
    """Client for X (Twitter) API"""

    def __init__(self):
        self.api_key = settings.x_api_key
        self.api_secret = settings.x_api_secret
        # TODO: Initialize X API client (e.g., tweepy, httpx)

    async def fetch_posts_from_list(self, list_id: str, max_results: int = 100, since_id: str = None) -> List[Dict[str, Any]]:
        """Fetch recent posts from a specific X list

        Args:
            list_id: X list ID
            since_id: Optional tweet ID - only return tweets posted after this ID (prevents refetching)

        Returns:
            List of post dictionaries with fields: id, text, author, created_at
        """
        import httpx
        from datetime import datetime

        url = f"https://api.twitter.com/2/lists/{list_id}/tweets"
        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }
        params = {
            "max_results": 5,
            "tweet.fields": "created_at,author_id",
            "expansions": "author_id",
            "user.fields": "username"
        }

        # Add since_id to prevent refetching (X API native deduplication)
        if since_id:
            params["since_id"] = since_id

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params)

            if response.status_code != 200:
                return []

            data = response.json()
            posts = []

            # Build user lookup
            users = {u["id"]: u["username"] for u in data.get("includes", {}).get("users", [])}

            for tweet in data.get("data", []):
                posts.append({
                    "id": tweet["id"],
                    "text": tweet["text"],
                    "author": users.get(tweet["author_id"], "unknown"),
                    "created_at": datetime.fromisoformat(tweet["created_at"].replace("Z", "+00:00"))
                })

            return posts

    async def get_configured_lists(self) -> List[str]:
        """Get list of configured X list IDs

        Returns:
            List of X list IDs to fetch posts from
        """
        from app.config import settings
        return settings.get_x_list_ids()

    async def test_list_connectivity(self, list_id: str) -> dict:
        """Test if X list is accessible via API (V-8)

        Args:
            list_id: X list ID to test

        Returns:
            dict with 'valid' boolean and 'message' string
        """
        try:
            posts = await self.fetch_posts_from_list(list_id, max_results=1)
            return {
                "valid": True,
                "message": f"List is accessible (found {len(posts)} recent posts)"
            }
        except Exception as e:
            return {
                "valid": False,
                "message": f"Connection failed: {str(e)}"
            }


x_client = XClient()

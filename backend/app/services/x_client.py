"""X (Twitter) API client for fetching posts from curated lists"""
from typing import List, Dict, Any
import logging

from app.config import settings

logger = logging.getLogger('klaus_news.x_client')


def detect_content_type(tweet_data, referenced_tweets_full):
    """Detect content type: 'article', 'quote_article', or 'post' (V-2)

    Args:
        tweet_data: Tweet object from X API
        referenced_tweets_full: Dict mapping tweet IDs to full tweet objects

    Returns:
        str: 'article', 'quote_article', or 'post'
    """
    # Check direct article on this tweet
    if tweet_data.get("article"):
        return "article"
    if tweet_data.get("note_tweet"):
        return "article"

    # Check quoted/referenced tweets for articles
    ref_tweets_list = tweet_data.get("referenced_tweets", [])
    for ref in ref_tweets_list:
        ref_id = ref.get("id")
        if not ref_id:
            continue
        # Look up full referenced tweet in includes.tweets
        ref_tweet = referenced_tweets_full.get(ref_id)
        if ref_tweet:
            if ref_tweet.get("article") or ref_tweet.get("note_tweet"):
                return "quote_article"

    return "post"


class XAPIError(Exception):
    """Exception raised when X API returns an error"""
    def __init__(self, status_code: int, response_body: str):
        self.status_code = status_code
        self.response_body = response_body
        super().__init__(f"X API error {status_code}: {response_body[:200]}")


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

        logger.info("Fetching posts from X list", extra={
            'list_id': list_id,
            'max_results': max_results,
            'since_id': since_id
        })

        url = f"https://api.twitter.com/2/lists/{list_id}/tweets"
        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }
        params = {
            "max_results": max_results,
            "tweet.fields": "article,note_tweet,entities,referenced_tweets,text,suggested_source_links,card_uri,created_at,author_id",
            "expansions": "referenced_tweets.id,article.cover_media,article.media_entities,author_id",
            "user.fields": "username"
        }


        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params)

            if response.status_code != 200:
                logger.error("X API request failed", extra={
                    'list_id': list_id,
                    'status_code': response.status_code,
                    'response_body': response.text[:500]  # Truncate for storage
                })
                raise XAPIError(response.status_code, response.text)

            data = response.json()
            posts = []

            # Build user lookup
            users = {u["id"]: u["username"] for u in data.get("includes", {}).get("users", [])}

            # Build referenced tweets lookup (for full RT text)
            referenced_tweets = {t["id"]: t["text"] for t in data.get("includes", {}).get("tweets", [])}

            # Build referenced tweets full object lookup (for article detection) — V-2
            referenced_tweets_full = {t["id"]: t for t in data.get("includes", {}).get("tweets", [])}

            for tweet in data.get("data", []):
                # Get full text: for retweets, use the original tweet's full text
                text = tweet["text"]
                ref_tweets = tweet.get("referenced_tweets", [])
                for ref in ref_tweets:
                    if ref.get("type") == "retweeted" and ref.get("id") in referenced_tweets:
                        # Replace truncated RT text with full original
                        original_author = text.split(":")[0] if text.startswith("RT @") else ""
                        full_original = referenced_tweets[ref["id"]]
                        text = f"{original_author}: {full_original}" if original_author else full_original
                        break

                content_type = detect_content_type(tweet, referenced_tweets_full)  # V-2
                posts.append({
                    "id": tweet["id"],
                    "text": text,
                    "author": users.get(tweet["author_id"], "unknown"),
                    "created_at": datetime.fromisoformat(tweet["created_at"].replace("Z", "+00:00")),
                    "content_type": content_type,  # V-2
                    "raw_tweet": tweet  # V-3: pass full tweet for article extraction
                })

            logger.info(f"Successfully fetched {len(posts)} posts from X list", extra={
                'list_id': list_id,
                'post_count': len(posts)
            })

            return posts

    async def get_configured_lists(self, db) -> List[str]:
        """Get list of configured X list IDs from database

        Args:
            db: Database session

        Returns:
            List of enabled X list IDs from database
        """
        from app.models.list_metadata import ListMetadata
        from sqlalchemy import select

        enabled_lists = db.execute(
            select(ListMetadata.list_id).where(ListMetadata.enabled == True)
        ).scalars().all()

        return list(enabled_lists)

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

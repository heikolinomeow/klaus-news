"""Duplicate and topic grouping detection using SHA-256 and TF-IDF"""
import hashlib
import re
import uuid
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def normalize_text(text: str) -> str:
    """Normalize text for hash comparison: lowercase, strip whitespace, remove URLs"""
    # Remove URLs
    text = re.sub(r'http\S+|www\.\S+', '', text)
    # Lowercase and strip whitespace
    text = text.lower().strip()
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    return text


def compute_content_hash(text: str) -> str:
    """Compute SHA-256 hash of normalized text"""
    normalized = normalize_text(text)
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()


def find_similar_post(new_text: str, existing_posts: list[dict], threshold: float = 0.85) -> str | None:
    """Find if new post is similar to any existing post using TF-IDF

    Args:
        new_text: Text of new post
        existing_posts: List of dicts with keys: text, group_id
        threshold: Cosine similarity threshold (default 0.85)

    Returns:
        group_id of similar post if found, None otherwise
    """
    if not existing_posts:
        return None

    # Build corpus: new post + all existing posts
    corpus = [new_text] + [p["text"] for p in existing_posts]

    # Compute TF-IDF vectors
    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = vectorizer.fit_transform(corpus)

    # Compute cosine similarity between new post (index 0) and all existing posts
    similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()

    # Find posts above threshold
    for idx, similarity in enumerate(similarities):
        if similarity >= threshold:
            return existing_posts[idx]["group_id"]

    return None


def assign_group_id(
    post_text: str,
    post_hash: str,
    existing_posts: list[dict],
    threshold: float = 0.85
) -> str:
    """Assign group_id to post using 5-step algorithm

    Args:
        post_text: Original post text
        post_hash: SHA-256 hash of normalized text
        existing_posts: List of existing posts with keys: text, content_hash, group_id
        threshold: Cosine similarity threshold (default 0.85)

    Returns:
        group_id to assign to this post
    """
    # Step 1: Compute content hash (already done, passed as parameter)

    # Step 2: Check if hash exists in existing posts (exact duplicate)
    for post in existing_posts:
        if post.get("content_hash") == post_hash:
            return post["group_id"]

    # Step 3: Compute TF-IDF similarity against existing posts
    similar_group_id = find_similar_post(post_text, existing_posts, threshold=threshold)

    # Step 4: If similarity > threshold, assign to matching group
    if similar_group_id:
        return similar_group_id

    # Step 5: Create new group_id (UUID)
    return str(uuid.uuid4())

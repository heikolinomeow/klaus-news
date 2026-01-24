"""Post worthiness scoring module"""
import math
from datetime import datetime, timezone


def calculate_worthiness_score(
    categorization_score: float,
    text: str,
    created_at: datetime
) -> float:
    """Calculate worthiness score using weighted formula

    Args:
        categorization_score: AI confidence for category (0-1)
        text: Post text for quality assessment
        created_at: Post creation timestamp

    Returns:
        Worthiness score (0-1)
    """
    relevance = calculate_relevance(categorization_score)
    quality = calculate_quality(text)
    recency = calculate_recency(created_at)

    worthiness_score = (0.4 * relevance) + (0.4 * quality) + (0.2 * recency)
    return worthiness_score


def calculate_relevance(categorization_score: float) -> float:
    """Relevance is AI confidence score for category assignment (0-1)"""
    return categorization_score


def calculate_quality(text: str) -> float:
    """Quality based on text length (sigmoid) and coherence heuristics (0-1)"""
    word_count = len(text.split())

    # Sigmoid for text length
    length_score = 1 / (1 + math.exp(-(word_count / 50)))

    # Coherence heuristics: complete sentences, proper capitalization
    coherence_score = 0.5
    if text and text[0].isupper():
        coherence_score += 0.25
    if text.endswith('.') or text.endswith('!') or text.endswith('?'):
        coherence_score += 0.25

    quality = (length_score + coherence_score) / 2
    return min(quality, 1.0)


def calculate_recency(created_at: datetime) -> float:
    """Recency with linear decay from 1.0 (day 0) to 0.0 (day 7+)"""
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    age_days = (now - created_at).total_seconds() / 86400

    if age_days >= 7:
        return 0.0

    recency = 1.0 - (age_days / 7.0)
    return max(recency, 0.0)

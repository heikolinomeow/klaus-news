"""Progress tracking for ingestion jobs"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import threading


@dataclass
class IngestionProgress:
    """Tracks progress of an ingestion run"""
    is_running: bool = False
    started_at: Optional[datetime] = None
    trigger_source: str = ""

    # Overall progress
    total_lists: int = 0
    current_list: int = 0
    current_list_name: str = ""

    # Post processing progress
    total_posts: int = 0
    current_post: int = 0
    current_step: str = ""  # "fetching", "categorizing", "scoring", "grouping", "storing"

    # Stats (running totals)
    posts_added: int = 0
    duplicates_skipped: int = 0
    errors: int = 0

    def reset(self):
        """Reset progress for a new run"""
        self.is_running = False
        self.started_at = None
        self.trigger_source = ""
        self.total_lists = 0
        self.current_list = 0
        self.current_list_name = ""
        self.total_posts = 0
        self.current_post = 0
        self.current_step = ""
        self.posts_added = 0
        self.duplicates_skipped = 0
        self.errors = 0

    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            "is_running": self.is_running,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "trigger_source": self.trigger_source,
            "total_lists": self.total_lists,
            "current_list": self.current_list,
            "current_list_name": self.current_list_name,
            "total_posts": self.total_posts,
            "current_post": self.current_post,
            "current_step": self.current_step,
            "posts_added": self.posts_added,
            "duplicates_skipped": self.duplicates_skipped,
            "errors": self.errors,
            "progress_percent": self._calculate_progress()
        }

    def _calculate_progress(self) -> int:
        """Calculate overall progress percentage"""
        if not self.is_running or self.total_posts == 0:
            return 0

        # Each post has 4 steps: categorize, title/summary, score, group
        steps_per_post = 4
        total_steps = self.total_posts * steps_per_post

        # Calculate completed steps
        completed_posts = self.current_post - 1 if self.current_post > 0 else 0
        completed_steps = completed_posts * steps_per_post

        # Add partial progress for current post
        step_map = {
            "fetching": 0,
            "categorizing": 1,
            "generating": 2,
            "scoring": 3,
            "grouping": 4,
            "storing": 4,
            "": 0
        }
        completed_steps += step_map.get(self.current_step, 0)

        return min(100, int((completed_steps / total_steps) * 100)) if total_steps > 0 else 0


class ProgressTracker:
    """Thread-safe progress tracker singleton"""
    _instance: Optional['ProgressTracker'] = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._progress = IngestionProgress()
        return cls._instance

    @property
    def progress(self) -> IngestionProgress:
        return self._progress

    def start(self, trigger_source: str, total_lists: int):
        """Start tracking a new ingestion run"""
        self._progress.reset()
        self._progress.is_running = True
        self._progress.started_at = datetime.utcnow()
        self._progress.trigger_source = trigger_source
        self._progress.total_lists = total_lists
        self._progress.current_step = "fetching"

    def set_current_list(self, list_index: int, list_name: str):
        """Update current list being processed"""
        self._progress.current_list = list_index
        self._progress.current_list_name = list_name

    def set_posts_to_process(self, total_posts: int):
        """Set total posts to process for current list"""
        self._progress.total_posts += total_posts

    def start_post(self, post_index: int):
        """Start processing a post"""
        self._progress.current_post = post_index
        self._progress.current_step = "categorizing"

    def set_step(self, step: str):
        """Update current processing step"""
        self._progress.current_step = step

    def post_added(self):
        """Record a post was successfully added"""
        self._progress.posts_added += 1

    def post_skipped(self):
        """Record a post was skipped (duplicate)"""
        self._progress.duplicates_skipped += 1

    def error(self):
        """Record an error occurred"""
        self._progress.errors += 1

    def finish(self):
        """Mark ingestion as complete"""
        self._progress.is_running = False
        self._progress.current_step = ""

    def get_status(self) -> dict:
        """Get current progress status"""
        return self._progress.to_dict()


# Global instance
progress_tracker = ProgressTracker()

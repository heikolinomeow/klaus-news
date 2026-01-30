import React, { useEffect, useState, useRef } from 'react';
import { adminApi } from '../services/api';

interface ProgressData {
  is_running: boolean;
  started_at: string | null;
  trigger_source: string;
  total_lists: number;
  current_list: number;
  current_list_name: string;
  total_posts: number;
  current_post: number;
  current_step: string;
  posts_added: number;
  duplicates_skipped: number;
  errors: number;
  progress_percent: number;
}

interface IngestionProgressProps {
  onComplete?: () => void;
}

const stepLabels: Record<string, string> = {
  fetching: 'Fetching posts...',
  categorizing: 'Categorizing...',
  generating: 'Generating title...',
  scoring: 'Scoring worthiness...',
  grouping: 'Finding duplicates...',
  storing: 'Storing...',
};

const IngestionProgress: React.FC<IngestionProgressProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const wasRunningRef = useRef(false);
  const hideTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const pollProgress = async () => {
      try {
        const response = await adminApi.getIngestionProgress();
        const data = response.data;
        setProgress(data);

        if (data.is_running) {
          setIsVisible(true);
          wasRunningRef.current = true;
          // Clear any pending hide timeout
          if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
          }
        } else if (wasRunningRef.current && !data.is_running) {
          // Just finished - keep visible for a moment, then hide
          wasRunningRef.current = false;
          if (onComplete) {
            onComplete();
          }
          hideTimeoutRef.current = window.setTimeout(() => {
            setIsVisible(false);
          }, 3000);
        }
      } catch (err) {
        console.error('Failed to fetch progress:', err);
      }
    };

    // Poll every 500ms
    pollProgress();
    const interval = setInterval(pollProgress, 500);

    return () => {
      clearInterval(interval);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [onComplete]);

  if (!isVisible || !progress) {
    return null;
  }

  const { is_running, current_step, progress_percent, posts_added, total_posts, current_post } = progress;

  return (
    <div className={`ingestion-progress ${!is_running ? 'completed' : ''}`}>
      <div className="progress-content">
        <div className="progress-info">
          <span className="progress-step">
            {is_running ? stepLabels[current_step] || 'Processing...' : `✓ Done! ${posts_added} posts added`}
          </span>
          {is_running && total_posts > 0 && (
            <span className="progress-count">
              {current_post}/{total_posts}
            </span>
          )}
        </div>
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${is_running ? progress_percent : 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default IngestionProgress;

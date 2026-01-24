/**
 * Format timestamp as relative time (e.g., "5 minutes ago")
 * V-9: Timestamp display utilities
 */

export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}

/**
 * Get color based on timestamp freshness
 * V-9: Color coding - Green (<30 min), Yellow (30-60 min), Red (>60 min)
 */
export function getTimestampColor(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 30) return '#28a745'; // Green
  if (diffMinutes < 60) return '#ffc107'; // Yellow
  return '#dc3545'; // Red
}

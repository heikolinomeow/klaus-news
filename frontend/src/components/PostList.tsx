/**
 * PostList component - displays list of posts
 */
import { Post } from '../types';

interface PostListProps {
  posts: Post[];
  onSelectPost?: (post: Post) => void;
}

function PostList({ posts, onSelectPost }: PostListProps) {
  if (posts.length === 0) {
    return <div className="post-list-empty">No posts available</div>;
  }

  // Collapse duplicates: show only first post per group_id
  const groupMap = new Map<string | null, Post>();
  posts.forEach((post) => {
    const key = post.group_id || `unique_${post.id}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, post);
    }
  });
  const displayPosts = Array.from(groupMap.values());

  return (
    <div className="post-list">
      {displayPosts.map((post) => (
        <div
          key={post.id}
          className="post-item"
          onClick={() => onSelectPost?.(post)}
        >
          <h3>{post.ai_title || 'Untitled'}</h3>
          <p className="post-summary">{post.ai_summary || post.original_text}</p>
          <div className="post-meta">
            <span className="post-category">{post.category || 'Uncategorized'}</span>
            {post.worthiness_score && (
              <span className="post-score">Score: {post.worthiness_score.toFixed(2)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default PostList;

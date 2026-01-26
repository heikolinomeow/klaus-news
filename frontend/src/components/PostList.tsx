/**
 * PostList component - displays groups with expand/collapse for post variations (V-5)
 */
import { useState } from 'react';
import { Post, Group } from '../types';
import { groupsApi } from '../services/api';

interface PostListProps {
  groups: Group[];
  onSelectPost?: (post: Post) => void;
}

function PostList({ groups, onSelectPost }: PostListProps) {
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [groupPosts, setGroupPosts] = useState<Record<number, Post[]>>({});
  const [loadingGroupId, setLoadingGroupId] = useState<number | null>(null);

  const handleGroupClick = async (groupId: number) => {
    if (expandedGroupId === groupId) {
      // Collapse if already expanded
      setExpandedGroupId(null);
      return;
    }

    // Expand and fetch posts if not already loaded
    setExpandedGroupId(groupId);
    if (!groupPosts[groupId]) {
      setLoadingGroupId(groupId);
      try {
        const response = await groupsApi.getPostsByGroup(groupId);
        setGroupPosts(prev => ({ ...prev, [groupId]: response.data.posts }));
      } catch (error) {
        console.error('Failed to fetch group posts:', error);
      } finally {
        setLoadingGroupId(null);
      }
    }
  };

  if (groups.length === 0) {
    return <div className="post-list-empty">No groups available</div>;
  }

  return (
    <div className="post-list">
      {groups.map((group) => (
        <div key={group.id} className="group-card">
          <div
            className="group-header"
            onClick={() => handleGroupClick(group.id)}
          >
            <h3>{group.representative_title}</h3>
            <span className="post-count-badge">
              {group.post_count} {group.post_count === 1 ? 'post' : 'posts'} about this story
            </span>
            <div className="group-meta">
              <span className="group-category">{group.category || 'Uncategorized'}</span>
              <span className="expand-icon">{expandedGroupId === group.id ? '▼' : '▶'}</span>
            </div>
          </div>

          {expandedGroupId === group.id && (
            <div className="group-posts-expanded">
              {loadingGroupId === group.id ? (
                <div className="loading">Loading posts...</div>
              ) : (
                groupPosts[group.id]?.map((post) => (
                  <div
                    key={post.id}
                    className="post-variation"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPost?.(post);
                    }}
                  >
                    <h4>{post.ai_title || 'Untitled'}</h4>
                    <p className="post-summary">{post.ai_summary || post.original_text}</p>
                    <div className="post-meta">
                      <span className="post-author">{post.author || 'Unknown'}</span>
                      {post.worthiness_score && (
                        <span className="post-score">Score: {post.worthiness_score.toFixed(2)}</span>
                      )}
                      <button
                        className="select-for-article"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPost?.(post);
                        }}
                      >
                        Use for Article
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default PostList;

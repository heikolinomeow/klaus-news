/**
 * PostList component - displays groups as tiles (V-5)
 */
import { useState } from 'react';
import { Post, Group } from '../types';
import { groupsApi } from '../services/api';

interface PostListProps {
  groups: Group[];
  onSelectGroup?: (groupId: number) => void;
  onArchiveGroup?: (groupId: number) => void;
  isSelecting?: boolean;
}

function PostList({ groups, onSelectGroup, onArchiveGroup, isSelecting }: PostListProps) {
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [groupPosts, setGroupPosts] = useState<Record<number, Post[]>>({});
  const [loadingGroupId, setLoadingGroupId] = useState<number | null>(null);

  const handleGroupClick = async (groupId: number) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }

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
    return <div className="post-list-empty">No stories match the current filters</div>;
  }

  return (
    <div className="post-tiles-grid">
      {groups.map((group) => (
        <div key={group.id} className="group-tile">
          <div className="tile-header" onClick={() => handleGroupClick(group.id)}>
            <h3 className="tile-title">{group.representative_title}</h3>
            <div className="tile-meta">
              <span className="tile-source-badge">
                {group.post_count} {group.post_count === 1 ? 'source' : 'sources'}
              </span>
              <span className="tile-category">{group.category || 'Other'}</span>
            </div>
          </div>

          <div className="tile-actions">
            <button
              className="tile-btn tile-btn-primary"
              disabled={isSelecting}
              onClick={(e) => {
                e.stopPropagation();
                onSelectGroup?.(group.id);
              }}
            >
              {isSelecting ? 'Selecting...' : 'Cook with that 🍳'}
            </button>
            <button
              className="tile-btn tile-btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                onArchiveGroup?.(group.id);
              }}
            >
              Not interesting
            </button>
          </div>

          {expandedGroupId === group.id && (
            <div className="tile-expanded">
              {loadingGroupId === group.id ? (
                <div className="tile-loading">Loading...</div>
              ) : (
                groupPosts[group.id]?.map((post) => (
                  <div key={post.id} className="tile-post">
                    <h4>{post.ai_title || 'Untitled'}</h4>
                    <p>{post.ai_summary || post.original_text}</p>
                    <div className="tile-post-meta">
                      <span className="tile-post-author">{post.author || 'Unknown'}</span>
                      {post.worthiness_score && (
                        <span className="tile-post-score">Score: {post.worthiness_score.toFixed(2)}</span>
                      )}
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

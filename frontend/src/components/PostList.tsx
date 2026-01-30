/**
 * PostList component - displays groups in newspaper layout
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

  const filterPosts = (posts: Post[] | undefined) => {
    if (!posts) return [];
    return posts.filter((post) => {
      if (post.worthiness_score === 0) return false;
      const title = (post.ai_title || '').toLowerCase();
      const errorIndicators = ["i'm sorry", "cannot access", "can't access", "please provide"];
      return !errorIndicators.some(indicator => title.includes(indicator));
    });
  };

  if (groups.length === 0) {
    return (
      <div className="newspaper-layout">
        <div className="post-list-empty" style={{
          fontFamily: 'var(--font-body)',
          fontStyle: 'italic',
          color: 'var(--ink-gray)',
          textAlign: 'center',
          padding: '60px 20px'
        }}>
          No stories match the current filters
        </div>
      </div>
    );
  }

  // Split into hero, secondary, and standard articles
  const heroStory = groups[0];
  const secondaryStories = groups.slice(1, 3);
  const standardStories = groups.slice(3);

  const renderArticleActions = (group: Group) => (
    <div className="article-actions">
      <button
        className="btn-newspaper"
        disabled={isSelecting}
        onClick={(e) => {
          e.stopPropagation();
          onSelectGroup?.(group.id);
        }}
      >
        {isSelecting ? 'Selecting...' : 'Read More'}
      </button>
      <button
        className="btn-newspaper btn-newspaper-secondary"
        onClick={(e) => {
          e.stopPropagation();
          onArchiveGroup?.(group.id);
        }}
      >
        Dismiss
      </button>
    </div>
  );

  const renderExpandedPosts = (groupId: number) => {
    if (expandedGroupId !== groupId) return null;

    return (
      <div className="tile-expanded">
        {loadingGroupId === groupId ? (
          <div className="tile-loading">Loading sources...</div>
        ) : (
          filterPosts(groupPosts[groupId]).map((post) => (
            <div key={post.id} className="tile-post">
              <h4>{post.ai_title || 'Untitled'}</h4>
              <p>{post.ai_summary || post.original_text}</p>
              <div className="tile-post-meta">
                <span className="tile-post-author">{post.author || 'Unknown source'}</span>
                {post.worthiness_score && (
                  <span className="tile-post-score">{post.worthiness_score.toFixed(2)}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="newspaper-layout">
      {/* Hero Section */}
      <div className="newspaper-hero">
        <article className="article-hero" onClick={() => handleGroupClick(heroStory.id)}>
          <h1 className="headline-hero">{heroStory.representative_title}</h1>
          {heroStory.representative_summary && (
            <p className="article-lead">{heroStory.representative_summary}</p>
          )}
          <div className="article-meta">
            <span className="article-category">{heroStory.category || 'News'}</span>
            <span className="article-sources">
              {heroStory.post_count} {heroStory.post_count === 1 ? 'source' : 'sources'}
            </span>
          </div>
          {renderArticleActions(heroStory)}
          {renderExpandedPosts(heroStory.id)}
        </article>

        {/* Secondary Stories */}
        <div className="secondary-stories">
          {secondaryStories.map((story) => (
            <article
              key={story.id}
              className="article-secondary"
              onClick={() => handleGroupClick(story.id)}
            >
              <h2 className="headline-secondary">{story.representative_title}</h2>
              {story.representative_summary && (
                <p className="article-summary">{story.representative_summary}</p>
              )}
              <div className="article-meta">
                <span className="article-category">{story.category || 'News'}</span>
                <span className="article-sources">
                  {story.post_count} {story.post_count === 1 ? 'source' : 'sources'}
                </span>
              </div>
              {renderArticleActions(story)}
              {renderExpandedPosts(story.id)}
            </article>
          ))}
        </div>
      </div>

      {/* Standard Articles Grid */}
      {standardStories.length > 0 && (
        <div className="articles-grid">
          {standardStories.map((story) => (
            <article
              key={story.id}
              className="article-standard"
              onClick={() => handleGroupClick(story.id)}
            >
              <h3 className="headline-standard">{story.representative_title}</h3>
              {story.representative_summary && (
                <p className="article-summary">{story.representative_summary}</p>
              )}
              <div className="article-meta">
                <span className="article-category">{story.category || 'News'}</span>
                <span className="article-sources">
                  {story.post_count} {story.post_count === 1 ? 'source' : 'sources'}
                </span>
              </div>
              {renderArticleActions(story)}
              {renderExpandedPosts(story.id)}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default PostList;

import { useState, useEffect, MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { groupsApi, researchApi, groupArticlesApi, settingsApi, promptsApi, teamsApi } from '../services/api';
import { Group, Post, GroupResearch, GroupArticle } from '../types';
import TeamsChannelModal from '../components/TeamsChannelModal';
import ArticleEditor from '../components/ArticleEditor';

type ResearchMode = 'quick' | 'agentic' | 'deep';
type ArticleStyle = 'very_short' | 'short' | 'medium' | 'long' | 'custom';

// Check if content is HTML (from WYSIWYG editor) vs markdown (from AI)
function isHtmlContent(text: string): boolean {
  if (!text) return false;
  return /<(p|div|br|strong|em|h[1-6]|ul|ol|li|a|blockquote)[^>]*>/i.test(text);
}

// Render content - detect HTML vs markdown and handle appropriately
function renderContent(text: string): string {
  if (!text) return '';
  if (isHtmlContent(text)) {
    return text;
  }
  return renderMarkdown(text);
}

// Simple markdown to HTML converter
function renderMarkdown(text: string): string {
  if (!text) return '';

  // Process line by line to properly handle lists
  const lines = text.split('\n');
  const result: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      result.push('<ul>' + listItems.join('') + '</ul>');
      listItems = [];
    }
  };

  const escapeHtml = (str: string) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const processInline = (str: string) => str
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Auto-link bare URLs (must come after markdown links to avoid double-linking)
    .replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line - flush list and add paragraph break
    if (!trimmed) {
      flushList();
      result.push('</p><p>');
      continue;
    }

    // Headers
    const h4Match = trimmed.match(/^####\s+(.+)$/);
    const h3Match = trimmed.match(/^###\s+(.+)$/);
    const h2Match = trimmed.match(/^##\s+(.+)$/);
    const h1Match = trimmed.match(/^#\s+(.+)$/);

    if (h4Match) {
      flushList();
      result.push(`<h4>${processInline(escapeHtml(h4Match[1]))}</h4>`);
      continue;
    }
    if (h3Match) {
      flushList();
      result.push(`<h3>${processInline(escapeHtml(h3Match[1]))}</h3>`);
      continue;
    }
    if (h2Match) {
      flushList();
      result.push(`<h2>${processInline(escapeHtml(h2Match[1]))}</h2>`);
      continue;
    }
    if (h1Match) {
      flushList();
      result.push(`<h1>${processInline(escapeHtml(h1Match[1]))}</h1>`);
      continue;
    }

    // Blockquote
    const blockquoteMatch = trimmed.match(/^>\s+(.+)$/);
    if (blockquoteMatch) {
      flushList();
      result.push(`<blockquote>${processInline(escapeHtml(blockquoteMatch[1]))}</blockquote>`);
      continue;
    }

    // List items - bullet points (• or *)
    const bulletMatch = trimmed.match(/^[•*]\s+(.+)$/);
    if (bulletMatch) {
      listItems.push(`<li class="main-bullet">${processInline(escapeHtml(bulletMatch[1]))}</li>`);
      continue;
    }

    // List items - dashes (sub-items or regular list items)
    const dashMatch = trimmed.match(/^-\s+(.+)$/);
    if (dashMatch) {
      // If we're already in a list, treat as sub-item; otherwise main item
      const className = listItems.length > 0 ? 'sub-item' : 'main-bullet';
      listItems.push(`<li class="${className}">${processInline(escapeHtml(dashMatch[1]))}</li>`);
      continue;
    }

    // Numbered list
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      listItems.push(`<li>${processInline(escapeHtml(numberedMatch[1]))}</li>`);
      continue;
    }

    // Regular text - flush any pending list first
    flushList();
    result.push(processInline(escapeHtml(trimmed)));
  }

  // Flush any remaining list items
  flushList();

  return `<p>${result.join('')}</p>`;
}

// Convert URLs in plain text to clickable links
function linkifyText(text: string): string {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
}

export default function Cooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationState = location.state as { selectedGroupId?: number } | null;

  // Groups & Posts
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Research
  const [research, setResearch] = useState<GroupResearch | null>(null);
  const [researchMode, setResearchMode] = useState<ResearchMode>('agentic');
  const [isResearchLoading, setIsResearchLoading] = useState(false);
  const [defaultResearchPrompt, setDefaultResearchPrompt] = useState<string>('');
  const [sessionResearchPrompt, setSessionResearchPrompt] = useState<string>('');

  // Article - multi-article support
  const [articles, setArticles] = useState<GroupArticle[]>([]);
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
  const currentArticle = articles.length > 0 ? articles[currentArticleIndex] : null;
  const [articleStyle, setArticleStyle] = useState<ArticleStyle>('short');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [refinementInstruction, setRefinementInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // View state
  const [view, setView] = useState<'cooking' | 'article'>('cooking');
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedPreview, setEditedPreview] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Teams integration
  const [teamsChannels, setTeamsChannels] = useState<Array<{ name: string }>>([]);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [isSendingToTeams, setIsSendingToTeams] = useState(false);

  // Article style prompts
  const [articlePrompts, setArticlePrompts] = useState<Record<string, string>>({});
  const [editablePrompt, setEditablePrompt] = useState<string>('');

  // Load groups in COOKING state
  useEffect(() => {
    loadGroups();
    loadArticlePrompts();
    loadResearchPrompt();
    loadTeamsChannels();
  }, []);

  // Auto-select group from navigation state
  useEffect(() => {
    if (navigationState?.selectedGroupId && groups.length > 0 && !selectedGroup) {
      const groupToSelect = groups.find((g: Group) => g.id === navigationState.selectedGroupId);
      if (groupToSelect) {
        selectGroup(groupToSelect);
      }
    }
  }, [groups, navigationState?.selectedGroupId]);

  const loadTeamsChannels = async () => {
    try {
      const response = await teamsApi.getChannels();
      setTeamsChannels(response.data.channels || []);
    } catch (err) {
      console.error('Failed to load Teams channels:', err);
    }
  };

  const loadResearchPrompt = async () => {
    try {
      const response = await promptsApi.getByKey('research_prompt');
      if (response.data?.prompt_text) {
        setDefaultResearchPrompt(response.data.prompt_text);
        setSessionResearchPrompt(response.data.prompt_text);
      }
    } catch (err) {
      console.error('Failed to load research prompt:', err);
    }
  };

  // Sync editable prompt when style or prompts change
  useEffect(() => {
    if (articleStyle !== 'custom' && articlePrompts[articleStyle]) {
      setEditablePrompt(articlePrompts[articleStyle]);
    }
  }, [articleStyle, articlePrompts]);

  const loadArticlePrompts = async () => {
    try {
      const response = await settingsApi.getArticlePrompts();
      setArticlePrompts(response.data.prompts);
    } catch (err) {
      console.error('Failed to load article prompts:', err);
    }
  };

  const loadGroups = async () => {
    try {
      const groupsResponse = await groupsApi.getAll();

      const cookingGroups = groupsResponse.data.groups.filter(
        (g: Group) => g.state === 'COOKING'
      );
      setGroups(cookingGroups);

      // Show error if no groups
      if (cookingGroups.length === 0) {
        setError('No groups in COOKING state. Please select a group from the Home page.');
      }
    } catch (err) {
      setError('Failed to load groups');
      console.error(err);
    }
  };

  const selectGroup = async (group: Group) => {
    setSelectedGroup(group);
    setError(null);
    setView('cooking');

    // Load posts
    try {
      const postsResponse = await groupsApi.getPostsByGroup(group.id);
      const loadedPosts = postsResponse.data.posts || [];
      setPosts(loadedPosts);
      // Auto-select first post
      if (loadedPosts.length > 0) {
        setSelectedPost(loadedPosts[0]);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
      setPosts([]);
      setSelectedPost(null);
    }

    // Load existing research if any
    try {
      const researchResponse = await researchApi.get(group.id);
      setResearch(researchResponse.data.research);
    } catch (err) {
      // No research yet, that's fine
      setResearch(null);
    }

    // Load all existing articles
    try {
      const articlesResponse = await groupArticlesApi.getAll(group.id);
      setArticles(articlesResponse.data.articles || []);
      setCurrentArticleIndex(0);
    } catch (err) {
      // No articles yet, that's fine
      setArticles([]);
      setCurrentArticleIndex(0);
    }
  };

  const runResearch = async () => {
    if (!selectedGroup) return;

    setIsResearchLoading(true);
    setError(null);

    try {
      // Pass custom prompt only if it differs from default
      const customPromptToUse = sessionResearchPrompt !== defaultResearchPrompt ? sessionResearchPrompt : undefined;
      const response = await researchApi.run(selectedGroup.id, researchMode, customPromptToUse);
      setResearch(response.data.research);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to run research');
      console.error(err);
    } finally {
      setIsResearchLoading(false);
    }
  };

  const generateArticle = async () => {
    if (!selectedGroup || !research) return;

    setIsGeneratingArticle(true);
    setError(null);

    try {
      const promptToUse = articleStyle === 'custom' ? customPrompt : editablePrompt;
      await groupArticlesApi.generate(
        selectedGroup.id,
        articleStyle,
        promptToUse
      );

      // Reload articles to include the new one
      const articlesResponse = await groupArticlesApi.getAll(selectedGroup.id);
      setArticles(articlesResponse.data.articles || []);
      setCurrentArticleIndex(0);

      // Transition to REVIEW state and navigate to Serving
      if (selectedGroup.state === 'COOKING') {
        await groupsApi.transition(selectedGroup.id, 'REVIEW');
      }

      // Navigate to Serving page
      navigate('/serving');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate article');
      console.error(err);
    } finally {
      setIsGeneratingArticle(false);
    }
  };

  const refineArticle = async () => {
    if (!selectedGroup || !currentArticle || !refinementInstruction.trim()) return;

    setIsRefining(true);
    setError(null);

    try {
      const response = await groupArticlesApi.refine(
        selectedGroup.id,
        currentArticle.id,
        refinementInstruction
      );
      // Update the specific article in the array
      setArticles((prev: GroupArticle[]) => prev.map(a =>
        a.id === currentArticle.id ? response.data.article : a
      ));
      setRefinementInstruction('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to refine article');
      console.error(err);
    } finally {
      setIsRefining(false);
    }
  };

  const copyToClipboard = () => {
    if (!currentArticle) return;
    navigator.clipboard.writeText(currentArticle.content);
    alert('Article copied to clipboard!');
  };

  const startEditing = () => {
    if (currentArticle) {
      setEditedTitle(currentArticle.title || selectedGroup?.representative_title || '');
      setEditedPreview(currentArticle.preview || '');
      setEditedContent(currentArticle.content);
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedTitle('');
    setEditedPreview('');
    setEditedContent('');
  };

  const saveArticle = async () => {
    if (!selectedGroup || !currentArticle || !editedContent.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await groupArticlesApi.update(selectedGroup.id, currentArticle.id, editedContent, editedTitle, editedPreview);
      // Update the specific article in the array
      setArticles((prev: GroupArticle[]) => prev.map(a =>
        a.id === currentArticle.id ? response.data.article : a
      ));
      setIsEditing(false);
      setEditedTitle('');
      setEditedPreview('');
      setEditedContent('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save article');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const sendToTeams = async (channelName: string) => {
    if (!currentArticle || !selectedGroup) return;

    setIsSendingToTeams(true);
    try {
      const response = await teamsApi.sendToTeams(String(currentArticle.id), channelName);
      if (response.data.success) {
        alert(`Article sent to #${channelName}!`);
        setShowTeamsModal(false);
      } else {
        setError(response.data.error || 'Failed to send to Teams');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send to Teams');
      console.error(err);
    } finally {
      setIsSendingToTeams(false);
    }
  };

  // All groups (no category filtering)
  const filteredGroups = groups;

  // Group selector view
  if (!selectedGroup && groups.length >= 1) {
    return (
      <div className="cooking-container">
        <div className="cooking-header">
          <h1>Cooking</h1>
          <p>Select a group to work with:</p>
        </div>
        <div className="cooking-group-selector">
          {filteredGroups.map((group: Group) => (
            <div
              key={group.id}
              className="cooking-group-card"
              onClick={() => selectGroup(group)}
            >
              <h3>{group.representative_title}</h3>
              <div className="cooking-group-meta">
                <span className="badge">{group.category}</span>
                <span className="small muted">{group.post_count} posts</span>
              </div>
              <button
                className="cooking-group-remove"
                onClick={async (e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  if (confirm('Remove this group from cooking?')) {
                    try {
                      await groupsApi.transition(group.id, 'NEW');
                      loadGroups();
                    } catch (err) {
                      console.error('Failed to remove group:', err);
                    }
                  }
                }}
                title="Remove from cooking"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !selectedGroup) {
    return (
      <div className="cooking-container">
        <div className="cooking-header">
          <h1>Cooking</h1>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  // Article view
  if (view === 'article' && currentArticle) {
    return (
      <div className="cooking-container">
        <div className="cooking-header">
          <h1>Article</h1>
          <div className="cooking-header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setView('cooking')}
            >
              ← Back to Research
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="cooking-article-view">
          <div className="cooking-article-content">
            <div className="article-content-header">
              {!isEditing && (
                <h2>{currentArticle.title || selectedGroup?.representative_title}</h2>
              )}
              <div className="article-header-controls">
                {articles.length > 1 && (
                  <div className="article-selector">
                    <button
                      className="btn btn-icon"
                      onClick={() => setCurrentArticleIndex((prev: number) => Math.min(articles.length - 1, prev + 1))}
                      disabled={currentArticleIndex === articles.length - 1}
                      title="Older article"
                    >
                      &#8249;
                    </button>
                    <span className="article-counter">
                      {currentArticleIndex + 1} / {articles.length}
                    </span>
                    <button
                      className="btn btn-icon"
                      onClick={() => setCurrentArticleIndex((prev: number) => Math.max(0, prev - 1))}
                      disabled={currentArticleIndex === 0}
                      title="Newer article"
                    >
                      &#8250;
                    </button>
                  </div>
                )}
                {!isEditing && (
                  <button className="btn btn-secondary btn-sm" onClick={startEditing}>
                    Edit
                  </button>
                )}
              </div>
            </div>
            {isEditing ? (
              <div className="article-editor-container">
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="article-title" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1a1a1a', fontFamily: 'Source Sans Pro, Helvetica Neue, Arial, sans-serif' }}>
                    Title
                  </label>
                  <input
                    id="article-title"
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    placeholder="Enter article title..."
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      fontFamily: 'Playfair Display, Georgia, serif',
                      border: '1px solid #d4d0c8',
                      borderRadius: '4px',
                      backgroundColor: '#fefdfb',
                      color: '#1a1a1a'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="article-preview" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#1a1a1a', fontFamily: 'Source Sans Pro, Helvetica Neue, Arial, sans-serif' }}>
                    Preview <span style={{ fontWeight: 400, color: '#666666', fontSize: '0.85rem' }}>(shown in Teams card before "Read more")</span>
                  </label>
                  <textarea
                    id="article-preview"
                    value={editedPreview}
                    onChange={(e) => setEditedPreview(e.target.value)}
                    placeholder="Write a short teaser that will appear in the Teams card..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '0.95rem',
                      fontFamily: 'Libre Baskerville, Georgia, serif',
                      border: '1px solid #d4d0c8',
                      borderRadius: '4px',
                      backgroundColor: '#fefdfb',
                      color: '#1a1a1a',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <ArticleEditor
                  content={editedContent}
                  onChange={setEditedContent}
                />
                <div className="article-editor-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={cancelEditing}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={saveArticle}
                    disabled={isSaving || !editedContent.trim()}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="article-text" dangerouslySetInnerHTML={{ __html: renderContent(currentArticle.content) }} />
            )}
          </div>

          {!isEditing && (
            <div className="cooking-refine-section">
              <h3>Refine Article</h3>
              <p className="small muted">
                Type instructions to refine the article (e.g., "Make it shorter" or "Add more context about the CEO")
              </p>
              <textarea
                className="cooking-refine-input"
                placeholder="e.g., Make the opening paragraph more attention-grabbing"
                value={refinementInstruction}
                onChange={(e) => setRefinementInstruction(e.target.value)}
                disabled={isRefining}
                rows={3}
              />
              <button
                className="btn btn-primary"
                onClick={refineArticle}
                disabled={isRefining || !refinementInstruction.trim()}
              >
                {isRefining ? 'Refining...' : 'Refine'}
              </button>
            </div>
          )}

          {!isEditing && (
            <div className="cooking-article-actions">
              <button className="btn btn-secondary" onClick={copyToClipboard}>
                Copy to Clipboard
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowTeamsModal(true)}
                disabled={teamsChannels.length === 0}
                title={teamsChannels.length === 0 ? 'No Teams channels configured' : 'Send to Microsoft Teams'}
              >
                Send to Teams
              </button>
            </div>
          )}
        </div>

        {showTeamsModal && teamsChannels.length > 0 && (
          <TeamsChannelModal
            channels={teamsChannels}
            articleTitle={currentArticle.title || selectedGroup?.representative_title || 'Article'}
            articleSummary={currentArticle.content.substring(0, 200) + '...'}
            onClose={() => setShowTeamsModal(false)}
            onSend={sendToTeams}
            isSending={isSendingToTeams}
          />
        )}
      </div>
    );
  }

  // Main cooking view (two-panel)
  return (
    <div className="cooking-container">
      {/* Compact Header */}
      <div className="cooking-header">
        <h1>{selectedGroup?.category?.toUpperCase() || 'COOKING'}</h1>
        {selectedGroup && (
          <div className="cooking-group-info">
            <h2>{selectedGroup.representative_title}</h2>
          </div>
        )}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setSelectedGroup(null)}
        >
          ← All Topics
        </button>
      </div>

      {error && <div className="error-message" style={{ padding: '12px 24px', margin: 0 }}>{error}</div>}

      {/* Main Panels */}
      <div className="cooking-panels">
        {/* Left Sidebar: Posts */}
        <div className="cooking-panel posts-panel">
          <h3>Source Posts ({posts.length})</h3>
          {posts.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#666666', fontFamily: 'Libre Baskerville, Georgia, serif', fontStyle: 'italic' }}>
              No posts found
            </div>
          ) : (
            <div className="posts-list">
              {posts.map(post => (
                <div
                  key={post.id}
                  className={`post-card-cooking ${selectedPost?.id === post.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPost(post)}
                >
                  <div className="post-author">@{post.author || 'unknown'}</div>
                  <div className="post-text">{post.original_text}</div>
                  {post.worthiness_score && (
                    <div className="post-score">
                      {post.worthiness_score.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Split 30/70 - Full Post | Research */}
        <div className="cooking-panel research-panel">
          <div className="research-split-container">
            {/* 30% - Full Post View */}
            <div className="post-detail-panel">
              <h3>Full Post</h3>
              {selectedPost ? (
                <div className="post-detail-content">
                  <div className="post-detail-author">@{selectedPost.author || 'unknown'}</div>
                  <div className="post-detail-text" dangerouslySetInnerHTML={{ __html: linkifyText(selectedPost.original_text) }} />
                  {selectedPost.worthiness_score && (
                    <div className="post-detail-score">
                      Score: {selectedPost.worthiness_score.toFixed(2)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="post-detail-placeholder">
                  Select a post to view full text
                </div>
              )}
            </div>

            {/* 70% - Research Output */}
            <div className="research-output-panel">
              <h3>
                <span>Research Output</span>
                {research && (
                  <span style={{ fontSize: '0.65rem', color: '#2d5a27', marginLeft: '8px', fontFamily: 'Source Sans Pro, Helvetica Neue, Arial, sans-serif' }}>
                    Ready
                  </span>
                )}
              </h3>

              {!research && !isResearchLoading && (
                <div className="research-placeholder" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  gap: '8px',
                  color: '#666666',
                  fontFamily: 'Libre Baskerville, Georgia, serif'
                }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>No research yet</p>
                  <p style={{ margin: 0, fontSize: '0.8rem' }}>Run research to get started</p>
                </div>
              )}

              {isResearchLoading && (
                <div className="research-loading" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  gap: '12px'
                }}>
                  <div className="spinner"></div>
                  <p style={{ margin: 0, color: '#8b7355', fontFamily: 'Source Sans Pro, Helvetica Neue, Arial, sans-serif', fontStyle: 'italic' }}>Running {researchMode} research...</p>
                </div>
              )}

              {research && (
                <div className="research-content">
                  <div className="research-preview-container">
                    <div
                      className="research-preview"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(research.edited_output || research.original_output)
                      }}
                    />
                  </div>

                  {research.sources && research.sources.length > 0 && (
                    <div className="research-sources">
                      <h4>Sources ({research.sources.length})</h4>
                      <ul>
                        {research.sources.map((source, idx) => (
                          <li key={idx}>
                            <a href={source.url} target="_blank" rel="noopener noreferrer">
                              {source.title || source.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar - Structured Controls */}
      <div className="cooking-action-bar">
        {/* Research Controls */}
        <div className="cooking-action-group">
          <label>Research</label>
          <div className="cooking-action-row">
            <select
              className="cooking-select"
              value={researchMode}
              onChange={(e) => setResearchMode(e.target.value as ResearchMode)}
              disabled={isResearchLoading}
            >
              <option value="quick">Quick</option>
              <option value="agentic">Agentic</option>
              <option value="deep">Deep</option>
            </select>
            <button
              className="btn btn-primary"
              onClick={runResearch}
              disabled={isResearchLoading || isGeneratingArticle || !selectedGroup}
            >
              {isResearchLoading ? 'Researching...' : 'Research'}
            </button>
          </div>

          {/* Research Prompt (always visible) */}
          <div className="style-prompt-editor">
            <div className="style-prompt-header">
              <span className="style-prompt-label">Research Prompt</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSessionResearchPrompt(defaultResearchPrompt)}
                disabled={sessionResearchPrompt === defaultResearchPrompt}
                style={{ padding: '4px 8px', fontSize: '0.65rem' }}
              >
                Reset
              </button>
            </div>
            <textarea
              className="style-prompt-textarea"
              value={sessionResearchPrompt}
              onChange={(e) => setSessionResearchPrompt(e.target.value)}
              disabled={isResearchLoading}
              rows={3}
            />
          </div>
        </div>

        {/* Article Style Selection */}
        <div className="cooking-action-group">
          <label>Article Style</label>
          <div className="cooking-action-row">
            <select
              className="cooking-select"
              value={articleStyle}
              onChange={(e) => setArticleStyle(e.target.value as ArticleStyle)}
              disabled={isResearchLoading || isGeneratingArticle}
            >
              <option value="very_short">Very Short (~50 words)</option>
              <option value="short">Short (~100 words)</option>
              <option value="medium">Medium (~200 words)</option>
              <option value="long">Long (~400 words)</option>
              <option value="custom">Custom</option>
            </select>

            <button
              className="btn btn-primary"
              onClick={generateArticle}
              disabled={isGeneratingArticle || isResearchLoading || !selectedGroup || !research || (articleStyle === 'custom' && !customPrompt.trim())}
              title={!research ? 'Run research first' : ''}
            >
              {isGeneratingArticle ? 'Generating...' : 'Generate Article'}
            </button>

            {articleStyle === 'custom' && (
              <textarea
                className="cooking-custom-prompt"
                placeholder="Enter custom prompt..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={isResearchLoading || isGeneratingArticle}
                rows={4}
                style={{ minHeight: '100px', resize: 'vertical' }}
              />
            )}
          </div>

          {/* Editable prompt for selected style */}
          {articleStyle !== 'custom' && articlePrompts[articleStyle] && (
            <div className="style-prompt-editor">
              <div className="style-prompt-header">
                <span className="style-prompt-label">
                  {articleStyle.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Prompt
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditablePrompt(articlePrompts[articleStyle])}
                  disabled={editablePrompt === articlePrompts[articleStyle]}
                  style={{ padding: '4px 8px', fontSize: '0.65rem' }}
                >
                  Reset
                </button>
              </div>
              <textarea
                className="style-prompt-textarea"
                value={editablePrompt}
                onChange={(e) => setEditablePrompt(e.target.value)}
                rows={3}
                disabled={isResearchLoading || isGeneratingArticle}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

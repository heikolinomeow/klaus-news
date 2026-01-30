import { useState, useEffect } from 'react';
import { groupsApi, groupArticlesApi, teamsApi } from '../services/api';
import { Group, GroupArticle } from '../types';
import TeamsChannelModal from '../components/TeamsChannelModal';
import ArticleEditor from '../components/ArticleEditor';
import { useNavigate } from 'react-router-dom';

// Check if content is HTML (from WYSIWYG editor) vs markdown (from AI)
function isHtmlContent(text: string): boolean {
  if (!text) return false;
  // Check for common HTML tags that indicate WYSIWYG-edited content
  return /<(p|div|br|strong|em|h[1-6]|ul|ol|li|a|blockquote)[^>]*>/i.test(text);
}

// Render content - detect HTML vs markdown and handle appropriately
function renderContent(text: string): string {
  if (!text) return '';
  if (isHtmlContent(text)) {
    // Already HTML from WYSIWYG editor - use directly
    return text;
  }
  // Markdown from AI - convert to HTML
  return renderMarkdown(text);
}

// Simple markdown to HTML converter
function renderMarkdown(text: string): string {
  if (!text) return '';

  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Main bullet points (• character)
    .replace(/^• (.+)$/gm, '<li class="main-bullet">$1</li>')
    // Sub-items (lines starting with -)
    .replace(/^- (.+)$/gm, '<li class="sub-item">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Line breaks (double newline = paragraph)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br/>');

  // Wrap consecutive <li> items in <ul>
  html = html.replace(/(<li[^>]*>.*?<\/li>)(\s*<br\/>)*(<li)/g, '$1$3');
  html = html.replace(/(<li[^>]*>.*?<\/li>)+/g, '<ul>$&</ul>');

  return `<p>${html}</p>`;
}

export default function Serving() {
  const navigate = useNavigate();

  // Groups & Articles
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [articles, setArticles] = useState<GroupArticle[]>([]);
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
  const currentArticle = articles.length > 0 ? articles[currentArticleIndex] : null;

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedPreview, setEditedPreview] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [refinementInstruction, setRefinementInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isEditingPreview, setIsEditingPreview] = useState(false);

  // Teams preview character limit (fits well in Adaptive Card with maxLines: 3)
  const PREVIEW_CHAR_LIMIT = 280;

  // Teams integration
  const [teamsChannels, setTeamsChannels] = useState<Array<{ name: string }>>([]);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [isSendingToTeams, setIsSendingToTeams] = useState(false);

  // Load groups in REVIEW state
  useEffect(() => {
    loadGroups();
    loadTeamsChannels();
  }, []);

  const loadTeamsChannels = async () => {
    try {
      const response = await teamsApi.getChannels();
      setTeamsChannels(response.data.channels || []);
    } catch (err) {
      console.error('Failed to load Teams channels:', err);
    }
  };

  const loadGroups = async () => {
    try {
      const groupsResponse = await groupsApi.getAll();

      const reviewGroups = groupsResponse.data.groups.filter(
        (g: Group) => g.state === 'REVIEW'
      );
      setGroups(reviewGroups);

      // Show error if no groups
      if (reviewGroups.length === 0) {
        setError('No articles ready for serving. Generate articles in the Cooking section first.');
      }
    } catch (err) {
      setError('Failed to load groups');
      console.error(err);
    }
  };

  const selectGroup = async (group: Group) => {
    setSelectedGroup(group);
    setError(null);

    // Load all existing articles, filtering out those sent to Teams
    try {
      const articlesResponse = await groupArticlesApi.getAll(group.id);
      const allArticles = articlesResponse.data.articles || [];
      // Filter out articles that have been sent to Teams
      const unsent = allArticles.filter((a: GroupArticle) => !a.posted_to_teams);
      setArticles(unsent);
      setCurrentArticleIndex(0);
    } catch (err) {
      console.error('Failed to load articles:', err);
      setArticles([]);
      setCurrentArticleIndex(0);
    }
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

  const sendToTeams = async (channelName: string) => {
    if (!currentArticle || !selectedGroup) return;

    setIsSendingToTeams(true);
    try {
      const response = await teamsApi.sendToTeams(String(currentArticle.id), channelName);
      if (response.data.success) {
        alert(`Article sent to #${channelName}!`);
        setShowTeamsModal(false);

        // Remove the entire group from Serving (group is "done" once any article is sent)
        setGroups((prev: Group[]) => prev.filter((g: Group) => g.id !== selectedGroup.id));
        setSelectedGroup(null);
        setArticles([]);
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

  const backToCooking = async () => {
    if (!selectedGroup) return;

    try {
      await groupsApi.transition(selectedGroup.id, 'COOKING');
      navigate('/cooking');
    } catch (err) {
      setError('Failed to move back to Cooking');
    }
  };

  const markAsPublished = async () => {
    if (!selectedGroup) return;

    try {
      await groupsApi.transition(selectedGroup.id, 'PUBLISHED');
      // Remove from current view
      setGroups(prev => prev.filter(g => g.id !== selectedGroup.id));
      setSelectedGroup(null);
      alert('Article marked as Published!');
    } catch (err) {
      setError('Failed to mark as published');
    }
  };

  // All groups (no category filtering)
  const filteredGroups = groups;

  // Group selector view
  if (!selectedGroup && groups.length >= 1) {
    return (
      <div className="cooking-container">
        <div className="cooking-header">
          <h1>Serving</h1>
          <p>Select an article to review and publish:</p>
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
          <h1>Serving</h1>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  // Article view
  if (selectedGroup && currentArticle) {
    return (
      <div className="cooking-container">
        <div className="cooking-header">
          <h1>Serving</h1>
          <div className="cooking-header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setSelectedGroup(null)}
            >
              ← All Articles
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
            {/* Teams Preview Section - Always visible */}
            {!isEditing && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: '#f8f5f0',
                borderRadius: '4px',
                border: '1px solid #d4d0c8'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontWeight: 600, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Source Sans Pro, Helvetica Neue, Arial, sans-serif' }}>
                    <span>Teams Preview</span>
                    <span style={{ fontWeight: 400, color: '#666666', fontSize: '0.85rem' }}>(shown before "Read Full Article")</span>
                  </label>
                  {!isEditingPreview ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setEditedPreview(currentArticle.preview || '');
                        setIsEditingPreview(true);
                      }}
                    >
                      Edit Preview
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setIsEditingPreview(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={async () => {
                          if (!selectedGroup || !currentArticle) return;
                          setIsSaving(true);
                          try {
                            const response = await groupArticlesApi.update(
                              selectedGroup.id,
                              currentArticle.id,
                              currentArticle.content,
                              currentArticle.title || selectedGroup?.representative_title || '',
                              editedPreview
                            );
                            setArticles((prev: GroupArticle[]) => prev.map(a =>
                              a.id === currentArticle.id ? response.data.article : a
                            ));
                            setIsEditingPreview(false);
                          } catch (err: any) {
                            setError(err.response?.data?.detail || 'Failed to save preview');
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>

                {isEditingPreview ? (
                  <div>
                    <textarea
                      value={editedPreview}
                      onChange={(e: { target: { value: string } }) => {
                        if (e.target.value.length <= PREVIEW_CHAR_LIMIT) {
                          setEditedPreview(e.target.value);
                        }
                      }}
                      placeholder="Write a short teaser that will appear in the Teams card..."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '0.95rem',
                        fontFamily: 'Libre Baskerville, Georgia, serif',
                        border: `2px solid ${editedPreview.length >= PREVIEW_CHAR_LIMIT ? '#8b0000' : editedPreview.length >= PREVIEW_CHAR_LIMIT * 0.9 ? '#b8860b' : '#d4d0c8'}`,
                        borderRadius: '4px',
                        backgroundColor: '#fefdfb',
                        color: '#1a1a1a',
                        resize: 'vertical'
                      }}
                    />
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '8px',
                      fontSize: '0.85rem',
                      fontFamily: 'Source Sans Pro, Helvetica Neue, Arial, sans-serif'
                    }}>
                      <span style={{
                        color: editedPreview.length >= PREVIEW_CHAR_LIMIT ? '#8b0000' : editedPreview.length >= PREVIEW_CHAR_LIMIT * 0.9 ? '#b8860b' : '#666666'
                      }}>
                        {editedPreview.length >= PREVIEW_CHAR_LIMIT && 'Limit reached: '}
                        {editedPreview.length} / {PREVIEW_CHAR_LIMIT} characters
                      </span>
                      <div style={{
                        width: '100px',
                        height: '4px',
                        backgroundColor: '#d4d0c8',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(100, (editedPreview.length / PREVIEW_CHAR_LIMIT) * 100)}%`,
                          height: '100%',
                          backgroundColor: editedPreview.length >= PREVIEW_CHAR_LIMIT ? '#8b0000' : editedPreview.length >= PREVIEW_CHAR_LIMIT * 0.9 ? '#b8860b' : '#2d5a27',
                          transition: 'all 0.2s ease'
                        }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fefdfb',
                    borderRadius: '4px',
                    fontFamily: 'Libre Baskerville, Georgia, serif',
                    color: currentArticle.preview ? '#1a1a1a' : '#666666',
                    fontStyle: currentArticle.preview ? 'normal' : 'italic',
                    minHeight: '60px'
                  }}>
                    {currentArticle.preview || 'No preview set. Click "Edit Preview" to add a teaser for Teams.'}
                    {currentArticle.preview && (
                      <div style={{
                        marginTop: '8px',
                        fontSize: '0.8rem',
                        fontFamily: 'Source Sans Pro, Helvetica Neue, Arial, sans-serif',
                        color: currentArticle.preview.length >= PREVIEW_CHAR_LIMIT ? '#8b0000' : currentArticle.preview.length >= PREVIEW_CHAR_LIMIT * 0.9 ? '#b8860b' : '#666666'
                      }}>
                        {currentArticle.preview.length} / {PREVIEW_CHAR_LIMIT} characters
                        {currentArticle.preview.length >= PREVIEW_CHAR_LIMIT && ' - May be truncated in Teams'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
                    onChange={(e) => {
                      if (e.target.value.length <= PREVIEW_CHAR_LIMIT) {
                        setEditedPreview(e.target.value);
                      }
                    }}
                    placeholder="Write a short teaser that will appear in the Teams card..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '0.95rem',
                      fontFamily: 'Libre Baskerville, Georgia, serif',
                      border: `2px solid ${editedPreview.length >= PREVIEW_CHAR_LIMIT ? '#8b0000' : editedPreview.length >= PREVIEW_CHAR_LIMIT * 0.9 ? '#b8860b' : '#d4d0c8'}`,
                      borderRadius: '4px',
                      backgroundColor: '#fefdfb',
                      color: '#1a1a1a',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '8px',
                    fontSize: '0.85rem',
                    fontFamily: 'Source Sans Pro, Helvetica Neue, Arial, sans-serif'
                  }}>
                    <span style={{
                      color: editedPreview.length >= PREVIEW_CHAR_LIMIT ? '#8b0000' : editedPreview.length >= PREVIEW_CHAR_LIMIT * 0.9 ? '#b8860b' : '#666666'
                    }}>
                      {editedPreview.length >= PREVIEW_CHAR_LIMIT && 'Limit reached: '}
                      {editedPreview.length} / {PREVIEW_CHAR_LIMIT} characters
                    </span>
                    <div style={{
                      width: '100px',
                      height: '4px',
                      backgroundColor: '#d4d0c8',
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min(100, (editedPreview.length / PREVIEW_CHAR_LIMIT) * 100)}%`,
                        height: '100%',
                        backgroundColor: editedPreview.length >= PREVIEW_CHAR_LIMIT ? '#8b0000' : editedPreview.length >= PREVIEW_CHAR_LIMIT * 0.9 ? '#b8860b' : '#2d5a27',
                        transition: 'all 0.2s ease'
                      }} />
                    </div>
                  </div>
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
              <h3>Refine Article with AI</h3>
              <p className="small muted">
                Type instructions to refine the article (e.g., "Make it shorter" or "Add more context about the technology")
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
                {isRefining ? 'Refining...' : 'Refine with AI'}
              </button>
            </div>
          )}

          {!isEditing && (
            <div className="cooking-article-actions">
              <button className="btn btn-secondary" onClick={backToCooking}>
                ← Back to Cooking
              </button>
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
              <button className="btn btn-success" onClick={markAsPublished}>
                Mark as Published
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

  // No article found
  return (
    <div className="cooking-container">
      <div className="cooking-header">
        <h1>Serving</h1>
        <div className="cooking-header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setSelectedGroup(null)}
          >
            ← All Articles
          </button>
        </div>
      </div>
      <div style={{ padding: '24px', textAlign: 'center', color: '#666666', fontFamily: 'Libre Baskerville, Georgia, serif' }}>
        <p>No articles found for this group.</p>
        <p style={{ marginTop: '12px', fontSize: '0.9em', fontStyle: 'italic' }}>
          This group was moved to Serving without generating an article.
        </p>
        <div style={{ marginTop: '24px' }}>
          <button
            className="btn btn-primary"
            onClick={backToCooking}
            title="Move back to Cooking to generate articles"
          >
            ← Back to Cooking
          </button>
        </div>
      </div>
    </div>
  );
}

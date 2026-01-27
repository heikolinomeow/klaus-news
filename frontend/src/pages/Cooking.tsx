import { useState, useEffect } from 'react';
import { groupsApi, researchApi, groupArticlesApi } from '../services/api';
import { Group, Post, GroupResearch, GroupArticle } from '../types';

type ResearchMode = 'quick' | 'agentic' | 'deep';
type ArticleStyle = 'news_brief' | 'full_article' | 'executive_summary' | 'analysis' | 'custom';

export default function Cooking() {
  // Groups & Posts
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  // Research
  const [research, setResearch] = useState<GroupResearch | null>(null);
  const [researchMode, setResearchMode] = useState<ResearchMode>('agentic');
  const [isResearchLoading, setIsResearchLoading] = useState(false);
  const [isEditingResearch, setIsEditingResearch] = useState(false);
  const [editedResearchText, setEditedResearchText] = useState('');

  // Article
  const [article, setArticle] = useState<GroupArticle | null>(null);
  const [articleStyle, setArticleStyle] = useState<ArticleStyle>('news_brief');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [refinementInstruction, setRefinementInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // View state
  const [view, setView] = useState<'cooking' | 'article'>('cooking');
  const [error, setError] = useState<string | null>(null);

  // Load groups in COOKING state
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await groupsApi.getAll();
      const cookingGroups = response.data.groups.filter(
        (g: Group) => g.state === 'COOKING'
      );
      setGroups(cookingGroups);

      // Auto-select if only one group
      if (cookingGroups.length === 1) {
        selectGroup(cookingGroups[0]);
      } else if (cookingGroups.length === 0) {
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
      setPosts(postsResponse.data.posts || []);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setPosts([]);
    }

    // Load existing research if any
    try {
      const researchResponse = await researchApi.get(group.id);
      setResearch(researchResponse.data);
    } catch (err) {
      // No research yet, that's fine
      setResearch(null);
    }

    // Load existing article if any
    try {
      const articleResponse = await groupArticlesApi.get(group.id);
      setArticle(articleResponse.data);
    } catch (err) {
      // No article yet, that's fine
      setArticle(null);
    }
  };

  const runResearch = async () => {
    if (!selectedGroup) return;

    setIsResearchLoading(true);
    setError(null);

    try {
      const response = await researchApi.run(selectedGroup.id, researchMode);
      setResearch(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to run research');
      console.error(err);
    } finally {
      setIsResearchLoading(false);
    }
  };

  const startEditingResearch = () => {
    if (!research) return;
    setEditedResearchText(research.edited_output || research.original_output);
    setIsEditingResearch(true);
  };

  const saveResearchEdits = async () => {
    if (!selectedGroup || !research) return;

    try {
      await researchApi.update(selectedGroup.id, editedResearchText);
      setResearch({
        ...research,
        edited_output: editedResearchText,
        updated_at: new Date().toISOString()
      });
      setIsEditingResearch(false);
    } catch (err) {
      setError('Failed to save research edits');
      console.error(err);
    }
  };

  const cancelResearchEdits = () => {
    setIsEditingResearch(false);
    setEditedResearchText('');
  };

  const resetResearch = () => {
    if (!research) return;
    setEditedResearchText(research.original_output);
  };

  const generateArticle = async () => {
    if (!selectedGroup) return;

    setIsGeneratingArticle(true);
    setError(null);

    try {
      const response = await groupArticlesApi.generate(
        selectedGroup.id,
        articleStyle,
        articleStyle === 'custom' ? customPrompt : undefined
      );
      setArticle(response.data);
      setView('article');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate article');
      console.error(err);
    } finally {
      setIsGeneratingArticle(false);
    }
  };

  const refineArticle = async () => {
    if (!selectedGroup || !refinementInstruction.trim()) return;

    setIsRefining(true);
    setError(null);

    try {
      const response = await groupArticlesApi.refine(
        selectedGroup.id,
        refinementInstruction
      );
      setArticle(response.data);
      setRefinementInstruction('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to refine article');
      console.error(err);
    } finally {
      setIsRefining(false);
    }
  };

  const copyToClipboard = () => {
    if (!article) return;
    navigator.clipboard.writeText(article.content);
    alert('Article copied to clipboard!');
  };

  // Group selector view
  if (!selectedGroup && groups.length > 1) {
    return (
      <div className="cooking-container">
        <div className="cooking-header">
          <h1>Cooking</h1>
          <p>Select a group to work with:</p>
        </div>
        <div className="cooking-group-selector">
          {groups.map(group => (
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
          <h1>Cooking</h1>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  // Article view
  if (view === 'article' && article) {
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
            <h2>{selectedGroup?.representative_title}</h2>
            <div className="article-text">{article.content}</div>
          </div>

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

          <div className="cooking-article-actions">
            <button className="btn btn-secondary" onClick={copyToClipboard}>
              Copy to Clipboard
            </button>
            <button className="btn btn-primary" onClick={() => alert('Publish feature coming soon')}>
              Mark as Published
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main cooking view (two-panel)
  return (
    <div className="cooking-container">
      <div className="cooking-header">
        <h1>Cooking</h1>
        {selectedGroup && (
          <div className="cooking-group-info">
            <h2>{selectedGroup.representative_title}</h2>
            <div className="cooking-group-meta">
              <span className="badge">{selectedGroup.category}</span>
              <span className="small muted">{posts.length} posts</span>
            </div>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="cooking-panels">
        {/* Left panel: Posts */}
        <div className="cooking-panel posts-panel">
          <h3>Posts</h3>
          {posts.length === 0 ? (
            <p className="small muted">No posts found for this group</p>
          ) : (
            <div className="posts-list">
              {posts.map(post => (
                <div key={post.id} className="post-card-cooking">
                  <div className="post-author">{post.author || 'Unknown'}</div>
                  <div className="post-text">{post.original_text}</div>
                  {post.worthiness_score && (
                    <div className="post-score small muted">
                      Score: {post.worthiness_score.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel: Research */}
        <div className="cooking-panel research-panel">
          <h3>Research Output</h3>

          {!research && !isResearchLoading && (
            <div className="research-placeholder">
              <p className="small muted">No research has been run yet.</p>
              <p className="small muted">Select a research mode and click "Run Research" to begin.</p>
            </div>
          )}

          {isResearchLoading && (
            <div className="research-loading">
              <div className="spinner"></div>
              <p>Running {researchMode} research...</p>
            </div>
          )}

          {research && !isEditingResearch && (
            <div className="research-content">
              <pre className="research-output">
                {research.edited_output || research.original_output}
              </pre>
              {research.sources && research.sources.length > 0 && (
                <div className="research-sources">
                  <h4>Sources</h4>
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
              <button
                className="btn btn-secondary btn-sm"
                onClick={startEditingResearch}
              >
                Edit
              </button>
            </div>
          )}

          {isEditingResearch && (
            <div className="research-edit">
              <textarea
                className="research-edit-textarea"
                value={editedResearchText}
                onChange={(e) => setEditedResearchText(e.target.value)}
                rows={15}
              />
              <div className="research-edit-actions">
                <button className="btn btn-secondary btn-sm" onClick={resetResearch}>
                  Reset to Original
                </button>
                <button className="btn btn-secondary btn-sm" onClick={cancelResearchEdits}>
                  Cancel
                </button>
                <button className="btn btn-primary btn-sm" onClick={saveResearchEdits}>
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="cooking-action-bar">
        <div className="cooking-action-group">
          <label htmlFor="research-mode">Research:</label>
          <select
            id="research-mode"
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
            className="btn btn-secondary"
            onClick={runResearch}
            disabled={isResearchLoading || !selectedGroup}
          >
            {isResearchLoading ? 'Running...' : 'Run Research'}
          </button>
        </div>

        <div className="cooking-action-group">
          <label htmlFor="article-style">Style:</label>
          <select
            id="article-style"
            className="cooking-select"
            value={articleStyle}
            onChange={(e) => setArticleStyle(e.target.value as ArticleStyle)}
            disabled={isGeneratingArticle}
          >
            <option value="news_brief">News Brief</option>
            <option value="full_article">Full Article</option>
            <option value="executive_summary">Executive Summary</option>
            <option value="analysis">Analysis</option>
            <option value="custom">Custom</option>
          </select>

          {articleStyle === 'custom' && (
            <input
              type="text"
              className="cooking-custom-prompt"
              placeholder="Enter custom prompt..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={isGeneratingArticle}
            />
          )}

          <button
            className="btn btn-primary"
            onClick={generateArticle}
            disabled={isGeneratingArticle || !selectedGroup || (articleStyle === 'custom' && !customPrompt.trim())}
          >
            {isGeneratingArticle ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}

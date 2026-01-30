import { useEffect, useState } from 'react';
import { settingsApi, listsApi, adminApi, promptsApi } from '../services/api';
import DataSourceManager from '../components/DataSourceManager';
import SettingsNav from '../components/SettingsNav';
import PromptTile from '../components/PromptTile';
import AddCategoryModal from '../components/AddCategoryModal';
import CategoryMismatchLogModal from '../components/CategoryMismatchLogModal';
import TeamsSettingsSection from '../components/TeamsSettingsSection';

export default function Settings() {
  const [nextRunTime, setNextRunTime] = useState<string | null>(null);
  const [ingestInterval, setIngestInterval] = useState(30);
  const [archiveAgeDays, setArchiveAgeDays] = useState(7);
  const [archiveTime, setArchiveTime] = useState('03:00');
  const [archivePreviewCount, setArchivePreviewCount] = useState<number | null>(null);
  const [postsPerFetch, setPostsPerFetch] = useState(5);
  const [estimatedApiCalls, setEstimatedApiCalls] = useState(0);
  const [enabledListsCount, setEnabledListsCount] = useState(0);
  const [duplicateThreshold, setDuplicateThreshold] = useState(0.85);
  const [autoFetchEnabled, setAutoFetchEnabled] = useState(false);
  const [operationFeedback, setOperationFeedback] = useState<string | null>(null);
  const [worthinessPrompt, setWorthinessPrompt] = useState<any>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<any>(null);
  const [categorizePrompt, setCategorizePrompt] = useState<any>(null);
  const [researchPrompt, setResearchPrompt] = useState<any>(null);
  const [openContentSection, setOpenContentSection] = useState<string | null>(null);
  const [openSystemSection, setOpenSystemSection] = useState<string | null>(null);

  // V-5, V-8: Categories state
  const [categories, setCategories] = useState<Array<{id: string; name: string; description: string; order: number}>>([]);
  const [categoryMismatches, setCategoryMismatches] = useState<Array<any>>([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showMismatchLogModal, setShowMismatchLogModal] = useState(false);
  const [categoryEditStates, setCategoryEditStates] = useState<Record<string, string>>({});

  // Article Style Prompts state
  const [articleStylePrompts, setArticleStylePrompts] = useState<Record<string, string>>({});
  const [editedArticleStylePrompts, setEditedArticleStylePrompts] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSchedulerStatus();
    const interval = setInterval(loadSchedulerStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadArchivePreview();
  }, [archiveAgeDays]);

  useEffect(() => {
    loadEnabledListsCount();
  }, []);

  useEffect(() => {
    calculateApiRate(postsPerFetch, ingestInterval, enabledListsCount);
  }, [postsPerFetch, ingestInterval, enabledListsCount]);

  useEffect(() => {
    loadAutoFetchSetting();
  }, []);

  useEffect(() => {
    loadSystemSettings();
  }, []);

  useEffect(() => {
    loadPrompts();
  }, []);

  useEffect(() => {
    loadCategories();
    loadCategoryMismatches();
  }, []);

  useEffect(() => {
    loadArticleStylePrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const [worthiness, duplicate, categorize, research] = await Promise.all([
        promptsApi.getByKey('score_worthiness'),
        promptsApi.getByKey('detect_duplicate'),
        promptsApi.getByKey('categorize_post'),
        promptsApi.getByKey('research_prompt').catch(() => null)
      ]);
      setWorthinessPrompt(worthiness.data);
      setDuplicatePrompt(duplicate.data);
      setCategorizePrompt(categorize.data);
      if (research?.data) setResearchPrompt(research.data);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  };

  const loadArticleStylePrompts = async () => {
    try {
      const response = await settingsApi.getArticlePrompts();
      setArticleStylePrompts(response.data.prompts);
      setEditedArticleStylePrompts(response.data.prompts);
    } catch (error) {
      console.error('Failed to load article style prompts:', error);
    }
  };

  const handleSaveArticleStylePrompt = async (style: string) => {
    try {
      const settingKey = `article_prompt_${style}`;
      await settingsApi.update(settingKey, editedArticleStylePrompts[style]);
      setArticleStylePrompts({
        ...articleStylePrompts,
        [style]: editedArticleStylePrompts[style]
      });
      setOperationFeedback('✓ Article style prompt saved');
      setTimeout(() => setOperationFeedback(null), 2000);
    } catch (error) {
      setOperationFeedback('✗ Failed to save article style prompt');
      setTimeout(() => setOperationFeedback(null), 3000);
    }
  };

  // V-5, V-8: Load categories and mismatches
  const loadCategories = async () => {
    try {
      const response = await settingsApi.getByKey('categories');
      if (response.data && response.data.value) {
        const cats = JSON.parse(response.data.value);
        setCategories(cats);
        // Initialize edit states
        const editStates: Record<string, string> = {};
        cats.forEach((cat: any) => { editStates[cat.id] = cat.description; });
        setCategoryEditStates(editStates);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadCategoryMismatches = async () => {
    try {
      const response = await settingsApi.getByKey('category_mismatches');
      if (response.data && response.data.value) {
        setCategoryMismatches(JSON.parse(response.data.value));
      }
    } catch (error) {
      console.error('Failed to load category mismatches:', error);
    }
  };

  const handleSaveCategoryDescription = async (categoryId: string) => {
    const newDescription = categoryEditStates[categoryId];
    const updatedCategories = categories.map(cat =>
      cat.id === categoryId ? { ...cat, description: newDescription } : cat
    );
    try {
      await settingsApi.update('categories', JSON.stringify(updatedCategories));
      setCategories(updatedCategories);
      setOperationFeedback('✓ Category description saved');
      setTimeout(() => setOperationFeedback(null), 2000);
    } catch (error) {
      setOperationFeedback('✗ Failed to save category');
      setTimeout(() => setOperationFeedback(null), 3000);
    }
  };

  const handleAddCategory = async (name: string, description: string) => {
    const newId = `cat-${Date.now()}`;
    const newOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) + 1 : 1;
    const newCategory = { id: newId, name, description, order: newOrder };
    const updatedCategories = [...categories, newCategory];
    try {
      await settingsApi.update('categories', JSON.stringify(updatedCategories));
      setCategories(updatedCategories);
      setCategoryEditStates({ ...categoryEditStates, [newId]: description });
      setShowAddCategoryModal(false);
      setOperationFeedback('✓ Category added');
      setTimeout(() => setOperationFeedback(null), 2000);
    } catch (error) {
      setOperationFeedback('✗ Failed to add category');
      setTimeout(() => setOperationFeedback(null), 3000);
    }
  };

  const handleClearMismatchLog = async () => {
    try {
      await settingsApi.update('category_mismatches', '[]');
      setCategoryMismatches([]);
      setOperationFeedback('✓ Mismatch log cleared');
      setTimeout(() => setOperationFeedback(null), 2000);
    } catch (error) {
      setOperationFeedback('✗ Failed to clear log');
      setTimeout(() => setOperationFeedback(null), 3000);
    }
  };

  const loadAutoFetchSetting = async () => {
    try {
      const response = await settingsApi.getByKey('auto_fetch_enabled');
      if (response.data && response.data.value !== undefined) {
        setAutoFetchEnabled(response.data.value === 'true' || response.data.value === true);
      }
    } catch (error) {
      console.error('Failed to load auto-fetch setting:', error);
    }
  };

  const loadSystemSettings = async () => {
    try {
      const [
        postsPerFetchRes,
        ingestIntervalRes,
        archiveAgeDaysRes,
        archiveTimeHourRes,
        duplicateThresholdRes
      ] = await Promise.all([
        settingsApi.getByKey('posts_per_fetch'),
        settingsApi.getByKey('ingest_interval_minutes'),
        settingsApi.getByKey('archive_age_days'),
        settingsApi.getByKey('archive_time_hour'),
        settingsApi.getByKey('duplicate_threshold')
      ]);

      if (postsPerFetchRes.data?.value) {
        setPostsPerFetch(parseInt(postsPerFetchRes.data.value));
      }
      if (ingestIntervalRes.data?.value) {
        setIngestInterval(parseInt(ingestIntervalRes.data.value));
      }
      if (archiveAgeDaysRes.data?.value) {
        setArchiveAgeDays(parseInt(archiveAgeDaysRes.data.value));
      }
      if (archiveTimeHourRes.data?.value) {
        const hour = parseInt(archiveTimeHourRes.data.value);
        setArchiveTime(`${hour.toString().padStart(2, '0')}:00`);
      }
      if (duplicateThresholdRes.data?.value) {
        setDuplicateThreshold(parseFloat(duplicateThresholdRes.data.value));
      }
    } catch (error) {
      console.error('Failed to load system settings:', error);
    }
  };

  const handleToggleAutoFetch = async () => {
    const newValue = !autoFetchEnabled;
    setAutoFetchEnabled(newValue);
    await updateSetting('auto_fetch_enabled', newValue.toString());
  };

  const loadSchedulerStatus = async () => {
    try {
      const response = await adminApi.getSchedulerStatus();

      const ingestJob = response.data.jobs.find((j: any) => j.id === 'ingest_posts');
      if (ingestJob && ingestJob.next_run_time) {
        const nextRun = new Date(ingestJob.next_run_time);
        const now = new Date();
        const diffMinutes = Math.floor((nextRun.getTime() - now.getTime()) / 60000);
        setNextRunTime(`${diffMinutes} minutes`);
      }
    } catch (error) {
      console.error('Failed to load scheduler status:', error);
    }
  };

  const handleTriggerIngestion = async () => {
    try {
      console.log('[DEBUG] Setting feedback to: Triggering ingestion...');
      setOperationFeedback('⏳ Triggering ingestion...');

      const response = await adminApi.triggerIngestion();
      console.log('[DEBUG] API response:', response.data);

      const message = response.data.message;
      const stats = response.data.stats;

      // Show result with actual stats from backend
      const feedback = stats.new_posts_added === 0
        ? `ℹ️ ${message}`
        : `✓ ${message}`;

      console.log('[DEBUG] Setting feedback to:', feedback);
      setOperationFeedback(feedback);

      setTimeout(() => {
        console.log('[DEBUG] Clearing feedback');
        setOperationFeedback(null);
      }, 5000);

      loadSchedulerStatus();
    } catch (error) {
      console.error('[DEBUG] Ingestion error:', error);
      setOperationFeedback('✗ Ingestion failed - check System Logs for details');
      setTimeout(() => setOperationFeedback(null), 5000);
      console.error('Failed to trigger ingestion:', error);
    }
  };

  const handleTriggerArchive = async () => {
    try {
      setOperationFeedback('Triggering archival...');
      await adminApi.triggerArchive();
      setOperationFeedback('✓ Archival completed successfully');
      setTimeout(() => setOperationFeedback(null), 3000);
      loadArchivePreview();
    } catch (error) {
      setOperationFeedback('✗ Archival failed');
      setTimeout(() => setOperationFeedback(null), 3000);
      console.error('Failed to trigger archive:', error);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await settingsApi.update(key, value);
      if (key === 'ingest_interval_minutes') {
        setIngestInterval(parseInt(value));
        loadSchedulerStatus(); // Refresh next run time
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const loadArchivePreview = async () => {
    try {
      const response = await adminApi.getArchivePreview();
      setArchivePreviewCount(response.data.count);
    } catch (error) {
      console.error('Failed to load archive preview:', error);
    }
  };

  const loadEnabledListsCount = async () => {
    try {
      const response = await listsApi.getAll();
      const count = response.data.lists.filter((l: any) => l.enabled).length;
      setEnabledListsCount(count);
    } catch (error) {
      console.error('Failed to load lists count:', error);
    }
  };

  const calculateApiRate = (posts: number, interval: number, listsCount: number) => {
    const cyclesPerHour = 60 / interval;
    const callsPerHour = Math.round(posts * listsCount * cyclesPerHour);
    setEstimatedApiCalls(callsPerHour);
  };

  const toggleContentSection = (section: string) => {
    setOpenContentSection(openContentSection === section ? null : section);
  };

  const toggleSystemSection = (section: string) => {
    setOpenSystemSection(openSystemSection === section ? null : section);
  };

  return (
    <div className="settings-container">
      <h1>Settings</h1>
      <SettingsNav />

      <div className="settings-grid">
        <section className="settings-tile">
          <h2>Data Sources</h2>
          <DataSourceManager />
        </section>
        <section className="settings-tile">
          <h2>Content</h2>

          <div className="collapsible-section">
            <div
              className={`collapsible-header ${openContentSection === 'worthiness' ? 'active' : ''}`}
              onClick={() => toggleContentSection('worthiness')}
            >
              <h3>Worthiness</h3>
              <span className="collapsible-icon">▼</span>
            </div>
            <div className={`collapsible-content ${openContentSection === 'worthiness' ? 'open' : ''}`}>
              <div className="collapsible-content-inner">
                {worthinessPrompt && (
                  <div className="prompt-tile-container">
                    <PromptTile prompt={worthinessPrompt} onUpdate={loadPrompts} />
                  </div>
                )}

              </div>
            </div>
          </div>

          <div className="collapsible-section">
            <div
              className={`collapsible-header ${openContentSection === 'duplicate' ? 'active' : ''}`}
              onClick={() => toggleContentSection('duplicate')}
            >
              <h3>Duplicate Detection</h3>
              <span className="collapsible-icon">▼</span>
            </div>
            <div className={`collapsible-content ${openContentSection === 'duplicate' ? 'open' : ''}`}>
              <div className="collapsible-content-inner">
                {duplicatePrompt && (
                  <div className="prompt-tile-container">
                    <PromptTile prompt={duplicatePrompt} onUpdate={loadPrompts} />
                  </div>
                )}

                <div className="setting-subgroup">
                  <h4>Duplicate Detection Threshold</h4>
                  <p>Controls the AI confidence required to group posts as duplicates. Lower values mean more aggressive grouping.</p>

                  <label>
                    AI Confidence Threshold:
                    <input
                      type="range"
                      min="0.5"
                      max="1"
                      step="0.05"
                      value={duplicateThreshold}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setDuplicateThreshold(value);
                      }}
                      onMouseUp={() => updateSetting('duplicate_threshold', duplicateThreshold.toString())}
                      onTouchEnd={() => updateSetting('duplicate_threshold', duplicateThreshold.toString())}
                    />
                    <span className="threshold-value">{duplicateThreshold.toFixed(2)}</span>
                  </label>

                  <p className="help-text">
                    Current threshold: {duplicateThreshold.toFixed(2)} (0.5 = aggressive grouping, 1.0 = strict matching)
                    <br />
                    {duplicateThreshold < 0.7 && (
                      <strong style={{ color: '#dc3545' }}>Aggressive - more posts grouped together</strong>
                    )}
                    {duplicateThreshold >= 0.7 && duplicateThreshold < 0.9 && (
                      <strong style={{ color: '#28a745' }}>Balanced - recommended setting</strong>
                    )}
                    {duplicateThreshold >= 0.9 && (
                      <strong style={{ color: '#ffc107' }}>Strict - only highly similar posts grouped</strong>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="collapsible-section">
            <div
              className={`collapsible-header ${openContentSection === 'category' ? 'active' : ''}`}
              onClick={() => toggleContentSection('category')}
            >
              <h3>Category Filters</h3>
              <span className="collapsible-icon">▼</span>
            </div>
            <div className={`collapsible-content ${openContentSection === 'category' ? 'open' : ''}`}>
              <div className="collapsible-content-inner">
                {/* V-5 Subsection 1: Categorization Prompt */}
                <div className="setting-subgroup">
                  <h4>Categorization Prompt</h4>
                  {categorizePrompt && (
                    <div className="prompt-tile-container">
                      <PromptTile prompt={categorizePrompt} onUpdate={loadPrompts} />
                    </div>
                  )}
                </div>

                {/* V-5 Subsection 2: Categories List */}
                <div className="setting-subgroup">
                  <h4>Categories</h4>
                  <div className="category-cards">
                    {categories.sort((a, b) => a.order - b.order).map(category => (
                      <div key={category.id} className="category-card">
                        <div className="category-card-header">
                          <strong>{category.name}</strong>
                        </div>
                        <textarea
                          value={categoryEditStates[category.id] || category.description}
                          onChange={(e) => setCategoryEditStates({
                            ...categoryEditStates,
                            [category.id]: e.target.value
                          })}
                          rows={3}
                        />
                        <button
                          className="btn-primary btn-small"
                          onClick={() => handleSaveCategoryDescription(category.id)}
                        >
                          Save
                        </button>
                      </div>
                    ))}

                    {/* Other card - locked */}
                    <div className="category-card category-card-locked">
                      <div className="category-card-header">
                        <strong>Other</strong>
                        <span className="lock-icon">🔒</span>
                      </div>
                      <p className="category-description-readonly">
                        Content not related to AI, ML, or adjacent technologies. General tech news, unrelated topics, off-topic discussions. (system default)
                      </p>
                    </div>
                  </div>

                  <button
                    className="btn-secondary"
                    onClick={() => setShowAddCategoryModal(true)}
                    style={{ marginTop: '1rem' }}
                  >
                    + Add New Category
                  </button>

                  <p className="help-text" style={{ marginTop: '1rem' }}>
                    Category names cannot be changed or deleted to preserve existing post assignments.
                    Descriptions can be edited anytime.
                  </p>
                </div>

                {/* V-5 Subsection 3: Category Matching Stats */}
                <div className="setting-subgroup">
                  <h4>Category Matching Stats</h4>
                  <div className="mismatch-stats">
                    <span className="mismatch-count">
                      ⚠️ Category mismatches: {categoryMismatches.length}
                    </span>
                    <p className="help-text">
                      Posts where AI returned unrecognized category and fell back to "Other"
                    </p>
                    <div className="mismatch-actions">
                      <button
                        className="btn-secondary btn-small"
                        onClick={() => setShowMismatchLogModal(true)}
                        disabled={categoryMismatches.length === 0}
                      >
                        View Log
                      </button>
                      <button
                        className="btn-secondary btn-small"
                        onClick={handleClearMismatchLog}
                        disabled={categoryMismatches.length === 0}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* V-6: Add Category Modal */}
          {showAddCategoryModal && (
            <AddCategoryModal
              onClose={() => setShowAddCategoryModal(false)}
              onAdd={handleAddCategory}
              existingNames={categories.map(c => c.name)}
            />
          )}

          {/* V-7: Category Mismatch Log Modal */}
          {showMismatchLogModal && (
            <CategoryMismatchLogModal
              mismatches={categoryMismatches}
              onClose={() => setShowMismatchLogModal(false)}
              onClear={handleClearMismatchLog}
            />
          )}

          <div className="collapsible-section">
            <div
              className={`collapsible-header ${openContentSection === 'articleStyles' ? 'active' : ''}`}
              onClick={() => toggleContentSection('articleStyles')}
            >
              <h3>Article Style Prompts</h3>
              <span className="collapsible-icon">▼</span>
            </div>
            <div className={`collapsible-content ${openContentSection === 'articleStyles' ? 'open' : ''}`}>
              <div className="collapsible-content-inner">
                <p className="help-text" style={{ marginBottom: '16px' }}>
                  Default prompts used when generating articles in the Cooking page.
                  Edit these to customize the default style for each article type.
                </p>

                {Object.entries(editedArticleStylePrompts).map(([style, prompt]) => (
                  <div key={style} className="setting-subgroup">
                    <h4>{style.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</h4>
                    <textarea
                      value={prompt}
                      onChange={(e) => setEditedArticleStylePrompts({
                        ...editedArticleStylePrompts,
                        [style]: e.target.value
                      })}
                      rows={4}
                    />
                    <div className="button-group">
                      <button
                        className="btn-primary btn-small"
                        onClick={() => handleSaveArticleStylePrompt(style)}
                        disabled={editedArticleStylePrompts[style] === articleStylePrompts[style]}
                      >
                        Save
                      </button>
                      <button
                        className="btn-secondary btn-small"
                        onClick={() => setEditedArticleStylePrompts({
                          ...editedArticleStylePrompts,
                          [style]: articleStylePrompts[style]
                        })}
                        disabled={editedArticleStylePrompts[style] === articleStylePrompts[style]}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                ))}

                {Object.keys(editedArticleStylePrompts).length === 0 && (
                  <p className="help-text">No article style prompts configured.</p>
                )}
              </div>
            </div>
          </div>

          <div className="collapsible-section">
            <div
              className={`collapsible-header ${openContentSection === 'research' ? 'active' : ''}`}
              onClick={() => toggleContentSection('research')}
            >
              <h3>Research Prompt</h3>
              <span className="collapsible-icon">▼</span>
            </div>
            <div className={`collapsible-content ${openContentSection === 'research' ? 'open' : ''}`}>
              <div className="collapsible-content-inner">
                <p className="help-text" style={{ marginBottom: '16px' }}>
                  Default prompt used when running research in the Cooking page.
                  Uses <code>{"{{TITLE}}"}</code> and <code>{"{{SUMMARY}}"}</code> placeholders.
                </p>

                {researchPrompt ? (
                  <div className="prompt-tile-container">
                    <PromptTile prompt={researchPrompt} onUpdate={loadPrompts} />
                  </div>
                ) : (
                  <p className="help-text">Research prompt not configured. It will be created on first use.</p>
                )}
              </div>
            </div>
          </div>
        </section>
        <section className="settings-tile">
          <h2>System Control</h2>

          {operationFeedback && (
              <div className={`operation-feedback ${operationFeedback.includes('✓') ? 'success' : operationFeedback.includes('✗') ? 'error' : 'info'}`}>
                {operationFeedback}
              </div>
            )}

            <div className="collapsible-section">
              <div
                className={`collapsible-header ${openSystemSection === 'ingestion' ? 'active' : ''}`}
                onClick={() => toggleSystemSection('ingestion')}
              >
                <h3>Ingestion</h3>
                <span className="collapsible-icon">▼</span>
              </div>
              <div className={`collapsible-content ${openSystemSection === 'ingestion' ? 'open' : ''}`}>
                <div className="collapsible-content-inner">
                  <div className="setting-subgroup">
                    <h4>Auto-Fetch Enabled/Disabled</h4>
                    <p>Control whether the system automatically fetches new posts from X lists.</p>

                    <div className="scheduler-controls">
                      <button
                        className={`scheduler-toggle ${autoFetchEnabled ? 'running' : 'paused'}`}
                        onClick={handleToggleAutoFetch}
                      >
                        {autoFetchEnabled ? '⏸ Disable Auto-Fetch' : '▶ Enable Auto-Fetch'}
                      </button>

                      <p className="help-text">
                        Status: <strong>{autoFetchEnabled ? 'ENABLED' : 'DISABLED'}</strong>
                        <br />
                        {autoFetchEnabled
                          ? 'System will automatically fetch posts at the configured interval.'
                          : 'Automatic fetching is disabled. Use manual trigger below.'}
                      </p>
                    </div>
                  </div>

                  <div className="setting-subgroup">
                    <h4>Ingestion Interval</h4>
                    <p>Control how often the system fetches new posts from X lists.</p>

                    <label>
                      Interval (minutes):
                      <select
                        value={ingestInterval.toString()}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setIngestInterval(value);
                          updateSetting('ingest_interval_minutes', e.target.value);
                        }}
                      >
                        <option value="5">Every 5 minutes</option>
                        <option value="15">Every 15 minutes</option>
                        <option value="30">Every 30 minutes</option>
                        <option value="60">Every 1 hour</option>
                        <option value="120">Every 2 hours</option>
                        <option value="360">Every 6 hours</option>
                      </select>
                    </label>

                    {nextRunTime && (
                      <p className="help-text next-run">
                        Next run: in {nextRunTime}
                      </p>
                    )}

                    <p className="help-text">
                      Changes apply to next scheduled job (no restart required)
                    </p>
                  </div>

                  <div className="setting-subgroup">
                    <h4>Manual Ingestion Trigger</h4>
                    <button
                      className="operation-button"
                      onClick={handleTriggerIngestion}
                      disabled={operationFeedback !== null}
                    >
                      Trigger Ingestion Now
                    </button>
                    <p className="operation-description">
                      Fetch new posts from all enabled X/Twitter lists immediately
                    </p>
                  </div>

                  <div className="setting-subgroup">
                    <h4>Posts Per Fetch</h4>
                    <p>Control how many posts are fetched from each list per cycle.</p>

                    <label>
                      Posts per fetch:
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={postsPerFetch}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setPostsPerFetch(value);
                          calculateApiRate(value, ingestInterval, enabledListsCount);
                        }}
                        onBlur={() => updateSetting('posts_per_fetch', postsPerFetch.toString())}
                      />
                    </label>

                    <div className="api-rate-calculator">
                      <strong>Estimated API calls per hour:</strong> {estimatedApiCalls}
                      <p className="calc-formula">
                        Formula: {postsPerFetch} posts × {enabledListsCount} lists × {60 / ingestInterval} cycles/hour = {estimatedApiCalls} calls/hour
                      </p>
                    </div>

                    {estimatedApiCalls > 50 && (
                      <div className="warning">
                        Warning: High API call rate may exceed X API limits
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="collapsible-section">
              <div
                className={`collapsible-header ${openSystemSection === 'archival' ? 'active' : ''}`}
                onClick={() => toggleSystemSection('archival')}
              >
                <h3>Archival</h3>
                <span className="collapsible-icon">▼</span>
              </div>
              <div className={`collapsible-content ${openSystemSection === 'archival' ? 'open' : ''}`}>
                <div className="collapsible-content-inner">
                  <div className="setting-subgroup">
                    <h4>Archival Settings</h4>
                    <p>Configure automatic archival of old unselected posts.</p>

                    <label>
                      Archive Age (days):
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={archiveAgeDays}
                        onChange={(e) => {
                          setArchiveAgeDays(parseInt(e.target.value));
                          loadArchivePreview();
                        }}
                        onBlur={() => updateSetting('archive_age_days', archiveAgeDays.toString())}
                      />
                    </label>

                    <label>
                      Archive Time:
                      <input
                        type="time"
                        value={archiveTime}
                        onChange={(e) => {
                          setArchiveTime(e.target.value);
                          const hour = new Date(`1970-01-01T${e.target.value}`).getHours();
                          updateSetting('archive_time_hour', hour.toString());
                        }}
                      />
                    </label>

                    <p className="help-text">
                      Posts older than {archiveAgeDays} days will be archived at {archiveTime}
                    </p>

                    {archivePreviewCount !== null && (
                      <div className="archive-preview">
                        <strong>Posts eligible for archival:</strong> {archivePreviewCount}
                      </div>
                    )}
                  </div>

                  <div className="setting-subgroup">
                    <h4>Manual Archival Trigger</h4>
                    <button
                      className="operation-button"
                      onClick={handleTriggerArchive}
                      disabled={operationFeedback !== null}
                    >
                      Trigger Archival Now
                    </button>
                    <p className="operation-description">
                      Archive old posts based on current archive settings
                      {archivePreviewCount !== null && (
                        <span> ({archivePreviewCount} posts eligible)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="collapsible-section">
              <div
                className={`collapsible-header ${openSystemSection === 'teams' ? 'active' : ''}`}
                onClick={() => toggleSystemSection('teams')}
              >
                <h3>Teams Integration</h3>
                <span className="collapsible-icon">▼</span>
              </div>
              <div className={`collapsible-content ${openSystemSection === 'teams' ? 'open' : ''}`}>
                <div className="collapsible-content-inner">
                  <TeamsSettingsSection />
                </div>
              </div>
            </div>
        </section>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { settingsApi, listsApi, adminApi, promptsApi } from '../services/api';
import DataSourceManager from '../components/DataSourceManager';
import SettingsNav from '../components/SettingsNav';
import PromptTile from '../components/PromptTile';

export default function Settings() {
  const [nextRunTime, setNextRunTime] = useState<string | null>(null);
  const [ingestInterval, setIngestInterval] = useState(30);
  const [archiveAgeDays, setArchiveAgeDays] = useState(7);
  const [archiveTime, setArchiveTime] = useState('03:00');
  const [archivePreviewCount, setArchivePreviewCount] = useState<number | null>(null);
  const [postsPerFetch, setPostsPerFetch] = useState(5);
  const [estimatedApiCalls, setEstimatedApiCalls] = useState(0);
  const [enabledListsCount, setEnabledListsCount] = useState(0);
  const [worthinessThreshold, setWorthinessThreshold] = useState(0.6);
  const [duplicateThreshold, setDuplicateThreshold] = useState(0.85);
  const [enabledCategories, setEnabledCategories] = useState<string[]>([
    'Technology', 'Politics', 'Business', 'Science', 'Health', 'Other'
  ]);
  const [autoFetchEnabled, setAutoFetchEnabled] = useState(true);
  const [operationFeedback, setOperationFeedback] = useState<string | null>(null);
  const [worthinessPrompt, setWorthinessPrompt] = useState<any>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<any>(null);
  const [categorizePrompt, setCategorizePrompt] = useState<any>(null);
  const [generateArticlePrompt, setGenerateArticlePrompt] = useState<any>(null);
  const [generateTitlePrompt, setGenerateTitlePrompt] = useState<any>(null);
  const [suggestImprovementsPrompt, setSuggestImprovementsPrompt] = useState<any>(null);
  const [openContentSection, setOpenContentSection] = useState<string | null>(null);
  const [openSystemSection, setOpenSystemSection] = useState<string | null>(null);

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
    loadEnabledCategories();
  }, []);


  useEffect(() => {
    loadAutoFetchSetting();
  }, []);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const [worthiness, duplicate, categorize, generateArticle, generateTitle, suggestImprovements] = await Promise.all([
        promptsApi.getByKey('score_worthiness'),
        promptsApi.getByKey('detect_duplicate'),
        promptsApi.getByKey('categorize_post'),
        promptsApi.getByKey('generate_article'),
        promptsApi.getByKey('generate_title'),
        promptsApi.getByKey('suggest_improvements')
      ]);
      setWorthinessPrompt(worthiness.data);
      setDuplicatePrompt(duplicate.data);
      setCategorizePrompt(categorize.data);
      setGenerateArticlePrompt(generateArticle.data);
      setGenerateTitlePrompt(generateTitle.data);
      setSuggestImprovementsPrompt(suggestImprovements.data);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  };

  const loadEnabledCategories = async () => {
    try {
      const response = await settingsApi.getByKey('enabled_categories');
      if (response.data && response.data.value) {
        setEnabledCategories(JSON.parse(response.data.value));
      }
    } catch (error) {
      console.error('Failed to load enabled categories:', error);
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

  const handleToggleAutoFetch = async () => {
    const newValue = !autoFetchEnabled;
    setAutoFetchEnabled(newValue);
    await updateSetting('auto_fetch_enabled', newValue.toString());
  };

  const toggleCategory = async (category: string) => {
    const newCategories = enabledCategories.includes(category)
      ? enabledCategories.filter(c => c !== category)
      : [...enabledCategories, category];

    setEnabledCategories(newCategories);
    await updateSetting('enabled_categories', JSON.stringify(newCategories));
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
      setOperationFeedback('Triggering ingestion...');
      await adminApi.triggerIngestion();
      setOperationFeedback('✓ Ingestion completed successfully');
      setTimeout(() => setOperationFeedback(null), 3000);
      loadSchedulerStatus();
    } catch (error) {
      setOperationFeedback('✗ Ingestion failed');
      setTimeout(() => setOperationFeedback(null), 3000);
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

                <div className="setting-subgroup">
                  <h4>Worthiness Threshold</h4>
                  <p>Control how selective the AI is when recommending posts for article generation.</p>

                  <label>
                    Minimum Worthiness Score:
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={worthinessThreshold}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setWorthinessThreshold(value);
                      }}
                      onMouseUp={() => updateSetting('worthiness_threshold', worthinessThreshold.toString())}
                      onTouchEnd={() => updateSetting('worthiness_threshold', worthinessThreshold.toString())}
                    />
                    <span className="threshold-value">{worthinessThreshold.toFixed(2)}</span>
                  </label>

                  <p className="help-text">
                    Current threshold: {worthinessThreshold.toFixed(2)} (0 = show all, 1 = only best)
                    <br />
                    {worthinessThreshold < 0.4 && (
                      <strong style={{ color: '#dc3545' }}>Very permissive - most posts will be recommended</strong>
                    )}
                    {worthinessThreshold >= 0.4 && worthinessThreshold < 0.7 && (
                      <strong style={{ color: '#ffc107' }}>Balanced - moderate filtering</strong>
                    )}
                    {worthinessThreshold >= 0.7 && (
                      <strong style={{ color: '#28a745' }}>Strict - only high-quality posts recommended</strong>
                    )}
                  </p>
                </div>
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
                  <p>Control how similar posts must be to be grouped as duplicates.</p>

                  <label>
                    Similarity Threshold:
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
                    Current threshold: {duplicateThreshold.toFixed(2)} (0.5 = loose, 1.0 = exact match)
                    <br />
                    {duplicateThreshold < 0.7 && (
                      <strong style={{ color: '#dc3545' }}>Loose - similar posts grouped together</strong>
                    )}
                    {duplicateThreshold >= 0.7 && duplicateThreshold < 0.9 && (
                      <strong style={{ color: '#28a745' }}>Balanced - recommended setting</strong>
                    )}
                    {duplicateThreshold >= 0.9 && (
                      <strong style={{ color: '#ffc107' }}>Strict - only near-identical posts grouped</strong>
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
                {categorizePrompt && (
                  <div className="prompt-tile-container">
                    <PromptTile prompt={categorizePrompt} onUpdate={loadPrompts} />
                  </div>
                )}

                <div className="setting-subgroup">
                  <h4>Category Selection</h4>
                  <p>Control which content categories are processed by the system.</p>

                  <div className="category-filters">
                    {['Technology', 'Politics', 'Business', 'Science', 'Health', 'Other'].map(category => (
                      <label key={category} className="category-checkbox">
                        <input
                          type="checkbox"
                          checked={enabledCategories.includes(category)}
                          onChange={() => toggleCategory(category)}
                        />
                        <span>{category}</span>
                      </label>
                    ))}
                  </div>

                  <p className="help-text">
                    Only posts in enabled categories will be processed and displayed.
                    <br />
                    <strong>{enabledCategories.length} of 6 categories enabled</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="collapsible-section">
            <div
              className={`collapsible-header ${openContentSection === 'articles' ? 'active' : ''}`}
              onClick={() => toggleContentSection('articles')}
            >
              <h3>Articles</h3>
              <span className="collapsible-icon">▼</span>
            </div>
            <div className={`collapsible-content ${openContentSection === 'articles' ? 'open' : ''}`}>
              <div className="collapsible-content-inner">
                {generateArticlePrompt && (
                  <div className="prompt-tile-container">
                    <PromptTile prompt={generateArticlePrompt} onUpdate={loadPrompts} />
                  </div>
                )}

                {generateTitlePrompt && (
                  <div className="prompt-tile-container">
                    <PromptTile prompt={generateTitlePrompt} onUpdate={loadPrompts} />
                  </div>
                )}

                {suggestImprovementsPrompt && (
                  <div className="prompt-tile-container">
                    <PromptTile prompt={suggestImprovementsPrompt} onUpdate={loadPrompts} />
                  </div>
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
                        onChange={(e) => updateSetting('ingest_interval_minutes', e.target.value)}
                        defaultValue="30"
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
        </section>
      </div>
    </div>
  );
}

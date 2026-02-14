import React from 'react';

export type SortOption = 'worthiness' | 'sources' | 'newest';

interface FilterSidebarProps {
  worthinessThreshold: number;
  minSourcesThreshold: number;
  onWorthinessChange: (value: number) => void;
  onMinSourcesChange: (value: number) => void;
  sortBy?: SortOption;
  onSortChange?: (value: SortOption) => void;
  contentTypeFilter?: 'all' | 'posts' | 'articles';  // V-9
  onContentTypeFilterChange?: (value: 'all' | 'posts' | 'articles') => void;  // V-9
  // Ingestion controls (optional - only shown when provided)
  autoFetchEnabled?: boolean;
  onToggleAutoFetch?: () => void;
  onTriggerIngestion?: () => void;
  nextRunTime?: string | null;
  ingestInterval?: number;
  onIngestIntervalChange?: (value: number) => void;
  postsPerFetch?: number;
  onPostsPerFetchChange?: (value: number) => void;
  onPostsPerFetchBlur?: () => void;
  estimatedApiCalls?: number;
  enabledListsCount?: number;
  operationFeedback?: string | null;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  worthinessThreshold,
  minSourcesThreshold,
  onWorthinessChange,
  onMinSourcesChange,
  sortBy,
  onSortChange,
  contentTypeFilter,
  onContentTypeFilterChange,
  autoFetchEnabled,
  onToggleAutoFetch,
  onTriggerIngestion,
  nextRunTime,
  ingestInterval,
  onIngestIntervalChange,
  postsPerFetch,
  onPostsPerFetchChange,
  onPostsPerFetchBlur,
  estimatedApiCalls,
  enabledListsCount,
  operationFeedback,
}) => {
  return (
    <aside className="filter-sidebar">
      <div className="sidebar-title">Filters</div>

      <div className="sidebar-filter-item">
        <label>Worthiness</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={worthinessThreshold}
          onChange={(e) => onWorthinessChange(parseFloat(e.target.value))}
          className="filter-slider"
        />
        <span className="filter-value">{worthinessThreshold.toFixed(2)}</span>
      </div>

      <div className="sidebar-filter-item">
        <label>Min Sources</label>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={minSourcesThreshold}
          onChange={(e) => onMinSourcesChange(parseInt(e.target.value))}
          className="filter-slider"
        />
        <span className="filter-value">{minSourcesThreshold}</span>
      </div>

      {onSortChange && (
        <div className="sidebar-filter-item">
          <label>Sort By</label>
          <select
            value={sortBy ?? 'worthiness'}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="sidebar-select"
          >
            <option value="worthiness">Worthiness</option>
            <option value="sources">Sources</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      )}

      {/* V-9: Content type filter */}
      {onContentTypeFilterChange && (
        <div className="sidebar-filter-item">
          <label>Content Type</label>
          <select
            value={contentTypeFilter ?? 'all'}
            onChange={(e) => onContentTypeFilterChange(e.target.value as 'all' | 'posts' | 'articles')}
            className="sidebar-select"
          >
            <option value="all">All</option>
            <option value="posts">Posts Only</option>
            <option value="articles">Articles Only</option>
          </select>
        </div>
      )}

      {/* Ingestion section - only shown when ingestion props are provided */}
      {onToggleAutoFetch && onTriggerIngestion && onIngestIntervalChange && onPostsPerFetchChange && (
        <>
          <div className="sidebar-divider"></div>
          <div className="sidebar-title">Ingestion</div>

          {operationFeedback && (
            <div className={`sidebar-feedback ${operationFeedback.includes('✓') ? 'success' : operationFeedback.includes('✗') ? 'error' : 'info'}`}>
              {operationFeedback}
            </div>
          )}

          <div className="sidebar-filter-item">
            <label>Auto-Fetch</label>
            <button
              className={`sidebar-toggle ${autoFetchEnabled ? 'enabled' : 'disabled'}`}
              onClick={onToggleAutoFetch}
            >
              {autoFetchEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="sidebar-filter-item">
            <button
              className="sidebar-action-btn"
              onClick={onTriggerIngestion}
              disabled={operationFeedback !== null}
            >
              Fetch Now
            </button>
          </div>

          {nextRunTime && (
            <div className="sidebar-filter-item sidebar-info">
              <label>Next Run</label>
              <span className="filter-value">{nextRunTime}</span>
            </div>
          )}

          <div className="sidebar-filter-item">
            <label>Interval</label>
            <select
              value={(ingestInterval ?? 15).toString()}
              onChange={(e) => onIngestIntervalChange(parseInt(e.target.value))}
              className="sidebar-select"
            >
              <option value="5">5 min</option>
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="360">6 hours</option>
            </select>
          </div>

          <div className="sidebar-filter-item">
            <label>Posts/Fetch</label>
            <input
              type="number"
              min="1"
              max="100"
              value={postsPerFetch ?? 10}
              onChange={(e) => onPostsPerFetchChange(parseInt(e.target.value))}
              onBlur={onPostsPerFetchBlur}
              className="sidebar-input"
            />
          </div>

          <div className="sidebar-api-calc">
            <div className="api-calc-value">{estimatedApiCalls ?? 0} calls/hr</div>
            <div className="api-calc-formula">
              {postsPerFetch ?? 10} × {enabledListsCount ?? 0} lists × {60 / (ingestInterval ?? 15)}/hr
            </div>
            {(estimatedApiCalls ?? 0) > 50 && (
              <div className="api-calc-warning">⚠️ High API rate</div>
            )}
          </div>
        </>
      )}
    </aside>
  );
};

export default FilterSidebar;

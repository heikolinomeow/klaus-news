import { useEffect, useState } from 'react';
import { logsApi } from '../services/api';
import LogDetailModal from '../components/LogDetailModal';

export default function Pantry() {
  const [systemLogs, setSystemLogs] = useState<Array<any>>([]);
  const [logStats, setLogStats] = useState<any>(null);
  const [logFilters, setLogFilters] = useState({ level: '', category: '', hours: 24 });
  const [selectedLogDetail, setSelectedLogDetail] = useState<any>(null);
  const [logCleanupDays, setLogCleanupDays] = useState(7);
  const [operationFeedback, setOperationFeedback] = useState<string | null>(null);
  const [logLimit, setLogLimit] = useState(250);
  const [logOffset, setLogOffset] = useState(0);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    loadLogs({ reset: true });
    loadLogStats();
  }, []);

  const formatLogTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
  };

  const parseLogContext = (context: string | null) => {
    if (!context) return null;
    try {
      return JSON.parse(context);
    } catch {
      return null;
    }
  };

  const loadLogs = async ({ reset = false, offset }: { reset?: boolean; offset?: number } = {}) => {
    try {
      setIsLoadingLogs(true);
      const effectiveOffset = reset ? 0 : (offset ?? logOffset);
      const response = await logsApi.getAll({
        level: logFilters.level || undefined,
        category: logFilters.category || undefined,
        hours: logFilters.hours,
        limit: logLimit,
        offset: effectiveOffset
      });
      const withContext = (response.data.logs || []).map((log: any) => ({
        ...log,
        _context: parseLogContext(log.context)
      }));
      setSystemLogs((prev) => (reset ? withContext : [...prev, ...withContext]));
      setHasMoreLogs(effectiveOffset + withContext.length < response.data.total);
      setLogOffset(effectiveOffset);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const loadLogStats = async () => {
    try {
      const response = await logsApi.getStats(logFilters.hours);
      setLogStats(response.data);
    } catch (error) {
      console.error('Failed to load log stats:', error);
    }
  };

  const handleLogCleanup = async () => {
    try {
      setOperationFeedback('Cleaning up old logs...');
      await logsApi.cleanup(logCleanupDays);
      setOperationFeedback('Logs cleaned up successfully');
      setTimeout(() => setOperationFeedback(null), 3000);
      loadLogs();
      loadLogStats();
    } catch (error) {
      setOperationFeedback('Failed to cleanup logs');
      setTimeout(() => setOperationFeedback(null), 3000);
      console.error('Failed to cleanup logs:', error);
    }
  };

  return (
    <div className="pantry-container">
      <div className="cooking-header">
        <h1>Pantry</h1>
        <p>System logs and historical records</p>
      </div>

      {operationFeedback && (
        <div className={`operation-feedback ${operationFeedback.includes('successfully') ? 'success' : operationFeedback.includes('Failed') ? 'error' : 'info'}`}>
          {operationFeedback}
        </div>
      )}

      <div className="pantry-grid">
        <section className="settings-tile">
          <h2>System Logs</h2>

          {logStats && (
            <div className="log-stats-cards">
              <div className="stat-card">
                <div className="stat-label">Total Logs</div>
                <div className="stat-value">{logStats.total_logs}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Errors</div>
                <div className="stat-value error">{logStats.error_count}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Time Window</div>
                <div className="stat-value">{logFilters.hours}h</div>
              </div>
            </div>
          )}

          <div className="setting-subgroup">
            <h4>Filters</h4>
            <div className="log-filters">
              <label>
                Level:
                <select
                  value={logFilters.level}
                  onChange={(e) => {
                    setLogFilters({ ...logFilters, level: e.target.value });
                    setTimeout(() => loadLogs({ reset: true }), 100);
                  }}
                >
                  <option value="">All</option>
                  <option value="DEBUG">DEBUG</option>
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="ERROR">ERROR</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </label>

              <label>
                Category:
                <select
                  value={logFilters.category}
                  onChange={(e) => {
                    setLogFilters({ ...logFilters, category: e.target.value });
                    setTimeout(() => loadLogs({ reset: true }), 100);
                  }}
                >
                  <option value="">All</option>
                  <option value="api">API</option>
                  <option value="scheduler">Scheduler</option>
                  <option value="external_api">External API</option>
                  <option value="database">Database</option>
                </select>
              </label>

              <label>
                Hours:
                <select
                  value={logFilters.hours}
                  onChange={(e) => {
                    const hours = parseInt(e.target.value);
                    setLogFilters({ ...logFilters, hours });
                    setTimeout(() => {
                      loadLogs({ reset: true });
                      loadLogStats();
                    }, 100);
                  }}
                >
                  <option value="1">Last 1 hour</option>
                  <option value="6">Last 6 hours</option>
                  <option value="24">Last 24 hours</option>
                  <option value="72">Last 3 days</option>
                  <option value="168">Last 7 days</option>
                </select>
              </label>

                <button
                  className="btn-secondary btn-small"
                  onClick={() => {
                    loadLogs({ reset: true });
                    loadLogStats();
                  }}
                >
                  Refresh
                </button>
                <label>
                  Rows:
                  <select
                    value={logLimit}
                    onChange={(e) => {
                      const limit = parseInt(e.target.value);
                      setLogLimit(limit);
                      setTimeout(() => loadLogs({ reset: true }), 100);
                    }}
                  >
                    <option value="100">100</option>
                    <option value="250">250</option>
                    <option value="500">500</option>
                    <option value="1000">1000</option>
                  </select>
                </label>
            </div>
          </div>

          <div className="setting-subgroup">
            <h4>Recent Logs</h4>
            {systemLogs.length > 0 ? (
              <div className="logs-table-container">
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Source</th>
                      <th>Headline</th>
                      <th>Summary</th>
                      <th>Score</th>
                      <th>Message</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemLogs.map((log) => {
                      const context = log._context || null;
                      return (
                        <tr
                          key={log.id}
                          className={`log-row ${log.level === 'ERROR' || log.level === 'CRITICAL' ? 'log-error' : ''}`}
                        >
                          <td className="log-when">
                            {formatLogTimestamp(log.timestamp)}
                          </td>
                          <td className="log-source">
                            <div className="log-source-category">
                              {log.category || 'N/A'}
                            </div>
                            <div className="log-source-logger">{log.logger_name}</div>
                            <div className="log-source-level">
                              <span className={`level-badge level-${log.level.toLowerCase()} level-compact`}>
                                {log.level}
                              </span>
                            </div>
                          </td>
                          <td className="log-headline" title={context?.generated_title || ''}>
                            {context?.generated_title || '—'}
                          </td>
                          <td className="log-summary" title={context?.generated_summary || ''}>
                            {context?.generated_summary || '—'}
                          </td>
                          <td className="log-score">
                            {context?.worthiness_score !== undefined
                              ? Number(context.worthiness_score).toFixed(2)
                              : context?.score !== undefined
                                ? Number(context.score).toFixed(2)
                                : '—'}
                          </td>
                          <td className="log-message">{log.message}</td>
                          <td>
                            <button
                              className="btn-secondary btn-small"
                              onClick={() => setSelectedLogDetail(log)}
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="logs-footer">
                  <span className="logs-count">
                    Showing {systemLogs.length} log(s)
                  </span>
                  {hasMoreLogs && (
                    <button
                      className="btn-secondary btn-small"
                      onClick={() => loadLogs({ reset: false, offset: logOffset + logLimit })}
                      disabled={isLoadingLogs}
                    >
                      {isLoadingLogs ? 'Loading…' : 'Load more'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="help-text">No logs found for the selected filters.</p>
            )}
          </div>

          <div className="setting-subgroup">
            <h4>Log Cleanup</h4>
            <p>Delete logs older than a specified number of days.</p>
            <div className="log-cleanup-controls">
              <label>
                Days to retain:
                <input
                  type="number"
                  min="7"
                  max="90"
                  value={logCleanupDays}
                  onChange={(e) => setLogCleanupDays(parseInt(e.target.value))}
                />
              </label>
              <button
                className="operation-button"
                onClick={handleLogCleanup}
                disabled={operationFeedback !== null}
              >
                Cleanup Old Logs
              </button>
            </div>
            <p className="help-text">
              This will delete all logs older than {logCleanupDays} days. Minimum 7 days retention.
            </p>
          </div>
        </section>
      </div>

      {selectedLogDetail && (
        <LogDetailModal
          log={selectedLogDetail}
          onClose={() => setSelectedLogDetail(null)}
        />
      )}
    </div>
  );
}

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

  useEffect(() => {
    loadLogs();
    loadLogStats();
  }, []);

  const loadLogs = async () => {
    try {
      const response = await logsApi.getAll({
        level: logFilters.level || undefined,
        category: logFilters.category || undefined,
        hours: logFilters.hours,
        limit: 100,
        offset: 0
      });
      setSystemLogs(response.data.logs);
    } catch (error) {
      console.error('Failed to load logs:', error);
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
                    setTimeout(loadLogs, 100);
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
                    setTimeout(loadLogs, 100);
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
                      loadLogs();
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
                  loadLogs();
                  loadLogStats();
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="setting-subgroup">
            <h4>Recent Logs</h4>
            {systemLogs.length > 0 ? (
              <div className="logs-table-container">
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Level</th>
                      <th>Category</th>
                      <th>Logger</th>
                      <th>Message</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemLogs.map((log) => (
                      <tr
                        key={log.id}
                        className={`log-row ${log.level === 'ERROR' || log.level === 'CRITICAL' ? 'log-error' : ''}`}
                      >
                        <td className="log-timestamp">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td>
                          <span className={`level-badge level-${log.level.toLowerCase()}`}>
                            {log.level}
                          </span>
                        </td>
                        <td>{log.category || 'N/A'}</td>
                        <td className="log-logger">{log.logger_name}</td>
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
                    ))}
                  </tbody>
                </table>
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

interface LogDetailModalProps {
  log: any;
  onClose: () => void;
}

export default function LogDetailModal({ log, onClose }: LogDetailModalProps) {
  if (!log) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Log Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="log-detail-section">
            <label>Timestamp:</label>
            <span>{new Date(log.timestamp).toLocaleString()}</span>
          </div>

          <div className="log-detail-section">
            <label>Level:</label>
            <span className={`level-badge level-${log.level.toLowerCase()}`}>
              {log.level}
            </span>
          </div>

          <div className="log-detail-section">
            <label>Logger:</label>
            <span>{log.logger_name}</span>
          </div>

          <div className="log-detail-section">
            <label>Category:</label>
            <span>{log.category || 'N/A'}</span>
          </div>

          <div className="log-detail-section">
            <label>Message:</label>
            <pre className="log-detail-pre">{log.message}</pre>
          </div>

          {log.exception_type && (
            <>
              <div className="log-detail-section">
                <label>Exception Type:</label>
                <span className="error-text">{log.exception_type}</span>
              </div>

              <div className="log-detail-section">
                <label>Exception Message:</label>
                <pre className="log-detail-pre error-text">{log.exception_message}</pre>
              </div>

              {log.stack_trace && (
                <div className="log-detail-section">
                  <label>Stack Trace:</label>
                  <pre className="log-detail-pre stack-trace">{log.stack_trace}</pre>
                </div>
              )}
            </>
          )}

          {log.context && (
            <div className="log-detail-section">
              <label>Context:</label>
              <pre className="log-detail-pre">
                {JSON.stringify(JSON.parse(log.context), null, 2)}
              </pre>
            </div>
          )}

          {log.correlation_id && (
            <div className="log-detail-section">
              <label>Correlation ID:</label>
              <span className="correlation-id">{log.correlation_id}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

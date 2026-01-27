interface MismatchEntry {
  timestamp: string;
  ai_response: string;
  valid_categories: string[];
  post_snippet: string;
  assigned_category: string;
}

interface CategoryMismatchLogModalProps {
  mismatches: MismatchEntry[];
  onClose: () => void;
  onClear: () => void;
}

export default function CategoryMismatchLogModal({ mismatches, onClose, onClear }: CategoryMismatchLogModalProps) {
  const handleClear = () => {
    if (confirm('Clear all mismatch logs? This cannot be undone.')) {
      onClear();
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Category Mismatch Log</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            These posts received unrecognized category responses from AI and were assigned to "Other".
          </p>

          {mismatches.length === 0 ? (
            <p className="empty-state">No mismatches recorded.</p>
          ) : (
            <div className="mismatch-log-entries">
              {mismatches.map((entry, index) => (
                <div key={index} className="mismatch-entry">
                  <div className="mismatch-timestamp">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                  <div className="mismatch-detail">
                    <strong>AI returned:</strong> "{entry.ai_response}"
                  </div>
                  <div className="mismatch-detail">
                    <strong>Expected one of:</strong> {entry.valid_categories.join(', ')}
                  </div>
                  <div className="mismatch-detail">
                    <strong>Post:</strong> "{entry.post_snippet}"
                  </div>
                  <div className="mismatch-detail">
                    <strong>→ Assigned to:</strong> {entry.assigned_category}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn-danger"
            onClick={handleClear}
            disabled={mismatches.length === 0}
          >
            Clear All Logs
          </button>
        </div>
      </div>
    </div>
  );
}

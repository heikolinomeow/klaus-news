import { useState } from 'react';

interface AddCategoryModalProps {
  onClose: () => void;
  onAdd: (name: string, description: string) => void;
  existingNames: string[];
}

export default function AddCategoryModal({ onClose, onAdd, existingNames }: AddCategoryModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    // V-15, V-16: Frontend validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (name.length > 50) {
      setError('Name must be 50 characters or less');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    if (description.length > 300) {
      setError('Description must be 300 characters or less');
      return;
    }
    if (name.toLowerCase() === 'other') {
      setError('"Other" is a reserved category name');
      return;
    }
    if (existingNames.some(n => n.toLowerCase() === name.toLowerCase())) {
      setError('A category with this name already exists');
      return;
    }

    onAdd(name.trim(), description.trim());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Category</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Name (cannot be changed later)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="e.g., Research"
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label>Description (can be edited anytime)</label>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setError(null); }}
              placeholder="e.g., Academic papers, scientific studies, AI research breakthroughs..."
              rows={4}
              maxLength={300}
            />
            <span className="char-count">{description.length}/300</span>
          </div>

          <div className="warning-text">
            ⚠️ Category name is permanent once created.
          </div>

          {error && <div className="error-text">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit}>Create Category</button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { promptsApi } from '../services/api';

interface Prompt {
  id: number;
  prompt_key: string;
  prompt_text: string;
  model: string;
  temperature: number;
  max_tokens: number;
  version: number;
  description?: string;
}

export default function Prompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [promptText, setPromptText] = useState('');
  const [model, setModel] = useState('gpt-4-turbo');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(500);
  const [description, setDescription] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const response = await promptsApi.getAll();
      setPrompts(response.data.prompts);
      if (response.data.prompts.length > 0 && !selectedKey) {
        selectPrompt(response.data.prompts[0].prompt_key);
      }
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  };

  const selectPrompt = async (key: string) => {
    try {
      const response = await promptsApi.getByKey(key);
      setSelectedKey(key);
      setPromptText(response.data.prompt_text);
      setModel(response.data.model);
      setTemperature(response.data.temperature);
      setMaxTokens(response.data.max_tokens);
      setDescription(response.data.description || '');
    } catch (error) {
      console.error('Failed to load prompt:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedKey) return;

    try {
      setFeedback('Saving...');
      await promptsApi.update(selectedKey, {
        prompt_text: promptText,
        model,
        temperature,
        max_tokens: maxTokens,
        description
      });
      setFeedback('✓ Saved successfully');
      setTimeout(() => setFeedback(null), 3000);
      loadPrompts();
    } catch (error) {
      setFeedback('✗ Save failed');
      setTimeout(() => setFeedback(null), 3000);
      console.error('Failed to save prompt:', error);
    }
  };

  const handleReset = async () => {
    if (!selectedKey) return;
    if (!confirm('Reset this prompt to default? This will overwrite your current changes.')) return;

    try {
      setFeedback('Resetting...');
      await promptsApi.reset(selectedKey);
      setFeedback('✓ Reset to default');
      setTimeout(() => setFeedback(null), 3000);
      selectPrompt(selectedKey);
      loadPrompts();
    } catch (error) {
      setFeedback('✗ Reset failed');
      setTimeout(() => setFeedback(null), 3000);
      console.error('Failed to reset prompt:', error);
    }
  };

  return (
    <div className="prompts-container">
      <h1>Prompt Management</h1>

      <div className="prompts-layout">
        <aside className="prompts-sidebar">
          <h3>AI Prompts</h3>
          <ul className="prompts-list">
            {prompts.map((p) => (
              <li
                key={p.prompt_key}
                className={selectedKey === p.prompt_key ? 'active' : ''}
                onClick={() => selectPrompt(p.prompt_key)}
              >
                <strong>{p.prompt_key}</strong>
                {p.description && <small>{p.description}</small>}
              </li>
            ))}
          </ul>
        </aside>

        <main className="prompts-editor">
          {selectedKey ? (
            <>
              {feedback && (
                <div className={`feedback ${feedback.includes('✓') ? 'success' : feedback.includes('✗') ? 'error' : 'info'}`}>
                  {feedback}
                </div>
              )}

              <div className="prompt-header">
                <h2>{selectedKey}</h2>
                <div className="prompt-actions">
                  <button className="btn-secondary" onClick={handleReset}>
                    Reset to Default
                  </button>
                  <button className="btn-primary" onClick={handleSave}>
                    Save Changes
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Prompt Text</label>
                <textarea
                  rows={8}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Enter prompt text..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Model</label>
                  <select value={model} onChange={(e) => setModel(e.target.value)}>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Temperature: {temperature.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  />
                  <small>0 = deterministic, 2 = very creative</small>
                </div>

                <div className="form-group">
                  <label>Max Tokens</label>
                  <input
                    type="number"
                    min="10"
                    max="4000"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this prompt's purpose..."
                />
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Select a prompt from the sidebar to edit</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

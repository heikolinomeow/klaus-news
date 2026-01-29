import { useState } from 'react';
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

interface PromptTileProps {
  prompt: Prompt;
  onUpdate: () => void;
}

export default function PromptTile({ prompt, onUpdate }: PromptTileProps) {
  const [promptText, setPromptText] = useState(prompt.prompt_text);
  const [description, setDescription] = useState(prompt.description || '');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setFeedback('Saving...');
      await promptsApi.update(prompt.prompt_key, {
        prompt_text: promptText,
        model: prompt.model,
        temperature: prompt.temperature,
        max_tokens: prompt.max_tokens,
        description
      });
      setFeedback('✓ Saved');
      setTimeout(() => {
        setFeedback(null);
        onUpdate();
      }, 2000);
    } catch (error) {
      setFeedback('✗ Failed');
      setTimeout(() => setFeedback(null), 3000);
      console.error('Failed to save prompt:', error);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset to default?')) return;

    try {
      setFeedback('Resetting...');
      await promptsApi.reset(prompt.prompt_key);
      setFeedback('✓ Reset');
      setTimeout(() => {
        setFeedback(null);
        onUpdate();
      }, 2000);
    } catch (error) {
      setFeedback('✗ Failed');
      setTimeout(() => setFeedback(null), 3000);
      console.error('Failed to reset prompt:', error);
    }
  };

  return (
    <div className="prompt-tile">
      <h3>{prompt.prompt_key}</h3>
      {feedback && <div className="feedback">{feedback}</div>}

      <div className="form-group">
        <label>Prompt Text</label>
        <textarea
          rows={15}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
        />
      </div>

      {prompt.prompt_key !== 'score_worthiness' && (
        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      )}

      {prompt.prompt_key !== 'score_worthiness' && (
        <div className="prompt-settings-info">
          <span>Model: {prompt.model}</span>
          <span>Temp: {prompt.temperature.toFixed(1)}</span>
          <span>Tokens: {prompt.max_tokens}</span>
        </div>
      )}

      <div className="tile-actions">
        <button className="btn-secondary" onClick={handleReset}>Reset</button>
        <button className="btn-primary" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}

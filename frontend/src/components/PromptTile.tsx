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
  const [model, setModel] = useState(prompt.model);
  const [temperature, setTemperature] = useState(prompt.temperature);
  const [maxTokens, setMaxTokens] = useState(prompt.max_tokens);
  const [description, setDescription] = useState(prompt.description || '');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setFeedback('Saving...');
      await promptsApi.update(prompt.prompt_key, {
        prompt_text: promptText,
        model,
        temperature,
        max_tokens: maxTokens,
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

      <div className="form-group">
        <label>Model</label>
        <select value={model} onChange={(e) => setModel(e.target.value)}>
          <optgroup label="GPT-5 Series (Recommended)">
            <option value="gpt-5.2">GPT-5.2 (Flagship)</option>
            <option value="gpt-5.1">GPT-5.1 (Conversational)</option>
            <option value="gpt-5">GPT-5</option>
            <option value="gpt-5-mini">GPT-5 Mini (Cost-effective)</option>
          </optgroup>
          <optgroup label="GPT-4 Series">
            <option value="gpt-4.1">GPT-4.1</option>
            <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
          </optgroup>
          <optgroup label="Legacy (Deprecated)">
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
          </optgroup>
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

      <div className="form-group">
        <label>Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="tile-actions">
        <button className="btn-secondary" onClick={handleReset}>Reset</button>
        <button className="btn-primary" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}

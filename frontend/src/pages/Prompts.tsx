import { useEffect, useState } from 'react';
import { promptsApi } from '../services/api';
import SettingsNav from '../components/SettingsNav';
import PromptTile from '../components/PromptTile';

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

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const response = await promptsApi.getAll();
      setPrompts(response.data.prompts);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  };

  return (
    <div className="prompts-container">
      <h1>Prompt Management</h1>
      <SettingsNav />

      <div className="prompts-grid">
        {prompts.map((prompt) => (
          <PromptTile
            key={prompt.prompt_key}
            prompt={prompt}
            onUpdate={loadPrompts}
          />
        ))}
      </div>
    </div>
  );
}

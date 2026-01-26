-- V-4: Prompts table for runtime-editable AI prompts
-- NOTE: This migration is OPTIONAL. The prompts table will be auto-created
-- at startup by Base.metadata.create_all() from the Prompt model definition.
-- This SQL file is provided for manual database setup or migration tracking only.

CREATE TABLE IF NOT EXISTS prompts (
    id SERIAL PRIMARY KEY,
    prompt_key VARCHAR(100) UNIQUE NOT NULL,
    prompt_text TEXT NOT NULL,
    model VARCHAR(50) DEFAULT 'gpt-4-turbo',
    temperature FLOAT DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 500,
    version INTEGER DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prompts_key ON prompts(prompt_key);

-- Seed default prompts (V-22 also seeds these at startup)
INSERT INTO prompts (prompt_key, prompt_text, model, temperature, max_tokens, description) VALUES
('categorize_post', 'Analyze this X/Twitter post and assign it to ONE category: Technology, Politics, Business, Science, Health, or Other. Return ONLY the category name.', 'gpt-4-turbo', 0.3, 50, 'Post categorization prompt'),
('generate_title', 'Generate a concise, engaging title (max 80 chars) for this X/Twitter thread. Focus on the main insight or takeaway.', 'gpt-4-turbo', 0.7, 100, 'Article title generation'),
('generate_article', 'Transform this X/Twitter thread into a professional blog article. Preserve key insights, add context where needed, maintain the author''s voice.', 'gpt-4-turbo', 0.7, 1500, 'Full article generation'),
('score_worthiness', 'Rate this post''s worthiness for article generation (0.0-1.0). Consider: insight quality, topic relevance, completeness, engagement potential. Return ONLY a number between 0.0 and 1.0.', 'gpt-4-turbo', 0.3, 50, 'AI worthiness scoring (V-6)'),
('detect_duplicate', 'Rate how similar these two news headlines are on a scale from 0.0 to 1.0, where 0.0 means completely different topics and 1.0 means they describe the exact same news story. Return ONLY a number.', 'gpt-4o-mini', 0.0, 10, 'AI duplicate detection (returns similarity score 0.0-1.0)'),
('suggest_improvements', 'Suggest 3 specific improvements for this draft article. Focus on clarity, structure, and reader value.', 'gpt-4-turbo', 0.7, 500, 'Article improvement suggestions')
ON CONFLICT (prompt_key) DO NOTHING;

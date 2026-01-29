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

-- Seed default prompts (only prompts actually used by backend code)
INSERT INTO prompts (prompt_key, prompt_text, model, temperature, max_tokens, description) VALUES
('categorize_post', 'You are categorizing social media posts about AI. Read the post carefully and assign it to exactly ONE category based on the primary topic. Consider the main subject matter, not peripheral mentions.

Categorize into one of the following categories:
{{CATEGORIES}}

Return ONLY the category name, nothing else.', 'gpt-5-mini', 0.3, 50, 'Post categorization prompt (uses {{CATEGORIES}} placeholder)'),
('score_worthiness', 'Rate this post''s worthiness for article generation (0.0-1.0). Consider: insight quality, topic relevance, completeness, engagement potential. Return ONLY a number between 0.0 and 1.0.', 'gpt-4-turbo', 0.3, 50, 'AI worthiness scoring (V-6)'),
('detect_duplicate', 'Rate how similar these two news headlines are on a scale from 0.0 to 1.0, where 0.0 means completely different topics and 1.0 means they describe the exact same news story. Return ONLY a number.', 'gpt-4o-mini', 0.0, 10, 'AI duplicate detection (returns similarity score 0.0-1.0)'),
('research_prompt', 'Research this story to help write an article that answers: "How does this help me work better with AI?"

**Story:** {{TITLE}}
**Details:** {{SUMMARY}}

Use web search to find:
- What''s actually new or different here
- Real-world examples of people/companies benefiting
- Step-by-step applications if any exist
- Honest assessment of limitations
- Links to try it yourself (tools, demos, papers)

Write for someone with 5 minutes who wants to know if this matters.', 'gpt-5-search-api', 0.7, 4000, 'Research prompt for web search (uses {{TITLE}} and {{SUMMARY}} placeholders)')
ON CONFLICT (prompt_key) DO NOTHING;

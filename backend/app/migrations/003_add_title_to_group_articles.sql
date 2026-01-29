-- Add title column to group_articles table
-- Allows articles to have editable titles separate from group representative_title

-- Add title column (nullable for backwards compatibility with existing articles)
ALTER TABLE group_articles
ADD COLUMN IF NOT EXISTS title VARCHAR(500);

-- Create index for faster title lookups
CREATE INDEX IF NOT EXISTS idx_group_articles_title ON group_articles(title);

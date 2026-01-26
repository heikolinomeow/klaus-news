-- V-4: Groups table for news story grouping
-- NOTE: No data migration required - clean schema (no existing data)

CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    representative_title VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    first_seen TIMESTAMP NOT NULL,
    post_count INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_groups_category ON groups(category);
CREATE INDEX IF NOT EXISTS idx_groups_first_seen ON groups(first_seen);

-- FK constraint on posts.group_id is enforced at ORM level
-- Posts.group_id is now Integer referencing Groups.id

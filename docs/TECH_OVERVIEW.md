# Technical Overview - The Klaus Daily News

## Current Implementation Status

**Status:** ~98% backend implemented, ~95% frontend implemented (all core features functional)
**Last Updated:** 2026-01-30

This document describes **how The Klaus Daily News technically solves** the requirements and what is currently implemented from a technical/architectural perspective.

---

## Architecture

The Klaus Daily News uses a **containerized three-tier architecture**:

1. **Backend API** (Python/FastAPI) - ✅ Core business logic fully implemented
2. **Frontend UI** (React/TypeScript) - ✅ Full UI implemented with newspaper-style layout
3. **Database** (PostgreSQL) - ✅ Full schema implemented and active

All components run in Docker containers orchestrated via Docker Compose.

---

## Tech Stack

### Backend

- **Python 3.11+**: Programming language
- **FastAPI 0.95+**: Web framework
  - ✅ Automatic OpenAPI docs at `/docs`
  - ✅ Pydantic validation
  - ✅ Async/await support
  - ✅ CORS enabled for localhost:5173
- **PostgreSQL 15**: ✅ Database with complete schema and active data
- **SQLAlchemy 2.0**: ✅ ORM with 9 models
- **psycopg2-binary**: ✅ PostgreSQL adapter
- **APScheduler 3.10**: ✅ Background job scheduler (2 jobs: ingest, archive)
- **httpx 0.26**: ✅ HTTP client for X API and Teams webhook
- **OpenAI API**: ✅ Fully configured and functional
- **Models Used:**
  - `gpt-5-mini`: Title and summary generation, categorization, worthiness scoring, duplicate detection, article generation
  - `gpt-5-search-api`: Research with web search capabilities

### Frontend

- **React 18**: ✅ UI library with functional components
- **TypeScript 5.3**: ✅ Full type safety across codebase
- **Vite 5.0**: ✅ Build tool with hot reload
- **Axios 1.6**: ✅ HTTP client connected to backend
- **Quill.js 2.0**: ✅ WYSIWYG editor fully integrated

### Infrastructure

- **Docker**: Container runtime
- **Docker Compose**: Local orchestration
- **Nginx**: Frontend reverse proxy (in production build)

---

## Database Schema (FULLY IMPLEMENTED)

### Posts Table ✅

Complete schema with all fields populated by background jobs:

```sql
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    post_id VARCHAR UNIQUE NOT NULL,
    original_text TEXT NOT NULL,
    author VARCHAR,
    created_at TIMESTAMP NOT NULL,

    -- AI-generated fields (populated during ingestion)
    ai_title VARCHAR,
    ai_summary TEXT,

    -- Categorization (populated during ingestion)
    category VARCHAR,

    -- Scores (computed during ingestion)
    categorization_score FLOAT,  -- AI confidence 0-1
    worthiness_score FLOAT,      -- Quality score 0-1

    -- Grouping (assigned during ingestion via AI title comparison)
    group_id INTEGER REFERENCES groups(id),

    -- Timestamps
    ingested_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_post_id ON posts(post_id);
CREATE INDEX idx_group_id ON posts(group_id);
```

**Location:** [backend/app/models/post.py](backend/app/models/post.py)

---

### Groups Table ✅

Stores news story groups as first-class entities with workflow state:

```sql
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    representative_title VARCHAR NOT NULL,
    representative_summary TEXT,
    category VARCHAR NOT NULL,
    first_seen TIMESTAMP NOT NULL,
    post_count INTEGER DEFAULT 1 NOT NULL,
    archived BOOLEAN DEFAULT FALSE NOT NULL,
    selected BOOLEAN DEFAULT FALSE NOT NULL,
    state VARCHAR DEFAULT 'NEW' NOT NULL,  -- NEW, COOKING, REVIEW, PUBLISHED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_groups_category ON groups(category);
CREATE INDEX idx_groups_first_seen ON groups(first_seen);
CREATE INDEX idx_groups_archived ON groups(archived);
CREATE INDEX idx_groups_state ON groups(state);
```

**Location:** [backend/app/models/group.py](backend/app/models/group.py)

---

### GroupArticles Table ✅

Primary article storage for generated content:

```sql
CREATE TABLE group_articles (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) NOT NULL,
    research_id INTEGER REFERENCES group_research(id),
    style VARCHAR NOT NULL,              -- 'news_brief', 'full_article', 'executive_summary', 'analysis', 'custom'
    prompt_used TEXT NOT NULL,
    title VARCHAR NOT NULL,
    preview VARCHAR,                     -- Short teaser text
    content TEXT NOT NULL,
    posted_to_teams TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Location:** [backend/app/models/group_articles.py](backend/app/models/group_articles.py)

---

### GroupResearch Table ✅

Stores AI research output for groups:

```sql
CREATE TABLE group_research (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) NOT NULL,
    research_mode VARCHAR NOT NULL,      -- 'quick', 'agentic', 'deep'
    original_output TEXT NOT NULL,
    edited_output TEXT,
    sources JSONB,
    model_used VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Location:** [backend/app/models/group_research.py](backend/app/models/group_research.py)

---

### ListMetadata Table ✅

Tracks X API pagination state for each list:

```sql
CREATE TABLE list_metadata (
    id SERIAL PRIMARY KEY,
    list_id VARCHAR UNIQUE NOT NULL,
    last_tweet_id VARCHAR,
    enabled BOOLEAN DEFAULT TRUE,
    list_name VARCHAR,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Location:** [backend/app/models/list_metadata.py](backend/app/models/list_metadata.py)

---

### SystemSettings Table ✅

Stores configuration key-value pairs with validation:

```sql
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR UNIQUE NOT NULL,
    value TEXT NOT NULL,
    value_type VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR,
    min_value FLOAT,
    max_value FLOAT,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR
);
```

**Default Settings:**
- `ingest_interval_minutes`: 30 (scheduling)
- `archive_age_days`: 7 (scheduling)
- `archive_time_hour`: 3 (scheduling)
- `posts_per_fetch`: 5 (scheduling)
- `worthiness_threshold`: 0.6 (filtering)
- `min_worthiness_threshold`: 0.3 (filtering)
- `duplicate_threshold`: 0.85 (filtering)
- `categories`: JSON with 10 predefined categories
- `article_prompt_*`: 4 article style templates
- `scheduler_paused`: false (system)
- `auto_fetch_enabled`: true (scheduling)

**Location:** [backend/app/models/system_settings.py](backend/app/models/system_settings.py)

---

### Prompts Table ✅

Stores AI prompt configurations:

```sql
CREATE TABLE prompts (
    id SERIAL PRIMARY KEY,
    prompt_key VARCHAR(100) UNIQUE NOT NULL,
    prompt_text TEXT NOT NULL,
    model VARCHAR(50) NOT NULL,
    temperature FLOAT,
    max_tokens INT,
    version INT DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Location:** [backend/app/models/prompt.py](backend/app/models/prompt.py)

---

### SystemLog Table ✅

Stores all application logs:

```sql
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    level VARCHAR NOT NULL,
    logger_name VARCHAR NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR,
    context TEXT,
    exception_type VARCHAR,
    exception_message TEXT,
    stack_trace TEXT,
    correlation_id VARCHAR
);
```

**Location:** [backend/app/models/system_log.py](backend/app/models/system_log.py)

---

## API Endpoints Implementation Status

### Groups API ✅

| Endpoint | Status | Description |
|----------|--------|-------------|
| `GET /api/groups/` | ✅ | Get all active groups with post counts |
| `GET /api/groups/archived/` | ✅ | Get archived groups |
| `GET /api/groups/{id}/posts/` | ✅ | Get all posts in a group |
| `POST /api/groups/{id}/select/` | ✅ | Mark group for article generation |
| `POST /api/groups/{id}/archive/` | ✅ | Archive a group |
| `POST /api/groups/{id}/unarchive/` | ✅ | Restore archived group |
| `POST /api/groups/{id}/transition/` | ✅ | Move group through workflow states |

### Group Articles API ✅

| Endpoint | Status | Description |
|----------|--------|-------------|
| `POST /api/groups/{id}/article/` | ✅ | Generate article with style |
| `GET /api/groups/{id}/article/` | ✅ | Get most recent article |
| `GET /api/groups/{id}/article/articles/` | ✅ | Get all articles for group |
| `PUT /api/groups/{id}/article/{article_id}/` | ✅ | Update article content |
| `PUT /api/groups/{id}/article/{article_id}/refine/` | ✅ | Refine article with AI |

### Research API ✅

| Endpoint | Status | Description |
|----------|--------|-------------|
| `POST /api/groups/{id}/research/` | ✅ | Run AI research (quick/agentic/deep) |
| `GET /api/groups/{id}/research/` | ✅ | Get current research |
| `PUT /api/groups/{id}/research/` | ✅ | Save edited research |

### Posts API ✅

| Endpoint | Status | Description |
|----------|--------|-------------|
| `GET /api/posts/` | ✅ | Get all non-archived posts |
| `GET /api/posts/recommended/` | ✅ | Get AI-filtered quality posts |
| `GET /api/posts/{id}` | 🟡 | Stub implementation |

### Settings API ✅

| Endpoint | Status | Description |
|----------|--------|-------------|
| `GET /api/settings/` | ✅ | Get all settings grouped by category |
| `GET /api/settings/{key}` | ✅ | Get single setting |
| `PUT /api/settings/{key}` | ✅ | Update setting with validation |
| `POST /api/settings/batch` | ✅ | Update multiple settings atomically |
| `POST /api/settings/reset` | ✅ | Reset all settings to defaults |
| `GET /api/settings/article-prompts/` | ✅ | Get article style prompts |
| `PUT /api/settings/article-prompts/` | ✅ | Update article prompts |

### Lists API ✅

| Endpoint | Status | Description |
|----------|--------|-------------|
| `GET /api/lists/` | ✅ | Get all X lists with metadata |
| `POST /api/lists/` | ✅ | Add new X list |
| `PUT /api/lists/{id}` | ✅ | Update list properties |
| `DELETE /api/lists/{id}` | ✅ | Remove list |
| `POST /api/lists/{id}/test` | ✅ | Test list connectivity |
| `GET /api/lists/export` | ✅ | Export lists to JSON |
| `POST /api/lists/import` | ✅ | Import lists from JSON |

### Prompts API ✅

| Endpoint | Status | Description |
|----------|--------|-------------|
| `GET /api/prompts/` | ✅ | Get all prompts |
| `GET /api/prompts/{key}` | ✅ | Get prompt by key |
| `PUT /api/prompts/{key}` | ✅ | Update prompt |
| `POST /api/prompts/{key}/reset` | ✅ | Reset to default |
| `GET /api/prompts/export` | ✅ | Export prompts to JSON |
| `POST /api/prompts/import` | ✅ | Import prompts from JSON |

### Admin API ✅

| Endpoint | Status | Description |
|----------|--------|-------------|
| `POST /api/admin/trigger-ingestion` | ✅ | Manual ingestion trigger |
| `POST /api/admin/trigger-archive` | ✅ | Manual archival trigger |
| `GET /api/admin/scheduler-status` | ✅ | Get scheduler state |
| `POST /api/admin/pause-scheduler` | ✅ | Pause background jobs |
| `POST /api/admin/resume-scheduler` | ✅ | Resume background jobs |
| `GET /api/admin/ingestion-progress` | ✅ | Real-time progress tracking |
| `GET /api/admin/archive-preview` | ✅ | Preview archivable posts |

### Logs API ✅

| Endpoint | Status | Description |
|----------|--------|-------------|
| `GET /api/logs/` | ✅ | Get logs with filtering |
| `GET /api/logs/stats` | ✅ | Get log statistics |
| `GET /api/logs/{id}` | ✅ | Get full log details |
| `DELETE /api/logs/cleanup` | ✅ | Delete old logs |

### Teams API ✅

| Endpoint | Status | Description |
|----------|--------|-------------|
| `GET /api/teams/channels` | ✅ | List configured channels |
| `POST /api/teams/send` | ✅ | Send article to Teams |
| `POST /api/teams/test` | ✅ | Test channel connectivity |

---

## Service Implementations

### X API Client ✅

**Location:** [backend/app/services/x_client.py](backend/app/services/x_client.py)

- Fetches posts from X API v2 using Bearer token
- Supports pagination with `since_id` parameter
- Handles retweets by fetching full original text
- Logs detailed metrics to system_logs table

### OpenAI Client ✅

**Location:** [backend/app/services/openai_client.py](backend/app/services/openai_client.py)

**Methods:**
- `generate_title_and_summary()` - Uses gpt-5-mini (reasoning model)
- `categorize_post()` - Uses gpt-5-mini (10 categories)
- `score_worthiness()` - Uses gpt-5-mini (0.0-1.0 score)
- `compare_titles_semantic()` - Uses gpt-5-mini for grouping
- `generate_article()` - Uses gpt-5-mini (reasoning model)

**Note:** gpt-5-mini is a reasoning model that doesn't support temperature parameter.

### Research Client ✅

**Location:** [backend/app/services/openai_client.py](backend/app/services/openai_client.py)

**Methods:**
- `quick_research()` - Fast single-pass research with gpt-5-search-api
- `agentic_research()` - Iterative research with web_search tool
- `deep_research()` - Exhaustive investigation

### Teams Service ✅

**Location:** [backend/app/services/teams_service.py](backend/app/services/teams_service.py)

- Sends articles to Microsoft Teams via webhook
- Parses content into Adaptive Card format
- Supports multiple channels (TEAMS_CHANNELS env var)
- Updates `posted_to_teams` timestamp
- Transitions group to PUBLISHED state

### Scheduler Service ✅

**Location:** [backend/app/services/scheduler.py](backend/app/services/scheduler.py)

**Jobs:**
1. **ingest_posts_job** (configurable, default 30 min)
   - Fetches from enabled X lists
   - Categorizes, scores, groups posts
   - Respects all configuration settings

2. **archive_posts_job** (daily at configurable hour)
   - Archives groups older than threshold
   - Preserves for future duplicate matching

### Progress Tracker ✅

**Location:** [backend/app/services/progress_tracker.py](backend/app/services/progress_tracker.py)

- Real-time tracking of ingestion progress
- Tracks current list, step, percentage
- Accessible via `/api/admin/ingestion-progress`

---

## Frontend Implementation

### Routes ✅

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Newspaper-style group browsing |
| `/cooking` | Cooking | Research & article generation |
| `/serving` | Serving | Article review & publishing |
| `/pantry` | Pantry | System logs viewer |
| `/kitchen/system` | Settings | System configuration |
| `/architecture` | Architecture | System overview diagram |

### Key Components ✅

| Component | Description |
|-----------|-------------|
| `PostList` | Newspaper-style layout (hero, secondary, standard) |
| `CategoryNav` | Horizontal category filter with badges |
| `FilterSidebar` | Filters, sort options, ingestion controls |
| `IngestionProgress` | Real-time progress bar |
| `ArticleEditor` | WYSIWYG editor (Quill.js) |
| `TeamsChannelModal` | Channel selection for publishing |
| `DataSourceManager` | X/Twitter list management |
| `PromptTile` | Individual prompt editor |

### Workflow Features ✅

**Group State Machine:**
```
NEW → COOKING → REVIEW → PUBLISHED
```

- Groups start in NEW state (visible on Home)
- Selecting a group transitions to COOKING
- Generating an article transitions to REVIEW
- Publishing to Teams transitions to PUBLISHED

**Real-Time Features:**
- Ingestion progress bar with step details
- Live scheduler status updates
- Operation feedback notifications

---

## Data Flow

### Ingestion Pipeline
```
X/Twitter Lists
  → fetch_posts_from_list()
  → categorize_post() [gpt-5-mini]
  → generate_title_and_summary() [gpt-5-mini]
  → score_worthiness() [gpt-5-mini]
  → compare_titles_semantic() [grouping]
  → Store in posts + groups tables
```

### Article Generation Pipeline
```
Group (with posts)
  → /api/groups/{id}/article/
  → Combine posts + optional research
  → Generate with style [gpt-5-mini]
  → Store in group_articles
```

### Publishing Pipeline
```
Article
  → /teams/send
  → Parse to Adaptive Card
  → Send to Teams webhook
  → Update posted_to_teams
  → Transition to PUBLISHED
```

---

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `X_API_KEY` | X/Twitter API Bearer token |
| `OPENAI_API_KEY` | OpenAI API key |
| `TEAMS_CHANNELS` | JSON array of Teams webhook configs |

### Default Categories

1. News - Major announcements and breaking news
2. Automation - AI and automation developments
3. Coding - Programming and development
4. Content - Content creation and media
5. Research - Research and academic findings
6. Policy - Government and regulatory news
7. Agents - AI agents and autonomous systems
8. Opensource - Open source projects and communities
9. Infrastructure - Cloud, DevOps, and infrastructure
10. Enterprise - Enterprise software and business news

---

**Document Status:**
- ✅ Backend: 98% complete
- ✅ Frontend: 95% complete
- ✅ All core workflows functional
- 📝 Last Updated: 2026-01-30

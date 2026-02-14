# Technical Overview - Klaus News

## Last Updated
2026-02-13

## Scope
This document reflects the current implementation in `backend/app` and `frontend/src`.

## 1. System Architecture

### 1.1 Runtime Topology
- `frontend` (React/Vite) -> calls backend REST API
- `backend` (FastAPI) -> business logic, auth, scheduler, external integrations
- `postgres` -> persistent storage for content, settings, prompts, and logs

### 1.2 Core Execution Paths
- Scheduled/manual ingestion from X lists
- Group-centric editorial workflow (`NEW -> COOKING -> REVIEW -> PUBLISHED`)
- Research and article generation with OpenAI
- Teams publishing via webhook (Adaptive Card)

## 2. Backend Design

### 2.1 App Initialization (`backend/app/main.py`)
Startup sequence:
1. Validate auth env vars (`AUTH_PASSWORD`, `AUTH_JWT_SECRET`)
2. `Base.metadata.create_all`
3. Run migration helper (`preview` column safety)
4. Initialize default settings
5. Seed/upgrade prompts
6. Configure logging
7. Start scheduler

### 2.2 Auth and Security
- JWT middleware protects all non-public routes.
- Public paths: `/`, `/health`, `/auth/login`, `/docs`, `/openapi.json`, `/redoc`.
- Frontend stores token in local storage and attaches `Authorization: Bearer`.
- 401 responses clear token and redirect to `/login`.

### 2.3 Data Model (Current Tables)
- `posts`: raw+AI-enriched post records (`ai_title`, `ai_summary`, category, worthiness, `content_type`, `article_id`, `article_title`, `article_subtitle`, `article_text`, `article_entities`, `source_post_id`, `quoted_post_id`, `is_article`, `ingestion_fallback_reason`)
- `groups`: story aggregates + lifecycle state + archive/select flags
- `group_research`: research outputs (`quick|agentic|deep`)
- `group_articles`: generated/editable article variants and Teams publish timestamp
- `list_metadata`: X list config, enabled flag, `last_tweet_id`
- `system_settings`: typed key/value runtime settings
- `prompts`: mutable AI prompt templates
- `system_logs`: structured logs with optional exception metadata
- `articles`: legacy post-based article table (still mounted in legacy routes)

### 2.4 Scheduler (`backend/app/services/scheduler.py`)
Configured jobs:
- `ingest_posts` interval (default 30m, dynamic reschedule supported)
- `archive_posts` daily cron (default 03:00, dynamic reschedule supported)
- `cleanup_logs` daily cron (04:00)

Execution controls:
- `scheduler_paused` blocks scheduled jobs.
- `auto_fetch_enabled` separately controls scheduled ingestion.
- Manual admin triggers bypass normal schedule timing.

### 2.5 Ingestion Pipeline
For each enabled list:
1. Fetch posts from X API
2. Detect content type (post, article, quote_article) based on article field presence in X API response
3. Deduplicate by `post_id`
4. Route article-type posts to extract article content for AI processing (article text prioritized over tweet text)
5. Skip link-only text
6. Categorize post
7. Generate title/summary (using article content for article-type posts)
8. Score worthiness
9. Drop below `min_worthiness_threshold`
10. Match/create group using semantic title similarity
11. Persist post and update group metrics

Progress is exposed through `/api/admin/ingestion-progress`.

### 2.6 Research and Article Pipeline
Research:
- `POST /api/groups/{id}/research/`
- Modes: `quick`, `agentic`, `deep`
- Stores original output + sources + model

Article generation:
- `POST /api/groups/{id}/article/`
- Uses group posts + optional latest research
- Supports style and optional custom prompt
- Stores content/title/preview in `group_articles`

Refinement:
- `PUT /api/groups/{id}/article/{article_id}/refine/`
- Rewrites existing article in place

### 2.7 Teams Publishing
- `POST /api/teams/send`
- Selects channel by name (webhook stays backend-only)
- Converts article HTML/markdown into structured Adaptive Card body
- On success, sets `posted_to_teams` and transitions group to `PUBLISHED`
- Accepts Teams response codes `200` or `202`

### 2.8 Logging and Diagnostics
- Database log handler writes structured entries to `system_logs`
- Categories include `api`, `scheduler`, `external_api`, `database`
- Logs API supports filtering, stats, detail, retention cleanup
- Pantry page adds a composed debug snapshot (scheduler, settings, progress, recent ingestion log)

## 3. Frontend Design

### 3.1 Route Map (`frontend/src/App.tsx`)
- `/login` (public)
- `/` Home (protected)
- `/cooking` (protected)
- `/serving` (protected)
- `/pantry` (protected)
- `/kitchen/system` (protected)
- `/settings/system` (legacy alias to settings, protected)
- `/architecture` (public informational page)

### 3.2 UX Theme
- Newspaper/print visual system in `frontend/src/App.css`
- Light paper palette, serif headlines/body, editorial layout
- Previous dark-mode assumptions are no longer accurate

### 3.3 Page Responsibilities
- Home: NEW groups triage, content type filter (All/Posts/Articles), category/worthiness/source filters, article badges on cards, ingestion controls, progress bar
- Cooking: COOKING groups, research run/edit, article generation/refinement/editing
- Serving: REVIEW groups, final edits, preview tuning, Teams send, publish/back transitions
- Pantry: logs, low-worthiness visibility, debug snapshot, log cleanup
- Settings: data sources, prompts, categories/mismatch log, scheduler/archival/Teams controls

## 4. API Surface Snapshot

### 4.1 Core Active Endpoints
- Auth: `/auth/login`, `/auth/logout`, `/auth/me`
- Groups: `/api/groups/*` (list, archive, select, transition, posts)
- Research: `/api/groups/{id}/research/*`
- Group Articles: `/api/groups/{id}/article/*`, `/api/groups/{id}/articles/*`
- Teams: `/api/teams/channels`, `/api/teams/send`, `/api/teams/test`
- Settings/Prompts/Lists/Admin/Logs all implemented and mounted

### 4.2 Legacy/Partial Endpoints
- `/api/articles/*` remains from older post-based article workflow
- `/api/posts/{post_id}` is still stubbed

## 5. Configuration and Environment

### 5.1 Required Backend Secrets
- `OPENAI_API_KEY`
- `X_API_KEY` (and optionally `X_API_SECRET`)
- `AUTH_PASSWORD`
- `AUTH_JWT_SECRET`

### 5.2 Runtime Config in DB
Primary settings are stored in `system_settings` and cached for 60s:
- Scheduler: intervals, archive timing, pause, auto-fetch
- Filtering: worthiness thresholds, duplicate threshold, categories
- Article style prompts
- Log retention days

## 6. Known Gaps and Mismatches
- `README.md` still describes older architecture/model choices.
- Settings endpoint `/api/settings/article-prompts/` uses legacy style keys (`news_brief`, etc.), while generation path uses style keys aligned with UI (`very_short`, `short`, `medium`, `long`, `custom`).
- Data source UI shows Import/Export buttons, but current component wiring does not invoke API import/export handlers.

## 7. Migration Guidance For Future Docs
When updating docs, treat these files as source of truth first:
- `backend/app/main.py`
- `backend/app/api/*.py`
- `backend/app/services/*.py`
- `frontend/src/App.tsx`
- `frontend/src/pages/*.tsx`
- `frontend/src/services/api.ts`

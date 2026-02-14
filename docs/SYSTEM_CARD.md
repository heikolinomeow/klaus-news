# Klaus News - System Card

## Last Updated
2026-02-13

## What It Is
Klaus News is an internal AI-assisted news workflow for curated X lists:
1. Ingest posts on a schedule or manually.
2. Categorize, score, and group posts into stories.
3. Research stories and generate publishable articles.
4. Review/edit and publish to Microsoft Teams.

## Major Changes Since Previous Docs
- JWT authentication is now required for almost all API routes.
- Group-first workflow is the primary path (`NEW -> COOKING -> REVIEW -> PUBLISHED`).
- Research and article generation are now group-based (`group_research`, `group_articles`).
- Frontend theme moved from dark UI to a print/newspaper visual style.
- Pantry now includes operational debug snapshot and low-worthiness visibility.
- Scheduler now includes log cleanup and dynamic rescheduling from settings.

## Architecture At A Glance

```
X Lists -> Scheduler/Admin Trigger -> Ingestion Pipeline -> PostgreSQL
                                                      |
                                                      v
                                               Group Workflow
                                        (NEW -> COOKING -> REVIEW -> PUBLISHED)
                                                      |
                                                      v
                                           Research + Article Drafting
                                                      |
                                                      v
                                        Review/Edit -> Teams Adaptive Card
```

## Core Runtime Components

### Backend
- FastAPI app in `backend/app/main.py`
- SQLAlchemy + PostgreSQL
- APScheduler for background jobs
- OpenAI client for categorization/scoring/research/article generation
- X client for list ingestion
- Teams service for Adaptive Card delivery

### Frontend
- React + TypeScript + Vite
- Protected routes via JWT token in local storage
- Main pages: Home, Cooking, Serving, Pantry, Settings

### Database (Primary Domain Tables)
- `posts`: ingested X posts + AI metadata
- `groups`: story-level entity and workflow state
- `group_research`: research runs per group
- `group_articles`: generated and edited articles per group
- `list_metadata`: configured X lists and last fetch cursor
- `system_settings`: runtime configuration
- `prompts`: editable AI prompts
- `system_logs`: structured operational logs
- `articles`: legacy post-based article table (still present)

## State Model
`NEW -> COOKING -> REVIEW -> PUBLISHED`

Transition enforcement exists in `/api/groups/{group_id}/transition`.

## API Surface (Current)

### Active workflow APIs
- `/auth/*`
- `/api/groups/*`
- `/api/groups/{id}/research/*`
- `/api/groups/{id}/article/*`
- `/api/teams/*`
- `/api/settings/*`
- `/api/prompts/*`
- `/api/lists/*`
- `/api/admin/*`
- `/api/logs/*`

### Legacy/partial APIs still mounted
- `/api/articles/*` (older post-based flow)
- `/api/posts/{id}` currently returns stub payload (`{"post": null}`)

## Scheduling and Automation
Jobs are always registered and run through pause checks:
- `ingest_posts` interval job (configurable, default 30 min)
- `archive_posts` daily job (configurable hour, default 03:00)
- `cleanup_logs` daily job (04:00)

Important behavior:
- `scheduler_paused=true` blocks scheduled runs.
- Manual trigger endpoints still run ingestion/archive.
- Auto-fetch can be disabled independently (`auto_fetch_enabled`).

## Security Model
- Backend enforces JWT auth middleware for all non-public routes.
- Public paths: `/`, `/health`, `/auth/login`, docs endpoints.
- Required backend env vars at startup:
  - `AUTH_PASSWORD`
  - `AUTH_JWT_SECRET`
- Teams webhook URLs are never exposed to frontend; only channel names are returned.

## AI Model Usage (Current)
- `gpt-5-mini`: title/summary generation, categorization, worthiness, duplicate similarity, article and refinement
- `gpt-5.1` + `web_search` tool: quick and agentic research
- `o4-mini-deep-research`: deep research mode (no explicit tool list)

## Key Operational Rules
- Link-only posts are skipped if text-after-URL removal is shorter than 20 chars.
- Low-worthiness posts are dropped below `min_worthiness_threshold`.
- Group matching is semantic title comparison against all groups in a category (including archived groups).
- Teams send accepts HTTP 200 and 202 responses.

## Deployment Model
- Local: Docker Compose (`postgres`, `backend`, `frontend`)
- Production target: Railway (containerized backend/frontend + managed Postgres)

## Known Implementation Notes
- `settings` article prompt helper endpoint still uses legacy style keys (`news_brief`, etc.), while main generation path uses `very_short/short/medium/long/custom` setting keys.
- `README.md` is behind the codebase and still describes older model/flow details.

# Klaus News - System Card

## What It Is
AI-powered internal news tool that fetches X/Twitter posts, scores them, groups related posts into stories, generates articles via AI, and publishes to Microsoft Teams.

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────────┐
│                         KLAUS NEWS                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │  INGEST  │ →  │  COOKING │ →  │ SERVING  │ →  │  TEAMS   │      │
│  │          │    │          │    │          │    │          │      │
│  │ X API    │    │ Research │    │ Review   │    │ Publish  │      │
│  │ Score    │    │ Generate │    │ Edit     │    │ Webhook  │      │
│  │ Group    │    │ Article  │    │ Approve  │    │          │      │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│       ↑               ↑               ↑               ↑             │
│       │               │               │               │             │
│  Background      User-driven     User-driven     User-driven        │
│  (Scheduler)                                                        │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  Backend: FastAPI + SQLAlchemy | Frontend: React + Vite             │
│  Database: PostgreSQL          | Deploy: Docker Compose / Railway   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Model (Simplified)

```
Post (raw X tweet)
  └─→ Group (story = collection of related posts)
        ├─→ GroupResearch (optional AI research)
        └─→ GroupArticle (generated article)
                 └─→ Teams (published)
```

**State Flow:** `NEW → COOKING → REVIEW → PUBLISHED`

---

## Services

| Service | Purpose | Runs |
|---------|---------|------|
| **Scheduler** | Fetch posts, archive old groups, cleanup logs | Background (APScheduler) |
| **X Client** | Fetch from X API v2 | On-demand |
| **OpenAI Client** | Categorize, score, generate articles, research | On-demand |
| **Teams Service** | Publish via webhook (Adaptive Cards) | On-demand |
| **Settings Service** | Cached config from DB (60s TTL) | On-demand |
| **Progress Tracker** | Real-time ingestion status | During ingestion |

---

## Key API Routes

| Route | Purpose |
|-------|---------|
| `/api/posts` | Raw posts CRUD |
| `/api/groups` | Story groups (archive/select) |
| `/api/group-articles` | Generate/update articles |
| `/api/research` | Run AI research (quick/agentic/deep) |
| `/api/admin` | Trigger ingestion, pause scheduler |
| `/api/teams` | List channels, publish article |
| `/api/settings` | System configuration |
| `/api/prompts` | AI prompt management |

---

## GOTCHAS & CRITICAL NOTES

### OpenAI Models
| Model | Use | Gotcha |
|-------|-----|--------|
| `gpt-5-mini` | Categorize, score | **No temperature support** - only default=1 |
| `gpt-4o` | Title/summary generation | Standard completion |
| `gpt-5.1` | Quick/agentic research | Use with `web_search` tool |
| `o4-mini-deep-research` | Deep research | Web search **built-in** - don't pass tools |

### Scheduler
- **Pause state**: When `scheduler_paused=true`, jobs don't run
- **Manual triggers** bypass pause (via `/api/admin/trigger-ingestion`)
- Jobs: ingest (configurable interval), archive (daily), log cleanup (daily 4AM)

### Post Processing
- **Link-only filter**: Posts with <20 chars after URL removal are skipped
- **Semantic grouping**: AI compares titles (threshold: 0.85) - not string matching
- **Worthiness scoring**: Detects "I'm sorry" / error content → returns 0.0

### Database
- **Visibility inheritance**: Posts inherit `archived` from their Group
- **Manual migrations**: `preview` column added on startup if missing
- **Default settings**: Seeded on first run

### Teams Integration
- **Webhook URLs**: Never exposed to frontend (security)
- **Response codes**: Accepts both 200 and 202 (Power Automate returns 202)
- **Format**: Adaptive Card v1.3 with expandable content

### X API
- **402 error** = Payment required (credits depleted)
- **Retweet handling**: Fetches original tweet text to avoid truncation
- **Deduplication**: Tracks `last_tweet_id` per list

---

## Environment Variables

### Backend (Required)
```bash
DATABASE_URL=postgresql://user:pass@host:5432/klaus_news
X_API_KEY=<bearer_token>
OPENAI_API_KEY=<key>
TEAMS_CHANNELS='[{"name":"General","webhookUrl":"https://..."}]'
```

### Frontend
```bash
VITE_API_URL=http://localhost:8000  # or Railway backend URL
```

---

## Docker Services

| Service | Port | Image |
|---------|------|-------|
| postgres | 5432 | postgres:15-alpine |
| backend | 8000 | python:3.11-slim + uvicorn |
| frontend | 3000 | nginx:alpine (serves React build) |

---

## Why Railway (Not Vercel)

| Requirement | Railway | Vercel |
|-------------|---------|--------|
| Docker support | Yes | No |
| Always-running backend | Yes (container) | No (serverless) |
| Background scheduler | Yes | No |
| Managed PostgreSQL | Yes | No (need external) |
| Single platform | Yes | No (need 3 services) |

---

## File Map (Critical Files)

```
backend/
├── app/main.py              # FastAPI app, startup, routers
├── app/database.py          # SQLAlchemy, migrations, defaults
├── models/*.py              # Post, Group, GroupArticle, GroupResearch, etc.
├── services/
│   ├── scheduler.py         # APScheduler jobs
│   ├── x_client.py          # X API
│   ├── openai_client.py     # All AI operations
│   ├── teams_service.py     # Webhook publishing
│   └── progress_tracker.py  # Ingestion progress
└── api/*.py                 # Route handlers

frontend/
├── src/pages/
│   ├── Home.tsx             # Post browsing
│   ├── Cooking.tsx          # Article generation
│   ├── Serving.tsx          # Review & publish
│   └── Settings.tsx         # Configuration
├── src/services/api.ts      # Axios API client
└── src/types/index.ts       # TypeScript interfaces

docker-compose.yml           # 3 services
docs/DEPLOYMENT_PLAYBOOK.md  # Railway deployment guide
```

---

## Quick Commands

```bash
# Local development
docker-compose up

# View logs
docker-compose logs -f backend

# Restart after code change
docker-compose restart backend

# Database shell
docker-compose exec postgres psql -U postgres -d klaus_news
```

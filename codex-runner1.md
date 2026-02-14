# Codex Runner Part 1: Backend Core

## Goal
Implement a production-safe backend runner with queueing, execution, status tracking, cancellation, timeout handling, idempotency, and log polling.

## Scope
- Database migration and models
- Runner registry and command assembly
- Queue/launcher/executor with advisory lock
- REST API endpoints for repos/scripts/jobs/cancel/logs
- Startup recovery for crashed `running` jobs

## Deliverables
1. Migration: `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/migrations/004_runner_tables.sql`
2. Models: `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/models/runner.py`
3. Services:
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/services/runner_registry.py`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/services/runner_service.py`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/services/runner_executor.py`
4. API router: `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/api/runner.py`
5. Wiring updates:
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/main.py`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/api/__init__.py`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/models/__init__.py`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/config.py`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/database.py`

## Implementation Steps
1. Add schema
- Tables: `runner_repos`, `runner_jobs`, `runner_job_events`
- Add status checks and timestamp invariants
- Add indexes for status filtering and FIFO queue scans
- Add active idempotency unique index for (`requested_by`, `idempotency_key`)

2. Add registry
- Whitelist script keys and allowed args
- Validate and normalize args
- Build command argv without shell interpolation

3. Add API contracts
- `GET /api/runner/repos`
- `GET /api/runner/scripts`
- `POST /api/runner/jobs`
- `GET /api/runner/jobs`
- `GET /api/runner/jobs/{job_id}`
- `POST /api/runner/jobs/{job_id}/cancel`
- `GET /api/runner/jobs/{job_id}/logs`

4. Add service logic
- Transactional enqueue with idempotency-key + canonical payload hash
- Queue limits (`RUNNER_MAX_QUEUE_SIZE`, `RUNNER_MAX_QUEUED_PER_USER`) with `429`
- State transitions with compare-and-set SQL
- Event inserts for state changes and failures

5. Add launcher/executor
- Advisory lock ownership loop
- `SELECT ... FOR UPDATE SKIP LOCKED` claim
- Spawn process group via `asyncio.create_subprocess_exec`
- Cancel/timeout: SIGTERM then SIGKILL on group
- Write logs to `RUNNER_LOG_DIR/{job_id}.log`

6. Add startup recovery
- Mark stale `running`/`cancel_requested` as `failed`
- Record `recovered_after_crash` event

## Acceptance Criteria
- Jobs can be enqueued and executed for whitelisted scripts only
- Status transitions are correct under success/failure/cancel/timeout
- `Idempotency-Key` works and prevents duplicate active jobs
- Queue limits return `429`
- Logs are readable incrementally via offset polling
- Recovery marks orphaned running jobs as failed on restart

## Exit Checklist
- Migration applies cleanly
- API endpoints available behind auth
- Launcher starts only when `RUNNER_ENABLED=true`
- Basic backend tests for create/run/cancel/timeout pass


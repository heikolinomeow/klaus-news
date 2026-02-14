# Codex Runner Design (Implementation-Ready)

## Objective
Add a Runner feature to `klaus-news` that lets authenticated users trigger approved Codex agent scripts from the web UI, track status, and inspect logs.

## Scope
- In scope (v1): single-repo execution for this workspace, polling-based status/log updates, cancel support, persistent run metadata, persistent log files.
- Out of scope (v1): multi-repo checkout/sync worker, cron scheduling, WebSocket log streaming, per-user RBAC.

## Key Design Choices
1. Deploy model: integrate into existing backend/frontend in this repo.
Reason: fastest path, reuses auth middleware and existing deployment.

2. Execution model: in-process async job manager in FastAPI process.
Reason: sufficient for low concurrency and simple operations. Queue worker split can be Phase 2.

3. Database: use existing PostgreSQL (no SQLite path in this repo).
Reason: the app already runs on Postgres in `docker-compose.yml`.

4. Auth model: reuse existing JWT auth middleware and treat authenticated users as runner admins in v1.
Reason: current system has authentication but no role table.

5. Log delivery in v1: HTTP polling endpoint for incremental logs (cursor/offset).
Reason: simpler and robust. WebSocket is Phase 2.

6. Runtime topology: single active launcher per deployment with graceful drain.
Reason: avoids double-claim/orphan behavior during restarts and rolling deploys while keeping v1 simple.

## Repository Fit
This design targets:
- Backend: `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app`
- Frontend: `/Users/ext.heiko.trenkle/Documents/klaus-news/frontend/src`
- Existing script entrypoints under `/Users/ext.heiko.trenkle/Documents/klaus-news/scripts`

## Script Registry (Whitelist)
Only these script keys are executable in v1:

- `masteragent.full`
  - command: `bash scripts/masteragent-runner.sh --retries {retries}`
  - allowed args: `retries` (int 1-10), `leaf_progress` (bool), `verbose` (bool)
  - timeout: 7200s

- `nb.stage`
  - command: `bash scripts/nb-leaf-runner.sh --retries {retries}`
  - allowed args: `retries` (int 1-10), `leaf_progress` (bool)
  - timeout: 3600s

- `bts.stage`
  - command: `bash scripts/bts-leaf-runner.sh --retries {retries}`
  - allowed args: `retries` (int 1-10), `leaf_progress` (bool)
  - timeout: 3600s

- `stcc.stage`
  - command: `bash scripts/stcc-stage-runner.sh --retries {retries}`
  - allowed args: `retries` (int 1-10), `leaf_progress` (bool)
  - timeout: 3600s

- `ic.stage`
  - command: `bash scripts/ic-leaf-runner.sh --retries {retries}`
  - allowed args: `retries` (int 1-10), `leaf_progress` (bool)
  - timeout: 3600s

Execution flags:
- Add `--leaf-progress` if `leaf_progress=true` and script supports it.
- Add `--verbose` only for `masteragent.full`.
- Never accept free-form command input from UI/API.

## Runtime and Safety Rules
1. Use `asyncio.create_subprocess_exec` with argument list, never shell interpolation.
2. Working directory must be repo root only.
3. Environment allowlist: `PATH`, `HOME`, `CODEX_BIN`, `AGENT_RETRIES` plus explicit runner settings.
4. `PYTHONPATH`, secrets, and unrelated env vars are not forwarded by default.
5. Max concurrent jobs (v1): 2.
6. Queue policy (v1): FIFO in DB, launcher picks oldest `queued`.
7. Multi-process safety: only one scheduler loop may claim jobs at a time using a PostgreSQL advisory lock (`pg_try_advisory_lock`) in the launcher process.
8. Job claiming must be atomic and non-blocking:
- claim query uses `SELECT ... FOR UPDATE SKIP LOCKED`
- update selected rows to `running` in the same transaction
- set `started_at` exactly once
9. Process termination must target process group (not only parent pid):
- launch subprocess in a new session/process group
- on cancel/timeout send SIGTERM to group, wait 10s, then SIGKILL to group
10. API semantics in v1:
- any authenticated user can create, view, and cancel any runner job
- this is explicit v1 behavior until RBAC is introduced
11. Idempotency:
- `POST /api/runner/jobs` accepts optional `Idempotency-Key` header
- when key matches same authenticated user + same payload within 5 minutes, return existing job (no duplicate enqueue)
12. Timeout handling:
- Send SIGTERM and wait 10s.
- If still running, send SIGKILL.
- Mark status `timeout` and record event.
13. Cancellation handling:
- User cancel marks job `cancel_requested`.
- Worker applies SIGTERM/SIGKILL sequence.
- Final status `canceled`.
14. Deploy/runtime policy:
- Backend may run with multiple web workers, but only one launcher loop may execute jobs (enforced by advisory lock).
- On process shutdown, launcher stops claiming new jobs, waits up to 15s for in-flight state flush, then exits.
- Running child processes receive cancellation sequence only when shutdown policy is `drain=false`; default is `drain=true` (leave job rows for recovery path on next boot).
15. Queue backpressure and fairness:
- `RUNNER_MAX_QUEUE_SIZE` default 200 (global queued + running).
- `RUNNER_MAX_QUEUED_PER_USER` default 20.
- `POST /jobs` returns `429` when either limit is exceeded.
- Queue ordering remains FIFO by `created_at`, then `id` tie-breaker.
16. Stuck job watchdog:
- Worker heartbeat updates `heartbeat_at` every 30s for running jobs.
- If `running` or `cancel_requested` has stale heartbeat > 2 minutes, recovery marks `failed` with event `heartbeat_stale_recovered`.

## Data Model (v1)

### `runner_repos`
- `id` UUID PK
- `name` TEXT UNIQUE NOT NULL
- `source_type` TEXT NOT NULL CHECK in (`local_path`)
- `path_or_url` TEXT NOT NULL
- `branch` TEXT NULL
- `default_workdir` TEXT NULL
- `enabled` BOOLEAN NOT NULL DEFAULT TRUE
- `last_synced_at` TIMESTAMPTZ NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

Notes:
- v1 supports only one seeded local repo: this workspace path.
- `git_url` support is deferred to Phase 3.

### `runner_jobs`
- `id` UUID PK
- `repo_id` UUID NOT NULL FK -> `runner_repos(id)`
- `script_key` TEXT NOT NULL
- `args_json` JSONB NOT NULL DEFAULT '{}'::jsonb
- `status` TEXT NOT NULL CHECK in (`queued`,`running`,`success`,`failed`,`canceled`,`timeout`,`cancel_requested`)
- `requested_by` TEXT NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `started_at` TIMESTAMPTZ NULL
- `finished_at` TIMESTAMPTZ NULL
- `exit_code` INT NULL
- `log_path` TEXT NULL
- `error_message` TEXT NULL
- `idempotency_key` TEXT NULL
- `idempotency_hash` TEXT NULL
- `heartbeat_at` TIMESTAMPTZ NULL

Indexes:
- `idx_runner_jobs_status_created_at` on (`status`,`created_at` DESC)
- `idx_runner_jobs_repo_created_at` on (`repo_id`,`created_at` DESC)
- `idx_runner_jobs_idempotency_lookup` on (`requested_by`,`idempotency_key`,`created_at` DESC) where `idempotency_key IS NOT NULL`
- `idx_runner_jobs_queued_fifo` on (`created_at`,`id`) where `status='queued'`
- `uq_runner_jobs_idempotency_active` unique on (`requested_by`,`idempotency_key`) where `idempotency_key IS NOT NULL AND status IN ('queued','running','cancel_requested')`

State/timestamp constraints:
- `started_at IS NOT NULL` when `status IN ('running','success','failed','timeout','cancel_requested')`
- `finished_at IS NOT NULL` when `status IN ('success','failed','canceled','timeout')`
- `finished_at IS NULL` when `status IN ('queued','running','cancel_requested')`
- `exit_code IS NOT NULL` only when `status IN ('success','failed','timeout','canceled')`

### `runner_job_events`
- `id` BIGSERIAL PK
- `job_id` UUID NOT NULL FK -> `runner_jobs(id)` ON DELETE CASCADE
- `event_type` TEXT NOT NULL
- `message` TEXT NOT NULL
- `actor` TEXT NULL (username or `system`)
- `meta_json` JSONB NOT NULL DEFAULT '{}'::jsonb
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

Index:
- `idx_runner_job_events_job_created` on (`job_id`,`created_at`)

## API Contract (v1)
Base prefix: `/api/runner`

### `GET /api/runner/repos`
Returns enabled repos for run form.

### `GET /api/runner/scripts`
Returns script registry metadata (keys, labels, allowed args, defaults).

### `POST /api/runner/jobs`
Request:
```json
{
  "repo_id": "uuid",
  "script_key": "masteragent.full",
  "args": {
    "retries": 5,
    "leaf_progress": true,
    "verbose": false
  }
}
```
Response: created job object with status `queued`.
Validation:
- reject unknown `script_key`
- reject args outside allowed schema/range
- reject disabled repo
- if `Idempotency-Key` matches recent equivalent request by same user, return existing job with `200` and `deduplicated=true`
- compute canonical payload hash (`idempotency_hash`) from normalized `{repo_id,script_key,args}`
- idempotency insert and lookup occur in one transaction; on unique collision, fetch and return winner row
- dedupe window rule is still 5 minutes; terminal jobs older than 5 minutes do not dedupe new requests
- return `429` when queue limits are exceeded

### `GET /api/runner/jobs`
Query params:
- `status` optional
- `repo_id` optional
- `limit` default 50 max 200
- `offset` default 0

### `GET /api/runner/jobs/{job_id}`
Returns full job details plus event list.

### `POST /api/runner/jobs/{job_id}/cancel`
Behavior:
- If `queued`, mark `canceled` immediately.
- If `running`, mark `cancel_requested`; worker cancels process.
- If terminal state, return 409.
- If already `cancel_requested`, return 202 idempotently.

### `GET /api/runner/jobs/{job_id}/logs`
Query params:
- `offset` bytes from start (default 0)
- `limit` bytes (default 16384, max 131072)

Response:
```json
{
  "job_id": "uuid",
  "offset": 0,
  "next_offset": 1200,
  "is_complete": false,
  "content": "...raw log text..."
}
```

Log pagination semantics:
- Offsets are defined on the redacted UTF-8 stream, not raw file bytes.
- Server performs deterministic redact transform, then slices by byte offset on valid UTF-8 boundaries.
- `next_offset` always points to the next unread byte in the same redacted stream version.
- If job is terminal and `next_offset` equals redacted stream size, `is_complete=true`.
- Response `content` byte length after redaction never exceeds requested `limit`.

## Backend Implementation Plan

### New files
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/models/runner.py`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/services/runner_registry.py`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/services/runner_service.py`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/services/runner_executor.py`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/api/runner.py`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/migrations/004_runner_tables.sql`

### Update files
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/models/__init__.py` (export runner models)
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/api/__init__.py` (include runner router)
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/main.py` (register router + startup launcher)
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/database.py` (execute migration 004)
- `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/config.py` (runner env vars)

### Runner settings (env)
Add to config and docs:
- `RUNNER_ENABLED=true`
- `RUNNER_MAX_CONCURRENCY=2`
- `RUNNER_DEFAULT_TIMEOUT_SECONDS=3600`
- `RUNNER_LOG_DIR=/tmp/klaus-runner-logs`
- `RUNNER_ALLOWED_REPO_PATHS=["/Users/ext.heiko.trenkle/Documents/klaus-news"]`

## Frontend Implementation Plan

### New pages/components
- `/Users/ext.heiko.trenkle/Documents/klaus-news/frontend/src/pages/Runner.tsx`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/frontend/src/components/RunnerNewJobForm.tsx`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/frontend/src/components/RunnerJobsTable.tsx`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/frontend/src/components/RunnerJobDetail.tsx`

### API client additions
- Extend `/Users/ext.heiko.trenkle/Documents/klaus-news/frontend/src/services/api.ts` with typed runner endpoints.

### Routing
- Add route `/kitchen/runner` behind `ProtectedRoute`.
- Add nav entry in existing header.

### UI states
- Job badges: `queued`, `running`, `success`, `failed`, `canceled`, `timeout`.
- Detail view shows metadata, events timeline, and incrementally loaded logs.
- Cancel button enabled only for `queued`/`running`.

## Logging and Retention
- Each job writes to `RUNNER_LOG_DIR/{job_id}.log`.
- Persist `log_path` in DB.
- Retention job (daily at startup-scheduled interval): delete logs and job rows older than 30 days unless status is `running`.
- Retention ordering: delete `runner_job_events` first, then `runner_jobs`, then orphan log files not referenced by any row.
- Keep the newest 100 terminal jobs regardless of age for operational debugging.
- Redaction pass before returning logs to client:
  - mask tokens/secrets matching common patterns (`sk-`, `Bearer `, webhook URLs).
- Redaction behavior must be deterministic:
  - redact-on-read in API only; on-disk logs remain raw
  - regex set versioned in code and unit-tested
  - enforce post-redaction response byte limit equal to requested `limit`

## Idempotency and Canonicalization
- Canonical args serialization rules:
  - sort object keys lexicographically
  - booleans/literals normalized to strict JSON
  - omit unknown/defaulted args from hash input
- `idempotency_hash` = SHA-256 of canonical JSON bytes.
- Dedupe window is 5 minutes by `created_at` server time; outside window, same key creates a new job.
- DB uniqueness prevents concurrent duplicate active jobs with same key/user; window logic is enforced in transactional service code.
- For conflicting same key with different hash inside window, return `409` with message `idempotency_key_reused_with_different_payload`.

## Deployment and Operations
- Recommended runtime for v1:
  - one backend replica for simplest behavior
  - or many replicas with advisory lock enabled and identical runner config
- Required startup checks:
  - verify `RUNNER_LOG_DIR` exists and is writable
  - verify whitelisted repo path exists and matches current mount path
  - verify script files in registry exist and are executable
- Health endpoints:
  - include launcher lock status and queue depth summary in admin diagnostics
- Rollout rule:
  - do not run mixed code versions that change runner state machine or schema without completing DB migration first

## State Machine (v1)
Allowed transitions only:
- `queued -> running|canceled`
- `running -> success|failed|timeout|cancel_requested`
- `cancel_requested -> canceled|failed`
Terminal states:
- `success`, `failed`, `canceled`, `timeout`
Enforcement:
- all status updates use compare-and-set SQL (`UPDATE ... WHERE id=:id AND status IN (...)`)
- rejected transition returns `409` (API path) or writes runner event (worker path)

## Worker Claiming and Recovery
- Launcher loop acquires advisory lock; if lock unavailable, it stays passive.
- Claim batch query picks oldest queued rows with `FOR UPDATE SKIP LOCKED` limited by available concurrency.
- Recovery on startup:
  - rows in `running` or `cancel_requested` older than worker boot are marked `failed`
  - add event `recovered_after_crash`
- Optional heartbeat for running jobs:
  - `runner_jobs.heartbeat_at TIMESTAMPTZ NULL`
  - worker updates every 30s; stale threshold 2 minutes for future multi-worker hardening.

## Observability (minimum)
- Metrics:
  - `runner_jobs_queued`
  - `runner_jobs_running`
  - `runner_job_starts_total`
  - `runner_job_failures_total`
  - `runner_job_timeouts_total`
  - `runner_job_cancellations_total`
  - `runner_scheduler_lock_acquired` (0/1 gauge)
- Structured logs must include `job_id`, `script_key`, `status_from`, `status_to`, and `duration_ms` on terminal transition.
- Audit events required:
  - `job_created` with actor + request metadata
  - `job_cancel_requested` with actor
  - `job_canceled`, `job_timeout`, `job_failed`, `job_succeeded` with system actor
  - `recovered_after_crash` and `heartbeat_stale_recovered` with system actor

## Error Model
API errors follow existing FastAPI style:
- `400` validation error (bad args, unsupported script)
- `401` unauthenticated
- `403` repo path not allowlisted
- `404` unknown job/repo
- `409` invalid state transition (cancel terminal job)
- `409` idempotency key reused with different payload in active dedupe window
- `429` queue full or per-user queued limit exceeded
- `500` execution/storage failures

## Phase Plan

### Phase 1 (now)
- Tables + models + migration 004
- Runner registry + queue + executor
- REST endpoints above
- Frontend page with polling for jobs and logs

### Phase 2
- `WS /api/runner/jobs/{id}/logs`
- Improved filter/search UX
- Retry job action from UI

### Phase 3
- Multi-repo registration with optional git checkout
- Scheduled jobs (templates)
- Audit dashboard

## Definition of Done (v1)
1. User can create a job for any whitelisted script from UI.
2. Job transitions are persisted and correct under success/fail/cancel/timeout.
3. Logs are viewable while running via polling endpoint.
4. Runner blocks non-whitelisted commands and invalid args.
5. Concurrency limit is enforced at runtime.
6. Restart-safe behavior: queued jobs remain queued; running jobs on crash are marked `failed` with recovery event on startup.
7. Basic tests pass.

## Test Plan (minimum)
- Unit tests:
  - script arg validation
  - command assembly (no shell interpolation)
  - state transitions
  - idempotency canonical hash stability
  - redaction and log offset invariants
- Integration tests:
  - create -> run -> success
  - create -> cancel queued
  - run -> cancel running
  - timeout path
  - startup recovery for stale `running` rows
  - queue backpressure (`429`) global and per-user
- API tests:
  - auth required on all runner endpoints
  - log offset pagination
  - idempotent create race (parallel same key/payload returns one job)
  - conflicting same key + different payload returns `409`

## Open Items (intentionally deferred)
- Fine-grained RBAC (admin vs operator)
- Distributed worker / external queue
- Cross-repo artifact storage
- WebSocket reconnect semantics

## Preconditions to Start Work
1. Add missing `/Users/ext.heiko.trenkle/Documents/klaus-news/.env.example` including auth and runner variables.
2. Confirm runtime has access to Codex CLI binary (`CODEX_BIN`) in backend container/host.
3. Confirm absolute repo path allowlist for the environment where backend runs.

# Codex Runner Part 2: Frontend Integration

## Goal
Ship the Runner UI so authenticated users can create jobs, monitor status, inspect events/logs, and cancel active runs.

## Scope
- Runner page and route
- New job form
- Jobs list and detail view
- Incremental log polling
- Cancel action UX

## Deliverables
1. Page: `/Users/ext.heiko.trenkle/Documents/klaus-news/frontend/src/pages/Runner.tsx`
2. Components:
- `/Users/ext.heiko.trenkle/Documents/klaus-news/frontend/src/components/RunnerNewJobForm.tsx`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/frontend/src/components/RunnerJobsTable.tsx`
- `/Users/ext.heiko.trenkle/Documents/klaus-news/frontend/src/components/RunnerJobDetail.tsx`
3. API client extension:
- `/Users/ext.heiko.trenkle/Documents/klaus-news/frontend/src/services/api.ts`
4. Route and nav wiring in existing app shell

## Implementation Steps
1. Extend API types and functions
- Add typed request/response interfaces for runner endpoints
- Add methods: list repos/scripts/jobs, create job, get job detail, cancel job, get logs

2. Build Runner page layout
- Left: create job form + filters
- Right/top: jobs table
- Right/bottom: selected job detail with events/logs

3. Build new job form
- Inputs: repo, script, retries, leaf_progress, verbose (only where valid)
- Validate allowed args client-side using `/api/runner/scripts` metadata
- Submit with optional idempotency key field

4. Build jobs table
- Columns: created time, script, status, requested_by, duration
- Filters: status, repo
- Pagination: limit/offset
- Badge colors for `queued`, `running`, `success`, `failed`, `canceled`, `timeout`

5. Build detail panel
- Metadata summary
- Event timeline in chronological order
- Live log viewer with offset polling
- Cancel button enabled only for `queued`/`running`

6. Polling behavior
- Jobs list refresh every 3-5s while page is visible
- Active job detail/log polling while selected and not terminal
- Stop/reduce polling when tab hidden

## UX Rules
- Show explicit API errors (`409`, `429`, validation failures)
- Distinguish terminal vs non-terminal states clearly
- Keep job selection stable across list refreshes
- Preserve filter and selected job in URL query params if practical

## Acceptance Criteria
- User can create a valid job from UI
- Job appears in list and transitions update without full page reload
- Logs stream incrementally with correct offsets
- Cancel works for queued/running jobs and updates UI state
- API error states are visible and actionable

## Exit Checklist
- Route `/kitchen/runner` protected by auth
- Nav entry added
- TypeScript build passes
- Manual flow verified end-to-end against Part 1 backend


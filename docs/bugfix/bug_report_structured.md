# Bug Report (Structured)

## Source
- Source-of-truth: docs/bug-report.md
- Docs used:
  - docs/USER_JOURNEY.md: Describes Settings UI for "Posts Per Fetch" control
  - docs/TECH_OVERVIEW.md: Documents backend architecture and database schema

## Summary
- One sentence: The "Posts Per Fetch" setting in Settings UI has no effect because x_client.py ignores the max_results parameter and always requests 5 posts from the X API.
- Severity: **medium** (feature is non-functional but workaround exists via code change; no data loss or security impact)

## Environment
- App/runtime: Python 3.11+ / FastAPI backend, React/TypeScript frontend
- OS: TBD (Docker-based, platform-agnostic)
- Node version: TBD (frontend)
- Browser: TBD (any modern browser)
- GPU/renderer: N/A
- DB: PostgreSQL 15
- Flags/env vars involved: `X_API_KEY`, `X_API_SECRET` (for X API calls)

## Known-Good vs Known-Bad States
- Known-Good (works when): N/A - setting has never worked per bug report
- Known-Bad (fails when): User changes "Posts Per Fetch" value in Settings UI - the value is saved but ignored during ingestion
- Smallest known scope where it fails: X API client function `fetch_posts_from_list()` in `x_client.py`

## Reproduction Steps (deterministic)
1) Start the Klaus News application (backend + frontend + database)
2) Navigate to `http://localhost:3000/settings/system`
3) Expand the "Ingestion" section in the "System Control" tile (right column)
4) Locate the "Posts Per Fetch" number input (default value: 5)
5) Change the value to 20 (or any value different from 5)
6) Observe the value saves (input blurs, no error message)
7) Click "Trigger Ingestion Now" button (or wait for scheduled ingestion)
8) Check database: `SELECT COUNT(*) FROM posts WHERE ingested_at > NOW() - INTERVAL '5 minutes'`
9) Observe: Only 5 posts per list were fetched, not 20

## Expected vs Actual
- Expected:
  - Changing "Posts Per Fetch" to 20 should cause the system to fetch 20 posts per X list
  - The `max_results` parameter in X API requests should equal the configured value
  - Both scheduled and manual ingestion should respect this setting
- Actual:
  - The setting value is saved to the database correctly
  - The scheduler reads the setting value correctly
  - The scheduler passes the value to `fetch_posts_from_list()`
  - BUT: `x_client.py` line 50 hardcodes `"max_results": 5` instead of using the passed parameter
  - Result: Always 5 posts fetched regardless of setting

## Do Not Re-test (Confirmed Negatives / Ruled Out)
None provided.

## Attempt History (Experiments and Outcomes)
None provided.

## Current Hypothesis / Suspects (from bug-report)
- Hypothesis: The `max_results` parameter in `x_client.py:fetch_posts_from_list()` is received but ignored when building the API request params.
- Suspects:
  1) `backend/app/services/x_client.py` line 50: `"max_results": 5` is hardcoded instead of using the `max_results` function parameter

## Scope and Blast Radius
- Affected surfaces (USER_JOURNEY naming): Settings > System Control > Ingestion section > "Posts Per Fetch" subsection; Manual ingestion trigger; Scheduled automatic fetches
- Affected API routes (repo-verified):
  - `PUT /api/settings/posts_per_fetch` (setting is saved correctly)
  - `POST /api/admin/trigger-ingest` (manual trigger passes correct value but ignored)
- Affected data entities (repo-verified):
  - `system_settings` table (`posts_per_fetch` key) - reads/writes work correctly
  - `posts` table - receives fewer posts than configured
  - `list_metadata` table - used during ingestion
- What is NOT affected (explicit, from bug-report):
  - Frontend UI (setting display and save works)
  - Database persistence (value is stored correctly)
  - Scheduler reading the setting (reads correctly)
  - Scheduler passing the value (passes correctly)

## Repo Mapping (paths must be repo-verified)
- Entry point(s): `backend/app/services/scheduler.py` (scheduled job), `backend/app/api/admin.py` (manual trigger)
- Route/page/screen: `frontend/src/pages/Settings.tsx` (Settings UI)
- Components involved:
  - `backend/app/services/x_client.py`: Contains the bug - line 50 hardcodes max_results
  - `backend/app/services/scheduler.py`: Calls fetch_posts_from_list() with correct value at line 97-100
  - `backend/app/services/settings_service.py`: Retrieves posts_per_fetch setting (works correctly)
  - `backend/app/api/settings.py`: API for saving/reading settings (works correctly)
- Rendering/engine layers (if relevant): N/A
- Assets/shaders/materials (if relevant): N/A

## Signals and Evidence
- Error messages (verbatim if present): None - bug is silent (no errors thrown)
- Logs to look for (where): Check scheduler logs for `posts_per_fetch` value being read; check X client logs for actual `max_results` used
- Screenshots/video mentioned in bug-report: No
- Telemetry/metrics (if any): `stats['posts_fetched']` in ingestion job tracks actual posts fetched

## Constraints (from bug-report)
- Must not break: Existing ingestion flow, X API authentication, since_id pagination
- Must preserve behavior: Duplicate prevention via post_id check, category filtering, AI processing pipeline
- Hard exclusions (from confirmed negatives): N/A

## Acceptance Criteria (human-checkable)
- AC-1: Setting "Posts Per Fetch" to 20 in Settings UI results in `max_results=20` being sent to X API
- AC-2: Scheduled automatic fetches respect the configured `posts_per_fetch` value
- AC-3: Manual "Trigger Ingestion Now" respects the configured `posts_per_fetch` value
- AC-4: Default behavior (no change to setting) still fetches 5 posts per list
- Regression guards:
  - RG-1: X API `since_id` pagination must continue to work (prevents refetching)
  - RG-2: Ingestion continues to process all AI steps (categorize, title, summary, scoring)
  - RG-3: Settings API continues to validate value range (1-100)

## Open Questions
- Needed: no

## Chat Gate (MANDATORY)

```txt
GATE: bf-0
Written: docs/bugfix/bug_report_structured.md
Questions needed: no
```

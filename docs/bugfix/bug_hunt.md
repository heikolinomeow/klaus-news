# Bug Hunt (Paranoid)

## Re-statement of the Bug (from structured report)
The "Posts Per Fetch" UI setting saves correctly to the database, is read correctly by the scheduler, and is passed correctly to `fetch_posts_from_list()`, but the X API client function ignores the parameter and hardcodes `max_results=5` in the API request params. Result: changing the setting has no effect on actual posts fetched.

## Pinned Constraints (from structured report)
- Known-Good states: N/A - setting has never worked per bug report
- Known-Bad states: User changes "Posts Per Fetch" value in Settings UI - the value is saved but ignored during ingestion
- Do Not Re-test (ruled out): None provided.
- Attempt History (already tried): None provided.

## Repro Checkpoints (where to instrument mentally)
- CP-1: Frontend saves `posts_per_fetch` to database via `PUT /api/settings/posts_per_fetch` (WORKS)
- CP-2: `SettingsService.get('posts_per_fetch')` returns correct value in scheduler (WORKS)
- CP-3: `x_client.fetch_posts_from_list()` receives correct `max_results` parameter (WORKS - logged at line 41)
- CP-4: **BUG HERE** - `params` dict on line 50 hardcodes `"max_results": 5` instead of using the parameter
- CP-5: X API receives `max_results=5` regardless of setting (BROKEN)

## Hypotheses (exhaustive list)

### H-1: Hardcoded max_results in params dict (PRIMARY SUSPECT)
- Status: **ACTIVE**
- Likelihood: **high** (99% certainty)
- Evidence:
  - File(s): `backend/app/services/x_client.py`
  - Anchor(s): Line 50: `"max_results": 5,` - hardcoded value in params dict
  - Anchor(s): Line 26: `async def fetch_posts_from_list(self, list_id: str, max_results: int = 100, since_id: str = None)` - parameter defined but unused
  - Anchor(s): Line 41: `'max_results': max_results,` - correct value LOGGED but not USED in params
- Failure mechanism: The function signature accepts `max_results` and logs it, but the params dict constructed on lines 49-54 hardcodes `5` instead of using the variable.
- Disproof test: Change line 50 from `"max_results": 5,` to `"max_results": max_results,` - if bug is fixed, this is root cause
- Related side effects: None for this fix; it's an isolated one-line change

### H-2: Settings cache serving stale value
- Status: **ACTIVE** (but low probability given primary suspect)
- Likelihood: **low**
- Evidence:
  - File(s): `backend/app/services/settings_service.py`
  - Anchor(s): Line 14-15: `_cache: dict[str, tuple[Any, datetime]] = {}` and `_cache_expiry_seconds = 60`
  - Anchor(s): Lines 32-35: Cache check uses 60-second expiry
- Failure mechanism: If settings were cached too long, scheduler might read old value. However, 60-second expiry is reasonable and cache is invalidated on update (line 156 of settings.py).
- Disproof test: Add logging inside `SettingsService.get()` to print actual value retrieved for `posts_per_fetch`. If value matches UI setting, cache is fine.
- Related side effects: Would affect ALL settings, not just posts_per_fetch

### H-3: Frontend sends wrong value type
- Status: **ACTIVE** (but low probability)
- Likelihood: **low**
- Evidence:
  - File(s): `frontend/src/pages/Settings.tsx`
  - Anchor(s): Line 719: `onBlur={() => updateSetting('posts_per_fetch', postsPerFetch.toString())}`
  - File(s): `frontend/src/contexts/SettingsContext.tsx`
  - Anchor(s): Lines 91-95: `stringValue = String(value);` conversion before API call
- Failure mechanism: Type coercion could theoretically lose precision, but `toString()` on an integer is safe.
- Disproof test: Check database directly: `SELECT value FROM system_settings WHERE key='posts_per_fetch'` - if value matches what user entered, frontend is fine.
- Related side effects: Would affect other numeric settings if true

### H-4: Database validation rejecting/clamping values
- Status: **ACTIVE** (but low probability)
- Likelihood: **low**
- Evidence:
  - File(s): `backend/app/api/settings.py`
  - Anchor(s): Lines 91-99: Numeric range validation for int/float types
  - Anchor(s): Lines 94-97: Validates against `min_value` and `max_value` (1-100 for posts_per_fetch)
  - File(s): `backend/app/database.py`
  - Anchor(s): Lines 66-72: Default setting `min_value=1.0, max_value=100.0`
- Failure mechanism: Value outside 1-100 would be rejected with HTTP 400, not silently clamped.
- Disproof test: Try setting value to 20 (within range) and check database. If stored as 20, validation is fine.
- Related side effects: None - explicit error would be raised

### H-5: Scheduler creates new SettingsService instance that doesn't see update
- Status: **ACTIVE** (but low probability)
- Likelihood: **low**
- Evidence:
  - File(s): `backend/app/services/scheduler.py`
  - Anchor(s): Line 70: `settings_svc = SettingsService(db)` - creates fresh instance per job run
  - File(s): `backend/app/services/settings_service.py`
  - Anchor(s): Line 14: `_cache: dict[str, tuple[Any, datetime]] = {}` - CLASS-level cache (shared across instances)
- Failure mechanism: Cache is at class level, so all instances share it. This is actually correct behavior.
- Disproof test: Log output of `settings_svc.get('posts_per_fetch')` in scheduler - if it returns correct value, this is not the issue.
- Related side effects: Would affect all settings read in scheduler

### H-6: X API has minimum max_results constraint we're not aware of
- Status: **ACTIVE** (informational - not the bug, but relevant)
- Likelihood: **low** (for being the bug)
- Evidence:
  - File(s): External - X API documentation
  - Anchor(s): NO EVIDENCE FOUND (hypothesis only) - X API v2 typically supports max_results from 10-100
- Failure mechanism: If X API has constraints (e.g., min 10), setting 5 might be forced lower. But even if true, this would mean ANY value we pass would be constrained, so the fix is still to use the parameter.
- Disproof test: Check X API docs or test with value 50 - if X returns 50, no API constraint.
- Related side effects: X API rate limits apply per call regardless of count

### H-7: Multiple XClient instances with different states
- Status: **ACTIVE** (but very low probability)
- Likelihood: **very low**
- Evidence:
  - File(s): `backend/app/services/x_client.py`
  - Anchor(s): Line 132: `x_client = XClient()` - single global instance
  - File(s): `backend/app/services/scheduler.py`
  - Anchor(s): Line 45: `from app.services.x_client import x_client` - imports singleton
- Failure mechanism: Only one instance exists. No state is stored for max_results anyway.
- Disproof test: Already confirmed by code inspection - singleton pattern used.
- Related side effects: None

### H-8: test_list_connectivity using hardcoded max_results=1
- Status: **ACTIVE** (tangential issue - not the main bug)
- Likelihood: **N/A** (separate issue)
- Evidence:
  - File(s): `backend/app/services/x_client.py`
  - Anchor(s): Line 120: `posts = await self.fetch_posts_from_list(list_id, max_results=1)`
- Failure mechanism: This is intentional for testing (only need 1 post to verify connectivity). However, it ALSO would be affected by the hardcoded bug - passing 1 but getting 5.
- Disproof test: N/A - different code path, intentionally different behavior
- Related side effects: Test connectivity fetches 5 posts instead of 1 (wasteful but not harmful)

### H-9: Environment variable override for max_results
- Status: **ACTIVE** (but no evidence)
- Likelihood: **very low**
- Evidence:
  - File(s): `backend/app/config.py`
  - Anchor(s): No `max_results` env var defined in Settings class (lines 5-27)
- Failure mechanism: No env var mechanism exists for max_results. Not the cause.
- Disproof test: Already confirmed by code inspection - no such env var exists.
- Related side effects: None

### H-10: Hot reload / module caching in development
- Status: **ACTIVE** (but unlikely given clear evidence)
- Likelihood: **very low**
- Evidence:
  - File(s): Development environment
  - Anchor(s): NO EVIDENCE FOUND (hypothesis only)
- Failure mechanism: If dev server caches old module, changes might not apply. But this wouldn't explain hardcoded literal in source.
- Disproof test: Restart backend container completely, test again.
- Related side effects: Would affect any code changes

### H-11: Shadowed variable name
- Status: **ACTIVE** (confirmed NOT present)
- Likelihood: **none** (ruled out by inspection)
- Evidence:
  - File(s): `backend/app/services/x_client.py`
  - Anchor(s): Line 26 defines `max_results` parameter, no redefinition before line 50
- Failure mechanism: If a local variable shadowed the parameter, it could explain the issue. Inspection confirms no shadowing.
- Disproof test: N/A - already confirmed by inspection.
- Related side effects: None

### H-12: Typo or copy-paste error when building params
- Status: **ACTIVE** (this IS the root cause, reframing H-1)
- Likelihood: **high** (certain)
- Evidence:
  - File(s): `backend/app/services/x_client.py`
  - Anchor(s): Line 50: `"max_results": 5,` - developer likely copy-pasted from example/docs or wrote quick prototype
  - Anchor(s): Line 41: `'max_results': max_results,` - CORRECT usage in logging shows developer knew to use variable
- Failure mechanism: Classic oversight: log statement uses variable correctly, but actual params dict uses literal.
- Disproof test: Fix line 50 to use variable.
- Related side effects: None

## Suspicious Code Map

- `backend/app/services/x_client.py:50`: **THE BUG** - hardcoded `"max_results": 5` instead of using `max_results` parameter
  - Anchor: `"max_results": 5,`

- `backend/app/services/x_client.py:26`: Function signature accepts parameter that is never used
  - Anchor: `async def fetch_posts_from_list(self, list_id: str, max_results: int = 100, since_id: str = None)`

- `backend/app/services/x_client.py:41`: Log statement correctly uses variable (shows intended usage)
  - Anchor: `'max_results': max_results,`

- `backend/app/services/x_client.py:120`: test_list_connectivity hardcodes max_results=1 (intentional but also affected by bug)
  - Anchor: `posts = await self.fetch_posts_from_list(list_id, max_results=1)`

## Non-obvious Failure Modes Checklist

- Race/ordering issues: **Not applicable** - single-threaded request processing, no concurrent writes to same param
- Caching/staleness: **Checked** - SettingsService has 60s cache with invalidation on update; not the cause
- Streaming edge cases: **Not applicable** - X API returns JSON, not streaming
- Idempotency collisions: **Not applicable** - no state collisions in fetch operation
- State mismatch (client vs server): **Not applicable** - no client state involved
- Timezone/time parsing: **Not applicable** - bug is in integer parameter, not time
- Env var mismatches: **Checked** - no env var for max_results; not the cause
- Dev hot reload pitfalls: **Unlikely** - bug is in source code literal, would persist across reloads
- "Works locally only" traps: **Not applicable** - same code runs everywhere, same hardcoded value

## Debugging Experiments (minimal, high-signal)

- EXP-1: Add temporary log inside params construction
  - Where: `backend/app/services/x_client.py` line 49 (before params dict)
  - Code: `logger.info(f"DEBUG: Building params with max_results={max_results}")`
  - Expected signal if H-1 true: Log shows correct max_results value (e.g., 20), but X API only returns 5 posts
  - Expected signal if H-1 false: Log shows max_results=5 (would indicate parameter never reached function)

- EXP-2: Direct database check for stored setting
  - Where: PostgreSQL database
  - Code: `SELECT key, value FROM system_settings WHERE key='posts_per_fetch';`
  - Expected signal if frontend works: Value matches what user set (e.g., "20")
  - Expected signal if frontend broken: Value is "5" or corrupted

- EXP-3: Inspect X API request in network logs
  - Where: Backend stdout/stderr or structured logs
  - Code: Enable httpx debug logging or add `logger.info(f"X API request params: {params}")` after line 54
  - Expected signal if H-1 true: Logs show `max_results=5` in actual request
  - Expected signal if fix correct: Logs show `max_results=20` (or configured value)

## Smells (not necessarily the bug, but relevant debt)

- S-1: Unused parameter with misleading default
  - Path: `backend/app/services/x_client.py`
  - Anchor: `async def fetch_posts_from_list(self, list_id: str, max_results: int = 100, since_id: str = None)`
  - Why it matters: Default is `100` but hardcoded value is `5`. Even if fixed, the default of 100 is misleading since DB default is 5. Should align defaults or remove default from function.

- S-2: Inconsistent logging of actual vs intended
  - Path: `backend/app/services/x_client.py`
  - Anchor: Line 41 logs `max_results` parameter, but line 85-88 logs actual `post_count` returned
  - Why it matters: Gap between "intended to fetch" and "actually requested" is not visible in logs. After fix, consider logging actual params sent.

- S-3: Print statement instead of logger
  - Path: `backend/app/services/scheduler.py`
  - Anchor: Line 144: `print(f"AI worthiness failed, using algorithmic fallback: {e}")`
  - Why it matters: Inconsistent with rest of codebase which uses `logger`. Should use structured logging.

- S-4: Print statement instead of logger (second occurrence)
  - Path: `backend/app/services/scheduler.py`
  - Anchor: Line 179: `print(f"AI title comparison failed for group {group.id}: {e}")`
  - Why it matters: Same as S-3 - inconsistent logging.

- S-5: Missing docstring for max_results parameter
  - Path: `backend/app/services/x_client.py`
  - Anchor: Lines 27-35 - docstring mentions `list_id` and `since_id` but not `max_results`
  - Why it matters: Makes parameter purpose unclear, contributes to bugs like this being overlooked.

## Chat Gate (MANDATORY)

```txt
GATE: bf-1
Written: docs/bugfix/bug_hunt.md
Hypotheses count: 12
Open questions: no
Next: bf-2
```

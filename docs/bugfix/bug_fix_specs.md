# Bug Fix Specs

## Source Documents
- Structured Report: `docs/bugfix/bug_report_structured.md`
- Bug Hunt: `docs/bugfix/bug_hunt.md`

## Triage Summary

### Primary Root Cause
**H-1/H-12: Hardcoded max_results in params dict**

The `fetch_posts_from_list()` function in `backend/app/services/x_client.py` accepts a `max_results` parameter but ignores it. Line 50 hardcodes `"max_results": 5` instead of using the `max_results` variable.

Evidence (verified):
- Line 26: Function signature declares `max_results: int = 100` parameter
- Line 41: Logs the correct `max_results` value (proves parameter arrives correctly)
- Line 50: Hardcodes `"max_results": 5` in the params dict (the bug)

### Secondary Contributing Factors
None. This is a single-point-of-failure bug.

### Hypotheses NOT Being Addressed Now
- H-2 through H-11: All rated low/very low likelihood; primary fix resolves the bug
- S-1 through S-5 (Smells): Out of scope - not required to fix the bug

## Scope

### In-Scope (MUST fix)
1. Replace hardcoded `5` with the `max_results` parameter on line 50 of `x_client.py`

### Out-of-Scope (will NOT change)
- Function signature default value (currently `100`) - cosmetic, doesn't affect behavior when called correctly
- Docstring update for `max_results` - smell S-5, not required for fix
- Print statements in scheduler.py - smells S-3/S-4, unrelated to bug
- test_list_connectivity behavior - H-8 notes it passes `max_results=1` but gets 5; after fix it will correctly get 1 post, which is fine

## Target Area

### File to Modify
- **Path:** `backend/app/services/x_client.py`
- **Verified:** Yes (exists at `/Users/ext.heiko.trenkle/Documents/klaus-news/backend/app/services/x_client.py`)

### Exact Change Location
- **Line 50**
- **Current code:** `"max_results": 5,`
- **Required change:** Replace `5` with `max_results` variable

### Context (lines 49-54)
```python
        params = {
            "max_results": 5,  # <-- THIS LINE: change 5 to max_results
            "tweet.fields": "created_at,author_id",
            "expansions": "author_id",
            "user.fields": "username"
        }
```

## Implementation Spec

### SPEC-1: Use max_results parameter in API request params
- **What:** Change line 50 from `"max_results": 5,` to `"max_results": max_results,`
- **Why:** The function parameter `max_results` is received correctly but ignored; this connects it to the actual API call
- **Constraints:**
  - Do NOT change the function signature
  - Do NOT add validation (already done upstream in settings API)
  - Do NOT change any other lines in the params dict

## Acceptance Tests (mapped to AC from structured report)

### AT-1: Setting respected in X API call (maps to AC-1)
- **Precondition:** Posts Per Fetch set to 20 in Settings UI
- **Action:** Trigger ingestion (manual or scheduled)
- **Verification:** Check logs for X API request showing `max_results=20`
- **Pass criteria:** Log entry `"Fetching posts from X list"` shows `'max_results': 20`

### AT-2: Scheduled fetches respect setting (maps to AC-2)
- **Precondition:** Posts Per Fetch set to 15, scheduler running
- **Action:** Wait for scheduled ingestion to execute
- **Verification:** Check database for newly ingested posts
- **Pass criteria:** Up to 15 posts per list are fetched (limited by available posts, but not capped at 5)

### AT-3: Manual trigger respects setting (maps to AC-3)
- **Precondition:** Posts Per Fetch set to 10
- **Action:** Click "Trigger Ingestion Now" in Settings UI
- **Verification:** Check ingestion stats returned by API
- **Pass criteria:** `stats.posts_fetched` can exceed 5 per list (if X list has >5 new posts)

### AT-4: Default behavior unchanged (maps to AC-4)
- **Precondition:** Fresh install with default Posts Per Fetch = 5
- **Action:** Trigger ingestion without changing setting
- **Verification:** Check logs for X API request
- **Pass criteria:** Log shows `'max_results': 5` (default preserved)

## Regression Guards (from structured report)

### RG-1: since_id pagination continues working
- **Verification:** After fix, trigger ingestion twice in succession
- **Pass criteria:** Second ingestion fetches only NEW posts (since_id filtering works)

### RG-2: AI processing pipeline intact
- **Verification:** After fix, check newly ingested posts have ai_title, ai_summary, category, worthiness_score
- **Pass criteria:** All AI-generated fields populated (not null)

### RG-3: Settings validation intact
- **Verification:** Try setting Posts Per Fetch to 200 (above max 100)
- **Pass criteria:** API returns HTTP 400 error, value not saved

## Risk Assessment
- **Blast radius:** Minimal - single line change in isolated function
- **Rollback:** Trivial - revert single line
- **Side effects:** None expected; function callers already pass correct value
- **Breaking changes:** None - fix makes existing interface work as documented

## Chat Gate (MANDATORY)

```txt
GATE: bf-2
Written: docs/bugfix/bug_fix_specs.md
Open questions: no
Next: bf-3
```

# Klaus News - Gotchas & Known Issues

## Settings & Configuration

### Dynamic Scheduler Rescheduling
**Issue:** Rescheduling APScheduler jobs while they're executing can cause errors
**Risk:** High (8/10)
**Workaround:** System checks if job is running before rescheduling; may fail silently
**Mitigation:** Test schedule changes thoroughly; implement retry logic

### Settings Cache Staleness
**Issue:** 60-second cache TTL means settings changes may not apply immediately
**Risk:** Medium (3/10)
**Behavior:** Settings updated via API may take up to 60 seconds to affect scheduler
**Mitigation:** Cache is invalidated on update, but race conditions possible

### Scheduler Pause State Persistence
**Issue:** UI no longer provides pause/resume scheduler control (removed in v2.1); scheduler control now only via auto_fetch_enabled setting
**Risk:** High (7/10)
**Behavior:** Paused state persists across backend restarts via database
**Mitigation:** Auto-fetch can be disabled via toggle in System Control → Ingestion section; status clearly displayed

### Class-Level Cache in Multi-Process Deployments
**Issue:** SettingsService uses class-level cache, not suitable for multi-process deployments
**Risk:** Medium (3/10)
**Behavior:** In multi-worker setups (Gunicorn, uWSGI), each process has separate cache
**Mitigation:** For production, consider Redis or shared cache backend

### X API Rate Limits
**Issue:** Aggressive settings (high posts_per_fetch, low ingest_interval) can exceed X API limits
**Risk:** Moderate (4/10)
**Behavior:** Settings page shows warning, but user can override
**Mitigation:** Calculate estimated API calls per hour; warn if >450/hour (75% of typical limit)

### Concurrent Setting Updates
**Issue:** Multiple users updating same setting simultaneously may cause last-write-wins
**Risk:** Low (2/10)
**Behavior:** Database transaction ensures atomic write, but earlier update is overwritten
**Mitigation:** Single-user system assumed; implement optimistic locking for multi-user

### Manual Trigger During Scheduled Job
**Issue:** User can trigger manual ingestion (System Control → Ingestion → Manual Ingestion Trigger) or archival (System Control → Archival → Manual Archival Trigger) while scheduled job is running
**Risk:** Moderate-High (6/10)
**Behavior:** May cause duplicate posts, race conditions, or database lock timeouts
**Mitigation:** UI disables manual trigger button while job is running; check scheduler status before trigger

### Archive Without Confirmation
**Issue:** Group archive operation sets group.archived=true (V-9); posts inherit this state
**Risk:** Low (4/10)
**Behavior:** Confirmation dialog mitigates accidental triggers
**Mitigation:** Archived groups can be un-archived via POST /api/groups/{id}/unarchive/ endpoint or archived groups UI view

### Group State Machine Progression
**Issue:** Groups follow state flow NEW → COOKING → REVIEW → PUBLISHED; no backward transitions (Brief V-3)
**Risk:** Medium (4/10)
**Behavior:** Once group moves to COOKING, it cannot return to NEW; once in REVIEW, cannot return to COOKING
**Mitigation:** Design enforces forward-only progression; user must create new group or archive current one to restart

### Research Optional But UI May Confuse
**Issue:** Design decision V-20: article generation always available without research (Brief V-11)
**Risk:** Low (3/10)
**Behavior:** Users might think research is required when it's optional
**Mitigation:** Generate Article button always enabled; UI should clearly show two paths (with/without research)

### Invalid Settings Breaking System
**Issue:** Extreme settings values (e.g., interval = 0, threshold = 1.5) could break scheduler
**Risk:** Medium (5/10)
**Behavior:** Validation layer prevents most invalid inputs
**Mitigation:** Min/max constraints enforced at database and API level; test edge cases

### Threshold Changes Affecting Existing Posts
**Issue:** Changing worthiness_threshold immediately affects Recommended view
**Risk:** Low (3/10)
**Behavior:** Posts appear/disappear from view based on new threshold
**Mitigation:** Live preview shows impact before saving; reversible change

### Settings Route Migration
**Issue:** Users may have bookmarked `/settings` which no longer exists as a direct page
**Risk:** Low (2/10)
**Behavior:** Old `/settings` URL should redirect to `/settings/system` for backward compatibility
**Mitigation:** Implement redirect in App.tsx routing; update documentation and external links

### Tile Content Overflow
**Issue:** Very long content in tiles may require scrolling, potentially hiding important controls
**Risk:** Low (3/10)
**Behavior:** Tiles have max-height (600px for settings, 400px for prompts) with overflow-y: auto
**Mitigation:** Most critical controls placed near top of tiles; users can scroll within tiles without affecting page layout

### Settings Page Restructuring
**Issue:** Users familiar with previous 2×2 grid layout may need to relearn tile locations
**Risk:** Low (2/10)
**Behavior:** Scheduling controls now in System Control → Ingestion section; PromptTiles now embedded in Content Filtering sections
**Mitigation:** Intuitive section names and clear visual hierarchy; all controls remain accessible

### V-5 Group-Centric UI Change
**Issue:** Home page now shows Groups instead of individual Posts
**Risk:** Low (2/10) - UX paradigm shift
**Behavior:** Users see representative titles with post count badges; must expand to see individual posts
**Mitigation:** More intuitive UX showing story depth; expand/collapse is familiar pattern

### V-18 Group-Level Selection
**Issue:** Selection actions now operate at group level, not post level
**Risk:** Low (2/10) - API breaking change
**Behavior:** POST /api/posts/{id}/select/ removed; use POST /api/groups/{id}/select/ instead
**Mitigation:** Frontend updated to use group-level actions; all posts in group become article source material

### V-5 Archived Group Matching Behavior
**Issue:** New posts matching archived groups join silently without unarchiving
**Risk:** Low (2/10) - may surprise users expecting notification
**Behavior:** Group stays archived; post_count increments; no status change or notification
**Mitigation:** User can view archived groups to see activity; respects user's explicit archive decision

### Invalid Prompts Breaking AI Operations
**Issue:** Users can edit prompts to invalid or empty text, breaking AI functionality
**Risk:** Critical (9/10)
**Behavior:** Empty or malformed prompts cause OpenAI API errors, blocking ingestion/article generation
**Mitigation:** UI validation prevents empty prompts; Reset to Default button available; fallback to hardcoded defaults if database entry missing

### Concurrent Prompt Editing
**Issue:** Multiple tiles editable simultaneously, user may forget unsaved changes in one tile while editing another
**Risk:** Low (2/10)
**Behavior:** Each tile has independent Save button; no indication of unsaved changes in other tiles
**Mitigation:** Per-tile save prevents losing all work if one save fails; consider adding visual indicator for unsaved changes in future

### Category Name Immutability
**Issue:** Category names cannot be changed after creation
**Risk:** Medium (5/10)
**Behavior:** Users may want to rename categories but this would orphan existing posts
**Mitigation:** UI clearly labels name field as permanent; descriptions can be edited anytime to clarify category scope

### Category Fuzzy Matching Edge Cases
**Issue:** Partial string matching may produce unexpected category assignments
**Risk:** Low (3/10)
**Behavior:** AI returns "News" → matches "Major News"; AI returns "Content" → matches "Content Creation"
**Mitigation:** Review mismatch log in Settings; adjust category names for distinctiveness; improve prompt skeleton instructions

### Category Mismatch Log Cap
**Issue:** Mismatch log capped at 100 entries; oldest entries removed automatically
**Risk:** Low (2/10)
**Behavior:** High mismatch volume may lose historical data before user reviews
**Mitigation:** Review and clear log regularly; adjust categories or prompt if consistent mismatches occur

### Cross-Category Duplicate Detection Limitation
**Issue:** Duplicate detection operates within category boundaries only
**Risk:** Low (3/10)
**Behavior:** If AI miscategorizes a post, it won't be detected as duplicate of similar post in correct category
**Mitigation:** Known trade-off; cross-category comparison would be significantly more expensive (API calls); current approach balances cost vs. accuracy

### Teams Webhook URL Security
**Issue:** TEAMS_CHANNELS webhook URLs are sensitive credentials
**Risk:** Critical (9/10)
**Behavior:** If exposed, anyone can post messages to Teams channels
**Mitigation:** GET /api/teams/channels only returns channel names, never webhook URLs; URLs stored in env vars only; backend validates articleId and channelName

### Microsoft Teams Rate Limits
**Issue:** Teams incoming webhooks have rate limits (~4 messages/second)
**Risk:** Medium (4/10)
**Behavior:** High-volume sending may be throttled or rejected
**Mitigation:** Current design is single-article send; bulk sending not implemented (V-23 out of scope); add delay if bulk feature added in future

### Teams Channel Configuration
**Issue:** Channels configured via environment variables require admin access
**Risk:** Low (3/10)
**Behavior:** End users cannot add/remove channels via UI
**Mitigation:** Design decision per V-2; Settings page clearly explains admin configuration requirement; empty state guides users to contact admin

### Invalid TEAMS_CHANNELS JSON
**Issue:** Malformed JSON in TEAMS_CHANNELS env var breaks channel loading
**Risk:** High (7/10)
**Behavior:** GET /api/teams/channels returns error; Send to Teams button shows "No channels configured"
**Mitigation:** Validate JSON structure on config load (V-22); each item must have `name` (string) and `webhookUrl` (string); log validation errors

### Teams Webhook Errors Not Detailed
**Issue:** Microsoft Teams webhooks return generic errors (200 OK or error)
**Risk:** Low (3/10)
**Behavior:** If Teams rejects message (e.g., malformed card), error is generic "Failed to send to Teams"
**Mitigation:** Log full response in system_logs with external_api category; user sees simplified message per V-20; admin can debug via logs

### Send to Teams Button Disabled State
**Issue:** Button disabled when no channels configured; users may not understand why
**Risk:** Low (2/10)
**Behavior:** Tooltip explains "No Teams channels configured" on hover
**Mitigation:** Settings page shows clear empty state with instructions; button tooltip provides immediate feedback

### Prompt Changes Immediate Effect
**Issue:** Prompt edits take effect immediately without preview or staging
**Risk:** Medium (5/10)
**Behavior:** Bad prompt can immediately affect all new posts ingested
**Mitigation:** Export prompts before editing (manual versioning); Reset to Default available

### No Prompt Change History
**Issue:** Cannot view previous prompt versions or revert changes
**Risk:** Medium (4/10)
**Behavior:** If user edits prompt and forgets original, must reset to default (loses custom tuning)
**Mitigation:** Recommend exporting prompts before major changes; implement audit log in future

## X Article Ingestion

### Article API Fields Dependency
**Issue:** X API request now includes article-specific fields (`article`, `note_tweet`, `referenced_tweets` expansions per V-6)
**Risk:** Medium (5/10)
**Behavior:** If X API deprecates these fields or changes response structure, article detection may break; existing tweet.fields like `created_at`, `author_id` must remain or current parsing will fail
**Mitigation:** Monitor X API changelog; implement defensive parsing with null checks; fallback to tweet text if article fields missing; V-6 merges new fields with existing required fields to prevent breakage

### Article Text Fallback Chain
**Issue:** Article text may be unavailable due to permissions, paywalls, or API restrictions (V-7 processing rules)
**Risk:** Medium (4/10)
**Behavior:** System falls back to article metadata + tweet text when `article.text` is empty or missing; summarization proceeds with available content
**Mitigation:** Fallback reason logged in `ingestion_fallback_reason` field; article metadata (title, subtitle) combined with post context for AI processing; system does not fail ingestion when article text unavailable

### Content Type Field Migration
**Issue:** Existing posts in database won't have `content_type` field populated (V-4, V-8)
**Risk:** Low (3/10)
**Behavior:** NULL or missing `content_type` treated as 'post' by default; UI filter may show inconsistent results until backfill completes
**Mitigation:** Feature flag controls rollout (V-11); optional backfill mechanism to re-process recent posts for article typing; frontend handles NULL gracefully by defaulting to 'post' type

### Article Pipeline Feature Flag
**Issue:** Feature flag (`article_pipeline_enabled` in system_settings) gates entire article detection/routing pipeline (V-11)
**Risk:** Medium (4/10)
**Behavior:** When flag is disabled, all posts flow through existing POST pipeline unchanged; when enabled, V-2/V-3 detection and routing logic activates
**Mitigation:** Flag-off state must be identical to current behavior to prevent regression; test both states thoroughly; monitoring should segment metrics by content_type when flag is enabled

## OpenAI API Integration

### OpenAI Model Reference (January 2026)

This section documents the current OpenAI model landscape and correct API usage patterns.

#### GPT-5 Model Family

| Model | Use Case | Context | Pricing (per 1M tokens) |
|-------|----------|---------|------------------------|
| `gpt-5` | General purpose, high capability | 400K total (272K input, 128K output) | $15 input / $60 output |
| `gpt-5-mini` | Cost-effective reasoning | 400K total | $3 input / $12 output |
| `gpt-5-nano` | Ultra-low cost, simple tasks | 400K total | $0.50 input / $2 output |
| `gpt-5.1` | Improved coding/reasoning (recommended) | 400K total | $15 input / $60 output |
| `gpt-5.2` | Latest frontier model, professional work | 400K total | $20 input / $80 output |
| `gpt-5.2-codex` | Agentic coding (Codex environments only) | 400K total | API access coming soon |

**Key Notes:**
- GPT-5.1 is now the recommended general-purpose model (GPT-5 considered "previous generation")
- GPT-5.2 adds `xhigh` reasoning effort level, concise reasoning summaries, and context compaction
- GPT-5.2-Codex is specifically for agentic coding in Codex-like environments

#### Search-Enabled Models (Responses API)

| Model | Use Case | Web Search | Reasoning | Status |
|-------|----------|------------|-----------|--------|
| `gpt-5-search-api` | Quick web lookups | **BUILT-IN** | ❌ NOT supported | ⚠️ 500 errors (Jan 2026) |
| `gpt-5-search-api-2026-10-14` | Dated snapshot | **BUILT-IN** | ❌ NOT supported | ⚠️ 500 errors (Jan 2026) |
| `gpt-5.1` + web_search | Web search + reasoning | Via tool | ✅ Supported | ✅ Working |

**⚠️ CRITICAL (January 2026): `gpt-5-search-api` is currently returning 500 Internal Server Errors.**

Use `gpt-5.1` with `tools=[{"type": "web_search"}]` as a workaround:

```python
# ✅ RECOMMENDED - gpt-5.1 with web_search tool (WORKS)
response = await client.responses.create(
    model="gpt-5.1",
    tools=[{"type": "web_search"}],
    input=prompt
)

# ❌ BROKEN (Jan 2026) - gpt-5-search-api returns 500 errors
response = await client.responses.create(
    model="gpt-5-search-api",
    input=prompt
)
```

**Key limitations of `gpt-5-search-api` (when working):**
1. Does NOT support `reasoning` parameter - returns: `"Unsupported parameter: 'reasoning.effort' is not supported with this model."`
2. Does NOT support `tools` parameter - returns: `"Tool 'web_search_preview' is not supported with gpt-5-search-api."`
3. It's a pure search model - "Google-like links provider with snippets" - not a reasoning model

**For agentic search WITH reasoning, use gpt-5.1:**
```python
# ✅ CORRECT - gpt-5.1 with web_search AND reasoning
response = await client.responses.create(
    model="gpt-5.1",
    tools=[{"type": "web_search"}],
    reasoning={"effort": "medium"},
    input=prompt
)
```

#### o-Series Reasoning Models

| Model | Use Case | Context | Pricing |
|-------|----------|---------|---------|
| `o4-mini` | Fast reasoning, math/coding | 200K | $2 input / $8 output |
| `o4-mini-deep-research` | Multi-step research | 200K | $2 input / $8 output + search costs |
| `o3` | Advanced reasoning | 200K | $10 input / $40 output |
| `o3-deep-research` | Comprehensive research | 200K | $10 input / $40 output + search costs |

**Deep Research Models:**
- `o4-mini-deep-research` and `o3-deep-research` have web search **BUILT-IN**
- Do NOT pass `tools=[{"type": "web_search"}]` - same error as search-api models
- These models "always use web_search" internally
- Recommended to run in "background" mode due to longer processing times

**Correct Deep Research Usage:**
```python
# ✅ CORRECT
response = await client.responses.create(
    model="o4-mini-deep-research",
    input=prompt
)

# Access results
output = response.output_text
citations = response.citations  # List of {url, title}
```

#### Chat Completions API vs Responses API

**Chat Completions API** (`client.chat.completions.create`):
- Traditional request/response pattern
- Used for: titles, summaries, categorization, scoring
- Does NOT support web search natively

**Responses API** (`client.responses.create`):
- Agentic loop supporting multiple tool calls per request
- Used for: research, multi-step tasks
- 40-80% better cache utilization vs Chat Completions
- Supports: `web_search`, `file_search`, `code_interpreter`, `image_generation`, MCP servers

**When to use which:**
| Task | API | Model | Notes |
|------|-----|-------|-------|
| Generate title/summary | Chat Completions | gpt-4o, gpt-5.1 | |
| Categorize posts | Chat Completions | gpt-5-mini | |
| Score worthiness | Chat Completions | gpt-5-mini | |
| Duplicate detection | Chat Completions | gpt-5-mini | |
| Quick web research | Responses | gpt-5.1 + web_search | gpt-5-search-api broken (Jan 2026) |
| Agentic research | Responses | gpt-5.1 + web_search + reasoning | gpt-5-search-api doesn't support reasoning |
| Deep research | Responses | o4-mini-deep-research | |

#### Adding Web Search to Non-Search Models

For models that don't have native search (gpt-5, gpt-5.1, gpt-5.2), you CAN add web search:

```python
# ✅ CORRECT - web_search tool with NON-search models
response = await client.responses.create(
    model="gpt-5.1",  # Regular model, not search-api
    tools=[{"type": "web_search"}],
    input=prompt
)
```

**Domain Filtering:**
```python
response = await client.responses.create(
    model="gpt-5.1",
    tools=[{
        "type": "web_search",
        "search_context_size": "medium",  # low, medium, high
        "user_location": {
            "type": "approximate",
            "country": "US"
        }
    }],
    input=prompt
)
```

#### Reasoning Effort Levels

For models that support reasoning (gpt-5, gpt-5.1, gpt-5.2, o-series - **NOT** gpt-5-search-api):

| Level | Description | Latency | Use Case |
|-------|-------------|---------|----------|
| `none` | No reasoning (default for non-reasoning) | Fastest | Quick lookups |
| `low` | Light reasoning | Fast | Simple analysis |
| `medium` | Moderate reasoning | Moderate | Balanced research |
| `high` | Deep reasoning | Slow | Complex analysis |
| `xhigh` | Maximum reasoning (GPT-5.2+ only) | Slowest | Critical decisions |

```python
response = await client.responses.create(
    model="gpt-5.1",
    tools=[{"type": "web_search"}],
    reasoning={"effort": "medium"},
    input=prompt
)
```

#### Response Parsing

```python
# Responses API returns different structure than Chat Completions
response = await client.responses.create(...)

# Get text output
text = response.output_text

# Get citations (for search-enabled responses)
if hasattr(response, 'citations') and response.citations:
    for citation in response.citations:
        print(f"Source: {citation.url} - {citation.title}")
```

---

### max_tokens vs max_completion_tokens Parameter
**Issue:** Newer OpenAI models (gpt-5.1, gpt-5-mini, gpt-5.2) reject `max_tokens` parameter
**Risk:** Critical (10/10) - All API calls fail with 400 Bad Request
**Behavior:** OpenAI returns `"Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead."`
**Mitigation:** All OpenAI API calls must use `max_completion_tokens` instead of `max_tokens` for newer models; code updated in openai_client.py

### gpt-5-mini Temperature Limitation
**Issue:** gpt-5-mini is a reasoning model that only supports `temperature=1` (default)
**Risk:** High (8/10) - API calls fail with 400 Bad Request if temperature is specified
**Behavior:** OpenAI returns `"Unsupported value: 'temperature' does not support 0.3 with this model. Only the default (1) value is supported."`
**Mitigation:** Temperature parameter is conditionally omitted for gpt-5-mini; use gpt-5.1 for tasks requiring temperature control (article generation, title generation)

### OpenAI API Key Format Validation
**Issue:** OpenAI API keys must start with `sk-` prefix
**Risk:** High (8/10) - Authentication fails silently on ingestion
**Behavior:** Keys with incorrect prefix (e.g., `ysk-p...`) return 401 Unauthorized; errors were previously not logged
**Mitigation:** Verify API key format in .env; OpenAI errors now logged to System Logs with `external_api` category

### OpenAI API Errors Now Visible
**Issue:** Previously, OpenAI API failures during ingestion were silent (no visibility)
**Risk:** Medium (5/10) - Debugging required container log inspection
**Behavior:** All OpenAI API calls now log to `system_logs` table with `external_api` category
**Visibility:** View in Settings → System Control → System Logs section; filter by "External API" category
**Details Logged:** Method called, model used, response status, error messages, token counts

---

## Article Generation

### Missing Article Workflow UI
**Issue:** Backend article generation fully functional, but no frontend UI
**Risk:** Critical for user value (blocks core workflow)
**Behavior:** Post selection calls API but doesn't navigate anywhere
**Mitigation:** Priority development task; estimate 2-3 days to complete

### Duplicate Post Protection
**Issue:** AI title comparison compares against Group representative titles (V-17), scoped to same category, includes ALL groups (archived and non-archived)
**Risk:** Medium (5/10) - performance and cost concern
**Behavior:**
- Each new post compared against all Groups in same category (V-4)
- Archived groups included in matching to prevent duplicate group creation when topics resurface
- API calls scale with number of groups found
- Slowdown and cost increase with high group volume
**Mitigation:**
- Limit comparison to 50 recent posts
- Only compare within same category (reduces API calls)
- 7-day time window reduces candidate pool
- Uses cost-effective GPT-4o-mini model
- Configurable threshold via Settings (higher = fewer matches = fewer subsequent comparisons)

## Research & Article Generation

### Deep Research Cost
**Issue:** o3-deep-research model is extremely expensive (hundreds of sources, minutes of processing)
**Risk:** Critical (9/10) - budget impact
**Behavior:** Single deep research run can cost $5-50 depending on topic complexity
**Mitigation:** Default to Agentic Research (o4-mini) which provides good balance; warn users before Deep Research; no cost estimates shown in UI per design decision V-20

### Research Mode API Rate Limits
**Issue:** Quick Research (gpt-5-search-api) and Agentic Research (o4-mini) may have different rate limits than standard chat models
**Risk:** Medium (5/10)
**Behavior:** Hitting rate limits during research causes failures, user must retry
**Mitigation:** Implement exponential backoff; monitor rate limit headers; queue research requests if needed

### Research Without Posts Context
**Issue:** Research can be run on groups, but quality depends on post content providing topic context
**Risk:** Low (3/10)
**Behavior:** Generic or off-topic research if posts don't clearly define topic
**Mitigation:** Research prompt includes all posts in group as context; representative title and summary guide AI

### Article Style Prompt Conflicts
**Issue:** Users can edit article style prompts to be contradictory or incompatible with style name
**Risk:** Medium (4/10)
**Behavior:** 'news_brief' prompt could be edited to generate long-form content, confusing users
**Mitigation:** Prompt descriptions in Settings explain intended style; Reset to Default available; no validation of prompt content vs style name

### Article Refinement Context Size
**Issue:** Refinement uses current article + research + posts + instruction as context; may exceed token limits for large groups
**Risk:** Medium (5/10)
**Behavior:** API error if combined context exceeds model's token limit
**Mitigation:** Article generation uses plain text (smaller than markdown); research output truncated if needed; limit posts in group or use summarization

### Research Editing vs Regeneration
**Issue:** Users can edit research output but cannot regenerate with same mode (only re-run with mode change)
**Risk:** Low (2/10)
**Behavior:** If user accidentally deletes research content, must re-run research (costs API call)
**Mitigation:** Reset to Original button available; original_output preserved in database; warn before overwriting with re-run

### Article Refinement No History
**Issue:** Refinement replaces article content without version history (Brief V-12, Specs V-12)
**Risk:** Medium (4/10)
**Behavior:** Previous article version lost after refinement
**Mitigation:** Design decision per V-20; single version keeps UI simple; users can regenerate from scratch if needed

## Database & Persistence

### Backup Script Dependencies
**Issue:** backup_db.sh and restore_db.sh require postgres container to be running
**Risk:** Medium (5/10)
**Behavior:** Scripts fail with "container not found" if postgres container is stopped
**Mitigation:** Check `docker-compose ps` before running scripts; scripts should validate container state

### Restore Overwrites All Data
**Issue:** restore_db.sh drops entire database and recreates from backup (destructive)
**Risk:** High (8/10)
**Behavior:** All data created since backup timestamp is permanently lost
**Mitigation:** Confirmation prompt warns user; recommend creating fresh backup before restore

### Backups Not Automatically Scheduled
**Issue:** Daily backup cron job (setup_cron.sh) not configured by default
**Risk:** Medium (6/10)
**Behavior:** Users must manually run backup_db.sh or configure cron themselves
**Mitigation:** Document cron setup in deployment playbook; provide setup_cron.sh script

### No Migration System
**Issue:** Database schema changes require manual SQL execution
**Risk:** Medium (4/10)
**Behavior:** No Alembic or automated migrations configured
**Mitigation:** Maintain migration SQL scripts in backend/migrations/ directory; document order

### .env to Database Migration
**Issue:** Moving from .env to database settings requires one-time migration
**Risk:** Low (2/10)
**Behavior:** Settings page shows defaults if database not initialized
**Mitigation:** Provide migration script; document in deployment playbook

### v2.0 AI Cost Increase
**Issue:** v2.0 features significantly increase OpenAI API costs (~$7/month → ~$20-70/month)
**Risk:** High (7/10) - budget impact
**Behavior:**
- Worthiness scoring: +1 API call per post (~$0.60/month for 3000 posts)
- Duplicate detection: +10-50 API calls per post (~$60/month for 3000 posts with 10 avg comparisons)
- Total increase: ~$60/month without optimizations
**Mitigation:**
- Use gpt-3.5-turbo for duplicate detection (saves ~$45/month)
- Reduce duplicate_check_limit from 50 to 20 (saves ~$24/month)
- Only run duplicate check on high-worthiness posts (>0.7 threshold, saves ~$30-40/month)
- With optimizations: estimated ~$20-25/month total

### V-2 AI Title Comparison Cost
**Issue:** AI semantic title comparison adds ~1 API call per candidate post comparison
**Risk:** Medium (5/10) - cost scales with post volume
**Behavior:** Each new post compared against up to 50 candidates (same category, last 7 days)
**Mitigation:** Category+time filtering reduces candidate pool; GPT-4o-mini is cost-effective (~$0.002/comparison)

### AI Rate Limits
**Issue:** High post volume can hit OpenAI API rate limits (especially duplicate detection)
**Risk:** Medium (6/10)
**Behavior:** API returns 429 errors, ingestion slows or fails
**Mitigation:** Duplicate detection uses cost-effective GPT-4o-mini; implement exponential backoff; monitor rate limit headers; category+time filtering reduces API calls

## Known Limitations

- **Single-user assumption:** No authentication, no multi-user permissions
- **No settings history:** Cannot view previous setting values or audit log
- **No rollback mechanism:** Setting changes cannot be undone (except manual reset to defaults)
- **Backup/restore for database:** ✅ Implemented (v2.0: backup_db.sh, restore_db.sh)
- **Export/import for lists:** ✅ Implemented (v2.0: GET /api/lists/export, POST /api/lists/import)
- **Export/import for prompts:** ✅ Implemented (v2.0: GET /api/prompts/export, POST /api/prompts/import)
- **Settings export/import:** Not implemented (system_settings table export/import not available)
- **Per-list scheduling not supported:** All lists share same ingestion interval
- **Category system:** Users can add up to 20 custom categories; category names are immutable after creation to preserve post assignments; 'Other' is reserved and non-editable
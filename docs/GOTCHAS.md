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
**Issue:** Manual archive operation is irreversible (soft delete via archived flag)
**Risk:** Low (4/10)
**Behavior:** Confirmation dialog mitigates accidental triggers
**Mitigation:** Archived posts can be un-archived by manually updating database

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

## Article Generation

### Missing Article Workflow UI
**Issue:** Backend article generation fully functional, but no frontend UI
**Risk:** Critical for user value (blocks core workflow)
**Behavior:** Post selection calls API but doesn't navigate anywhere
**Mitigation:** Priority development task; estimate 2-3 days to complete

### Duplicate Post Protection
**Issue:** AI title comparison compares AI-generated titles, scoped to same category and last 7 days
**Risk:** Medium (5/10) - performance and cost concern
**Behavior:**
- Each new post compared against up to 50 recent posts in same category
- API calls scale with number of candidates found
- Slowdown and cost increase with high post volume
**Mitigation:**
- Limit comparison to 50 recent posts
- Only compare within same category (reduces API calls)
- 7-day time window reduces candidate pool
- Uses cost-effective GPT-4o-mini model
- Configurable threshold via Settings (higher = fewer matches = fewer subsequent comparisons)

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
- **Fixed categories:** Cannot add custom categories beyond predefined 6
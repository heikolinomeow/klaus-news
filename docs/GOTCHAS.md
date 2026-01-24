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
**Issue:** If user pauses scheduler and forgets to resume, system stops ingesting data
**Risk:** High (7/10)
**Behavior:** Paused state persists across backend restarts via database
**Mitigation:** UI shows prominent warning banner when paused; recommend monitoring

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
**Issue:** User can trigger manual ingestion while scheduled job is running
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

## Article Generation

### Missing Article Workflow UI
**Issue:** Backend article generation fully functional, but no frontend UI
**Risk:** Critical for user value (blocks core workflow)
**Behavior:** Post selection calls API but doesn't navigate anywhere
**Mitigation:** Priority development task; estimate 2-3 days to complete

### Duplicate Post Protection
**Issue:** TF-IDF similarity scales O(n) with post count
**Risk:** Low (2/10) - performance concern
**Behavior:** Slowdown possible with >10,000 non-archived posts
**Mitigation:** Archive posts older than 7 days; consider approximate nearest neighbors for large datasets

## Database & Persistence

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

## Known Limitations

- **Single-user assumption:** No authentication, no multi-user permissions
- **No settings history:** Cannot view previous setting values or audit log
- **No rollback mechanism:** Setting changes cannot be undone (except manual reset to defaults)
- **No backup/restore:** Settings export/import not implemented
- **Per-list scheduling not supported:** All lists share same ingestion interval
- **Fixed categories:** Cannot add custom categories beyond predefined 6
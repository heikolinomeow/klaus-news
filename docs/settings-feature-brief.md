# Product Brief: Settings & System Control Panel

**Feature Name:** Settings & System Control Panel
**Priority:** High
**Target Release:** v1.1
**Status:** Proposal
**Owner:** Product Team
**Last Updated:** 2026-01-23

---

## Executive Summary

Currently, Klaus News requires manual `.env` file editing and backend restarts to change system behavior (ingestion schedules, data sources, AI thresholds). This creates friction for users and prevents real-time operational adjustments.

This feature introduces a Settings page that allows users to control all operational parameters through a web UI, eliminating the need for file editing, server access, or technical knowledge.

**Business Impact:**
- Reduces operational overhead by 80% (no more SSH access needed)
- Enables instant configuration changes (no restarts required)
- Empowers non-technical users to manage the system
- Provides visibility into system health and data sources

---

## Problem Statement

### Current Pain Points

**For Content Managers:**
- Cannot adjust ingestion frequency when news is breaking
- Cannot quickly add/remove X lists without IT help
- No visibility into when data was last fetched
- Cannot test if new data sources work before committing

**For System Administrators:**
- Must SSH into server to change configurations
- `.env` file editing is error-prone and requires restart
- No way to pause ingestion during maintenance
- Cannot trigger immediate data refresh when needed

**For Product Teams:**
- AI filtering thresholds are hardcoded, preventing experimentation
- Cannot A/B test different worthiness cutoffs
- No metrics on configuration impact

### User Impact

**Frequency:** Daily for content managers, weekly for admins
**Severity:** Medium (workarounds exist but are inefficient)
**Affected Users:** All users (3 content managers, 1 admin)

---

## Goals & Success Metrics

### Primary Goals

1. **Self-Service Configuration:** Enable non-technical users to manage system settings without IT intervention
2. **Operational Flexibility:** Allow real-time adjustments to ingestion schedules and data sources
3. **System Transparency:** Provide visibility into background processes and data source health

### Success Metrics

**Quantitative:**
- ✅ 90% reduction in IT tickets for configuration changes (5/week → 0.5/week)
- ✅ 50% reduction in average time-to-configuration (2 hours → 1 minute)
- ✅ Zero backend restarts required for configuration changes

**Qualitative:**
- Users report feeling "in control" of the system
- Content managers can independently manage data sources
- Faster response to breaking news or urgent content needs

**Leading Indicators (Week 1):**
- 80% of users access settings page at least once
- Average of 3 configuration changes per user per week
- Zero support escalations for settings-related issues

---

## User Stories

### Epic 1: Data Source Management

**As a content manager,**
I want to add and remove X/Twitter lists through the UI
So that I can respond to changing content needs without IT help

**Acceptance Criteria:**
- Can add a new X list by entering list ID
- Can test list connectivity before saving (shows "✓ Valid" or "✗ Error")
- Can view all configured lists with last fetch timestamps
- Can enable/disable lists without deleting them
- Can remove lists permanently
- Changes take effect on next ingestion cycle (no restart)

**User Flow:**
```
1. User clicks "Settings" → "Data Sources"
2. Sees list of current X lists with status indicators
3. Clicks "+ Add New List"
4. Enters X list ID (e.g., "1234567890")
5. Clicks "Test Connection" → System validates list exists
6. If valid: Clicks "Add" → List appears in table with "✓ Enabled"
7. If invalid: Sees error message with details
```

---

**As a content manager,**
I want to see when each data source was last updated
So that I can verify content is being ingested regularly

**Acceptance Criteria:**
- Each list shows "Last fetch: X minutes ago" timestamp
- Timestamp updates in real-time (or on page refresh)
- Color coding: Green (<30 min), Yellow (30-60 min), Red (>60 min)

---

### Epic 2: Scheduling Control

**As a system administrator,**
I want to adjust ingestion frequency through the UI
So that I can optimize for breaking news or reduce costs during quiet periods

**Acceptance Criteria:**
- Can set ingestion interval between 5 minutes and 6 hours
- Current setting is clearly displayed (e.g., "Every 30 minutes")
- Next scheduled run time is shown (e.g., "Next run: in 12 minutes")
- Changes apply to next scheduled job (no restart required)
- System validates inputs (min: 5 min, max: 6 hours)

**User Flow:**
```
1. User navigates to Settings → "Scheduling"
2. Sees current interval: "30 minutes"
3. Clicks dropdown, selects "15 minutes"
4. Clicks "Save Changes"
5. Confirmation: "Schedule updated. Next run: in 15 minutes"
6. System reschedules APScheduler job immediately
```

---

**As a system administrator,**
I want to control post archival settings
So that I can optimize database size and content freshness

**Acceptance Criteria:**
- Can set archive age between 1-30 days (default: 7)
- Can set archive time (default: 03:00 AM)
- Shows count of posts eligible for archival
- Changes apply to next scheduled job

---

**As a system administrator,**
I want to control how many posts are fetched per cycle
So that I can balance data freshness with API rate limits

**Acceptance Criteria:**
- Can set posts per fetch between 1-100 (default: 5)
- Shows estimated API calls per hour based on settings
- Warning if setting exceeds recommended limits

---

### Epic 3: AI Filtering Configuration

**As a content manager,**
I want to adjust AI filtering thresholds
So that I can see more or fewer recommended posts based on quality needs

**Acceptance Criteria:**
- Slider for worthiness threshold (0.3 - 0.9, default: 0.6)
- Live preview: "X posts currently meet this threshold"
- Slider for duplicate detection sensitivity (0.7 - 0.95, default: 0.85)
- Changes apply immediately to API queries
- Can reset to defaults

**User Flow:**
```
1. User navigates to Settings → "Content Filtering"
2. Sees current threshold: 0.6 (slider position)
3. Moves slider to 0.5
4. Preview updates: "142 posts meet this threshold (was 89)"
5. Clicks "Save Changes"
6. Next API call to /recommended uses new threshold
```

---

**As a content manager,**
I want to show/hide specific content categories
So that I can focus on relevant topics for my team

**Acceptance Criteria:**
- Checkboxes for each category: Technology, Politics, Business, Science, Health, Other
- All enabled by default
- Disabled categories hidden from Recommended view
- Changes apply immediately
- Can "Select All" or "Clear All"

---

### Epic 4: Manual Operations Control

**As a system administrator,**
I want to manually trigger data ingestion
So that I can get fresh content immediately without waiting for the schedule

**Acceptance Criteria:**
- "Trigger Ingestion Now" button in Settings
- Shows progress indicator while running ("Fetching... 3/5 lists complete")
- Shows result summary: "Successfully fetched 42 posts from 5 lists"
- Button disabled while ingestion is running
- Does not interfere with scheduled jobs

**User Flow:**
```
1. User clicks "Trigger Ingestion Now"
2. Confirmation dialog: "This will fetch posts from all enabled lists. Continue?"
3. User clicks "Yes"
4. Progress bar appears: "Fetching posts... (2/5 lists)"
5. Completion message: "✓ Fetched 42 posts from 5 lists in 8 seconds"
6. Posts immediately visible in main feed
```

---

**As a system administrator,**
I want to pause/resume the background scheduler
So that I can perform maintenance without conflicting jobs

**Acceptance Criteria:**
- Toggle button: "Scheduler: ● Running" / "Scheduler: ○ Paused"
- When paused: No automatic ingestion or archival occurs
- Shows warning: "Paused since [timestamp] - Data may be stale"
- Can resume with single click
- Pause state persists across backend restarts

---

**As a system administrator,**
I want to manually trigger post archival
So that I can clean up old content immediately

**Acceptance Criteria:**
- "Archive Old Posts Now" button
- Shows count: "Will archive 42 posts older than 7 days"
- Confirmation dialog with post count
- Shows result: "✓ Archived 42 posts"
- Does not affect scheduled archival

---

## User Experience (UX) Requirements

### Navigation Structure

```
Settings (new top-level menu item)
├── Data Sources
│   ├── X/Twitter Lists
│   └── Connection Status
├── Scheduling
│   ├── Ingestion Interval
│   ├── Archival Settings
│   └── Posts Per Fetch
├── Content Filtering
│   ├── AI Thresholds
│   └── Category Filters
└── System Control
    ├── Manual Operations
    └── Scheduler Status
```

### UI/UX Principles

1. **Progressive Disclosure:** Advanced settings hidden behind "Advanced" toggle
2. **Instant Feedback:** All changes show immediate effect or next-scheduled-effect time
3. **Safe Defaults:** All settings have sensible defaults clearly marked
4. **Validation:** Inline validation prevents invalid configurations
5. **Confirmation:** Destructive actions (delete list, manual archive) require confirmation
6. **Status Indicators:** Visual cues (green/yellow/red) for health and freshness

### Visual Design Guidelines

- **Color Coding:**
  - Green: Healthy, recent, enabled
  - Yellow: Warning, stale, needs attention
  - Red: Error, critical, failed
  - Gray: Disabled, inactive

- **Feedback Timing:**
  - Instant: Threshold sliders, category toggles
  - Next-cycle: Schedule changes, list enable/disable
  - Requires restart: None (by design)

---

## Technical Requirements

### Database Schema Changes

#### New Table: `system_settings`
```sql
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR UNIQUE NOT NULL,
    value TEXT NOT NULL,
    value_type VARCHAR NOT NULL,  -- 'int', 'float', 'string', 'bool', 'json'
    description TEXT,
    category VARCHAR,  -- 'scheduling', 'filtering', 'system'
    min_value FLOAT,  -- For numeric validation
    max_value FLOAT,  -- For numeric validation
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR  -- Future: track who changed settings
);

-- Initial settings
INSERT INTO system_settings (key, value, value_type, description, category, min_value, max_value) VALUES
('ingest_interval_minutes', '30', 'int', 'Minutes between post ingestion runs', 'scheduling', 5, 360),
('archive_age_days', '7', 'int', 'Days before archiving unselected posts', 'scheduling', 1, 30),
('archive_time_hour', '3', 'int', 'Hour of day (0-23) to run archival job', 'scheduling', 0, 23),
('posts_per_fetch', '5', 'int', 'Number of posts to fetch per list', 'scheduling', 1, 100),
('worthiness_threshold', '0.6', 'float', 'Minimum score for recommended posts', 'filtering', 0.3, 0.9),
('duplicate_threshold', '0.85', 'float', 'Similarity threshold for duplicate detection', 'filtering', 0.7, 0.95),
('enabled_categories', '["Technology","Politics","Business","Science","Health","Other"]', 'json', 'Visible categories in UI', 'filtering', NULL, NULL),
('scheduler_paused', 'false', 'bool', 'Whether background scheduler is paused', 'system', NULL, NULL);
```

#### Modified Table: `list_metadata`
```sql
ALTER TABLE list_metadata ADD COLUMN enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE list_metadata ADD COLUMN list_name VARCHAR;  -- User-friendly name
ALTER TABLE list_metadata ADD COLUMN description TEXT;   -- Optional notes
```

### API Endpoints

#### Settings Management
```python
GET    /api/settings/                # Get all settings grouped by category
GET    /api/settings/{key}           # Get single setting
PUT    /api/settings/{key}           # Update single setting
POST   /api/settings/batch           # Update multiple settings atomically
POST   /api/settings/reset           # Reset all to defaults
GET    /api/settings/validate/{key}  # Validate value before saving
```

#### List Management
```python
GET    /api/lists/                   # Get all X lists with metadata
POST   /api/lists/                   # Add new list
PUT    /api/lists/{id}               # Update list (enable/disable, rename)
DELETE /api/lists/{id}               # Remove list
POST   /api/lists/{id}/test          # Test list connectivity
GET    /api/lists/{id}/stats         # Get fetch statistics for list
```

#### Manual Operations
```python
POST   /api/admin/trigger-ingest     # Manually trigger ingestion
POST   /api/admin/trigger-archive    # Manually trigger archival
POST   /api/admin/pause-scheduler    # Pause background jobs
POST   /api/admin/resume-scheduler   # Resume background jobs
GET    /api/admin/scheduler-status   # Get scheduler state and next run times
GET    /api/admin/system-stats       # Get database counts, last operations
```

### Backend Implementation Notes

**Settings Loader Service:**
```python
class SettingsService:
    """Load settings from DB with caching"""
    _cache = {}
    _cache_expiry = 60  # seconds

    def get(self, key: str, default=None):
        # Check cache, return cached value if fresh
        # Otherwise query DB and update cache
        pass

    def invalidate_cache(self, key: str = None):
        # Clear cache on setting update
        pass
```

**Scheduler Integration:**
```python
# In scheduler.py - read from DB on each run
async def ingest_posts_job():
    settings = SettingsService()
    interval = settings.get('ingest_interval_minutes', 30)
    posts_per_fetch = settings.get('posts_per_fetch', 5)
    # Use dynamic settings...
```

**Dynamic Job Rescheduling:**
```python
# When ingest_interval_minutes changes
def reschedule_ingest_job(new_interval_minutes: int):
    scheduler.reschedule_job(
        'ingest_posts_job',
        trigger='interval',
        minutes=new_interval_minutes
    )
```

### Frontend Implementation Notes

**Settings Context Provider:**
```typescript
// Global settings state management
const SettingsContext = createContext<Settings>({...});
const useSettings = () => useContext(SettingsContext);

// Auto-refresh settings every 30 seconds
useEffect(() => {
  const interval = setInterval(fetchSettings, 30000);
  return () => clearInterval(interval);
}, []);
```

**Optimistic Updates:**
- UI updates immediately on slider change
- Background save to API
- Rollback if save fails

---

## Implementation Phases

### Phase 1: Foundation (2-3 days)
**Goal:** Core infrastructure and basic settings

**Backend:**
- Create `system_settings` table
- Add `enabled` field to `list_metadata`
- Implement `SettingsService` with caching
- Create `/api/settings/` CRUD endpoints
- Modify scheduler to read from DB

**Frontend:**
- Create Settings page structure (tabs)
- Implement basic form for threshold sliders
- Connect to settings API
- Add "Save Changes" flow

**Deliverables:**
- Can view and edit thresholds via UI
- Changes persist to database
- Next API call uses new thresholds

---

### Phase 2: List Management (2 days)
**Goal:** Self-service data source control

**Backend:**
- Create `/api/lists/` endpoints
- Implement list connectivity testing (call X API)
- Add list enable/disable logic to scheduler

**Frontend:**
- Create List Management UI (table view)
- Add/edit/delete list flows
- Test connection button with loading states
- Last fetch time display

**Deliverables:**
- Can add/remove X lists via UI
- Can test if list is valid before adding
- Can enable/disable lists
- See last fetch time per list

---

### Phase 3: Scheduling & Manual Control (1-2 days)
**Goal:** Operational flexibility

**Backend:**
- Create `/api/admin/*` endpoints for manual triggers
- Implement dynamic job rescheduling
- Add pause/resume scheduler logic
- Track scheduler state in DB

**Frontend:**
- Schedule settings UI (dropdowns/inputs)
- Manual trigger buttons with progress indicators
- Pause/resume toggle
- System status dashboard

**Deliverables:**
- Can adjust ingestion frequency via UI
- Can trigger ingestion manually
- Can pause/resume scheduler
- See next scheduled run times

---

### Phase 4: Polish & Advanced Features (1 day)
**Goal:** Professional UX and edge cases

**Backend:**
- Settings validation layer
- Atomic batch updates
- Audit log for setting changes

**Frontend:**
- Real-time status updates (WebSocket or polling)
- Settings import/export (JSON download)
- Advanced settings toggle (hide complexity)
- Confirmation dialogs for destructive actions

**Deliverables:**
- Polished UI with animations
- Edge cases handled gracefully
- Settings can be backed up/restored

---

## Dependencies & Risks

### Dependencies
- ✅ Database migration system (Alembic or manual SQL)
- ✅ APScheduler dynamic job support (already in use)
- ⚠️ X API access for list validation (rate limits apply)

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Scheduler fails to reschedule dynamically | Low | High | Test rescheduling thoroughly; fallback to restart prompt |
| Settings cache causes stale reads | Medium | Medium | Short cache TTL (60s); invalidate on update |
| Concurrent setting updates cause conflicts | Low | Medium | Use DB transactions; last-write-wins strategy |
| Invalid settings break system | Medium | High | Validation layer; safe defaults; rollback on error |

### Product Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Users overwhelmed by too many settings | Medium | Medium | Progressive disclosure; sensible defaults; tooltips |
| Too much flexibility leads to misconfiguration | Low | High | Validation; warnings for extreme values; "Reset to Defaults" |
| Feature creep (users request more settings) | High | Low | Strict scope; "Advanced" section for edge cases |

---

## Out of Scope (v1.1)

The following features are explicitly excluded from this release:

❌ **API Key Management** - Security risk; keys remain in `.env`
❌ **Multi-user with Permissions** - Single-user admin assumed
❌ **Settings History/Audit Log** - Basic tracking only (who/when)
❌ **A/B Testing Framework** - Just manual threshold adjustment
❌ **Backup/Restore Automation** - Manual export/import only
❌ **Per-List Scheduling** - All lists share same schedule
❌ **Custom Categories** - Fixed to 6 predefined categories
❌ **Database Connection Settings** - Requires restart; stays in `.env`

These may be considered for future releases based on user feedback.

---

## Acceptance Criteria (Release Gate)

This feature is ready for release when:

**Functional:**
- ✅ All 4 epics pass QA testing
- ✅ Settings persist across backend restarts
- ✅ No configuration change requires manual restart
- ✅ Invalid inputs are prevented or warned
- ✅ Manual operations complete within 30 seconds

**Non-Functional:**
- ✅ Settings API responds in < 200ms (99th percentile)
- ✅ UI is responsive on mobile (viewport ≥ 375px wide)
- ✅ No console errors in browser
- ✅ No backend errors in logs for valid operations

**Documentation:**
- ✅ User guide for Settings page (screenshots + descriptions)
- ✅ API documentation in Swagger UI
- ✅ Migration guide for moving `.env` values to DB

**User Validation:**
- ✅ 2/3 content managers can add a new list without help
- ✅ 1/1 admin successfully adjusts schedule and triggers manual fetch
- ✅ Users report "easier" or "much easier" vs. current process

---

## Launch Plan

### Pre-Launch (1 week before)
1. Migrate existing `.env` values to database (one-time script)
2. Test migration on staging environment
3. Create user documentation with screenshots
4. Record 5-minute demo video

### Launch Day
1. Deploy backend changes (includes DB migration)
2. Deploy frontend changes
3. Send announcement email to users
4. Host 15-minute live walkthrough session

### Post-Launch (1 week after)
1. Monitor for errors and user questions
2. Collect feedback via short survey (3 questions)
3. Track usage metrics (settings page views, changes made)
4. Plan v1.2 improvements based on feedback

---

## Success Criteria (90 Days Post-Launch)

**Adoption:**
- 100% of users have accessed Settings page
- 80% of users have made at least one configuration change
- 50% of users adjust settings weekly

**Operational Impact:**
- IT tickets for configuration: 5/week → <1/week (80% reduction)
- Average time to adjust schedule: 2 hours → <2 minutes (98% reduction)
- Backend restarts per week: ~5 → 0 (100% reduction)

**User Satisfaction:**
- NPS score ≥ 8/10 for Settings feature
- Zero critical bugs reported
- Positive feedback in retrospective

---

## Appendix: User Research Insights

**Interview Findings (Jan 2026, n=4):**

> "I wish I could add a new Twitter list without asking IT. Sometimes news breaks and I want to add a source immediately." — Content Manager

> "Every time we change the schedule, I have to SSH in, edit a file, and restart. It's archaic." — System Admin

> "I'd like to experiment with the AI threshold. Maybe 0.6 is too strict, but I have no way to test without code changes." — Content Lead

> "Can we pause the system during maintenance? Right now it keeps running and causes conflicts." — System Admin

**Pain Point Severity (Self-Reported, 1-5 scale):**
- Cannot adjust schedule dynamically: 4.5/5
- Cannot add/remove data sources easily: 4/5
- Cannot trigger manual refresh: 3.5/5
- No visibility into system status: 3/5

---

**End of Brief**

*Questions? Contact Product Team*

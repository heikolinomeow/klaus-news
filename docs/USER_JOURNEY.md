# User Journey - Klaus News

## Current Implementation Status

**Status:** Core post browsing features fully functional, article workflow UI incomplete
**Last Updated:** 2026-01-23

This document describes what users **CAN currently do** with Klaus News from a UX/UI/feature perspective.

---

## Prerequisites for Full Functionality

For the application to display content, posts must exist in the database. Posts are ingested based on the configured schedule (default: every 30 minutes, adjustable via Settings page from 5 minutes to 6 hours) via background scheduler once the system is running with valid API credentials.

**Configuration Options:**
- Settings can be managed via web UI at `http://localhost:3000/settings`
- No backend restart required for configuration changes
- Initial configuration values can be set via `.env` file or managed through Settings page

**Initial State:**
- Fresh installation → empty database → UI shows "No posts available"
- After scheduler runs → posts ingested → UI displays content

---

## Phase 0: System Configuration ✅ FULLY FUNCTIONAL

Before browsing posts, users can configure system behavior through the Settings page.

### 0.1 Access Settings
**URL:** `http://localhost:3000/settings/system` (redirects from `/settings` for backward compatibility)

**What Users See:**
- Settings area with 2 main routes: System Settings (3 tiles: Data Sources, Content Filtering, System Control) and AI Prompts (6 tiles in responsive grid). Navigation tabs at top switch between routes.
- Current configuration values displayed
- Real-time validation feedback
- Save buttons with confirmation messages

### 0.2 Manage Data Sources
**User Action:** Navigate to System Settings route (`/settings/system`), Data Sources tile is the first tile in the settings layout

**What Users Experience:**
- ✅ View all configured X/Twitter lists with last fetch timestamps
- ✅ Add new X lists by entering list ID
- ✅ Test list connectivity before saving (shows "✓ Valid" or "✗ Error")
- ✅ Enable/disable lists without deleting them
- ✅ Remove lists permanently with confirmation dialog
- ✅ Color-coded status indicators (Green: recent fetch, Yellow: stale, Red: error)
- ✅ Export all lists to JSON file with "Export Lists" button
- ✅ Import lists from JSON file with "Import Lists" button (merge behavior)
- ✅ Exported lists include list_id, list_name, enabled status, fetch_frequency

### 0.3 Control Scheduling
**User Action:** Navigate to System Settings route (`/settings/system`), System Control tile contains Ingestion section

**What Users Experience:**
- ✅ Adjust ingestion frequency (5 minutes to 6 hours)
- ✅ See next scheduled run time
- ✅ Control post archival age (1-30 days)
- ✅ Set archival time (hour of day)
- ✅ Adjust posts fetched per cycle (1-100)
- ✅ See estimated API calls per hour
- ✅ See auto-fetch status (Enabled/Paused) in System Control tab
- ✅ Warning if settings exceed recommended limits

### 0.4 Configure AI Filtering
**User Action:** Navigate to System Settings route (`/settings/system`), Content Filtering tile now includes embedded Prompt Management tiles for score_worthiness, detect_duplicate, and categorize_post prompts inline with threshold sliders and category checkboxes

**What Users Experience:**
- ✅ Adjust worthiness threshold slider (0.3 - 0.9)
- ✅ See live preview of posts meeting threshold
- ✅ Adjust duplicate detection sensitivity (0.7 - 0.95)
- ✅ Enable/disable content categories (Technology, Politics, Business, Science, Health, Other)
- ✅ Changes apply immediately to Recommended view
- ✅ Reset to defaults button

### 0.5 Manual System Control
**User Action:** Navigate to System Settings route (`/settings/system`), System Control tile contains Ingestion and Archival sections with manual trigger buttons

**What Users Experience:**
- ✅ Trigger manual data ingestion with progress indicator
- ✅ Trigger manual post archival with preview count
- ✅ View system statistics (database counts, last operations)
- ✅ Confirmation dialogs for destructive actions

### 0.6 Manage AI Prompts
**User Action:** Navigate to AI Prompts route (`/prompts`), accessible via tab navigation at top of settings area

**What Users Experience:**
- ✅ All 6 AI prompts displayed simultaneously as tiles in responsive grid. Each tile shows full prompt configuration with inline editing (no modal/sidebar required).
- ✅ Edit prompt text, model, temperature, max_tokens directly in tiles
- ✅ Reset prompts to defaults with confirmation
- ✅ Export all prompts to JSON file
- ✅ Import prompts from JSON file (overwrites existing)
- ✅ Changes take effect immediately (no restart required)
- ✅ Character count for prompt text validation
- ✅ Edit prompts directly in tiles (no modal—all fields visible inline). ✅ Per-tile Save and Reset buttons (independent editing, no global save).

**UX Note:** All system settings tiles (Data Sources, Content Filtering, System Control) are visible simultaneously. No tab switching required—users can scroll within tiles if content exceeds tile height (max 600px).

**0.7 Database Backup & Restore**
**User Action:** Use command-line backup/restore scripts

**What Users Experience:**
- ✅ Run `./backup_db.sh` to create timestamped SQL backup in `./backups/` directory
- ✅ Run `./restore_db.sh <backup_file.sql>` to restore from backup with confirmation prompt
- ✅ Backups survive `docker-compose down -v` (stored outside volumes)
- ✅ Scripts display backup size and success confirmation

**UX Notes:**
- Restore operation shows warning about data overwrite
- Scripts require postgres container to be running

---

## Current User Journey

**Note:** Users can now configure system behavior via Settings page before browsing posts. See Phase 0: System Configuration above.

### Phase 1: Browse Posts ✅ FULLY FUNCTIONAL

Users can browse and explore AI-curated posts from X (Twitter):

#### 1.1 Access the Application
**URL:** `http://localhost:3000`

**What Users See:**
- Clean interface with "Klaus News" header
- Two navigation tabs: "Recommended" and "All Posts"
- Loading state while data fetches
- Post list or empty state message

#### 1.2 View Recommended Posts
**User Action:** Click "Recommended" tab (default view)

**What Users Experience:**
- ✅ See posts with worthiness score > 0.6 (high-quality content)
- ✅ Posts organized by AI-detected category (Technology, Politics, Business, Science, Health, Other)
- ✅ Each post displays:
  - AI-generated title (clear, concise headline)
  - AI-generated summary (2-3 sentence overview)
  - Category badge
  - Worthiness score indicator
- ✅ Duplicate/similar posts appear as single entry (automatic deduplication)
- ✅ Posts are clickable

**UX Notes:**
- Recommended view filters out low-quality content
- Only shows fresh, unarchived posts
- Posts already selected by user are hidden

#### 1.3 View All Posts
**User Action:** Click "All Posts" tab

**What Users Experience:**
- ✅ See complete list of all collected posts (no quality filter)
- ✅ Same post display format as Recommended view
- ✅ Includes lower-scored posts that didn't make Recommended cut
- ✅ Duplicate detection still active (grouped posts shown once)

**UX Notes:**
- Gives user full visibility into what's been collected
- Useful for exploring content that didn't meet recommendation threshold

#### 1.4 Select a Post
**User Action:** Click on any post

**What Happens:**
- ✅ Post is marked as "selected" in backend (via API call)
- ❌ **BROKEN:** UI doesn't navigate to next screen
- ❌ **MISSING:** No visual feedback that post was selected
- ❌ **MISSING:** Post doesn't disappear from list

**Expected Behavior (Not Implemented):**
- Should navigate to article generation view
- Should show loading state while article generates
- Should display generated article in editor

---

### Phase 2: Article Workflow ❌ NOT IMPLEMENTED (Backend Ready)

The following features are **fully implemented in the backend** but have **no UI**:

#### 2.1 Generate Article ❌ UI MISSING
**Expected User Flow:**
1. User selects post → navigates to article view
2. System automatically generates full article via AI
3. Article appears in rich text editor

**Backend Status:** ✅ API endpoint ready (`POST /api/articles`)
**Frontend Status:** ❌ No article generation view exists
**Component Exists:** ✅ ArticleEditor (Quill.js WYSIWYG) is built but not integrated

**What Backend Does (When UI Calls It):**
- Generates full article from post content
- Creates headline, 3-5 paragraphs, provides context
- Markdown formatted content
- Stores article to database with generation_count = 1

#### 2.2 Edit Article ❌ UI MISSING
**Expected User Flow:**
- User sees generated article in WYSIWYG editor
- User can modify text, formatting, structure
- Changes save automatically or on button click

**Backend Status:** ✅ API endpoint ready (`PUT /api/articles/{id}`)
**Frontend Status:** ❌ ArticleEditor exists but not integrated into workflow

**Available Editor Features (When Integrated):**
- Headers (H1, H2, H3)
- Bold, italic, underline
- Bullet and numbered lists
- Link insertion
- Clean formatting tool

#### 2.3 Regenerate Article ❌ UI MISSING
**Expected User Flow:**
- User clicks "Regenerate" button
- System creates improved version of article
- New version replaces old in editor

**Backend Status:** ✅ API endpoint ready (`POST /api/articles/{id}/regenerate`)
**Frontend Status:** ❌ No regenerate button or UI

**What Backend Does:**
- Generates new article with improved prompt
- Increments generation_count
- Returns fresh content

#### 2.4 Post to Teams ❌ UI MISSING
**Expected User Flow:**
- User reviews article
- User clicks "Post to Teams" button
- Confirmation message appears
- Article is posted to configured Teams channel

**Backend Status:** ✅ API endpoint ready (`POST /api/articles/{id}/post-to-teams`)
**Frontend Status:** ❌ No Teams posting button or UI

**What Backend Does:**
- Formats article as Microsoft Teams Adaptive Card
- Posts to webhook URL
- Sets posted_to_teams timestamp
- Prevents duplicate posting

---

## What Users CANNOT Do (Yet)

From a user perspective, the following experiences are not available:

### Missing User Flows:

❌ **Article Creation Workflow**
- Cannot navigate from post selection to article view
- Cannot see generated articles
- Cannot edit articles in UI

❌ **Article Management**
- Cannot view list of created articles
- Cannot return to edit previously created articles
- Cannot see which articles have been posted to Teams

❌ **Navigation**
- Cannot move between different views
- No back button from article view (doesn't exist)
- No breadcrumbs or navigation structure

❌ **Feedback & Confirmation**
- No visual feedback when post is selected
- No confirmation when article is posted to Teams
- No success/error messages for user actions

❌ **Article List View**
- Cannot browse previously generated articles
- Cannot see article history
- Cannot access articles after creation

---

## Detailed Feature Coverage

### ✅ Implemented Features

**Post Discovery & Browsing:**
- View recommended posts (quality-filtered)
- View all collected posts (complete list)
- Toggle between views seamlessly
- See AI-generated titles and summaries
- View post categories
- View worthiness scores
- Automatic duplicate collapsing
- Loading states during data fetch
- Error message display
- Empty state handling

**Backend Article Operations:**
- Article generation from posts (API ready)
- Article editing/updating (API ready)
- Article regeneration (API ready)
- Teams webhook posting (API ready)

---

### 🟡 Partially Implemented Features

**Post Selection:**
- Frontend: Click handler exists, calls API ✅
- Frontend: No navigation after selection ❌
- Backend: Marks post as selected ✅
- Frontend: No visual feedback ❌

---

### ❌ Not Implemented Features

**Article Workflow UI:**
- Article generation view
- Article editor integration
- Article list/management page
- Navigation routing
- Regenerate button
- Post to Teams button

**User Feedback:**
- Success/error notifications
- Confirmation dialogs
- Action feedback (loading, success states)

**Mobile Experience:**
- Responsive design
- Touch-optimized UI
- Mobile layout adjustments

---

## User Experience Gaps

### Critical UX Issues:

1. **Broken Navigation Flow**
   - User clicks post → nothing happens (feels broken)
   - Dead end after post selection
   - No clear next action

2. **Missing Feedback**
   - Actions complete silently (no confirmation)
   - User doesn't know if click worked
   - No indication of system state

3. **Incomplete Workflow**
   - Can browse posts ✅
   - Cannot do anything with them ❌
   - Value proposition incomplete

### Recommended UX Improvements:

**High Priority:**
1. Add article generation view with integrated editor
2. Implement navigation (React Router or similar)
3. Add loading states for article generation
4. Add success messages for Teams posting

**Medium Priority:**
5. Visual feedback on post selection (highlight, checkmark)
6. Article list/history view
7. Confirmation dialogs for destructive actions

**Low Priority:**
8. Mobile responsive design
9. Keyboard shortcuts
10. Advanced filtering/sorting options

---

## How Users Currently Interact

### Scenario 1: First-Time User
1. Opens `http://localhost:3000`
2. Sees "Klaus News" header
3. Sees "Recommended" tab (active) and "All Posts" tab
4. If posts exist: Sees list of posts with titles, summaries, categories
5. If no posts: Sees "No posts available" message
6. Clicks between tabs → views switch successfully
7. Clicks a post → **nothing happens** (broken experience)

### Scenario 2: Returning User
1. Opens application
2. Sees newly ingested posts (updated every 30 minutes)
3. Previous selected posts are hidden from Recommended view
4. Posts older than 7 days are archived (not shown)
5. Can continue browsing but cannot progress to article creation

### Scenario 3: Power User (Hypothetical - When Complete)
1. Browse recommended posts
2. Select interesting post
3. Navigate to article view
4. Review AI-generated article
5. Edit content as needed
6. Regenerate if quality is low
7. Post to Teams when satisfied
8. Return to browse more posts
9. Access article history

**Current Reality:** Only steps 1-2 work. Steps 3-9 have backend support but no UI.

---

## System-Generated Content Users See

### AI-Generated Elements:

**Post Titles:**
- Clear, concise headlines (max 100 chars)
- Replace original tweet text with readable title
- Generated by GPT-4-turbo

**Post Summaries:**
- 2-3 sentence overview of content
- Objective tone
- Highlights key information

**Categories:**
- Technology, Politics, Business, Science, Health, Other
- Assigned via AI with confidence score
- Displayed as badges on posts

**Worthiness Scores:**
- 0.0 to 1.0 scale (higher = better quality)
- Generated by AI prompt evaluating newsworthiness (v2.0: AI-based)
- Falls back to algorithmic scoring (relevance 40%, quality 40%, recency 20%) if AI fails
- Threshold: 0.6 for Recommended view
- Editable prompt via Settings → Prompts tab

**Articles (When Generated):**
- Full-length articles (3-5 paragraphs)
- Informative headline
- Contextual background
- Objective reporting tone
- Markdown formatted

---

## Accessibility Status

**Currently Accessible:**
- `http://localhost:3000` - Frontend application
- `http://localhost:8000/health` - Backend health check
- `http://localhost:8000/docs` - API documentation (Swagger UI)
- `http://localhost:3000/settings` - Settings & System Control Panel

**Working Endpoints (When Called from UI or Direct API):**
- `GET /api/posts` - All posts
- `GET /api/posts/recommended` - Recommended posts
- `POST /api/posts/{id}/select` - Mark post as selected
- `POST /api/articles` - Generate article
- `PUT /api/articles/{id}` - Update article
- `POST /api/articles/{id}/regenerate` - Regenerate article
- `POST /api/articles/{id}/post-to-teams` - Post to Teams
- `GET /api/settings/` - Get all settings grouped by category
- `PUT /api/settings/{key}` - Update single setting
- `GET /api/lists/` - Get all X lists with metadata
- `POST /api/lists/` - Add new X list
- `PUT /api/lists/{id}` - Update list (enable/disable, rename)
- `DELETE /api/lists/{id}` - Remove list
- `POST /api/lists/{id}/test` - Test list connectivity
- `POST /api/admin/trigger-ingest` - Manually trigger ingestion
- `POST /api/admin/trigger-archive` - Manually trigger archival
- `POST /api/admin/pause-scheduler` - Pause background jobs
- `POST /api/admin/resume-scheduler` - Resume background jobs
- `GET /api/admin/scheduler-status` - Get scheduler state
- `GET /api/lists/export` - Export lists to JSON
- `POST /api/lists/import` - Import lists from JSON
- `GET /api/prompts` - Get all prompts
- `GET /api/prompts/{name}` - Get single prompt
- `PUT /api/prompts/{name}` - Update prompt
- `POST /api/prompts/{name}/reset` - Reset prompt to default
- `GET /api/prompts/export` - Export prompts to JSON
- `POST /api/prompts/import` - Import prompts from JSON

---

## Next Steps to Complete User Journey

To achieve full user journey, the following UI work is needed:

1. **Create Article View Page** (1 day)
   - Layout with article editor
   - Action buttons (regenerate, post to Teams)
   - Loading and success states

2. **Integrate ArticleEditor Component** (0.5 day)
   - Mount Quill editor in article view
   - Connect to backend API
   - Handle content updates

3. **Add Navigation/Routing** (0.5 day)
   - Install React Router
   - Define routes (home, article view, article list)
   - Implement navigation on post selection

4. **Add User Feedback** (0.5 day)
   - Success/error notifications
   - Loading spinners
   - Confirmation dialogs

**Estimated Time to Complete:** 2-3 days of focused frontend development

**Technical Blocker:** None - all backend APIs are ready and functional

---

**Document Status:** Reflects actual implementation - ~80% complete (settings UI complete, article UI is primary remaining gap)

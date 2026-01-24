# Klaus News v2.0 - Product Brief
## Configuration Management, AI-First Architecture, and Data Safety

**Version**: 2.0
**Status**: Proposal
**Date**: 2026-01-23
**Previous Version**: v1.1 (Settings & System Control Panel)

---

## Executive Summary

Klaus News v2.0 focuses on three critical pillars:

1. **Data Safety & Portability**: Address database brittleness through backup/restore capabilities and configuration export/import
2. **Configuration Transparency**: Make all AI prompts visible and editable through the UI
3. **AI-First Architecture**: Replace algorithmic components (worthiness scoring, duplicate detection) with AI prompts for better flexibility and accuracy

**Business Context**: Current system has critical data loss risks - a single `docker-compose down -v` command wipes all configuration (lists, settings, post history) with no recovery mechanism. Additionally, key logic components (worthiness scoring, duplicate detection) use hardcoded algorithms that cannot be adjusted without code changes.

**Cost Impact**: Estimated increase from ~$7/month to ~$20/month due to additional AI prompt usage for scoring and duplicate detection.

---

## Problem Statement

### Current Pain Points

1. **Database Brittleness** (Critical)
   - No backup mechanism exists
   - `docker-compose down -v` permanently deletes all data
   - Cannot recover from accidental data loss
   - Cannot migrate configuration between environments

2. **Configuration Lock-In** (High)
   - X/Twitter lists stored only in database
   - No way to backup or share list configurations
   - Manual re-entry required after data loss

3. **Prompt Opacity** (High)
   - 4 AI prompts hidden in Python code (`backend/app/services/openai_client.py`)
   - No visibility into prompt content without reading code
   - Cannot experiment with prompt variations without code deployment
   - No version control or A/B testing capability

4. **Algorithmic Rigidity** (Medium)
   - Worthiness scoring uses hardcoded formula: `relevance*0.4 + quality*0.4 + recency*0.2`
   - Duplicate detection uses fixed TF-IDF cosine similarity threshold (0.85)
   - Cannot adjust logic to match evolving editorial preferences
   - Requires code changes for tuning

5. **Operational Inflexibility** (Medium)
   - Cannot temporarily disable automatic fetching (e.g., during maintenance, API quota issues, testing)
   - Scheduler always runs even when undesired

---

## Target Users

1. **System Administrator** (primary)
   - Needs to backup/restore system before risky operations
   - Needs to migrate configuration between dev/staging/production
   - Needs to disable fetching temporarily during maintenance

2. **Content Manager** (primary)
   - Needs to tune AI prompts to match editorial voice
   - Needs to adjust worthiness criteria without developer help
   - Needs to export/import prompt configurations for experimentation

3. **Developer** (secondary)
   - Needs safe deployment practices with configuration backups
   - Needs to share working configurations with team

---

## Feature Requirements

### Feature 1: Database Backup & Restore Scripts (High Priority)

#### User Story
As a system administrator, I need automated database backups so that I can recover from accidental data loss or migrate between environments.

#### Requirements

1. **Backup Script** (`backup_db.sh`)
   - Creates timestamped SQL dump of PostgreSQL database
   - Filename format: `klaus_news_backup_YYYYMMDD_HHMMSS.sql`
   - Backs up `postgres_data` volume content
   - Stores backups in `./backups/` directory (outside Docker volumes)
   - Includes all tables: `posts`, `articles`, `list_metadata`, `system_settings`
   - Runs successfully whether containers are running or stopped
   - Returns clear success/failure status message
   - Logs backup size and timestamp

2. **Restore Script** (`restore_db.sh`)
   - Accepts backup filename as argument: `./restore_db.sh klaus_news_backup_20260123_143022.sql`
   - Stops application containers before restore (safety measure)
   - Drops existing database and recreates from backup
   - Validates backup file exists before attempting restore
   - Returns clear success/failure status message
   - Warns user about data overwrite before proceeding

3. **Automated Daily Backups** (cron job)
   - Runs `backup_db.sh` daily at 2 AM UTC
   - Keeps last 7 days of backups (deletes older files automatically)
   - Logs cron execution to `./backups/backup.log`

#### Technical Details

**Files to Create**:
- `backup_db.sh` (bash script, executable)
- `restore_db.sh` (bash script, executable)
- `setup_cron.sh` (bash script to install cron job)
- `./backups/.gitkeep` (ensure directory exists in repo)

**Docker Integration**:
- Scripts use `docker-compose exec` to run `pg_dump` inside postgres container
- Handle both running and stopped container states
- Use `.env` file for database credentials (reuse existing `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`)

**Example Usage**:
```bash
# Manual backup
./backup_db.sh
# Output: ✓ Backup created: backups/klaus_news_backup_20260123_143022.sql (2.4 MB)

# Restore from backup
./restore_db.sh backups/klaus_news_backup_20260123_143022.sql
# Output: ⚠ WARNING: This will overwrite all current data. Continue? (y/N)
```

#### Acceptance Criteria

- [ ] `backup_db.sh` creates valid SQL dump file
- [ ] `restore_db.sh` successfully restores database from backup file
- [ ] Backup includes all 4 tables with data intact
- [ ] Restore warns user before overwriting data
- [ ] Scripts work whether containers are running or stopped
- [ ] Daily cron job runs and maintains 7-day retention
- [ ] Scripts return non-zero exit code on failure (for automation)
- [ ] Documentation added to README.md with usage examples

#### Risk Assessment
**Risk**: 3/10 - Low risk, bash scripting with standard PostgreSQL tools. Main risk is ensuring scripts work in all container states.

---

### Feature 2: List Export & Import (High Priority)

#### User Story
As a system administrator, I need to export and import X/Twitter list configurations so that I can backup my data source setup and migrate between environments.

#### Requirements

1. **Export Lists Button** (UI)
   - Located in Settings → Data Sources tab
   - Button labeled "Export Lists" with download icon
   - Triggers download of `klaus_news_lists_YYYYMMDD_HHMMSS.json` file
   - JSON contains all list metadata: `list_id`, `list_name`, `enabled`, `fetch_frequency_minutes`
   - Excludes database metadata: `id`, `created_at`, `updated_at`, `last_fetched_at`
   - Shows success toast notification: "Lists exported successfully"

2. **Import Lists Button** (UI)
   - Located in Settings → Data Sources tab, next to Export button
   - Button labeled "Import Lists" with upload icon
   - Opens file picker (accepts `.json` files only)
   - Validates JSON schema before import
   - Shows confirmation dialog: "Import X lists? This will add to (not replace) existing lists."
   - On success: refreshes DataSourceManager table to show imported lists
   - On validation failure: shows error toast with specific issue

3. **Import Behavior**
   - Adds new lists (does not replace existing lists unless `list_id` matches)
   - If `list_id` already exists: updates that list's configuration (merge behavior)
   - Imported lists are set to `enabled: false` by default (safety measure)
   - After import, user must manually enable lists in UI

4. **API Endpoints**
   - `GET /api/lists/export` - returns JSON array of all lists
   - `POST /api/lists/import` - accepts JSON array, validates schema, imports lists

#### JSON Schema

```json
{
  "export_version": "2.0",
  "exported_at": "2026-01-23T14:30:22Z",
  "lists": [
    {
      "list_id": "1585430245762441216",
      "list_name": "Tech News",
      "enabled": true,
      "fetch_frequency_minutes": 30
    }
  ]
}
```

#### Technical Details

**Backend Changes**:
- New endpoints in `backend/app/api/lists.py`
- JSON schema validation using Pydantic models
- Export query: `SELECT list_id, list_name, enabled, fetch_frequency_minutes FROM list_metadata`
- Import logic: upsert based on `list_id` (ON CONFLICT DO UPDATE)

**Frontend Changes**:
- New buttons in `frontend/src/components/DataSourceManager.tsx`
- File download using browser download API
- File upload using `<input type="file" accept=".json">`
- JSON parsing and validation on client side before sending to API

#### Acceptance Criteria

- [ ] Export button downloads valid JSON file with all lists
- [ ] Import button accepts valid JSON and adds lists to database
- [ ] Import validates JSON schema and rejects invalid files with clear error message
- [ ] Duplicate `list_id` during import updates existing list (does not create duplicate)
- [ ] Imported lists are disabled by default
- [ ] Export/import preserves list configuration accurately
- [ ] File naming includes timestamp for versioning
- [ ] Toast notifications provide clear feedback on success/failure

#### Risk Assessment
**Risk**: 2/10 - Low risk, straightforward CRUD operations with JSON serialization. Main risk is ensuring proper schema validation.

---

### Feature 3: Disable Automatic Fetch Toggle (Medium Priority)

#### User Story
As a system administrator, I need to temporarily disable automatic post fetching so that I can perform maintenance, conserve API quota, or test new configurations without incoming data.

#### Requirements

1. **UI Toggle** (Settings → Scheduling tab)
   - New toggle control labeled "Enable Automatic Fetch"
   - Located at top of Scheduling tab (before fetch frequency setting)
   - Default state: ON (enabled)
   - When OFF: scheduler job still exists but skips post fetching logic
   - Shows status text next to toggle:
     - ON: "Automatic fetching is enabled"
     - OFF: "Automatic fetching is paused"

2. **System Settings Storage**
   - New setting key: `auto_fetch_enabled` (boolean, default: `true`)
   - Stored in `system_settings` table
   - Read by scheduler before running `ingest_posts_job()`

3. **Scheduler Behavior**
   - At start of `ingest_posts_job()`, check `auto_fetch_enabled` setting
   - If `false`: log "Auto-fetch disabled, skipping ingestion" and return early
   - If `true`: proceed with normal fetch logic
   - Scheduler job continues running on schedule (does not unregister job)

4. **Status Indicator**
   - Settings → System Control → Status section shows:
     - "Auto-fetch: Enabled" (green) or "Auto-fetch: Disabled" (red)
   - Last run timestamp still updates (shows last scheduled run, even if skipped)

#### Technical Details

**Backend Changes**:
- Add `auto_fetch_enabled` to `SystemSettings` model defaults
- Modify `backend/app/services/scheduler.py:ingest_posts_job()`:
  ```python
  def ingest_posts_job():
      settings_svc = SettingsService(SessionLocal())
      if not settings_svc.get('auto_fetch_enabled', True):
          logger.info("Auto-fetch disabled, skipping ingestion")
          return
      # ... existing fetch logic
  ```

**Frontend Changes**:
- Add toggle to `frontend/src/components/SchedulingSettings.tsx`
- Use `useSettings()` hook to read/write `auto_fetch_enabled`
- Update status display in SystemControl component

#### Acceptance Criteria

- [ ] Toggle control appears in Settings → Scheduling tab
- [ ] Changing toggle updates `system_settings.auto_fetch_enabled` in database
- [ ] When disabled, scheduler skips post ingestion (logs "skipping" message)
- [ ] When disabled, no new posts appear in database during scheduled runs
- [ ] When re-enabled, next scheduled run fetches posts normally
- [ ] Status indicator reflects current state accurately
- [ ] Toggle state persists across application restarts

#### Risk Assessment
**Risk**: 2/10 - Low risk, simple boolean flag check. Main risk is ensuring scheduler continues running (not accidentally unregistered).

---

### Feature 4: Prompt Management UI (High Priority)

#### User Story
As a content manager, I need to view and edit all AI prompts in the UI so that I can tune the system's behavior without developer assistance or code deployments.

#### Requirements

1. **New Settings Tab: "Prompts"**
   - Added to Settings page navigation (5th tab after Data Sources, Scheduling, Content Filtering, System Control)
   - Displays all 6 prompts (4 existing + 2 new from Features 6-7)

2. **Prompt List Display**
   - Table with columns: Prompt Name, Model, Temperature, Max Tokens, Last Modified, Actions
   - Each row shows one prompt with "Edit" button

3. **Prompt Names** (display names)
   - Post Categorization
   - Post Title Generation
   - Post Summary Generation
   - Article Generation
   - Worthiness Scoring (new in v2.0)
   - Duplicate Detection (new in v2.0)

4. **Edit Prompt Modal**
   - Click "Edit" → opens modal dialog
   - Modal title: "Edit Prompt: [Prompt Name]"
   - Form fields (all editable):
     - **Prompt Text** (textarea, 10 rows, required)
     - **Model** (dropdown: gpt-4-turbo, gpt-4, gpt-3.5-turbo)
     - **Temperature** (number input, 0.0-2.0, step 0.1)
     - **Max Tokens** (number input, 1-4000)
   - Buttons: "Save Changes", "Cancel", "Reset to Default"
   - Shows character count for prompt text
   - Validation: prompt text cannot be empty

5. **Save Behavior**
   - Saves to `system_settings` table with key format: `prompt_[name]_text`, `prompt_[name]_model`, etc.
   - Shows success toast: "Prompt updated successfully"
   - Prompts take effect immediately (next API call uses new prompt)

6. **Reset to Default**
   - "Reset to Default" button restores original prompt from code
   - Shows confirmation dialog: "Reset to default prompt? This cannot be undone."
   - Defaults are hardcoded in backend as fallback values

7. **Prompt Storage Schema**
   - Each prompt stored as separate settings keys:
     - `prompt_categorization_text`, `prompt_categorization_model`, `prompt_categorization_temperature`, `prompt_categorization_max_tokens`
     - (Repeat pattern for all 6 prompts)

#### Current Prompts (from PROMPTS_REFERENCE.md)

**1. Post Categorization**
- **Location**: `backend/app/services/openai_client.py:63`
- **Current Prompt**: "Classify this post into exactly one category: Technology, Politics, Business, Science, Health, or Other. Post text: {post_text}. Return only the category name, nothing else."
- **Model**: gpt-4-turbo
- **Temperature**: 0.3
- **Max Tokens**: 20

**2. Post Title Generation**
- **Location**: `backend/app/services/openai_client.py:28`
- **Current Prompt**: "Generate a concise, informative title (maximum 100 characters) for this post: {post_text}. Return only the title, nothing else."
- **Model**: gpt-4-turbo
- **Temperature**: 0.5
- **Max Tokens**: 30

**3. Post Summary Generation**
- **Location**: `backend/app/services/openai_client.py:29`
- **Current Prompt**: "Summarize this post in 2-3 sentences: {post_text}. Return only the summary, nothing else."
- **Model**: gpt-4-turbo
- **Temperature**: 0.5
- **Max Tokens**: 100

**4. Article Generation**
- **Location**: `backend/app/services/openai_client.py:91`
- **Current Prompt**: "Write a comprehensive news article based on this post: {post_text}. Requirements: Informative headline, 3-5 paragraphs, Objective tone, Include context and background. Format as markdown."
- **Model**: gpt-4-turbo
- **Temperature**: 0.7
- **Max Tokens**: 1000

**5. Worthiness Scoring** (new prompt, see Feature 6)
**6. Duplicate Detection** (new prompt, see Feature 7)

#### Technical Details

**Backend Changes**:
- Migrate existing prompts from hardcoded strings to `system_settings` table
- Modify `openai_client.py` to read prompts from SettingsService:
  ```python
  def categorize_post(post_text: str) -> tuple[str, float]:
      settings_svc = SettingsService(SessionLocal())
      prompt_text = settings_svc.get('prompt_categorization_text', DEFAULT_CATEGORIZATION_PROMPT)
      model = settings_svc.get('prompt_categorization_model', 'gpt-4-turbo')
      temperature = settings_svc.get('prompt_categorization_temperature', 0.3)
      max_tokens = settings_svc.get('prompt_categorization_max_tokens', 20)
      # ... use these values in OpenAI API call
  ```
- New API endpoints in `backend/app/api/settings.py`:
  - `GET /api/prompts` - list all prompts with current values
  - `GET /api/prompts/{prompt_name}` - get single prompt details
  - `PUT /api/prompts/{prompt_name}` - update prompt
  - `POST /api/prompts/{prompt_name}/reset` - reset to default

**Frontend Changes**:
- New component: `frontend/src/components/PromptManager.tsx`
- New tab in Settings page
- Modal dialog component for editing
- Form validation and character counting

#### Acceptance Criteria

- [ ] Prompts tab appears in Settings navigation
- [ ] All 6 prompts display in table with correct current values
- [ ] Edit button opens modal with pre-filled current values
- [ ] Saving prompt updates database and takes effect immediately
- [ ] Next API call after save uses new prompt text/parameters
- [ ] Reset to Default restores original hardcoded prompt
- [ ] Character count updates in real-time as user types
- [ ] Validation prevents saving empty prompts
- [ ] Success/error toasts provide clear feedback

#### Risk Assessment
**Risk**: 4/10 - Medium risk. Main concerns:
- Migration of existing prompts from code to database (must not break existing functionality)
- Ensuring prompt changes take effect immediately (no cached old prompts)
- Users might enter invalid prompts that break functionality (needs good defaults and reset capability)

---

### Feature 5: Prompt Export & Import (Medium Priority)

#### User Story
As a content manager, I need to export and import prompt configurations so that I can experiment with variations, share successful prompts with team, and backup my tuned prompts.

#### Requirements

1. **Export Prompts Button** (UI)
   - Located in Settings → Prompts tab (top-right corner)
   - Button labeled "Export Prompts" with download icon
   - Downloads `klaus_news_prompts_YYYYMMDD_HHMMSS.json` file
   - JSON contains all 6 prompts with text, model, temperature, max_tokens

2. **Import Prompts Button** (UI)
   - Located next to Export button in Prompts tab
   - Button labeled "Import Prompts" with upload icon
   - Opens file picker (accepts `.json` files only)
   - Shows confirmation dialog: "Import prompts? This will overwrite all current prompts."
   - Validates JSON schema before import
   - On success: refreshes Prompt Manager table and shows success toast

3. **Import Behavior**
   - Overwrites all matching prompts (not additive)
   - If JSON contains fewer than 6 prompts: only updates included prompts, leaves others unchanged
   - Validates each prompt has required fields before import
   - Shows error toast with specific validation issues if import fails

4. **API Endpoints**
   - `GET /api/prompts/export` - returns JSON with all prompts
   - `POST /api/prompts/import` - accepts JSON, validates, updates prompts

#### JSON Schema

```json
{
  "export_version": "2.0",
  "exported_at": "2026-01-23T14:30:22Z",
  "prompts": {
    "categorization": {
      "text": "Classify this post into exactly one category...",
      "model": "gpt-4-turbo",
      "temperature": 0.3,
      "max_tokens": 20
    },
    "title_generation": { ... },
    "summary_generation": { ... },
    "article_generation": { ... },
    "worthiness_scoring": { ... },
    "duplicate_detection": { ... }
  }
}
```

#### Technical Details

**Backend Changes**:
- New endpoints in `backend/app/api/settings.py` or new file `backend/app/api/prompts.py`
- Export: query all `prompt_*` keys from `system_settings`, format as JSON
- Import: validate schema, iterate over prompts, update each in `system_settings`

**Frontend Changes**:
- Buttons in `frontend/src/components/PromptManager.tsx`
- File download and upload same pattern as Feature 2 (List Export/Import)

#### Acceptance Criteria

- [ ] Export button downloads valid JSON with all 6 prompts
- [ ] Import button accepts valid JSON and updates prompts in database
- [ ] Import validates schema and rejects invalid files with clear error
- [ ] Partial import (fewer than 6 prompts) only updates included prompts
- [ ] Import shows confirmation before overwriting
- [ ] Prompts take effect immediately after import
- [ ] File naming includes timestamp for versioning

#### Risk Assessment
**Risk**: 2/10 - Low risk, reuses patterns from Feature 2. Main risk is ensuring prompt validation prevents broken configurations.

---

### Feature 6: AI-Based Worthiness Scoring (High Priority)

#### User Story
As a content manager, I need worthiness scoring to use an AI prompt instead of a hardcoded algorithm so that I can adjust scoring logic to match evolving editorial standards without code changes.

#### Requirements

1. **Replace Algorithmic Scoring**
   - **Current Implementation** (to remove):
     - File: `backend/app/services/scheduler.py:ingest_posts_job()`
     - Formula: `worthiness_score = relevance * 0.4 + quality * 0.4 + recency * 0.2`
     - Relevance: keyword matching count
     - Quality: text length / engagement metrics
     - Recency: time decay function
   - **New Implementation**:
     - Call new function `calculate_worthiness_score_ai(post_text: str, category: str) -> float`
     - Returns float between 0.0 and 1.0

2. **New AI Prompt: Worthiness Scoring**
   - **Prompt Name**: "Worthiness Scoring"
   - **Default Prompt Text**:
     ```
     Evaluate the newsworthiness of this post for an internal company newsletter.

     Post text: {post_text}
     Category: {category}

     Score the post on a scale of 0.0 to 1.0 based on:
     - Relevance to professional/business audience (0.4 weight)
     - Content quality and credibility (0.4 weight)
     - Timeliness and urgency (0.2 weight)

     Return ONLY a decimal number between 0.0 and 1.0, nothing else.
     Examples: 0.85, 0.42, 0.91
     ```
   - **Model**: gpt-4-turbo
   - **Temperature**: 0.3 (low for consistency)
   - **Max Tokens**: 10

3. **API Call Logic**
   - Located in `backend/app/services/openai_client.py`
   - New function: `calculate_worthiness_score_ai(post_text: str, category: str) -> float`
   - Error handling: if API call fails or returns invalid number, default to 0.5 (neutral score)
   - Logging: log score with post_id for debugging

4. **Integration into Ingestion Flow**
   - Called during `ingest_posts_job()` after categorization, before saving to database
   - Execution order per post:
     1. Categorize → get category
     2. Calculate worthiness score (new AI call) → get score
     3. Generate title → get title
     4. Generate summary → get summary
     5. Save post to database with score

5. **Prompt Editability**
   - Stored in `system_settings` as `prompt_worthiness_text`, `prompt_worthiness_model`, etc.
   - Editable via Feature 4 (Prompt Management UI)
   - Exportable via Feature 5

#### Technical Details

**Backend Changes**:
- Remove algorithmic scoring logic from `scheduler.py`
- Add new function in `openai_client.py`:
  ```python
  def calculate_worthiness_score_ai(post_text: str, category: str) -> float:
      settings_svc = SettingsService(SessionLocal())
      prompt_text = settings_svc.get('prompt_worthiness_text', DEFAULT_WORTHINESS_PROMPT)
      model = settings_svc.get('prompt_worthiness_model', 'gpt-4-turbo')
      temperature = settings_svc.get('prompt_worthiness_temperature', 0.3)

      prompt = prompt_text.format(post_text=post_text, category=category)
      response = openai.ChatCompletion.create(
          model=model,
          messages=[{"role": "user", "content": prompt}],
          temperature=temperature,
          max_tokens=10
      )

      try:
          score = float(response.choices[0].message.content.strip())
          return max(0.0, min(1.0, score))  # clamp to [0.0, 1.0]
      except ValueError:
          logger.warning(f"Invalid score returned: {response.choices[0].message.content}")
          return 0.5  # default neutral score
  ```
- Update `ingest_posts_job()` to call new function

**Cost Impact**:
- Current: 0 additional API calls (algorithmic)
- New: +1 API call per post ingested
- Estimated: 100 posts/day × 30 days = 3,000 calls/month
- Cost per call: ~$0.0002 (10 input tokens + 5 output tokens)
- **Additional monthly cost: ~$0.60**

#### Acceptance Criteria

- [ ] Algorithmic scoring code removed from `scheduler.py`
- [ ] New AI prompt returns valid float between 0.0 and 1.0
- [ ] Score is saved to `posts.worthiness_score` field correctly
- [ ] If API call fails, default score of 0.5 is used (no crash)
- [ ] Prompt appears in Feature 4 (Prompt Management UI) and is editable
- [ ] Changing prompt in UI affects next ingestion immediately
- [ ] Posts are still filtered by worthiness threshold correctly in UI

#### Risk Assessment
**Risk**: 5/10 - Medium-high risk. Concerns:
- AI prompt might return invalid output (not a number) → needs robust error handling
- AI scoring might be less consistent than algorithmic approach → needs monitoring
- Additional API costs and latency during ingestion
- Failure of this API call could block entire ingestion → needs fallback

---

### Feature 7: AI-Based Duplicate Detection (High Priority)

#### User Story
As a content manager, I need duplicate detection to use an AI prompt instead of TF-IDF similarity so that I can catch semantic duplicates (same story, different wording) and adjust detection sensitivity without code changes.

#### Requirements

1. **Replace TF-IDF Algorithm**
   - **Current Implementation** (to remove):
     - File: `backend/app/services/duplicate_detection.py`
     - Method: TF-IDF vectorization + cosine similarity
     - Threshold: 0.85 (hardcoded)
     - Logic: if similarity > threshold, assign to same `group_id`
   - **New Implementation**:
     - Call new function `check_duplicate_ai(post_text: str, existing_post_text: str) -> bool`
     - Returns boolean: `True` if duplicate, `False` if distinct

2. **New AI Prompt: Duplicate Detection**
   - **Prompt Name**: "Duplicate Detection"
   - **Default Prompt Text**:
     ```
     Compare these two posts and determine if they describe the same news story.

     Post A: {post_a_text}

     Post B: {post_b_text}

     Consider them duplicates if they:
     - Report the same core event or announcement
     - Involve the same key entities (people, companies, products)
     - Have the same fundamental message, even if worded differently

     Return ONLY "YES" if duplicates, or "NO" if distinct stories.
     ```
   - **Model**: gpt-4-turbo
   - **Temperature**: 0.2 (very low for consistency)
   - **Max Tokens**: 5

3. **Deduplication Logic**
   - During ingestion, for each new post:
     1. Compute SHA-256 hash (exact duplicate check, unchanged)
     2. If hash exists → assign existing `group_id`, skip AI call
     3. If hash new → fetch recent posts from same category (last 24 hours, max 50 posts)
     4. For each existing post, call `check_duplicate_ai(new_post, existing_post)`
     5. If any AI call returns "YES" → assign existing post's `group_id`
     6. If all AI calls return "NO" → generate new `group_id` (UUID)

4. **Performance Optimization**
   - Limit comparison to 50 most recent posts (or configurable limit in settings: `duplicate_check_limit`)
   - Only compare within same category (reduces API calls)
   - Cache results per post pair for session (avoid redundant calls)

5. **Fallback Behavior**
   - If API call fails: log error and treat as "NO" (not duplicate) → default to creating new group
   - Prevents blocking ingestion due to API issues

6. **Prompt Editability**
   - Stored in `system_settings` as `prompt_duplicate_text`, `prompt_duplicate_model`, etc.
   - Editable via Feature 4
   - Exportable via Feature 5

#### Technical Details

**Backend Changes**:
- Replace `duplicate_detection.py` logic:
  ```python
  def check_duplicate_ai(post_a: str, post_b: str) -> bool:
      settings_svc = SettingsService(SessionLocal())
      prompt_text = settings_svc.get('prompt_duplicate_text', DEFAULT_DUPLICATE_PROMPT)
      model = settings_svc.get('prompt_duplicate_model', 'gpt-4-turbo')
      temperature = settings_svc.get('prompt_duplicate_temperature', 0.2)

      prompt = prompt_text.format(post_a_text=post_a, post_b_text=post_b)
      response = openai.ChatCompletion.create(
          model=model,
          messages=[{"role": "user", "content": prompt}],
          temperature=temperature,
          max_tokens=5
      )

      result = response.choices[0].message.content.strip().upper()
      return result == "YES"
  ```
- Update `scheduler.py:ingest_posts_job()` to use new function
- Add setting: `duplicate_check_limit` (default: 50)

**Cost Impact**:
- Current: 0 additional API calls (TF-IDF)
- New: up to 50 API calls per post ingested (worst case: compare with 50 existing posts)
- Average case: ~10 comparisons per post (most posts match earlier in the loop)
- Estimated: 100 posts/day × 10 comparisons/post × 30 days = 30,000 calls/month
- Cost per call: ~$0.002 (150 input tokens average)
- **Additional monthly cost: ~$60**

#### Acceptance Criteria

- [ ] TF-IDF code removed from `duplicate_detection.py`
- [ ] New AI prompt returns "YES" or "NO" correctly
- [ ] Duplicate posts assigned to same `group_id`
- [ ] Distinct posts assigned to different `group_id`
- [ ] Comparison limited to 50 most recent posts (performance)
- [ ] Comparison only within same category (performance)
- [ ] If API call fails, ingestion continues (not blocked)
- [ ] Prompt appears in Feature 4 and is editable
- [ ] Changing prompt affects next ingestion immediately

#### Risk Assessment
**Risk**: 7/10 - High risk. Concerns:
- Very high API call volume (50 calls per post in worst case) → significant cost increase
- AI might be inconsistent in duplicate detection → false positives/negatives
- Latency: each post ingestion now takes significantly longer (blocking)
- API rate limits might be hit during high-volume ingestion
- Failure could result in many duplicate posts being stored
- **Mitigation**: aggressive caching, comparison limit, fallback to TF-IDF as safety net

---

## Implementation Strategy

### Phase 1: Foundation (Data Safety)
**Priority**: Critical
**Timeline**: Week 1

1. Feature 1: Database Backup & Restore Scripts
2. Feature 2: List Export & Import
3. Feature 3: Disable Automatic Fetch Toggle

**Rationale**: Establish data safety mechanisms before making architectural changes.

### Phase 2: Configuration Transparency
**Priority**: High
**Timeline**: Week 2-3

4. Feature 4: Prompt Management UI
   - Migrate existing 4 prompts to database
   - Build UI components
5. Feature 5: Prompt Export & Import

**Rationale**: Make prompts visible and editable before adding new AI-based features.

### Phase 3: AI-First Architecture
**Priority**: High
**Timeline**: Week 3-4

6. Feature 6: AI-Based Worthiness Scoring
7. Feature 7: AI-Based Duplicate Detection

**Rationale**: These are high-risk, high-value changes that require careful monitoring and tuning.

### Phase 4: Monitoring & Optimization
**Priority**: Medium
**Timeline**: Week 4-5

- Add cost tracking dashboard (log API call counts per prompt type)
- Add performance monitoring (API call latency)
- A/B testing framework for prompts
- Tune Feature 7 (duplicate detection) based on false positive/negative rates

---

## Technical Considerations

### Database Schema Changes

**New Table**: `prompts` (optional, alternative to storing in `system_settings`)
```sql
CREATE TABLE prompts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,  -- e.g., "categorization"
    display_name VARCHAR(200) NOT NULL,  -- e.g., "Post Categorization"
    prompt_text TEXT NOT NULL,
    model VARCHAR(50) NOT NULL DEFAULT 'gpt-4-turbo',
    temperature FLOAT NOT NULL DEFAULT 0.5,
    max_tokens INT NOT NULL DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```
*Alternative: Continue using `system_settings` table with key-value pairs (simpler, no migration needed)*

**New Setting Keys** (if using `system_settings` approach):
- `auto_fetch_enabled` (boolean)
- `duplicate_check_limit` (integer)
- `prompt_[name]_text`, `prompt_[name]_model`, `prompt_[name]_temperature`, `prompt_[name]_max_tokens` (6 prompts × 4 keys = 24 new keys)

### API Design

**New Endpoints**:
```
GET    /api/lists/export              → JSON download
POST   /api/lists/import              → JSON upload

GET    /api/prompts                   → list all prompts
GET    /api/prompts/{name}            → get single prompt
PUT    /api/prompts/{name}            → update prompt
POST   /api/prompts/{name}/reset      → reset to default
GET    /api/prompts/export            → JSON download
POST   /api/prompts/import            → JSON upload
```

### Cost Impact Analysis

| Component | Current | v2.0 | Change |
|-----------|---------|------|--------|
| Post Categorization | $0.0002 × 3000 = $0.60 | $0.60 | - |
| Title Generation | $0.0008 × 3000 = $2.40 | $2.40 | - |
| Summary Generation | $0.0012 × 3000 = $3.60 | $3.60 | - |
| Worthiness Scoring | $0 (algorithmic) | $0.0002 × 3000 = $0.60 | **+$0.60** |
| Duplicate Detection | $0 (TF-IDF) | $0.002 × 30,000 = $60 | **+$60** |
| Article Generation | $0.01 × 20 = $0.20 | $0.20 | - |
| **Total** | **~$7/month** | **~$68/month** | **+$61/month** |

**Optimization Options** (to reduce cost):
1. Use gpt-3.5-turbo for duplicate detection ($0.0005 per call) → saves $45/month
2. Reduce duplicate check limit from 50 to 20 → saves $24/month
3. Only run duplicate check on high-worthiness posts (>0.7) → saves $30-40/month

**Revised Estimate with Optimizations**: ~$20-25/month

---

## Success Metrics

### Data Safety Metrics
- **Backup Success Rate**: 100% of scheduled backups complete successfully
- **Restore Test**: Successfully restore from backup at least once per month
- **Zero Data Loss Events**: No unrecoverable data loss incidents

### Configuration Portability Metrics
- **Export/Import Success Rate**: 100% of valid JSON imports succeed
- **Configuration Reuse**: Dev → Staging → Production migration with zero manual re-entry

### AI Tuning Metrics
- **Prompt Iteration Velocity**: Time from "idea" to "deployed prompt" < 5 minutes (no code deployment)
- **Worthiness Accuracy**: % of high-scoring posts (>0.8) that users actually generate articles from
- **Duplicate Detection Accuracy**:
  - False Positive Rate: < 5% (distinct stories marked as duplicates)
  - False Negative Rate: < 10% (duplicate stories not caught)

### Cost Metrics
- **Monthly AI Costs**: Stay under $25/month with optimizations
- **Cost Per Post Ingested**: < $0.01 per post

---

## Out of Scope (v2.0)

The following are explicitly **not** included in v2.0:

1. **Automated Configuration Sync**: No real-time sync between dev/staging/production environments
2. **Prompt Version History**: No built-in versioning or rollback for prompt changes (user must manually export before changing)
3. **A/B Testing Framework**: No built-in UI for running multiple prompt variants simultaneously
4. **Cost Dashboard**: No real-time cost tracking UI (user must monitor OpenAI dashboard)
5. **Advanced Duplicate Detection**: No clustering or bulk deduplication of existing posts
6. **Prompt Templates Library**: No shared marketplace or library of community prompts
7. **Scheduled Exports**: No automated daily/weekly exports (only manual)
8. **Change Approval Workflow**: No review/approve flow for prompt changes (assumes single admin)

---

## Migration Path from v1.1 to v2.0

### Step 1: Backup Current State
```bash
./backup_db.sh
./export_lists.sh  # manual or via UI
```

### Step 2: Deploy v2.0 Code
```bash
git pull origin main
docker-compose build
docker-compose up -d
```

### Step 3: Migrate Prompts to Database
- On first startup, application should auto-seed `system_settings` with default prompts (from hardcoded values)
- No manual action required

### Step 4: Verify Functionality
- Test prompt editing in UI
- Run one manual fetch cycle: verify all 6 AI prompts execute correctly
- Check logs for errors

### Step 5: Optimize for Cost
- Tune duplicate detection prompt to be more selective
- Reduce `duplicate_check_limit` from 50 to 20
- Consider switching duplicate detection to gpt-3.5-turbo

---

## Open Questions

1. **Duplicate Detection Performance**: Should we add a "Skip duplicate detection" toggle for users who prioritize speed over deduplication?

2. **Prompt Sharing**: Should we add a "Share Prompt" feature to export a single prompt as shareable link/JSON?

3. **Cost Alerts**: Should we add a setting to pause automatic fetching if estimated monthly cost exceeds threshold?

4. **Rollback Safety**: Should prompt edits be logged to a separate `prompt_history` table for audit trail?

5. **Batch Operations**: Should we add "Apply to all categories" when updating prompts?

---

## Appendix: Current System Architecture

### AI Prompt Execution Points (from PROMPTS_REFERENCE.md)

**Ingestion Flow** (every 30 minutes):
```
Fetch posts from X
  ↓
For each post:
  1. Categorize (AI Prompt 1) → category
  2. [NEW] Calculate worthiness (AI Prompt 5) → score
  3. Generate title (AI Prompt 2) → title
  4. Generate summary (AI Prompt 3) → summary
  5. [NEW] Check duplicates (AI Prompt 6, up to 50 calls) → group_id
  6. Save to database
```

**User-Triggered Flow**:
```
User clicks post
  ↓
Generate article (AI Prompt 4)
  ↓
User reviews
  ↓
User regenerates (reuses AI Prompt 4)
  ↓
User posts to Teams
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-23 | System | Initial v2.0 proposal based on user requirements |

---

**End of Brief**

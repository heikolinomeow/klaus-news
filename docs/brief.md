# Polished Brief (from docs/new-brief.md)

**Version**: 2.0
**Status**: Proposal
**Date**: 2026-01-23
**Previous Version**: v1.1 (Settings & System Control Panel)

---

## Work Package: 1. Executive Summary

- V-1: Business Context
  - Work package: Executive Summary
  - Source: New Brief §1.1
  - Anchor quote: "Current system has critical data loss risks"
  - Requirement:
    - Current system has critical data loss risks: a single `docker-compose down -v` command wipes all configuration (lists, settings, post history) with no recovery mechanism
    - Key logic components (worthiness scoring, duplicate detection) use hardcoded algorithms that cannot be adjusted without code changes

- V-2: Cost Impact
  - Work package: Executive Summary
  - Source: New Brief §1.2
  - Anchor quote: "Estimated increase from ~$7/month to ~$20/month"
  - Requirement:
    - Estimated increase from ~$7/month to ~$20/month due to additional AI prompt usage for scoring and duplicate detection

---

## Work Package: 2. Problem Statement

- V-3: Database Brittleness (Critical)
  - Work package: Problem Statement
  - Source: New Brief §2.1
  - Anchor quote: "No backup mechanism exists"
  - Requirement:
    - No backup mechanism exists
    - `docker-compose down -v` permanently deletes all data
    - Cannot recover from accidental data loss
    - Cannot migrate configuration between environments

- V-4: Configuration Lock-In (High)
  - Work package: Problem Statement
  - Source: New Brief §2.2
  - Anchor quote: "X/Twitter lists stored only in database"
  - Requirement:
    - X/Twitter lists stored only in database
    - No way to backup or share list configurations
    - Manual re-entry required after data loss

- V-5: Prompt Opacity (High)
  - Work package: Problem Statement
  - Source: New Brief §2.3
  - Anchor quote: "4 AI prompts hidden in Python code"
  - Requirement:
    - 4 AI prompts hidden in Python code (`backend/app/services/openai_client.py`)
    - No visibility into prompt content without reading code
    - Cannot experiment with prompt variations without code deployment
    - No version control or A/B testing capability

- V-6: Algorithmic Rigidity (Medium)
  - Work package: Problem Statement
  - Source: New Brief §2.4
  - Anchor quote: "Worthiness scoring uses hardcoded formula"
  - Requirement:
    - Worthiness scoring uses hardcoded formula: `relevance*0.4 + quality*0.4 + recency*0.2`
    - Duplicate detection uses fixed TF-IDF cosine similarity threshold (0.85)
    - Cannot adjust logic to match evolving editorial preferences
    - Requires code changes for tuning

- V-7: Operational Inflexibility (Medium)
  - Work package: Problem Statement
  - Source: New Brief §2.5
  - Anchor quote: "Cannot temporarily disable automatic fetching"
  - Requirement:
    - Cannot temporarily disable automatic fetching (e.g., during maintenance, API quota issues, testing)
    - Scheduler always runs even when undesired

---

## Work Package: 3. Target Users

- V-8: System Administrator (primary)
  - Work package: Target Users
  - Source: New Brief §3.1
  - Anchor quote: "Needs to backup/restore system before risky operations"
  - Requirement:
    - Needs to backup/restore system before risky operations
    - Needs to migrate configuration between dev/staging/production
    - Needs to disable fetching temporarily during maintenance

- V-9: Content Manager (primary)
  - Work package: Target Users
  - Source: New Brief §3.2
  - Anchor quote: "Needs to tune AI prompts to match editorial voice"
  - Requirement:
    - Needs to tune AI prompts to match editorial voice
    - Needs to adjust worthiness criteria without developer help
    - Needs to export/import prompt configurations for experimentation

- V-10: Developer (secondary)
  - Work package: Target Users
  - Source: New Brief §3.3
  - Anchor quote: "Needs safe deployment practices with configuration backups"
  - Requirement:
    - Needs safe deployment practices with configuration backups
    - Needs to share working configurations with team

---

## Work Package: 4. Feature Requirements

### 4.1 Database Backup & Restore Scripts (High Priority)

- V-11: User Story - Database Backup & Restore
  - Work package: Feature Requirements - Database Backup & Restore Scripts
  - Source: New Brief §4.1.1
  - Anchor quote: "I need automated database backups so that I can recover"
  - Requirement:
    - As a system administrator, I need automated database backups so that I can recover from accidental data loss or migrate between environments

- V-12: Requirements - Backup Script
  - Work package: Feature Requirements - Database Backup & Restore Scripts
  - Source: New Brief §4.1.2
  - Anchor quote: "Backup Script (`backup_db.sh`)"
  - Requirement:
    - Creates timestamped SQL dump of PostgreSQL database
    - Filename format: `klaus_news_backup_YYYYMMDD_HHMMSS.sql`
    - Backs up `postgres_data` volume content
    - Stores backups in `./backups/` directory (outside Docker volumes)
    - Includes all tables: `posts`, `articles`, `list_metadata`, `system_settings`
    - Runs successfully whether containers are running or stopped
    - Returns clear success/failure status message
    - Logs backup size and timestamp
  - Split justification: Backup Script and Restore Script are distinct deliverables with separate implementation and testing requirements
  - Split from: New Brief §4.1.2

- V-13: Requirements - Restore Script
  - Work package: Feature Requirements - Database Backup & Restore Scripts
  - Source: New Brief §4.1.2
  - Anchor quote: "Restore Script (`restore_db.sh`)"
  - Requirement:
    - Accepts backup filename as argument: `./restore_db.sh klaus_news_backup_20260123_143022.sql`
    - Stops application containers before restore (safety measure)
    - Drops existing database and recreates from backup
    - Validates backup file exists before attempting restore
    - Returns clear success/failure status message
    - Warns user about data overwrite before proceeding
  - Split justification: Restore Script and Backup Script are distinct deliverables with separate implementation and testing requirements
  - Split from: New Brief §4.1.2

- V-14: Requirements - Automated Daily Backups
  - Work package: Feature Requirements - Database Backup & Restore Scripts
  - Source: New Brief §4.1.2
  - Anchor quote: "Automated Daily Backups (cron job)"
  - Requirement:
    - Runs `backup_db.sh` daily at 2 AM UTC
    - Keeps last 7 days of backups (deletes older files automatically)
    - Logs cron execution to `./backups/backup.log`
  - Split justification: Cron automation is a distinct deliverable separate from the scripts themselves
  - Split from: New Brief §4.1.2

- V-15: Technical Details - Database Backup & Restore
  - Work package: Feature Requirements - Database Backup & Restore Scripts
  - Source: New Brief §4.1.3
  - Anchor quote: "Files to Create"
  - Requirement - Files to Create:
    - `backup_db.sh` (bash script, executable)
    - `restore_db.sh` (bash script, executable)
    - `setup_cron.sh` (bash script to install cron job)
    - `./backups/.gitkeep` (ensure directory exists in repo)
  - Requirement - Docker Integration:
    - Scripts use `docker-compose exec` to run `pg_dump` inside postgres container
    - Handle both running and stopped container states
    - Use `.env` file for database credentials (reuse existing `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`)
  - Example Usage:
    ```bash
    # Manual backup
    ./backup_db.sh
    # Output: ✓ Backup created: backups/klaus_news_backup_20260123_143022.sql (2.4 MB)

    # Restore from backup
    ./restore_db.sh backups/klaus_news_backup_20260123_143022.sql
    # Output: ⚠ WARNING: This will overwrite all current data. Continue? (y/N)
    ```

- V-16: Acceptance Criteria - Database Backup & Restore
  - Work package: Feature Requirements - Database Backup & Restore Scripts
  - Source: New Brief §4.1.4
  - Anchor quote: "`backup_db.sh` creates valid SQL dump file"
  - Acceptance Criteria:
    - `backup_db.sh` creates valid SQL dump file
    - `restore_db.sh` successfully restores database from backup file
    - Backup includes all 4 tables with data intact
    - Restore warns user before overwriting data
    - Scripts work whether containers are running or stopped
    - Daily cron job runs and maintains 7-day retention
    - Scripts return non-zero exit code on failure (for automation)
    - Documentation added to README.md with usage examples

- V-17: Risk Assessment - Database Backup & Restore
  - Work package: Feature Requirements - Database Backup & Restore Scripts
  - Source: New Brief §4.1.5
  - Anchor quote: "Risk: 3/10 - Low risk"
  - Requirement:
    - Risk: 3/10 - Low risk, bash scripting with standard PostgreSQL tools
    - Main risk is ensuring scripts work in all container states

### 4.2 List Export & Import (High Priority)

- V-18: User Story - List Export & Import
  - Work package: Feature Requirements - List Export & Import
  - Source: New Brief §4.2.1
  - Anchor quote: "I need to export and import X/Twitter list configurations"
  - Requirement:
    - As a system administrator, I need to export and import X/Twitter list configurations so that I can backup my data source setup and migrate between environments

- V-19: Requirements - Export Lists Button
  - Work package: Feature Requirements - List Export & Import
  - Source: New Brief §4.2.2
  - Anchor quote: "Export Lists Button (UI)"
  - Requirement:
    - Located in Settings → Data Sources tab
    - Button labeled "Export Lists" with download icon
    - Triggers download of `klaus_news_lists_YYYYMMDD_HHMMSS.json` file
    - JSON contains all list metadata: `list_id`, `list_name`, `enabled`, `fetch_frequency_minutes`
    - Excludes database metadata: `id`, `created_at`, `updated_at`, `last_fetched_at`
    - Shows success toast notification: "Lists exported successfully"
  - Split justification: Export and Import are distinct UI features with separate implementation and testing
  - Split from: New Brief §4.2.2

- V-20: Requirements - Import Lists Button
  - Work package: Feature Requirements - List Export & Import
  - Source: New Brief §4.2.2
  - Anchor quote: "Import Lists Button (UI)"
  - Requirement:
    - Located in Settings → Data Sources tab, next to Export button
    - Button labeled "Import Lists" with upload icon
    - Opens file picker (accepts `.json` files only)
    - Validates JSON schema before import
    - Shows confirmation dialog: "Import X lists? This will add to (not replace) existing lists."
    - On success: refreshes DataSourceManager table to show imported lists
    - On validation failure: shows error toast with specific issue
  - Split justification: Import and Export are distinct UI features with separate implementation and testing
  - Split from: New Brief §4.2.2

- V-21: Requirements - Import Behavior
  - Work package: Feature Requirements - List Export & Import
  - Source: New Brief §4.2.2
  - Anchor quote: "Import Behavior"
  - Requirement:
    - Adds new lists (does not replace existing lists unless `list_id` matches)
    - If `list_id` already exists: updates that list's configuration (merge behavior)
    - Imported lists are set to `enabled: false` by default (safety measure)
    - After import, user must manually enable lists in UI
  - Split justification: Import behavior logic is distinct from the UI controls
  - Split from: New Brief §4.2.2

- V-22: Requirements - API Endpoints for List Export/Import
  - Work package: Feature Requirements - List Export & Import
  - Source: New Brief §4.2.2
  - Anchor quote: "API Endpoints"
  - Requirement:
    - `GET /api/lists/export` - returns JSON array of all lists
    - `POST /api/lists/import` - accepts JSON array, validates schema, imports lists

- V-23: JSON Schema - List Export/Import
  - Work package: Feature Requirements - List Export & Import
  - Source: New Brief §4.2.3
  - Anchor quote: "JSON Schema"
  - Requirement:
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

- V-24: Technical Details - List Export/Import
  - Work package: Feature Requirements - List Export & Import
  - Source: New Brief §4.2.4
  - Anchor quote: "Backend Changes"
  - Requirement - Backend Changes:
    - New endpoints in `backend/app/api/lists.py`
    - JSON schema validation using Pydantic models
    - Export query: `SELECT list_id, list_name, enabled, fetch_frequency_minutes FROM list_metadata`
    - Import logic: upsert based on `list_id` (ON CONFLICT DO UPDATE)
  - Requirement - Frontend Changes:
    - New buttons in `frontend/src/components/DataSourceManager.tsx`
    - File download using browser download API
    - File upload using `<input type="file" accept=".json">`
    - JSON parsing and validation on client side before sending to API

- V-25: Acceptance Criteria - List Export/Import
  - Work package: Feature Requirements - List Export & Import
  - Source: New Brief §4.2.5
  - Anchor quote: "Export button downloads valid JSON file with all lists"
  - Acceptance Criteria:
    - Export button downloads valid JSON file with all lists
    - Import button accepts valid JSON and adds lists to database
    - Import validates JSON schema and rejects invalid files with clear error message
    - Duplicate `list_id` during import updates existing list (does not create duplicate)
    - Imported lists are disabled by default
    - Export/import preserves list configuration accurately
    - File naming includes timestamp for versioning
    - Toast notifications provide clear feedback on success/failure

- V-26: Risk Assessment - List Export/Import
  - Work package: Feature Requirements - List Export & Import
  - Source: New Brief §4.2.6
  - Anchor quote: "Risk: 2/10 - Low risk"
  - Requirement:
    - Risk: 2/10 - Low risk, straightforward CRUD operations with JSON serialization
    - Main risk is ensuring proper schema validation

### 4.3 Disable Automatic Fetch Toggle (Medium Priority)

- V-27: User Story - Disable Automatic Fetch Toggle
  - Work package: Feature Requirements - Disable Automatic Fetch Toggle
  - Source: New Brief §4.3.1
  - Anchor quote: "I need to temporarily disable automatic post fetching"
  - Requirement:
    - As a system administrator, I need to temporarily disable automatic post fetching so that I can perform maintenance, conserve API quota, or test new configurations without incoming data

- V-28: Requirements - UI Toggle
  - Work package: Feature Requirements - Disable Automatic Fetch Toggle
  - Source: New Brief §4.3.2
  - Anchor quote: "UI Toggle (Settings → Scheduling tab)"
  - Requirement:
    - New toggle control labeled "Enable Automatic Fetch"
    - Located at top of Scheduling tab (before fetch frequency setting)
    - Default state: ON (enabled)
    - When OFF: scheduler job still exists but skips post fetching logic
    - Shows status text next to toggle:
      - ON: "Automatic fetching is enabled"
      - OFF: "Automatic fetching is paused"

- V-29: Requirements - System Settings Storage
  - Work package: Feature Requirements - Disable Automatic Fetch Toggle
  - Source: New Brief §4.3.2
  - Anchor quote: "System Settings Storage"
  - Requirement:
    - New setting key: `auto_fetch_enabled` (boolean, default: `true`)
    - Stored in `system_settings` table
    - Read by scheduler before running `ingest_posts_job()`

- V-30: Requirements - Scheduler Behavior
  - Work package: Feature Requirements - Disable Automatic Fetch Toggle
  - Source: New Brief §4.3.2
  - Anchor quote: "Scheduler Behavior"
  - Requirement:
    - At start of `ingest_posts_job()`, check `auto_fetch_enabled` setting
    - If `false`: log "Auto-fetch disabled, skipping ingestion" and return early
    - If `true`: proceed with normal fetch logic
    - Scheduler job continues running on schedule (does not unregister job)

- V-31: Requirements - Status Indicator
  - Work package: Feature Requirements - Disable Automatic Fetch Toggle
  - Source: New Brief §4.3.2
  - Anchor quote: "Status Indicator"
  - Requirement:
    - Settings → System Control → Status section shows:
      - "Auto-fetch: Enabled" (green) or "Auto-fetch: Disabled" (red)
    - Last run timestamp still updates (shows last scheduled run, even if skipped)

- V-32: Technical Details - Disable Automatic Fetch
  - Work package: Feature Requirements - Disable Automatic Fetch Toggle
  - Source: New Brief §4.3.3
  - Anchor quote: "Backend Changes"
  - Requirement - Backend Changes:
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
  - Requirement - Frontend Changes:
    - Add toggle to `frontend/src/components/SchedulingSettings.tsx`
    - Use `useSettings()` hook to read/write `auto_fetch_enabled`
    - Update status display in SystemControl component

- V-33: Acceptance Criteria - Disable Automatic Fetch
  - Work package: Feature Requirements - Disable Automatic Fetch Toggle
  - Source: New Brief §4.3.4
  - Anchor quote: "Toggle control appears in Settings → Scheduling tab"
  - Acceptance Criteria:
    - Toggle control appears in Settings → Scheduling tab
    - Changing toggle updates `system_settings.auto_fetch_enabled` in database
    - When disabled, scheduler skips post ingestion (logs "skipping" message)
    - When disabled, no new posts appear in database during scheduled runs
    - When re-enabled, next scheduled run fetches posts normally
    - Status indicator reflects current state accurately
    - Toggle state persists across application restarts

- V-34: Risk Assessment - Disable Automatic Fetch
  - Work package: Feature Requirements - Disable Automatic Fetch Toggle
  - Source: New Brief §4.3.5
  - Anchor quote: "Risk: 2/10 - Low risk"
  - Requirement:
    - Risk: 2/10 - Low risk, simple boolean flag check
    - Main risk is ensuring scheduler continues running (not accidentally unregistered)

### 4.4 Prompt Management UI (High Priority)

- V-35: User Story - Prompt Management UI
  - Work package: Feature Requirements - Prompt Management UI
  - Source: New Brief §4.4.1
  - Anchor quote: "I need to view and edit all AI prompts in the UI"
  - Requirement:
    - As a content manager, I need to view and edit all AI prompts in the UI so that I can tune the system's behavior without developer assistance or code deployments

- V-36: Requirements - New Settings Tab
  - Work package: Feature Requirements - Prompt Management UI
  - Source: New Brief §4.4.2
  - Anchor quote: "New Settings Tab: \"Prompts\""
  - Requirement:
    - Added to Settings page navigation (5th tab after Data Sources, Scheduling, Content Filtering, System Control)
    - Displays all 6 prompts (4 existing + 2 new from Features 4.6-4.7)

- V-37: Requirements - Prompt List Display
  - Work package: Feature Requirements - Prompt Management UI
  - Source: New Brief §4.4.2
  - Anchor quote: "Prompt List Display"
  - Requirement:
    - Table with columns: Prompt Name, Model, Temperature, Max Tokens, Last Modified, Actions
    - Each row shows one prompt with "Edit" button

- V-38: Requirements - Prompt Names
  - Work package: Feature Requirements - Prompt Management UI
  - Source: New Brief §4.4.2
  - Anchor quote: "Prompt Names (display names)"
  - Requirement:
    - Post Categorization
    - Post Title Generation
    - Post Summary Generation
    - Article Generation
    - Worthiness Scoring (new in v2.0)
    - Duplicate Detection (new in v2.0)

- V-39: Requirements - Edit Prompt Modal
  - Work package: Feature Requirements - Prompt Management UI
  - Source: New Brief §4.4.2
  - Anchor quote: "Edit Prompt Modal"
  - Requirement:
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

- V-40: Requirements - Save Behavior
  - Work package: Feature Requirements - Prompt Management UI
  - Source: New Brief §4.4.2
  - Anchor quote: "Save Behavior"
  - Requirement:
    - Saves to `system_settings` table with key format: `prompt_[name]_text`, `prompt_[name]_model`, etc.
    - Shows success toast: "Prompt updated successfully"
    - Prompts take effect immediately (next API call uses new prompt)

- V-41: Requirements - Reset to Default
  - Work package: Feature Requirements - Prompt Management UI
  - Source: New Brief §4.4.2
  - Anchor quote: "Reset to Default"
  - Requirement:
    - "Reset to Default" button restores original prompt from code
    - Shows confirmation dialog: "Reset to default prompt? This cannot be undone."
    - Defaults are hardcoded in backend as fallback values

- V-42: Requirements - Prompt Storage Schema
  - Work package: Feature Requirements - Prompt Management UI
  - Source: New Brief §4.4.2
  - Anchor quote: "Prompt Storage Schema"
  - Requirement:
    - Each prompt stored as separate settings keys:
      - `prompt_categorization_text`, `prompt_categorization_model`, `prompt_categorization_temperature`, `prompt_categorization_max_tokens`
      - (Repeat pattern for all 6 prompts)

- V-43: Current Prompts Reference
  - Work package: Feature Requirements - Prompt Management UI
  - Source: New Brief §4.4.3
  - Anchor quote: "Current Prompts (from PROMPTS_REFERENCE.md)"
  - Requirement - 1. Post Categorization:
    - Location: `backend/app/services/openai_client.py:63`
    - Current Prompt: "Classify this post into exactly one category: Technology, Politics, Business, Science, Health, or Other. Post text: {post_text}. Return only the category name, nothing else."
    - Model: gpt-4-turbo
    - Temperature: 0.3
    - Max Tokens: 20
  - Requirement - 2. Post Title Generation:
    - Location: `backend/app/services/openai_client.py:28`
    - Current Prompt: "Generate a concise, informative title (maximum 100 characters) for this post: {post_text}. Return only the title, nothing else."
    - Model: gpt-4-turbo
    - Temperature: 0.5
    - Max Tokens: 30
  - Requirement - 3. Post Summary Generation:
    - Location: `backend/app/services/openai_client.py:29`
    - Current Prompt: "Summarize this post in 2-3 sentences: {post_text}. Return only the summary, nothing else."
    - Model: gpt-4-turbo
    - Temperature: 0.5
    - Max Tokens: 100
  - Requirement - 4. Article Generation:
    - Location: `backend/app/services/openai_client.py:91`
    - Current Prompt: "Write a comprehensive news article based on this post: {post_text}. Requirements: Informative headline, 3-5 paragraphs, Objective tone, Include context and background. Format as markdown."
    - Model: gpt-4-turbo
    - Temperature: 0.7
    - Max Tokens: 1000
  - Requirement - 5. Worthiness Scoring (new prompt, see Feature 4.6)
  - Requirement - 6. Duplicate Detection (new prompt, see Feature 4.7)

- V-44: Technical Details - Prompt Management UI
  - Work package: Feature Requirements - Prompt Management UI
  - Source: New Brief §4.4.4
  - Anchor quote: "Backend Changes"
  - Requirement - Backend Changes:
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
  - Requirement - Frontend Changes:
    - New component: `frontend/src/components/PromptManager.tsx`
    - New tab in Settings page
    - Modal dialog component for editing
    - Form validation and character counting

- V-45: Acceptance Criteria - Prompt Management UI
  - Work package: Feature Requirements - Prompt Management UI
  - Source: New Brief §4.4.5
  - Anchor quote: "Prompts tab appears in Settings navigation"
  - Acceptance Criteria:
    - Prompts tab appears in Settings navigation
    - All 6 prompts display in table with correct current values
    - Edit button opens modal with pre-filled current values
    - Saving prompt updates database and takes effect immediately
    - Next API call after save uses new prompt text/parameters
    - Reset to Default restores original hardcoded prompt
    - Character count updates in real-time as user types
    - Validation prevents saving empty prompts
    - Success/error toasts provide clear feedback

- V-46: Risk Assessment - Prompt Management UI
  - Work package: Feature Requirements - Prompt Management UI
  - Source: New Brief §4.4.6
  - Anchor quote: "Risk: 4/10 - Medium risk"
  - Requirement:
    - Risk: 4/10 - Medium risk
    - Main concerns:
      - Migration of existing prompts from code to database (must not break existing functionality)
      - Ensuring prompt changes take effect immediately (no cached old prompts)
      - Users might enter invalid prompts that break functionality (needs good defaults and reset capability)

### 4.5 Prompt Export & Import (Medium Priority)

- V-47: User Story - Prompt Export & Import
  - Work package: Feature Requirements - Prompt Export & Import
  - Source: New Brief §4.5.1
  - Anchor quote: "I need to export and import prompt configurations"
  - Requirement:
    - As a content manager, I need to export and import prompt configurations so that I can experiment with variations, share successful prompts with team, and backup my tuned prompts

- V-48: Requirements - Export Prompts Button
  - Work package: Feature Requirements - Prompt Export & Import
  - Source: New Brief §4.5.2
  - Anchor quote: "Export Prompts Button (UI)"
  - Requirement:
    - Located in Settings → Prompts tab (top-right corner)
    - Button labeled "Export Prompts" with download icon
    - Downloads `klaus_news_prompts_YYYYMMDD_HHMMSS.json` file
    - JSON contains all 6 prompts with text, model, temperature, max_tokens

- V-49: Requirements - Import Prompts Button
  - Work package: Feature Requirements - Prompt Export & Import
  - Source: New Brief §4.5.2
  - Anchor quote: "Import Prompts Button (UI)"
  - Requirement:
    - Located next to Export button in Prompts tab
    - Button labeled "Import Prompts" with upload icon
    - Opens file picker (accepts `.json` files only)
    - Shows confirmation dialog: "Import prompts? This will overwrite all current prompts."
    - Validates JSON schema before import
    - On success: refreshes Prompt Manager table and shows success toast

- V-50: Requirements - Import Behavior (Prompts)
  - Work package: Feature Requirements - Prompt Export & Import
  - Source: New Brief §4.5.2
  - Anchor quote: "Import Behavior"
  - Requirement:
    - Overwrites all matching prompts (not additive)
    - If JSON contains fewer than 6 prompts: only updates included prompts, leaves others unchanged
    - Validates each prompt has required fields before import
    - Shows error toast with specific validation issues if import fails

- V-51: Requirements - API Endpoints for Prompt Export/Import
  - Work package: Feature Requirements - Prompt Export & Import
  - Source: New Brief §4.5.2
  - Anchor quote: "API Endpoints"
  - Requirement:
    - `GET /api/prompts/export` - returns JSON with all prompts
    - `POST /api/prompts/import` - accepts JSON, validates, updates prompts

- V-52: JSON Schema - Prompt Export/Import
  - Work package: Feature Requirements - Prompt Export & Import
  - Source: New Brief §4.5.3
  - Anchor quote: "JSON Schema"
  - Requirement:
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
        "title_generation": { },
        "summary_generation": { },
        "article_generation": { },
        "worthiness_scoring": { },
        "duplicate_detection": { }
      }
    }
    ```

- V-53: Technical Details - Prompt Export/Import
  - Work package: Feature Requirements - Prompt Export & Import
  - Source: New Brief §4.5.4
  - Anchor quote: "Backend Changes"
  - Requirement - Backend Changes:
    - New endpoints in `backend/app/api/settings.py` or new file `backend/app/api/prompts.py`
    - Export: query all `prompt_*` keys from `system_settings`, format as JSON
    - Import: validate schema, iterate over prompts, update each in `system_settings`
  - Requirement - Frontend Changes:
    - Buttons in `frontend/src/components/PromptManager.tsx`
    - File download and upload same pattern as Feature 4.2 (List Export/Import)

- V-54: Acceptance Criteria - Prompt Export/Import
  - Work package: Feature Requirements - Prompt Export & Import
  - Source: New Brief §4.5.5
  - Anchor quote: "Export button downloads valid JSON with all 6 prompts"
  - Acceptance Criteria:
    - Export button downloads valid JSON with all 6 prompts
    - Import button accepts valid JSON and updates prompts in database
    - Import validates schema and rejects invalid files with clear error
    - Partial import (fewer than 6 prompts) only updates included prompts
    - Import shows confirmation before overwriting
    - Prompts take effect immediately after import
    - File naming includes timestamp for versioning

- V-55: Risk Assessment - Prompt Export/Import
  - Work package: Feature Requirements - Prompt Export & Import
  - Source: New Brief §4.5.6
  - Anchor quote: "Risk: 2/10 - Low risk"
  - Requirement:
    - Risk: 2/10 - Low risk, reuses patterns from Feature 4.2
    - Main risk is ensuring prompt validation prevents broken configurations

### 4.6 AI-Based Worthiness Scoring (High Priority)

- V-56: User Story - AI-Based Worthiness Scoring
  - Work package: Feature Requirements - AI-Based Worthiness Scoring
  - Source: New Brief §4.6.1
  - Anchor quote: "I need worthiness scoring to use an AI prompt"
  - Requirement:
    - As a content manager, I need worthiness scoring to use an AI prompt instead of a hardcoded algorithm so that I can adjust scoring logic to match evolving editorial standards without code changes

- V-57: Requirements - Replace Algorithmic Scoring
  - Work package: Feature Requirements - AI-Based Worthiness Scoring
  - Source: New Brief §4.6.2
  - Anchor quote: "Replace Algorithmic Scoring"
  - Requirement - Current Implementation (to remove):
    - File: `backend/app/services/scheduler.py:ingest_posts_job()`
    - Formula: `worthiness_score = relevance * 0.4 + quality * 0.4 + recency * 0.2`
    - Relevance: keyword matching count
    - Quality: text length / engagement metrics
    - Recency: time decay function
  - Requirement - New Implementation:
    - Call new function `calculate_worthiness_score_ai(post_text: str, category: str) -> float`
    - Returns float between 0.0 and 1.0

- V-58: Requirements - New AI Prompt for Worthiness Scoring
  - Work package: Feature Requirements - AI-Based Worthiness Scoring
  - Source: New Brief §4.6.2
  - Anchor quote: "New AI Prompt: Worthiness Scoring"
  - Requirement:
    - Prompt Name: "Worthiness Scoring"
    - Default Prompt Text:
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
    - Model: gpt-4-turbo
    - Temperature: 0.3 (low for consistency)
    - Max Tokens: 10

- V-59: Requirements - API Call Logic for Worthiness
  - Work package: Feature Requirements - AI-Based Worthiness Scoring
  - Source: New Brief §4.6.2
  - Anchor quote: "API Call Logic"
  - Requirement:
    - Located in `backend/app/services/openai_client.py`
    - New function: `calculate_worthiness_score_ai(post_text: str, category: str) -> float`
    - Error handling: if API call fails or returns invalid number, default to 0.5 (neutral score)
    - Logging: log score with post_id for debugging

- V-60: Requirements - Integration into Ingestion Flow (Worthiness)
  - Work package: Feature Requirements - AI-Based Worthiness Scoring
  - Source: New Brief §4.6.2
  - Anchor quote: "Integration into Ingestion Flow"
  - Requirement:
    - Called during `ingest_posts_job()` after categorization, before saving to database
    - Execution order per post:
      1. Categorize → get category
      2. Calculate worthiness score (new AI call) → get score
      3. Generate title → get title
      4. Generate summary → get summary
      5. Save post to database with score

- V-61: Requirements - Prompt Editability (Worthiness)
  - Work package: Feature Requirements - AI-Based Worthiness Scoring
  - Source: New Brief §4.6.2
  - Anchor quote: "Prompt Editability"
  - Requirement:
    - Stored in `system_settings` as `prompt_worthiness_text`, `prompt_worthiness_model`, etc.
    - Editable via Feature 4.4 (Prompt Management UI)
    - Exportable via Feature 4.5

- V-62: Technical Details - AI Worthiness Scoring
  - Work package: Feature Requirements - AI-Based Worthiness Scoring
  - Source: New Brief §4.6.3
  - Anchor quote: "Backend Changes"
  - Requirement - Backend Changes:
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
  - Requirement - Cost Impact:
    - Current: 0 additional API calls (algorithmic)
    - New: +1 API call per post ingested
    - Estimated: 100 posts/day × 30 days = 3,000 calls/month
    - Cost per call: ~$0.0002 (10 input tokens + 5 output tokens)
    - Additional monthly cost: ~$0.60

- V-63: Acceptance Criteria - AI Worthiness Scoring
  - Work package: Feature Requirements - AI-Based Worthiness Scoring
  - Source: New Brief §4.6.4
  - Anchor quote: "Algorithmic scoring code removed from `scheduler.py`"
  - Acceptance Criteria:
    - Algorithmic scoring code removed from `scheduler.py`
    - New AI prompt returns valid float between 0.0 and 1.0
    - Score is saved to `posts.worthiness_score` field correctly
    - If API call fails, default score of 0.5 is used (no crash)
    - Prompt appears in Feature 4.4 (Prompt Management UI) and is editable
    - Changing prompt in UI affects next ingestion immediately
    - Posts are still filtered by worthiness threshold correctly in UI

- V-64: Risk Assessment - AI Worthiness Scoring
  - Work package: Feature Requirements - AI-Based Worthiness Scoring
  - Source: New Brief §4.6.5
  - Anchor quote: "Risk: 5/10 - Medium-high risk"
  - Requirement:
    - Risk: 5/10 - Medium-high risk
    - Concerns:
      - AI prompt might return invalid output (not a number) → needs robust error handling
      - AI scoring might be less consistent than algorithmic approach → needs monitoring
      - Additional API costs and latency during ingestion
      - Failure of this API call could block entire ingestion → needs fallback

### 4.7 AI-Based Duplicate Detection (High Priority)

- V-65: User Story - AI-Based Duplicate Detection
  - Work package: Feature Requirements - AI-Based Duplicate Detection
  - Source: New Brief §4.7.1
  - Anchor quote: "I need duplicate detection to use an AI prompt"
  - Requirement:
    - As a content manager, I need duplicate detection to use an AI prompt instead of TF-IDF similarity so that I can catch semantic duplicates (same story, different wording) and adjust detection sensitivity without code changes

- V-66: Requirements - Replace TF-IDF Algorithm
  - Work package: Feature Requirements - AI-Based Duplicate Detection
  - Source: New Brief §4.7.2
  - Anchor quote: "Replace TF-IDF Algorithm"
  - Requirement - Current Implementation (to remove):
    - File: `backend/app/services/duplicate_detection.py`
    - Method: TF-IDF vectorization + cosine similarity
    - Threshold: 0.85 (hardcoded)
    - Logic: if similarity > threshold, assign to same `group_id`
  - Requirement - New Implementation:
    - Call new function `check_duplicate_ai(post_text: str, existing_post_text: str) -> bool`
    - Returns boolean: `True` if duplicate, `False` if distinct

- V-67: Requirements - New AI Prompt for Duplicate Detection
  - Work package: Feature Requirements - AI-Based Duplicate Detection
  - Source: New Brief §4.7.2
  - Anchor quote: "New AI Prompt: Duplicate Detection"
  - Requirement:
    - Prompt Name: "Duplicate Detection"
    - Default Prompt Text:
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
    - Model: gpt-4-turbo
    - Temperature: 0.2 (very low for consistency)
    - Max Tokens: 5

- V-68: Requirements - Deduplication Logic
  - Work package: Feature Requirements - AI-Based Duplicate Detection
  - Source: New Brief §4.7.2
  - Anchor quote: "Deduplication Logic"
  - Requirement:
    - During ingestion, for each new post:
      1. Compute SHA-256 hash (exact duplicate check, unchanged)
      2. If hash exists → assign existing `group_id`, skip AI call
      3. If hash new → fetch recent posts from same category (last 24 hours, max 50 posts)
      4. For each existing post, call `check_duplicate_ai(new_post, existing_post)`
      5. If any AI call returns "YES" → assign existing post's `group_id`
      6. If all AI calls return "NO" → generate new `group_id` (UUID)

- V-69: Requirements - Performance Optimization (Duplicate Detection)
  - Work package: Feature Requirements - AI-Based Duplicate Detection
  - Source: New Brief §4.7.2
  - Anchor quote: "Performance Optimization"
  - Requirement:
    - Limit comparison to 50 most recent posts (or configurable limit in settings: `duplicate_check_limit`)
    - Only compare within same category (reduces API calls)
    - Cache results per post pair for session (avoid redundant calls)

- V-70: Requirements - Fallback Behavior (Duplicate Detection)
  - Work package: Feature Requirements - AI-Based Duplicate Detection
  - Source: New Brief §4.7.2
  - Anchor quote: "Fallback Behavior"
  - Requirement:
    - If API call fails: log error and treat as "NO" (not duplicate) → default to creating new group
    - Prevents blocking ingestion due to API issues

- V-71: Requirements - Prompt Editability (Duplicate Detection)
  - Work package: Feature Requirements - AI-Based Duplicate Detection
  - Source: New Brief §4.7.2
  - Anchor quote: "Prompt Editability"
  - Requirement:
    - Stored in `system_settings` as `prompt_duplicate_text`, `prompt_duplicate_model`, etc.
    - Editable via Feature 4.4
    - Exportable via Feature 4.5

- V-72: Technical Details - AI Duplicate Detection
  - Work package: Feature Requirements - AI-Based Duplicate Detection
  - Source: New Brief §4.7.3
  - Anchor quote: "Backend Changes"
  - Requirement - Backend Changes:
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
  - Requirement - Cost Impact:
    - Current: 0 additional API calls (TF-IDF)
    - New: up to 50 API calls per post ingested (worst case: compare with 50 existing posts)
    - Average case: ~10 comparisons per post (most posts match earlier in the loop)
    - Estimated: 100 posts/day × 10 comparisons/post × 30 days = 30,000 calls/month
    - Cost per call: ~$0.002 (150 input tokens average)
    - Additional monthly cost: ~$60

- V-73: Acceptance Criteria - AI Duplicate Detection
  - Work package: Feature Requirements - AI-Based Duplicate Detection
  - Source: New Brief §4.7.4
  - Anchor quote: "TF-IDF code removed from `duplicate_detection.py`"
  - Acceptance Criteria:
    - TF-IDF code removed from `duplicate_detection.py`
    - New AI prompt returns "YES" or "NO" correctly
    - Duplicate posts assigned to same `group_id`
    - Distinct posts assigned to different `group_id`
    - Comparison limited to 50 most recent posts (performance)
    - Comparison only within same category (performance)
    - If API call fails, ingestion continues (not blocked)
    - Prompt appears in Feature 4.4 and is editable
    - Changing prompt affects next ingestion immediately

- V-74: Risk Assessment - AI Duplicate Detection
  - Work package: Feature Requirements - AI-Based Duplicate Detection
  - Source: New Brief §4.7.5
  - Anchor quote: "Risk: 7/10 - High risk"
  - Requirement:
    - Risk: 7/10 - High risk
    - Concerns:
      - Very high API call volume (50 calls per post in worst case) → significant cost increase
      - AI might be inconsistent in duplicate detection → false positives/negatives
      - Latency: each post ingestion now takes significantly longer (blocking)
      - API rate limits might be hit during high-volume ingestion
      - Failure could result in many duplicate posts being stored
      - Mitigation: aggressive caching, comparison limit, fallback to TF-IDF as safety net

---

## Work Package: 5. Implementation Strategy

- V-75: Phase 1 - Foundation (Data Safety)
  - Work package: Implementation Strategy
  - Source: New Brief §5.1
  - Anchor quote: "Phase 1: Foundation (Data Safety)"
  - Requirement:
    - Priority: Critical
    - Timeline: Week 1
    - Features:
      1. Feature 4.1: Database Backup & Restore Scripts
      2. Feature 4.2: List Export & Import
      3. Feature 4.3: Disable Automatic Fetch Toggle
    - Rationale: Establish data safety mechanisms before making architectural changes

- V-76: Phase 2 - Configuration Transparency
  - Work package: Implementation Strategy
  - Source: New Brief §5.2
  - Anchor quote: "Phase 2: Configuration Transparency"
  - Requirement:
    - Priority: High
    - Timeline: Week 2-3
    - Features:
      4. Feature 4.4: Prompt Management UI
         - Migrate existing 4 prompts to database
         - Build UI components
      5. Feature 4.5: Prompt Export & Import
    - Rationale: Make prompts visible and editable before adding new AI-based features

- V-77: Phase 3 - AI-First Architecture
  - Work package: Implementation Strategy
  - Source: New Brief §5.3
  - Anchor quote: "Phase 3: AI-First Architecture"
  - Requirement:
    - Priority: High
    - Timeline: Week 3-4
    - Features:
      6. Feature 4.6: AI-Based Worthiness Scoring
      7. Feature 4.7: AI-Based Duplicate Detection
    - Rationale: These are high-risk, high-value changes that require careful monitoring and tuning

- V-78: Phase 4 - Monitoring & Optimization
  - Work package: Implementation Strategy
  - Source: New Brief §5.4
  - Anchor quote: "Phase 4: Monitoring & Optimization"
  - Requirement:
    - Priority: Medium
    - Timeline: Week 4-5
    - Activities:
      - Add cost tracking dashboard (log API call counts per prompt type)
      - Add performance monitoring (API call latency)
      - A/B testing framework for prompts
      - Tune Feature 4.7 (duplicate detection) based on false positive/negative rates

---

## Work Package: 6. Technical Considerations

- V-79: Database Schema Changes
  - Work package: Technical Considerations
  - Source: New Brief §6.1
  - Anchor quote: "Database Schema Changes"
  - Requirement - New Table (optional):
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
    - Alternative: Continue using `system_settings` table with key-value pairs (simpler, no migration needed)
  - Requirement - New Setting Keys (if using `system_settings` approach):
    - `auto_fetch_enabled` (boolean)
    - `duplicate_check_limit` (integer)
    - `prompt_[name]_text`, `prompt_[name]_model`, `prompt_[name]_temperature`, `prompt_[name]_max_tokens` (6 prompts × 4 keys = 24 new keys)

- V-80: API Design
  - Work package: Technical Considerations
  - Source: New Brief §6.2
  - Anchor quote: "API Design"
  - Requirement - New Endpoints:
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

- V-81: Cost Impact Analysis
  - Work package: Technical Considerations
  - Source: New Brief §6.3
  - Anchor quote: "Cost Impact Analysis"
  - Requirement - Cost Breakdown:
    | Component | Current | v2.0 | Change |
    |-----------|---------|------|--------|
    | Post Categorization | $0.0002 × 3000 = $0.60 | $0.60 | - |
    | Title Generation | $0.0008 × 3000 = $2.40 | $2.40 | - |
    | Summary Generation | $0.0012 × 3000 = $3.60 | $3.60 | - |
    | Worthiness Scoring | $0 (algorithmic) | $0.0002 × 3000 = $0.60 | **+$0.60** |
    | Duplicate Detection | $0 (TF-IDF) | $0.002 × 30,000 = $60 | **+$60** |
    | Article Generation | $0.01 × 20 = $0.20 | $0.20 | - |
    | **Total** | **~$7/month** | **~$68/month** | **+$61/month** |
  - Requirement - Optimization Options (to reduce cost):
    1. Use gpt-3.5-turbo for duplicate detection ($0.0005 per call) → saves $45/month
    2. Reduce duplicate check limit from 50 to 20 → saves $24/month
    3. Only run duplicate check on high-worthiness posts (>0.7) → saves $30-40/month
  - Requirement - Revised Estimate with Optimizations:
    - ~$20-25/month

---

## Work Package: 7. Success Metrics

- V-82: Data Safety Metrics
  - Work package: Success Metrics
  - Source: New Brief §7.1
  - Anchor quote: "Data Safety Metrics"
  - Requirement:
    - Backup Success Rate: 100% of scheduled backups complete successfully
    - Restore Test: Successfully restore from backup at least once per month
    - Zero Data Loss Events: No unrecoverable data loss incidents

- V-83: Configuration Portability Metrics
  - Work package: Success Metrics
  - Source: New Brief §7.2
  - Anchor quote: "Configuration Portability Metrics"
  - Requirement:
    - Export/Import Success Rate: 100% of valid JSON imports succeed
    - Configuration Reuse: Dev → Staging → Production migration with zero manual re-entry

- V-84: AI Tuning Metrics
  - Work package: Success Metrics
  - Source: New Brief §7.3
  - Anchor quote: "AI Tuning Metrics"
  - Requirement:
    - Prompt Iteration Velocity: Time from "idea" to "deployed prompt" < 5 minutes (no code deployment)
    - Worthiness Accuracy: % of high-scoring posts (>0.8) that users actually generate articles from
    - Duplicate Detection Accuracy:
      - False Positive Rate: < 5% (distinct stories marked as duplicates)
      - False Negative Rate: < 10% (duplicate stories not caught)

- V-85: Cost Metrics
  - Work package: Success Metrics
  - Source: New Brief §7.4
  - Anchor quote: "Cost Metrics"
  - Requirement:
    - Monthly AI Costs: Stay under $25/month with optimizations
    - Cost Per Post Ingested: < $0.01 per post

---

## Work Package: 8. Out of Scope (v2.0)

- V-86: Out of Scope Items
  - Work package: Out of Scope
  - Source: New Brief §8
  - Anchor quote: "The following are explicitly **not** included in v2.0"
  - Requirement - Items explicitly NOT included in v2.0:
    1. Automated Configuration Sync: No real-time sync between dev/staging/production environments
    2. Prompt Version History: No built-in versioning or rollback for prompt changes (user must manually export before changing)
    3. A/B Testing Framework: No built-in UI for running multiple prompt variants simultaneously
    4. Cost Dashboard: No real-time cost tracking UI (user must monitor OpenAI dashboard)
    5. Advanced Duplicate Detection: No clustering or bulk deduplication of existing posts
    6. Prompt Templates Library: No shared marketplace or library of community prompts
    7. Scheduled Exports: No automated daily/weekly exports (only manual)
    8. Change Approval Workflow: No review/approve flow for prompt changes (assumes single admin)

---

## Work Package: 9. Migration Path from v1.1 to v2.0

- V-87: Migration Step 1 - Backup Current State
  - Work package: Migration Path
  - Source: New Brief §9.1
  - Anchor quote: "Step 1: Backup Current State"
  - Requirement:
    ```bash
    ./backup_db.sh
    ./export_lists.sh  # manual or via UI
    ```

- V-88: Migration Step 2 - Deploy v2.0 Code
  - Work package: Migration Path
  - Source: New Brief §9.2
  - Anchor quote: "Step 2: Deploy v2.0 Code"
  - Requirement:
    ```bash
    git pull origin main
    docker-compose build
    docker-compose up -d
    ```

- V-89: Migration Step 3 - Migrate Prompts to Database
  - Work package: Migration Path
  - Source: New Brief §9.3
  - Anchor quote: "Step 3: Migrate Prompts to Database"
  - Requirement:
    - On first startup, application should auto-seed `system_settings` with default prompts (from hardcoded values)
    - No manual action required

- V-90: Migration Step 4 - Verify Functionality
  - Work package: Migration Path
  - Source: New Brief §9.4
  - Anchor quote: "Step 4: Verify Functionality"
  - Requirement:
    - Test prompt editing in UI
    - Run one manual fetch cycle: verify all 6 AI prompts execute correctly
    - Check logs for errors

- V-91: Migration Step 5 - Optimize for Cost
  - Work package: Migration Path
  - Source: New Brief §9.5
  - Anchor quote: "Step 5: Optimize for Cost"
  - Requirement:
    - Tune duplicate detection prompt to be more selective
    - Reduce `duplicate_check_limit` from 50 to 20
    - Consider switching duplicate detection to gpt-3.5-turbo

---

## Work Package: 10. Open Questions

- V-92: Open Questions
  - Work package: Open Questions
  - Source: New Brief §10
  - Anchor quote: "Duplicate Detection Performance"
  - Requirement - Questions requiring decisions:
    1. Duplicate Detection Performance: Should we add a "Skip duplicate detection" toggle for users who prioritize speed over deduplication?
    2. Prompt Sharing: Should we add a "Share Prompt" feature to export a single prompt as shareable link/JSON?
    3. Cost Alerts: Should we add a setting to pause automatic fetching if estimated monthly cost exceeds threshold?
    4. Rollback Safety: Should prompt edits be logged to a separate `prompt_history` table for audit trail?
    5. Batch Operations: Should we add "Apply to all categories" when updating prompts?

---

## Work Package: 11. Appendix: Current System Architecture

- V-93: AI Prompt Execution Points
  - Work package: Appendix
  - Source: New Brief §11.1
  - Anchor quote: "AI Prompt Execution Points (from PROMPTS_REFERENCE.md)"
  - Requirement - Ingestion Flow (every 30 minutes):
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
  - Requirement - User-Triggered Flow:
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

## Work Package: 12. Document History

- V-94: Document History
  - Work package: Document History
  - Source: New Brief §12
  - Anchor quote: "Document History"
  - Requirement:
    | Version | Date | Author | Changes |
    |---------|------|--------|---------|
    | 1.0 | 2026-01-23 | System | Initial v2.0 proposal based on user requirements |

---

**End of Polished Brief**

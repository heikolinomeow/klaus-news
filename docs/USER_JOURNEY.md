# User Journey - Klaus News

## Last Updated
2026-02-13

## What Changed
This journey reflects the current product behavior (not the older dark-mode or post-first flow):
- Login is required for main pages.
- Workflow is group-based, not single-post based.
- UI is newspaper-style (light, print-inspired theme).
- Cooking/Serving rely on group research + group articles.

## 1. Entry and Authentication

### 1.1 Login
1. User opens app.
2. If unauthenticated, protected routes redirect to `/login`.
3. User signs in with configured credentials.
4. JWT token is stored client-side and attached to API calls.

### 1.2 Main Navigation
After login, top nav provides:
- Home (`/`)
- Cooking (`/cooking`)
- Serving (`/serving`)
- Pantry (`/pantry`)

Additional pages:
- Settings (`/kitchen/system`)
- Architecture (`/architecture`, informational)

## 2. Home Journey (Triage NEW Stories)

### 2.1 What User Sees
- Category bar with counts.
- Ingestion progress bar when jobs run.
- Left filter/control sidebar.
- Story tiles (`groups`) in newspaper layout.
- Story tiles display an 'Article' badge when content originates from X articles (post has article attached or quotes a post with article).

### 2.2 Core Actions
- Filter by content type (All/Posts/Articles), category, worthiness threshold, source count.
- Sort by worthiness, source volume, newest.
- Toggle auto-fetch, trigger manual ingestion, tune ingestion settings.
- Open story for work (`Read More` equivalent) -> group moves to `COOKING` and user goes to Cooking.
- Dismiss story -> group archived.

### 2.3 Visibility Rules
- Home only shows groups in `NEW` state.
- Groups in `COOKING`, `REVIEW`, `PUBLISHED` are hidden from Home.

## 3. Cooking Journey (Research + Draft)

### 3.1 Group Selection
- Cooking lists groups currently in `COOKING`.
- User selects a group to load source posts, latest research, and existing drafts.
- User can remove group back to `NEW` from this page.

### 3.2 Research Step
- Choose mode: `quick`, `agentic`, or `deep`.
- Optionally adjust session research prompt.
- Run research and review output + sources.

### 3.3 Draft Generation
- Choose article style (`very_short`, `short`, `medium`, `long`, `custom`).
- Generate article from posts + optional research context.
- Multiple drafts per group are supported (article list/navigation).

### 3.4 Editing and Refinement
- Open article view.
- Manual edit via WYSIWYG editor (title, preview, content).
- AI refine with instruction prompt.
- Copy to clipboard.
- Optional direct send to Teams from Cooking.

### 3.5 Workflow Transition
- On generate, frontend transitions group from `COOKING` to `REVIEW` and navigates to Serving.

## 4. Serving Journey (Final Review + Publish)

### 4.1 Group Selection
- Serving shows groups in `REVIEW` state.
- User selects a group to review unsent article drafts.

### 4.2 Review Controls
- Switch between article variants.
- Edit full article and title.
- Edit Teams preview text with 280-char guidance.
- AI refine from serving screen.

### 4.3 Publish Actions
- Send to Teams (select channel in modal).
- Mark as published without Teams.
- Move back to Cooking if more work is needed.

### 4.4 Result
- Successful Teams send or explicit publish removes group from active serving queue (`PUBLISHED`).

## 5. Pantry Journey (Operations and Logs)

### 5.1 Debug Snapshot
Pantry surfaces operational state in one view:
- Scheduler paused state
- Next ingestion run
- Auto-fetch and fetch settings
- Enabled list count
- Ingestion progress and last ingestion log

### 5.2 Logs Exploration
- Filter logs by level, category, and time window.
- Inspect detailed log record modal.
- Paginate/load more results.
- Clean up old logs with retention days input.

### 5.3 Filtered-Out Visibility
A dedicated tab shows posts filtered for low worthiness, including recovered title/summary context where possible.

## 6. Settings Journey (Configuration)

### 6.1 Data Sources
- Manage X lists (create/test/enable/disable/delete).
- See list status and timestamps.

### 6.2 Content Controls
- Edit prompt templates (worthiness, duplicate detection, categorization, research).
- Tune duplicate threshold.
- Manage categories (descriptions, add categories, view mismatch logs).
- Edit article style prompts.

### 6.3 System Controls
- Toggle auto-fetch.
- Adjust ingestion interval and posts per fetch.
- Trigger manual ingestion.
- Configure archival age/time and run manual archive.
- View Teams channel config status and test connectivity.

## 7. End-To-End Happy Path
1. Login.
2. Home: choose a high-value NEW group.
3. Cooking: run research and generate draft.
4. Serving: refine/edit and send to Teams.
5. Group transitions to `PUBLISHED` and leaves active queues.

## 8. Practical Edge Cases
- No groups in `COOKING`: Cooking shows guidance to select from Home first.
- No groups in `REVIEW`: Serving explains nothing is ready yet.
- Missing Teams channels: send button disabled and settings guidance shown.
- API/auth failure: user is redirected to login on 401.

## 9. States Cheat Sheet
- `NEW`: visible in Home
- `COOKING`: visible in Cooking
- `REVIEW`: visible in Serving
- `PUBLISHED`: completed (not in active workflow views)

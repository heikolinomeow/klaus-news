# Bug Report (Structured)

## Source
- Source-of-truth: docs/bug-report.md
- Docs used:
  - docs/USER_JOURNEY.md: Describes Cooking workflow, TeamsChannelModal, article generation flow
  - docs/TECH_OVERVIEW.md: Confirms GroupArticle model, Teams API endpoints, database schema

## Summary
- One sentence: Article View on Cooking page is broken: content not rendered with markdown, CSS styles missing, and Teams integration queries wrong database table.
- Severity: **blocker** - The article generation workflow is the core value proposition; article view is completely non-functional at final step.

## Environment
- App/runtime: React 18 + FastAPI (Python 3.11+) in Docker
- OS: TBD (Docker containerized)
- Node version: TBD (frontend container)
- Browser: TBD (any modern browser)
- GPU/renderer (if relevant): N/A
- DB: PostgreSQL 15
- Flags/env vars involved: TEAMS_CHANNELS env var for channel configuration

## Known-Good vs Known-Bad States
- Known-Good (works when): Research view renders markdown correctly (line 570 uses `renderMarkdown()`)
- Known-Bad (fails when): Article View displays content - content is raw text, no styling, Teams button fails
- Smallest known scope where it fails: Article View section in Cooking.tsx (lines 384-419)

## Reproduction Steps (deterministic)
1) Start the application (`docker-compose up`)
2) Navigate to Home page at `http://localhost:3000`
3) Select a group and click "Start Cooking" → navigates to `/cooking`
4) In Cooking page, run Research (any mode)
5) Generate Article (any style)
6) Observe Article View:
   - BUG 1: Article content displays as raw text (no markdown formatting)
   - BUG 2: Layout is broken with no proper styling (white background, no spacing)
7) Click "Send to Teams" button
   - BUG 3: Either shows "Article not found" error or sends wrong content

## Expected vs Actual
- Expected:
  - Article content renders with markdown (headers, bold, lists, links styled)
  - Article view has proper layout, spacing, dark theme styling
  - "Send to Teams" sends the generated article content to Teams channel
- Actual:
  - Article content displays as raw unformatted text (line 387: `{article.content}`)
  - All CSS classes are undefined (0 matches in App.css for article-view classes)
  - "Send to Teams" queries Group/Post tables, never queries `group_articles` table

## Do Not Re-test (Confirmed Negatives / Ruled Out)
None provided.

## Attempt History (Experiments and Outcomes)
None provided.

## Current Hypothesis / Suspects (from bug-report)
- Hypothesis: Three distinct code bugs causing the Article View to be broken
- Suspects:
  1) `Cooking.tsx:387` - `{article.content}` renders raw text instead of using `renderMarkdown()`
  2) `App.css` - Six CSS classes used by Article View are completely missing
  3) `teams_service.py:90-151` - `send_to_teams()` queries Group/Post tables but never queries `group_articles` table

## Scope and Blast Radius
- Affected surfaces (USER_JOURNEY naming): Cooking Page → Article View, Send to Teams Modal
- Affected API routes (repo-verified):
  - `POST /api/teams/send` → backend/app/api/teams.py → backend/app/services/teams_service.py
- Affected data entities (repo-verified):
  - `GroupArticle` (backend/app/models/group_articles.py) - not queried by teams_service
  - `Group` (backend/app/models/group.py) - incorrectly queried instead
  - `Post` (backend/app/models/post.py) - incorrectly queried instead
- What is NOT affected (explicit, from bug-report):
  - Research View (markdown rendering works there)
  - Home page post browsing
  - Settings page

## Repo Mapping (paths must be repo-verified)
- Entry point(s): frontend/src/pages/Cooking.tsx
- Route/page/screen: `/cooking` route
- Components involved:
  - frontend/src/pages/Cooking.tsx:384-419 - Article View section with missing styles and raw content
  - frontend/src/components/TeamsChannelModal.tsx - Modal that triggers send
- Rendering/engine layers (if relevant):
  - frontend/src/pages/Cooking.tsx:17-55 - `renderMarkdown()` function (exists but not used for article)
- Backend services:
  - backend/app/services/teams_service.py:90-151 - `send_to_teams()` queries wrong tables
  - backend/app/api/teams.py - API endpoint that calls teams_service
- Models:
  - backend/app/models/group_articles.py - GroupArticle model (should be queried but is not)
  - backend/app/models/group.py - Group model (incorrectly queried)
  - backend/app/models/post.py - Post model (incorrectly queried)
- Stylesheets:
  - frontend/src/App.css - Missing CSS classes for article view

## Signals and Evidence
- Error messages (verbatim if present):
  - "Article not found" - when article_id doesn't match Group.id or Post.id
  - Or: wrong content sent if article_id happens to match a Group/Post ID
- Logs to look for (where): Backend logs for teams_service.py queries
- Screenshots/video mentioned in bug-report: yes (user reported article shows only title, no content)
- Telemetry/metrics (if any): None

## Constraints (from bug-report)
- Must not break: Research View markdown rendering (currently works)
- Must preserve behavior: renderMarkdown() function should remain unchanged
- Hard exclusions: None specified

## Acceptance Criteria (human-checkable)
- AC-1: Article content displays with proper markdown formatting (headers, bold, italic, lists, links render correctly)
- AC-2: Article view has proper layout and spacing with dark theme styling (background, borders, padding)
- AC-3: "Send to Teams" successfully sends the generated article content (from group_articles table) to Teams channel
- AC-4: Teams card shows correct article title and content summary
- Regression guards:
  - RG-1: Research output still renders markdown correctly (line 570 unchanged)
  - RG-2: Existing CSS styles for other components remain unchanged
  - RG-3: Teams API still validates channel exists before sending

## Open Questions
- Needed: no

## Chat Gate (MANDATORY)

```txt
GATE: bf-1
Written: docs/bugfix/bug_report_structured.md
Questions needed: no
```

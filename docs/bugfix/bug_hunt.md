# Bug Hunt (Paranoid)

## Re-statement of the Bug (from structured report)
The Article View on the Cooking page is completely non-functional due to three distinct bugs:
1. Article content renders as raw unformatted text instead of markdown
2. Article View CSS classes are entirely missing from the stylesheet
3. "Send to Teams" queries the wrong database tables and fails with "Article not found"

This is a **blocker** because the article generation workflow is the core value proposition of the application - users cannot view, style, or distribute the articles they generate.

## Pinned Constraints (from structured report)
- **Known-Good states:** Research view renders markdown correctly (Cooking.tsx line 570 uses `renderMarkdown()` with `dangerouslySetInnerHTML`)
- **Known-Bad states:** Article View displays content as raw text, no styling, Teams button fails with "Article not found"
- **Do Not Re-test (ruled out):** None provided
- **Attempt History (already tried):** None provided

## Repro Checkpoints (where to instrument mentally)
- **CP-1:** Article content renders at Cooking.tsx:387 - diverges from expected (raw text vs markdown)
- **CP-2:** CSS classes applied at Cooking.tsx:384-412 - diverges from expected (no styles applied)
- **CP-3:** Teams API called at Cooking.tsx:285 with `article.id` - trace to backend
- **CP-4:** Backend receives `article_id` at teams_service.py:90 - check what table is queried
- **CP-5:** Database query at teams_service.py:115 and 137 - query goes to wrong tables

## Hypotheses (exhaustive list)

### H-1: Article content rendered without markdown conversion
- **Status:** ACTIVE
- **Likelihood:** high (confirmed)
- **Evidence:**
  - File(s): `frontend/src/pages/Cooking.tsx`
  - Anchor(s):
    - Line 387: `<div className="article-text">{article.content}</div>` (renders raw)
    - Line 570: `dangerouslySetInnerHTML={{ __html: renderMarkdown(research.edited_output || research.original_output) }}` (renders markdown)
- **Failure mechanism:** Article content bypasses the `renderMarkdown()` function that exists on lines 17-55 of the same file. Content is interpolated directly as text, not converted to HTML.
- **Disproof test:** Add `console.log(typeof article.content, article.content.substring(0,100))` at line 386 to confirm content is plain string with markdown syntax
- **Related side effects:** Any markdown in article (headers, bold, links) will show as literal characters (`# Title` instead of `<h1>Title</h1>`)

### H-2: Article View CSS classes completely missing from stylesheet
- **Status:** ACTIVE
- **Likelihood:** high (confirmed)
- **Evidence:**
  - File(s): `frontend/src/App.css`, `frontend/src/pages/Cooking.tsx`
  - Anchor(s):
    - Grep for `cooking-article|cooking-refine|article-text` in App.css: "No matches found"
    - Line 384: `className="cooking-article-view"` - NO CSS DEFINITION
    - Line 385: `className="cooking-article-content"` - NO CSS DEFINITION
    - Line 387: `className="article-text"` - NO CSS DEFINITION
    - Line 390: `className="cooking-refine-section"` - NO CSS DEFINITION
    - Line 396: `className="cooking-refine-input"` - NO CSS DEFINITION
    - Line 412: `className="cooking-article-actions"` - NO CSS DEFINITION
- **Failure mechanism:** CSS classes are used in JSX but never defined in the stylesheet. Browser applies no styling, resulting in unstyled white-background layout.
- **Disproof test:** Browser DevTools → Elements → Select `.article-text` element → Computed tab shows no matched rules
- **Related side effects:** White background, no spacing, no dark theme, broken layout, illegible content

### H-3: teams_service.py queries wrong database tables
- **Status:** ACTIVE
- **Likelihood:** high (confirmed)
- **Evidence:**
  - File(s): `backend/app/services/teams_service.py`
  - Anchor(s):
    - Line 95-97: `from sqlalchemy import select` + `from app.models.post import Post` + `from app.models.group import Group` (imports Post/Group, NOT GroupArticle)
    - Line 115: `select(Group).where(Group.id == int(article_id))` (queries groups table)
    - Line 137: `select(Post).where(Post.id == int(article_id))` (queries posts table)
    - Line 90: `async def send_to_teams(article_id: str, channel_name: str, db) -> dict:` (receives article_id)
- **Failure mechanism:** Frontend passes `GroupArticle.id` but backend queries `Group` and `Post` tables. Since IDs don't match (different tables), query returns None → "Article not found" error.
- **Disproof test:** Add logging at line 112: `logger.info(f"Looking for article_id={article_id} in Group table")` - will show mismatched lookup
- **Related side effects:** Even if ID coincidentally matches (e.g., article_id=1 exists in both), wrong content would be sent (Post.ai_summary instead of GroupArticle.content)

### H-4: Two incompatible Article models in codebase
- **Status:** ACTIVE
- **Likelihood:** high (confirmed)
- **Evidence:**
  - File(s): `backend/app/models/article.py`, `backend/app/models/group_articles.py`
  - Anchor(s):
    - article.py line 10: `__tablename__ = "articles"` with `posted_to_teams` field (line 26)
    - group_articles.py line 9: `__tablename__ = "group_articles"` WITHOUT `posted_to_teams` field
- **Failure mechanism:** Old `Article` model (single-post based) coexists with new `GroupArticle` model (group-based). `teams_service.py` was written for old model but Cooking page uses new model. Schema mismatch causes lookups to fail.
- **Disproof test:** Run `SELECT * FROM articles; SELECT * FROM group_articles;` to see both tables exist independently
- **Related side effects:** No way to track if GroupArticle was sent to Teams (missing `posted_to_teams` column); potential for duplicate sends

### H-5: Frontend passes GroupArticle.id but backend expects different ID type
- **Status:** ACTIVE
- **Likelihood:** high
- **Evidence:**
  - File(s): `frontend/src/pages/Cooking.tsx`, `frontend/src/services/api.ts`
  - Anchor(s):
    - Cooking.tsx line 285: `await teamsApi.sendToTeams(String(article.id), channelName)`
    - api.ts line 140-143: `sendToTeams: (articleId: string, channelName: string) => apiClient.post<...>('/api/teams/send', { articleId, channelName })`
- **Failure mechanism:** `article` state is typed as `GroupArticle` (see line 77). Its `id` field is `GroupArticle.id`. Backend never queries `group_articles` table.
- **Disproof test:** Add `console.log('Sending article.id:', article.id, 'article:', article)` before line 285 - will show GroupArticle properties
- **Related side effects:** API silently fails with 200 status but `success: false`

### H-6: renderMarkdown function exists but not used for articles
- **Status:** ACTIVE
- **Likelihood:** high (confirmed)
- **Evidence:**
  - File(s): `frontend/src/pages/Cooking.tsx`
  - Anchor(s):
    - Line 18: `function renderMarkdown(text: string): string {` (function exists)
    - Line 570: Only usage is for research: `__html: renderMarkdown(research.edited_output || research.original_output)`
    - Line 387: Article uses plain interpolation: `{article.content}`
- **Failure mechanism:** Developer implemented renderMarkdown for research but forgot to use it for article content.
- **Disproof test:** Search codebase for `renderMarkdown(article` - will return 0 matches
- **Related side effects:** Inconsistent UX - research view looks good, article view looks broken

### H-7: GroupArticle model missing posted_to_teams tracking field
- **Status:** ACTIVE
- **Likelihood:** medium
- **Evidence:**
  - File(s): `backend/app/models/group_articles.py`, `backend/app/models/article.py`
  - Anchor(s):
    - article.py line 26: `posted_to_teams = Column(DateTime)` (old model has it)
    - group_articles.py: No `posted_to_teams` field defined (grep returns "No matches found")
- **Failure mechanism:** Even if Teams send is fixed, there's no field to track whether GroupArticle was sent, enabling duplicate sends and preventing status display in UI.
- **Disproof test:** `\d group_articles` in psql - column list won't include posted_to_teams
- **Related side effects:** Cannot show "Already sent to Teams" badge, cannot prevent duplicate sends

### H-8: Inconsistent data flow between old and new article systems
- **Status:** ACTIVE
- **Likelihood:** medium
- **Evidence:**
  - File(s): `frontend/src/services/api.ts`
  - Anchor(s):
    - Line 24-30: `articlesApi` operates on `/api/articles/` endpoint (old Article model)
    - Line 115-122: `groupArticlesApi` operates on `/api/groups/{id}/article/` endpoint (new GroupArticle model)
- **Failure mechanism:** Two parallel article systems exist. Frontend has both APIs but they're not interchangeable. Cooking page uses `groupArticlesApi` but Teams flow may be confused about which article type to use.
- **Disproof test:** Compare article structures returned by each API - will have different fields
- **Related side effects:** Confusion about which API to use, potential for using wrong API in future features

### H-9: Teams adaptive card uses wrong article fields
- **Status:** ACTIVE
- **Likelihood:** medium
- **Evidence:**
  - File(s): `backend/app/services/teams_service.py`
  - Anchor(s):
    - Line 51-52: `title = article.get("title", article.get("ai_title", "Untitled"))` and `summary = article.get("summary", article.get("ai_summary", ""))`
    - GroupArticle model only has `content` field, not `title` or `summary`
- **Failure mechanism:** build_adaptive_card expects `title` and `summary` keys, but GroupArticle only has `content`. Even if query is fixed, card building will use wrong/empty fields.
- **Disproof test:** Examine GroupArticle schema - has `style`, `prompt_used`, `content` but NOT `title` or `summary`
- **Related side effects:** Teams card would show "Untitled" and empty summary even with correct article data

### H-10: Article content may contain unescaped markdown that's unsafe when raw
- **Status:** ACTIVE
- **Likelihood:** low
- **Evidence:**
  - File(s): `frontend/src/pages/Cooking.tsx`
  - Anchor(s):
    - Line 387: `{article.content}` - React escapes this by default
    - Line 21-25 in renderMarkdown: Escapes `&`, `<`, `>` to HTML entities
- **Failure mechanism:** While React escapes the content preventing XSS, the visual output is garbled with literal markdown syntax showing. Not a security issue, but UX issue.
- **Disproof test:** Generate article with markdown, view shows `**bold**` literally instead of **bold**
- **Related side effects:** None beyond broken display

### H-11: Research view styling exists but article view styling doesn't
- **Status:** ACTIVE
- **Likelihood:** high (confirmed)
- **Evidence:**
  - File(s): `frontend/src/App.css`
  - Anchor(s):
    - Lines 1542-2304: Extensive `.research-*` CSS classes defined (over 60 rules)
    - Search for `.cooking-article-*`: 0 matches
- **Failure mechanism:** Developer created comprehensive styles for research view but never created equivalent styles for article view. Copy-paste omission or incomplete feature implementation.
- **Disproof test:** Compare CSS line count: `grep -c "\.research-" App.css` vs `grep -c "\.cooking-article-" App.css`
- **Related side effects:** Stark visual inconsistency between research and article views

### H-12: Article state in Cooking.tsx may be stale after Teams send
- **Status:** ACTIVE
- **Likelihood:** low
- **Evidence:**
  - File(s): `frontend/src/pages/Cooking.tsx`
  - Anchor(s):
    - Line 286-288: On success, only shows alert and closes modal - doesn't refresh article state
- **Failure mechanism:** After sending to Teams, UI doesn't update to reflect the action. If `posted_to_teams` field existed and was set, local state wouldn't reflect it.
- **Disproof test:** Send to Teams → Check if any state update occurs (it doesn't)
- **Related side effects:** User can click "Send to Teams" multiple times; no visual indication of successful send

### H-13: teamsApi.sendToTeams returns 200 with error in body
- **Status:** ACTIVE
- **Likelihood:** medium
- **Evidence:**
  - File(s): `backend/app/api/teams.py`
  - Anchor(s):
    - Line 38-40: `if not result.get("success"): pass` - returns 200 even on failure
    - Comment at line 39: `# Return 200 with success=false per spec (not HTTP error)`
- **Failure mechanism:** Frontend may not properly handle non-HTTP errors. Returns `{success: false, error: "Article not found"}` as 200 OK.
- **Disproof test:** Network tab shows 200 status but response body has `success: false`
- **Related side effects:** Error handling must check response body, not HTTP status

### H-14: Copy to clipboard gets raw markdown instead of rendered text
- **Status:** ACTIVE
- **Likelihood:** low
- **Evidence:**
  - File(s): `frontend/src/pages/Cooking.tsx`
  - Anchor(s):
    - Line 274-278: `navigator.clipboard.writeText(article.content)`
- **Failure mechanism:** Copies raw markdown to clipboard. User pastes `# Title\n\n**bold**` instead of formatted text.
- **Disproof test:** Click "Copy to Clipboard" → paste into text editor → see raw markdown
- **Related side effects:** May actually be desired behavior for some users who want markdown

### H-15: Article refinement doesn't update UI with new content visually
- **Status:** ACTIVE
- **Likelihood:** low
- **Evidence:**
  - File(s): `frontend/src/pages/Cooking.tsx`
  - Anchor(s):
    - Line 264: `setArticle(response.data)` - updates state correctly
    - Line 387: But display still uses `{article.content}` raw - even refined content shows raw
- **Failure mechanism:** Even though state updates correctly, the raw text display means refined content still appears unformatted.
- **Disproof test:** Refine article → observe content updates but still shows markdown syntax literally
- **Related side effects:** All the same as H-1

## Suspicious Code Map

- **frontend/src/pages/Cooking.tsx:387**: Article renders raw text
  - Anchor: `<div className="article-text">{article.content}</div>`
  - Should use: `<div className="article-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }} />`

- **frontend/src/pages/Cooking.tsx:384-412**: Uses 6 undefined CSS classes
  - Anchor: `className="cooking-article-view"`, `className="cooking-article-content"`, `className="article-text"`, `className="cooking-refine-section"`, `className="cooking-refine-input"`, `className="cooking-article-actions"`
  - Should have: Corresponding CSS definitions in App.css

- **backend/app/services/teams_service.py:95-97**: Wrong model imports
  - Anchor: `from app.models.post import Post` + `from app.models.group import Group`
  - Should import: `from app.models.group_articles import GroupArticle`

- **backend/app/services/teams_service.py:115**: Queries Group instead of GroupArticle
  - Anchor: `select(Group).where(Group.id == int(article_id))`
  - Should query: `select(GroupArticle).where(GroupArticle.id == int(article_id))`

- **backend/app/services/teams_service.py:51-52**: Expects wrong fields from article
  - Anchor: `title = article.get("title", article.get("ai_title", "Untitled"))` + `summary = article.get("summary", article.get("ai_summary", ""))`
  - Should use: GroupArticle fields or parse title from content

- **backend/app/models/group_articles.py**: Missing posted_to_teams field
  - Anchor: (absence of field)
  - Should have: `posted_to_teams = Column(DateTime, nullable=True)`

## Non-obvious Failure Modes Checklist

- **Race/ordering issues:** TBD - potential race if user clicks "Send to Teams" before article generation completes (button should be disabled but verify)
- **Caching/staleness:** N/A for this bug - no caching involved in article display
- **Streaming edge cases:** N/A - article content is complete before display
- **Idempotency collisions:** YES - no `posted_to_teams` tracking means duplicate Teams sends possible
- **State mismatch (client vs server):** YES - after Teams send, client state doesn't reflect server changes
- **Timezone/time parsing:** N/A for this bug
- **Env var mismatches:** N/A - TEAMS_CHANNELS parsing works per teams_service.py:11-26
- **Dev hot reload pitfalls:** N/A
- **"Works locally only" traps:** N/A - this bug manifests in all environments

## Debugging Experiments (minimal, high-signal)

- **EXP-1:** Confirm article content is markdown string
  - Where: `frontend/src/pages/Cooking.tsx`, add before line 387
  - Log: `console.log('Article content preview:', article.content?.substring(0, 200))`
  - Expected signal if true: Shows markdown syntax like `# Title` or `**bold**`
  - Expected signal if false: Shows plain text with no special characters

- **EXP-2:** Confirm CSS classes have no matched rules
  - Where: Browser DevTools on `/cooking` page
  - Action: Inspect `.cooking-article-view` element → Styles panel
  - Expected signal if true: No CSS rules matched (only user-agent styles)
  - Expected signal if false: Custom styles visible

- **EXP-3:** Confirm article_id lookup target
  - Where: `backend/app/services/teams_service.py`, add after line 112
  - Log: `logger.info(f"send_to_teams: received article_id={article_id}, querying Group table")`
  - Expected signal if true: Log shows GroupArticle ID being searched in Group table
  - Expected signal if false: Would never reach this code if GroupArticle was queried

- **EXP-4:** Verify GroupArticle table structure
  - Where: Database shell
  - Query: `\d group_articles` or `SELECT column_name FROM information_schema.columns WHERE table_name = 'group_articles';`
  - Expected signal if true: No `posted_to_teams` column present
  - Expected signal if false: Column exists (would disprove H-7)

- **EXP-5:** Compare research vs article rendering path
  - Where: Browser → View Source or React DevTools
  - Action: Find research output element vs article element in DOM
  - Expected signal if true: Research has `<div dangerouslySetInnerHTML...>` with HTML; Article has plain text node
  - Expected signal if false: Both use same rendering approach

## Smells (not necessarily the bug, but relevant debt)

- **S-1:** Two parallel Article model systems
  - Path: `backend/app/models/article.py` vs `backend/app/models/group_articles.py`
  - Anchor: `class Article(Base)` vs `class GroupArticle(Base)`
  - Why it matters: Architectural debt. Old post-based Article system coexists with new group-based GroupArticle system. Causes confusion, leads to bugs like this one where code references wrong model.

- **S-2:** Duplicate API surfaces for articles
  - Path: `frontend/src/services/api.ts`
  - Anchor: `articlesApi` (lines 24-30) vs `groupArticlesApi` (lines 115-122)
  - Why it matters: Two APIs doing similar things. Easy to call wrong one. Should consolidate or clearly deprecate old API.

- **S-3:** renderMarkdown function scoped to single file
  - Path: `frontend/src/pages/Cooking.tsx:17-55`
  - Anchor: `function renderMarkdown(text: string): string {`
  - Why it matters: Utility function is local to Cooking.tsx. Should be extracted to shared utility file for reuse elsewhere. Also exists in isolation - if another component needs markdown rendering, it would duplicate this code.

- **S-4:** Magic strings for article styles
  - Path: `frontend/src/pages/Cooking.tsx:15`
  - Anchor: `type ArticleStyle = 'news_brief' | 'full_article' | 'executive_summary' | 'analysis' | 'custom';`
  - Why it matters: Style names duplicated between frontend types and backend prompt keys. Change in one place doesn't update the other. Should be shared constant.

- **S-5:** Alert-based user feedback
  - Path: `frontend/src/pages/Cooking.tsx:277, 287`
  - Anchor: `alert('Article copied to clipboard!')` and `alert(\`Article sent to #${channelName}!\`)`
  - Why it matters: Using `alert()` for feedback is poor UX. Should use toast notifications or inline feedback. Blocks UI and looks unprofessional.

- **S-6:** No loading state for article view
  - Path: `frontend/src/pages/Cooking.tsx:367-441`
  - Anchor: Article view section has no loading indicators
  - Why it matters: If article content is large or slow to load, user sees nothing. Research view has spinner (lines 550-561) but article view doesn't.

## Chat Gate (MANDATORY)

```txt
GATE: bf-2
Written: docs/bugfix/bug_hunt.md
Hypotheses count: 15
Open questions: no
Next: bf-2
```

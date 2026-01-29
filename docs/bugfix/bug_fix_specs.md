# Bug Fix Specs (bf-2)

## Summary
Fix Article View on Cooking page: (1) render article content with markdown, (2) add missing CSS classes, (3) fix Teams send to query GroupArticle table.

## Root Cause Selection

### Primary Hypothesis: H-1 + H-2 + H-3 (combined)
Three distinct bugs causing Article View to be non-functional:

1. **H-1/H-6**: Article content bypasses `renderMarkdown()` function
   - Evidence: `Cooking.tsx:387` uses `{article.content}` (raw text)
   - Research view uses `renderMarkdown()` at line 570 (works)

2. **H-2/H-11**: Article View CSS classes undefined
   - Evidence: grep for `cooking-article|cooking-refine|article-text` in App.css returns 0 matches
   - Six classes used in JSX (lines 384-412) have no CSS definitions

3. **H-3/H-5**: teams_service.py queries wrong tables
   - Evidence: lines 96-97 import `Post` and `Group`, never `GroupArticle`
   - Line 114-115 queries `Group` table, line 136-137 queries `Post` table
   - Frontend passes `GroupArticle.id` (Cooking.tsx:285) but backend never queries `group_articles`

### Contributing Factor: H-9
- `build_adaptive_card()` expects `title` and `summary` fields (line 51-52)
- `GroupArticle` model only has `content` field (no title/summary)
- Must derive title from group or extract from content

### NOT Addressed (out of scope)
- **H-4**: Two incompatible Article models - architectural debt, not required for fix
- **H-7**: Missing `posted_to_teams` field - not in acceptance criteria
- **H-8**: Inconsistent data flow - debt, not required
- **H-10**: Markdown escaping - not a real issue, React handles it
- **H-12**: State staleness after send - nice-to-have, not blocker
- **H-13**: 200 with error in body - frontend already handles this pattern
- **H-14**: Copy to clipboard raw markdown - may be desired behavior
- **H-15**: Refinement display - same root cause as H-1, fixed together

---

## Spec 1: Render Article Content with Markdown

### Target Area
- File: `frontend/src/pages/Cooking.tsx`
- Anchor: Line 387

### Change Description
Replace raw text interpolation with `renderMarkdown()` call using `dangerouslySetInnerHTML`, matching the pattern used for research output at line 570.

### Current Code
```tsx
<div className="article-text">{article.content}</div>
```

### Target Behavior
Article content rendered as HTML with:
- Headers (`# Title` -> `<h1>`)
- Bold (`**text**` -> `<strong>`)
- Italic (`*text*` -> `<em>`)
- Links (`[text](url)` -> `<a>`)
- Lists (`- item` -> `<ul><li>`)

### Constraints
- MUST use existing `renderMarkdown()` function (lines 17-55)
- MUST NOT modify `renderMarkdown()` function
- MUST preserve existing behavior for research view (RG-1)

### Acceptance Test (maps to AC-1)
1. Generate article with markdown content (headers, bold, lists)
2. Article view displays formatted HTML (not literal `# Title`)
3. Research view still renders markdown correctly (regression check)

---

## Spec 2: Add Article View CSS Classes

### Target Area
- File: `frontend/src/App.css`
- Anchor: End of file (new rules)

### Change Description
Add CSS definitions for the six undefined classes used in Article View section of Cooking.tsx.

### Classes to Define
1. `.cooking-article-view` - Container for entire article view section
2. `.cooking-article-content` - Wrapper for title and article text
3. `.article-text` - Article content display area (styled markdown output)
4. `.cooking-refine-section` - Container for refinement controls
5. `.cooking-refine-input` - Textarea for refinement instructions
6. `.cooking-article-actions` - Button row container

### Target Behavior
- Dark theme styling consistent with existing Cooking page
- Proper spacing and padding
- Readable typography for article content
- Styled markdown elements (headers, lists, links, blockquotes)

### Constraints
- MUST NOT modify existing CSS rules (RG-2)
- MUST match existing dark theme color palette
- SHOULD follow existing naming conventions in App.css

### Acceptance Test (maps to AC-2)
1. Navigate to Cooking page with generated article
2. Article view has dark background (not white)
3. Proper padding/margin around content
4. Headings, lists, links visually distinct
5. Refine section and action buttons properly styled

---

## Spec 3: Fix Teams Service to Query GroupArticle Table

### Target Area
- File: `backend/app/services/teams_service.py`
- Anchors: Lines 95-97 (imports), Lines 111-151 (query logic)

### Change Description
Replace queries to `Group` and `Post` tables with query to `GroupArticle` table. Article ID passed from frontend is `GroupArticle.id`.

### Current Query Flow (broken)
1. Receive `article_id` (GroupArticle.id)
2. Query `Group` table by id -> fails (different table)
3. Fallback query `Post` table by id -> fails (different table)
4. Return "Article not found"

### Target Query Flow
1. Receive `article_id` (GroupArticle.id)
2. Query `GroupArticle` table by id
3. If found, fetch related `Group` for title
4. Build card with article content and group title

### Constraints
- MUST import `GroupArticle` from `app.models.group_articles`
- MUST query `GroupArticle` table
- MUST still validate channel exists before sending (RG-3)
- MAY fallback to existing Post/Group logic for backwards compatibility

### Acceptance Test (maps to AC-3)
1. Generate article on Cooking page
2. Click "Send to Teams"
3. Select channel and send
4. No "Article not found" error
5. Article content sent to Teams channel

---

## Spec 4: Fix Adaptive Card Field Mapping

### Target Area
- File: `backend/app/services/teams_service.py`
- Anchor: `build_adaptive_card()` function call context (line 154)

### Change Description
When building adaptive card for GroupArticle, derive `title` from related Group's `representative_title` and use `content` field appropriately for summary.

### Current Field Mapping (broken for GroupArticle)
```python
title = article.get("title", article.get("ai_title", "Untitled"))
summary = article.get("summary", article.get("ai_summary", ""))
```

### Target Field Mapping (for GroupArticle)
- `title`: From related Group's `representative_title`
- `summary`: Truncated first portion of `GroupArticle.content` (or full if short)

### Constraints
- Card must stay under 28 KB Teams limit
- `build_adaptive_card()` signature may remain unchanged (pass dict)
- SHOULD truncate summary if content exceeds reasonable length

### Acceptance Test (maps to AC-4)
1. Send article to Teams
2. Teams card shows correct article title (not "Untitled")
3. Teams card shows content summary (not empty)

---

## In-Scope Summary
| Spec | File | Lines | Change |
|------|------|-------|--------|
| 1 | frontend/src/pages/Cooking.tsx | 387 | Use renderMarkdown() |
| 2 | frontend/src/App.css | (new) | Add 6 CSS class definitions |
| 3 | backend/app/services/teams_service.py | 95-151 | Query GroupArticle table |
| 4 | backend/app/services/teams_service.py | 154 context | Map GroupArticle fields to card |

## Out-of-Scope (explicit)
- Adding `posted_to_teams` tracking field to GroupArticle model
- Removing or refactoring old Article model
- Consolidating articlesApi / groupArticlesApi
- Moving renderMarkdown to shared utility
- Replacing alert() with toast notifications
- Adding loading states to article view
- Any changes to research view rendering

## Regression Guards
- RG-1: Research output at Cooking.tsx:570 must still render markdown
- RG-2: Existing CSS rules must remain unchanged
- RG-3: Teams API must still validate channel exists before sending

---

## Open Questions
None. Specs are complete for implementation.

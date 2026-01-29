# Bug Report: Article View Completely Broken

**Date:** 2026-01-28
**Severity:** Critical
**Status:** Open
**Affected Component:** Cooking Page - Article View

---

## Summary

After generating an article from research in the Cooking page, the Article View is fundamentally broken:
1. Article content is not visible
2. Layout is completely unstyled and looks terrible
3. "Send to Teams" button does not work (queries wrong database table)

---

## Screenshots

User reported: Article view shows only the title, refine controls, and action buttons - but **no article content is displayed**. The page has excessive empty space and poor visual structure.

---

## Root Cause Analysis

### Bug 1: Article Content Not Rendered

**Location:** `frontend/src/pages/Cooking.tsx:380`

**Problem:**
```tsx
<div className="article-text">{article.content}</div>
```

The article content is rendered as raw text. However:
- The file contains a `renderMarkdown()` function (lines 18-55)
- This function is used for research output (line 536-538) but **NOT for article content**
- Article content likely contains markdown formatting (headers, bold, lists, etc.)
- Without markdown rendering, content may appear as unformatted blob or not display properly

**Expected:**
```tsx
<div
  className="article-text"
  dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
/>
```

---

### Bug 2: Missing CSS Styles for Article View

**Location:** `frontend/src/App.css`

**Problem:** The Article View in Cooking.tsx uses the following CSS classes that **DO NOT EXIST** in the stylesheet:

| Class Name | Used In (Cooking.tsx) | CSS Definition |
|------------|----------------------|----------------|
| `.cooking-article-view` | Line 377 | **MISSING** |
| `.cooking-article-content` | Line 378 | **MISSING** |
| `.article-text` | Line 380 | **MISSING** |
| `.cooking-refine-section` | Line 383 | **MISSING** |
| `.cooking-refine-input` | Line 389 | **MISSING** |
| `.cooking-article-actions` | Line 405 | **MISSING** |

**Evidence:**
```bash
# Search results show no matches
grep -n "cooking-article-view\|cooking-article-content\|article-text\|cooking-refine-section\|cooking-article-actions" frontend/src/App.css
# Returns: No matches found
```

**Impact:**
- No layout structure (everything stacks with no spacing)
- No background colors or borders
- No typography styling for article text
- Buttons appear but with no proper container styling
- Overall appearance is broken/unusable

---

### Bug 3: Send to Teams Queries Wrong Database Table

**Location:** `backend/app/services/teams_service.py:90-151`

**Problem:** The `send_to_teams()` function receives an `article_id` but looks it up in the WRONG tables.

**Frontend sends:**
```tsx
// Cooking.tsx:278
await teamsApi.sendToTeams(String(article.id), channelName)
```

Where `article` is of type `GroupArticle` with `id` being the primary key of the `group_articles` table.

**Backend does:**
```python
# teams_service.py:114-138
# First try as group ID
group = db.execute(
    select(Group).where(Group.id == int(article_id))
).scalar_one_or_none()

if group:
    # ... uses group data
else:
    # Try as post ID
    post = db.execute(
        select(Post).where(Post.id == int(article_id))
    ).scalar_one_or_none()
```

**The code NEVER queries the `group_articles` table!**

**Result:**
- If `article.id` happens to match a `Group.id`: Sends wrong content (group's representative_title + post's ai_summary, NOT the generated article)
- If `article.id` happens to match a `Post.id`: Sends wrong content (post data, NOT the generated article)
- If `article.id` matches neither: Returns `{"success": false, "error": "Article not found"}`

**Expected behavior:**
```python
from app.models.group_articles import GroupArticle

# First try as GroupArticle ID (the correct table!)
group_article = db.execute(
    select(GroupArticle).where(GroupArticle.id == int(article_id))
).scalar_one_or_none()

if group_article:
    article_data = {
        "title": group_article.group.representative_title,  # Get title from related group
        "summary": group_article.content[:500],  # Use the ACTUAL generated content
        # ...
    }
```

---

## Database Schema Reference

The `GroupArticle` model exists and stores generated articles:

```python
# backend/app/models/group_articles.py
class GroupArticle(Base):
    __tablename__ = "group_articles"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    research_id = Column(Integer, ForeignKey("group_research.id"), nullable=True)
    style = Column(String, nullable=False)
    prompt_used = Column(Text, nullable=False)
    content = Column(Text, nullable=False)  # <-- THE ACTUAL ARTICLE CONTENT
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

---

## Reproduction Steps

1. Navigate to Home page
2. Select a group and click "Start Cooking"
3. In Cooking page, run Research (any mode)
4. Generate Article (any style)
5. Observe Article View:
   - **BUG 1:** Article content is missing or unformatted
   - **BUG 2:** Layout is broken with no proper styling
6. Click "Send to Teams" button
   - **BUG 3:** Either shows "Article not found" error or sends wrong content

---

## Impact Assessment

| Bug | User Impact | Severity |
|-----|-------------|----------|
| Missing article content | Users cannot read the article they generated | **Critical** |
| Missing CSS styles | UI is broken and unprofessional | **High** |
| Teams integration broken | Core feature completely non-functional | **Critical** |

**Overall Severity: CRITICAL** - The article generation workflow is the core value proposition of the application, and it's completely broken at the final step.

---

## Files Requiring Changes

### Frontend
1. `frontend/src/pages/Cooking.tsx`
   - Line 380: Apply `renderMarkdown()` to article.content

2. `frontend/src/App.css`
   - Add complete styling for:
     - `.cooking-article-view`
     - `.cooking-article-content`
     - `.article-text`
     - `.cooking-refine-section`
     - `.cooking-refine-input`
     - `.cooking-article-actions`

### Backend
1. `backend/app/services/teams_service.py`
   - Lines 90-151: Rewrite `send_to_teams()` to query `group_articles` table
   - Import `GroupArticle` model
   - Build adaptive card using actual article content

---

## Suggested CSS Structure

```css
/* Article View Container */
.cooking-article-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  flex: 1;
  overflow-y: auto;
}

/* Article Content Area */
.cooking-article-content {
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
  border-radius: 12px;
  padding: 32px;
  flex: 1;
}

.cooking-article-content h2 {
  margin: 0 0 24px 0;
  font-size: 1.5rem;
  color: #f1f5f9;
}

.article-text {
  color: #cbd5e1;
  line-height: 1.8;
  font-size: 1rem;
}

.article-text h1, .article-text h2, .article-text h3 {
  color: #f1f5f9;
  margin: 24px 0 12px 0;
}

.article-text p {
  margin: 0 0 16px 0;
}

.article-text ul, .article-text ol {
  margin: 0 0 16px 0;
  padding-left: 24px;
}

.article-text a {
  color: #60a5fa;
}

/* Refine Section */
.cooking-refine-section {
  background: #050505;
  border: 1px solid #1a1a1a;
  border-radius: 8px;
  padding: 20px;
}

.cooking-refine-section h3 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  color: #e2e8f0;
}

.cooking-refine-input {
  width: 100%;
  padding: 12px;
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 0.9rem;
  resize: vertical;
  margin-bottom: 12px;
}

.cooking-refine-input:focus {
  outline: none;
  border-color: #3b82f6;
}

/* Action Buttons */
.cooking-article-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 16px 0;
  border-top: 1px solid #1a1a1a;
}
```

---

## Testing Checklist

After fixes are applied:

- [ ] Article content displays with proper markdown formatting
- [ ] Headers, bold, italic, lists render correctly
- [ ] Links in article are clickable
- [ ] Article view has proper layout and spacing
- [ ] Refine textarea is properly styled
- [ ] Action buttons are properly aligned
- [ ] "Send to Teams" successfully sends the generated article content
- [ ] Teams card shows correct title and article summary
- [ ] Error handling works if Teams channel is misconfigured

---

## Related Files

- `frontend/src/pages/Cooking.tsx` - Main component
- `frontend/src/App.css` - Stylesheet
- `frontend/src/types/index.ts` - GroupArticle type definition (lines 87-95)
- `frontend/src/services/api.ts` - teamsApi.sendToTeams (lines 140-144)
- `backend/app/api/teams.py` - Teams API endpoints
- `backend/app/services/teams_service.py` - Teams integration logic
- `backend/app/models/group_articles.py` - GroupArticle model

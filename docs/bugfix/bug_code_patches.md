# Bug Code Patch Plan

## Summary
- Total patch operations: 4
- New files to create: 0
- Blockers: no

---

## Patch Operations (in order)

### OP-1 — Render article content with markdown
- File: `frontend/src/pages/Cooking.tsx`
- Operation: REPLACE

- Target location (required for non-CREATE)
  - Anchor snippet:
    - `<div className="article-text">{article.content}</div>`

- Change:
  - Replace this exact text:
    - `<div className="article-text">{article.content}</div>`
  - With this exact text:
    - `<div className="article-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }} />`

- Why (ties to bug_fix_specs.md, 1 sentence):
  - Spec 1 requires using renderMarkdown() to convert markdown to HTML, matching the research view pattern at line 570.

---

### OP-2 — Add GroupArticle import to teams_service
- File: `backend/app/services/teams_service.py`
- Operation: INSERT AFTER

- Target location (required for non-CREATE)
  - Anchor snippet:
    - `from app.models.group import Group`

- Change:
  - Insert this exact text:
    - `from app.models.group_articles import GroupArticle`

- Why (ties to bug_fix_specs.md, 1 sentence):
  - Spec 3 requires importing GroupArticle to query the correct table for articles sent from Cooking page.

---

### OP-3 — Replace query logic to use GroupArticle table first
- File: `backend/app/services/teams_service.py`
- Operation: REPLACE

- Target location (required for non-CREATE)
  - Anchor snippet:
    - `# Try to find article - could be a group ID or post ID`

- Change:
  - Replace this exact text:
    - ```python
    # Try to find article - could be a group ID or post ID
    try:
        # First try as group ID
        group = db.execute(
            select(Group).where(Group.id == int(article_id))
        ).scalar_one_or_none()

        if group:
            # Get representative post for the group
            post = db.execute(
                select(Post).where(Post.group_id == group.id).order_by(Post.created_at.desc())
            ).scalars().first()

            if not post:
                return {"success": False, "error": "Article not found"}

            article_data = {
                "title": group.representative_title or post.ai_title,
                "summary": post.ai_summary or post.original_text,
                "category": group.category or post.category,
                "source": post.author,
                "url": _build_post_url(post)
            }
        else:
            # Try as post ID
            post = db.execute(
                select(Post).where(Post.id == int(article_id))
            ).scalar_one_or_none()

            if not post:
                return {"success": False, "error": "Article not found"}

            article_data = {
                "title": post.ai_title,
                "summary": post.ai_summary or post.original_text,
                "category": post.category,
                "source": post.author,
                "url": _build_post_url(post)
            }
    except (ValueError, TypeError):
        return {"success": False, "error": "Article not found"}
    ```
  - With this exact text:
    - ```python
    # Try to find article - first as GroupArticle (Cooking page), then fallback to Group/Post
    try:
        # First try as GroupArticle ID (from Cooking page)
        group_article = db.execute(
            select(GroupArticle).where(GroupArticle.id == int(article_id))
        ).scalar_one_or_none()

        if group_article:
            # Get related Group for title
            group = db.execute(
                select(Group).where(Group.id == group_article.group_id)
            ).scalar_one_or_none()

            # Truncate content for summary (max 500 chars)
            content = group_article.content or ""
            summary = content[:500] + "..." if len(content) > 500 else content

            article_data = {
                "title": group.representative_title if group else "Untitled",
                "summary": summary,
                "category": group.category if group else None,
                "source": "Klaus News",
                "url": ""
            }
        else:
            # Fallback: try as group ID
            group = db.execute(
                select(Group).where(Group.id == int(article_id))
            ).scalar_one_or_none()

            if group:
                # Get representative post for the group
                post = db.execute(
                    select(Post).where(Post.group_id == group.id).order_by(Post.created_at.desc())
                ).scalars().first()

                if not post:
                    return {"success": False, "error": "Article not found"}

                article_data = {
                    "title": group.representative_title or post.ai_title,
                    "summary": post.ai_summary or post.original_text,
                    "category": group.category or post.category,
                    "source": post.author,
                    "url": _build_post_url(post)
                }
            else:
                # Fallback: try as post ID
                post = db.execute(
                    select(Post).where(Post.id == int(article_id))
                ).scalar_one_or_none()

                if not post:
                    return {"success": False, "error": "Article not found"}

                article_data = {
                    "title": post.ai_title,
                    "summary": post.ai_summary or post.original_text,
                    "category": post.category,
                    "source": post.author,
                    "url": _build_post_url(post)
                }
    except (ValueError, TypeError):
        return {"success": False, "error": "Article not found"}
    ```

- Why (ties to bug_fix_specs.md, 1 sentence):
  - Specs 3 and 4 require querying GroupArticle table first (since frontend passes GroupArticle.id) and mapping its content field to title/summary for the adaptive card.

- Safety check (required if risk > 3):
  - Verify that existing Group/Post send-to-teams functionality still works after change (backwards compatibility).

---

### OP-4 — Add Article View CSS classes
- File: `frontend/src/App.css`
- Operation: INSERT AFTER

- Target location (required for non-CREATE)
  - Anchor snippet:
    - ```css
.tile-post-score {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 3px 8px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 6px;
  color: #34d399;
}
```

- Change:
  - Insert this exact text:
    - ```css

/* ===== Article View Styles (Bug Fix) ===== */

.cooking-article-view {
  text-align: left;
  max-width: 900px;
  margin: 0 auto;
}

.cooking-article-content {
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
}

.cooking-article-content h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 24px 0;
  padding-bottom: 16px;
  border-bottom: 1px solid #1a1a1a;
}

.article-text {
  font-size: 1rem;
  line-height: 1.8;
  color: #cbd5e1;
}

.article-text h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 24px 0 16px 0;
}

.article-text h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 20px 0 12px 0;
}

.article-text h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 16px 0 10px 0;
}

.article-text h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 14px 0 8px 0;
}

.article-text p {
  margin: 0 0 16px 0;
}

.article-text strong {
  color: #f1f5f9;
  font-weight: 600;
}

.article-text em {
  font-style: italic;
  color: #94a3b8;
}

.article-text a {
  color: #60a5fa;
  text-decoration: none;
  transition: color 0.2s;
}

.article-text a:hover {
  color: #93c5fd;
  text-decoration: underline;
}

.article-text ul,
.article-text ol {
  margin: 0 0 16px 0;
  padding-left: 24px;
}

.article-text li {
  margin-bottom: 8px;
}

.article-text blockquote {
  margin: 16px 0;
  padding: 12px 20px;
  border-left: 4px solid #60a5fa;
  background: rgba(96, 165, 250, 0.1);
  color: #94a3b8;
  font-style: italic;
}

.article-text code {
  background: #1e293b;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  color: #f59e0b;
}

.cooking-refine-section {
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.cooking-refine-section h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 8px 0;
}

.cooking-refine-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 0.9rem;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  background-color: #000000;
  color: #e2e8f0;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.cooking-refine-input:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
}

.cooking-refine-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cooking-article-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
}

.cooking-article-actions .btn {
  padding: 10px 20px;
  font-size: 0.9rem;
}
```

- Why (ties to bug_fix_specs.md, 1 sentence):
  - Spec 2 requires defining the 6 CSS classes used in Article View section so the UI renders with proper dark theme styling.

---

## Blockers (only if any)
None.

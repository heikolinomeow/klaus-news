# BRIEF: Modular Category System for Post Categorization

**Version:** 4.0 (Final)
**Date:** 2026-01-26
**Status:** Ready for Implementation

---

## Problem Statement

Categories are **hardcoded in 4+ places** (openai_client.py, prompts.py, main.py, Settings.tsx). The UI only allows toggling visibility of fixed categories - users cannot define their own categories or descriptions. The prompt has categories baked in, making it impossible to separate "how to categorize" from "what categories exist."

---

## Goal

Create a **modular prompt system** where:
1. **Prompt skeleton** = Instructions on how to categorize (ends with `{{CATEGORIES}}` placeholder)
2. **User categories** = Defined in UI (name + description)
3. **"Other" category** = Always present, hardcoded fallback

**Final prompt at runtime** = Skeleton + User Categories + "Other"

---

## Initial Categories (Seeded on First Run)

| Category | Description |
|----------|-------------|
| **Major News** | Breaking announcements and significant industry news: new AI model releases, major product launches, company acquisitions, funding rounds, policy changes. High-impact news that everyone should know about. |
| **Automation** | Practical tips on using AI to improve everyday work: workflow automation, productivity hacks, business process improvements, no-code tools, AI assistants. For general business users. |
| **Coding** | Developer-focused content: AI coding assistants, code generation, IDE integrations, APIs, technical implementations. For engineers and developers. |
| **Content Creation** | AI tools for creating media: image generation, video, copywriting, voice synthesis, design tools, marketing materials. |
| **Other** | Posts that don't clearly fit the above categories. *(hardcoded, always present)* |

---

## User Permissions

| Action | Allowed? | Reason |
|--------|----------|--------|
| **Edit description** | ✅ Yes | Safe - only affects future categorization |
| **Add new category** | ✅ Yes | Expands options, no data loss |
| **Delete category** | ❌ No | Would orphan existing posts |
| **Rename category** | ❌ No | Would orphan existing posts |
| **Edit "Other"** | ❌ No | System fallback, must remain stable |
| **Reorder categories** | ❌ No | Order is controlled internally, not exposed in UI |

---

## UI/UX Design

### New UI (Settings > Content > Category Filters)

```
┌─────────────────────────────────────────────────┐
│ Category Filters                            ▼   │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─ CATEGORIZATION PROMPT ─────────────────────┐ │
│ │ PromptTile: categorize_post                 │ │
│ │ "You are categorizing social media posts.   │ │
│ │  Read carefully and assign to ONE category  │ │
│ │  based on primary topic.                    │ │
│ │                                             │ │
│ │  Categorize into one of these:              │ │
│ │  {{CATEGORIES}}"                            │ │
│ │                            [Edit] [Reset]   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─ CATEGORIES ────────────────────────────────┐ │
│ │                                             │ │
│ │  ┌───────────────────────────────────────┐  │ │
│ │  │ Major News                            │  │ │
│ │  │ ┌───────────────────────────────────┐ │  │ │
│ │  │ │ Breaking announcements and        │ │  │ │
│ │  │ │ significant industry news: new AI │ │  │ │
│ │  │ │ model releases, major product...  │ │  │ │
│ │  │ └───────────────────────────────────┘ │  │ │
│ │  │                        [Save] (edit)  │  │ │
│ │  └───────────────────────────────────────┘  │ │
│ │                                             │ │
│ │  ┌───────────────────────────────────────┐  │ │
│ │  │ Automation                            │  │ │
│ │  │ ┌───────────────────────────────────┐ │  │ │
│ │  │ │ Practical tips on using AI to     │ │  │ │
│ │  │ │ improve everyday work: workflow...│ │  │ │
│ │  │ └───────────────────────────────────┘ │  │ │
│ │  │                        [Save] (edit)  │  │ │
│ │  └───────────────────────────────────────┘  │ │
│ │                                             │ │
│ │  ┌───────────────────────────────────────┐  │ │
│ │  │ Coding                                │  │ │
│ │  │ ┌───────────────────────────────────┐ │  │ │
│ │  │ │ Developer-focused content: AI     │ │  │ │
│ │  │ │ coding assistants, code gen...    │ │  │ │
│ │  │ └───────────────────────────────────┘ │  │ │
│ │  │                        [Save] (edit)  │  │ │
│ │  └───────────────────────────────────────┘  │ │
│ │                                             │ │
│ │  ┌───────────────────────────────────────┐  │ │
│ │  │ Content Creation                      │  │ │
│ │  │ ┌───────────────────────────────────┐ │  │ │
│ │  │ │ AI tools for creating media:      │ │  │ │
│ │  │ │ image generation, video, copy...  │ │  │ │
│ │  │ └───────────────────────────────────┘ │  │ │
│ │  │                        [Save] (edit)  │  │ │
│ │  └───────────────────────────────────────┘  │ │
│ │                                             │ │
│ │  ┌───────────────────────────────────────┐  │ │
│ │  │ Other                          🔒     │  │ │
│ │  │ Posts that don't clearly fit the     │  │ │
│ │  │ above categories. (system default)   │  │ │
│ │  └───────────────────────────────────────┘  │ │
│ │                                             │ │
│ │           [ + Add New Category ]            │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─ CATEGORY MATCHING STATS ───────────────────┐ │
│ │                                             │ │
│ │  ⚠️ Category mismatches: 12                  │ │
│ │  ↳ Posts where AI returned unrecognized     │ │
│ │    category and fell back to "Other"        │ │
│ │                                             │ │
│ │                      [View Log] [Clear]     │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ℹ️ Category names cannot be changed or deleted  │
│   to preserve existing post assignments.        │
│   Descriptions can be edited anytime.           │
└─────────────────────────────────────────────────┘
```

### Add New Category Modal

```
┌─────────────────────────────────────────────────┐
│ Add New Category                          [X]   │
├─────────────────────────────────────────────────┤
│                                                 │
│ Name (cannot be changed later)                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ Research                                    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Description (can be edited anytime)             │
│ ┌─────────────────────────────────────────────┐ │
│ │ Academic papers, scientific studies, AI     │ │
│ │ research breakthroughs, benchmarks...       │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ⚠️ Category name is permanent once created.     │
│                                                 │
│              [Cancel]  [Create Category]        │
└─────────────────────────────────────────────────┘
```

### Category Mismatch Log Modal

```
┌─────────────────────────────────────────────────┐
│ Category Mismatch Log                     [X]   │
├─────────────────────────────────────────────────┤
│                                                 │
│ These posts received unrecognized category      │
│ responses from AI and were assigned to "Other". │
│                                                 │
│ ┌───────────────────────────────────────────┐   │
│ │ 2026-01-26 14:32                          │   │
│ │ AI returned: "Tech News"                  │   │
│ │ Expected one of: Major News, Automation,  │   │
│ │   Coding, Content Creation, Other         │   │
│ │ Post: "OpenAI announces GPT-5..."         │   │
│ │ → Assigned to: Other                      │   │
│ └───────────────────────────────────────────┘   │
│                                                 │
│ ┌───────────────────────────────────────────┐   │
│ │ 2026-01-26 13:15                          │   │
│ │ AI returned: "Development"                │   │
│ │ Expected one of: Major News, Automation,  │   │
│ │   Coding, Content Creation, Other         │   │
│ │ Post: "New VS Code extension for..."      │   │
│ │ → Assigned to: Other                      │   │
│ └───────────────────────────────────────────┘   │
│                                                 │
│                              [Clear All Logs]   │
└─────────────────────────────────────────────────┘
```

---

## Data Model

### New: `categories` setting (JSON array)

```json
[
  {
    "id": "uuid-1",
    "name": "Major News",
    "description": "Breaking announcements and significant industry news: new AI model releases, major product launches, company acquisitions, funding rounds, policy changes. High-impact news that everyone should know about.",
    "order": 1
  },
  {
    "id": "uuid-2",
    "name": "Automation",
    "description": "Practical tips on using AI to improve everyday work: workflow automation, productivity hacks, business process improvements, no-code tools, AI assistants. For general business users.",
    "order": 2
  },
  {
    "id": "uuid-3",
    "name": "Coding",
    "description": "Developer-focused content: AI coding assistants, code generation, IDE integrations, APIs, technical implementations. For engineers and developers.",
    "order": 3
  },
  {
    "id": "uuid-4",
    "name": "Content Creation",
    "description": "AI tools for creating media: image generation, video, copywriting, voice synthesis, design tools, marketing materials.",
    "order": 4
  }
]
```

**Notes:**
- "Other" is NOT stored in this array - it's hardcoded in the assembly function
- The `order` field controls display order but is NOT exposed in UI (internal use only)
- New categories are appended with `order = max(existing) + 1`

### New: `category_mismatches` setting (JSON array)

Stores log of category matching failures for monitoring.

```json
[
  {
    "timestamp": "2026-01-26T14:32:00Z",
    "ai_response": "Tech News",
    "valid_categories": ["Major News", "Automation", "Coding", "Content Creation", "Other"],
    "post_snippet": "OpenAI announces GPT-5...",
    "assigned_category": "Other"
  }
]
```

**Notes:**
- Capped at 100 entries (oldest removed when limit reached)
- Can be cleared manually via UI

### Modified: `prompts.categorize_post`

```
prompt_text: "You are categorizing social media posts about AI. Read the post carefully and assign it to exactly ONE category based on the primary topic. Consider the main subject matter, not peripheral mentions.

Categorize into one of the following categories:
{{CATEGORIES}}

Return ONLY the category name, nothing else."
```

---

## Category Matching Logic (Runtime)

When the AI returns a category response, apply this matching logic:

```python
def match_category(ai_response: str, valid_categories: list[str]) -> tuple[str, bool]:
    """
    Match AI response to a valid category.

    Returns:
        tuple: (matched_category, was_exact_match)
        - was_exact_match=True means exact or partial match found
        - was_exact_match=False means fell back to "Other" (log this)
    """
    response = ai_response.strip()

    # 1. Exact match (case-insensitive)
    for cat in valid_categories:
        if response.lower() == cat.lower():
            return (cat, True)

    # 2. Partial match - AI returned substring or category contains response
    #    e.g., AI returns "Content" but category is "Content Creation"
    #    e.g., AI returns "Major News Update" but category is "Major News"
    for cat in valid_categories:
        if response.lower() in cat.lower() or cat.lower() in response.lower():
            return (cat, True)

    # 3. No match found - fallback to "Other" and log mismatch
    return ("Other", False)
```

### Matching Flow

```
AI Response: "Tech News"
     │
     ▼
┌─────────────────────────────────┐
│ Step 1: Exact Match?            │
│ "tech news" == "major news"? No │
│ "tech news" == "automation"? No │
│ "tech news" == "coding"? No     │
│ "tech news" == "content..."? No │
│ "tech news" == "other"? No      │
└─────────────────────────────────┘
     │ No exact match
     ▼
┌─────────────────────────────────┐
│ Step 2: Partial Match?          │
│ "tech news" in "major news"? No │
│ "major news" in "tech news"? No │
│ ... (all categories)            │
└─────────────────────────────────┘
     │ No partial match
     ▼
┌─────────────────────────────────┐
│ Step 3: Fallback to "Other"     │
│ Log mismatch for monitoring     │
│ Return ("Other", False)         │
└─────────────────────────────────┘
```

### Logging Mismatches

When `was_exact_match=False`, log the mismatch:

```python
def log_category_mismatch(ai_response: str, valid_categories: list[str], post_text: str):
    """Log a category mismatch for monitoring."""
    mismatches = settings_service.get("category_mismatches") or []

    # Add new mismatch
    mismatches.append({
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "ai_response": ai_response,
        "valid_categories": valid_categories,
        "post_snippet": post_text[:100] + "..." if len(post_text) > 100 else post_text,
        "assigned_category": "Other"
    })

    # Cap at 100 entries
    if len(mismatches) > 100:
        mismatches = mismatches[-100:]

    settings_service.update("category_mismatches", mismatches)
```

---

## Prompt Assembly (Runtime)

```python
def build_categorization_prompt() -> str:
    """
    Build the full categorization prompt by combining:
    1. Prompt skeleton (from prompts table)
    2. User-defined categories (from settings)
    3. Hardcoded "Other" category
    """
    skeleton = prompt_service.get("categorize_post")["prompt_text"]
    user_categories = settings_service.get("categories")  # JSON array

    # Format user categories (sorted by order field)
    sorted_categories = sorted(user_categories, key=lambda x: x.get("order", 0))
    lines = [f"- {cat['name']}: {cat['description']}" for cat in sorted_categories]

    # Add hardcoded "Other" (always last)
    lines.append("- Other: Posts that don't clearly fit the above categories")

    formatted = "\n".join(lines)

    return skeleton.replace("{{CATEGORIES}}", formatted)


def get_valid_category_names() -> list[str]:
    """Get list of valid category names for matching."""
    user_categories = settings_service.get("categories")
    names = [cat["name"] for cat in user_categories]
    names.append("Other")  # Always include Other
    return names
```

---

## API Structure

Use existing **settings API** for simplicity:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/settings/categories` | GET | Get all categories |
| `/api/settings/categories` | PUT | Update entire categories array |
| `/api/settings/category_mismatches` | GET | Get mismatch log |
| `/api/settings/category_mismatches` | PUT | Clear mismatch log (set to `[]`) |

### Frontend Workflow

**Editing a category description:**
1. Load all categories via `GET /api/settings/categories`
2. User edits description in textarea
3. User clicks "Save"
4. Update the specific category in local array
5. Save entire array via `PUT /api/settings/categories`

**Adding a new category:**
1. User fills in name + description in modal
2. Frontend validates: name unique, not "Other", within limits
3. Append to local array with `order = max(existing) + 1`
4. Save entire array via `PUT /api/settings/categories`

---

## What Changes

| Component | Current | New |
|-----------|---------|-----|
| **Categories storage** | Hardcoded in 4 files | `categories` setting (JSON) |
| **Prompt text** | Full text with categories | Skeleton with `{{CATEGORIES}}` |
| **"Other" category** | Part of hardcoded list | Hardcoded in assembly function |
| **Settings UI** | Checkboxes (visibility toggle) | Editable description cards + Add button |
| **PromptTile** | Shows full prompt | Shows skeleton (placeholder visible) |
| **Prompt assembly** | Direct text | Template replacement at runtime |
| **Category matching** | Direct string comparison | Fuzzy match + fallback + logging |
| **Monitoring** | None | Mismatch count + log in Settings UI |

---

## Backend Changes

1. **New setting**: `categories` (type: json) - seeded with 4 initial categories
2. **New setting**: `category_mismatches` (type: json) - stores mismatch log
3. **New function**: `build_categorization_prompt()` in `openai_client.py`
4. **New function**: `match_category()` in `openai_client.py`
5. **New function**: `log_category_mismatch()` in `openai_client.py`
6. **Update default `categorize_post` prompt** to use `{{CATEGORIES}}` placeholder
7. **Remove hardcoded category lists** from all files:
   - `backend/app/services/openai_client.py`
   - `backend/app/api/prompts.py`
   - `backend/app/main.py`
   - `frontend/src/pages/Settings.tsx`
8. **Remove `enabled_categories` setting** - no longer needed

## Frontend Changes

1. **Replace checkbox grid** with category cards (name + editable description textarea)
2. **Add category modal** with permanent name warning
3. **Remove delete/rename capabilities** - only description is editable
4. **"Other" card** - visible but fully locked (no edit controls)
5. **Add mismatch stats section** showing count + link to log modal
6. **Add mismatch log modal** with entries and clear button
7. **Helper text** explaining why names are permanent
8. **Remove references to old hardcoded categories**

---

## Validation Rules

| Field | Rule |
|-------|------|
| **Category name** | Required, 1-50 chars, unique, immutable after creation |
| **Category description** | Required, 1-300 chars, editable anytime |
| **Max categories** | 20 (reasonable limit, enforced on add) |
| **Reserved name** | "Other" cannot be used as category name |
| **Mismatch log** | Capped at 100 entries (auto-prune oldest) |

---

## Migration Plan

1. **Seed `categories` setting** with 4 initial categories (Major News, Automation, Coding, Content Creation)
2. **Seed `category_mismatches` setting** with empty array `[]`
3. **Update `categorize_post` prompt** to skeleton with `{{CATEGORIES}}` placeholder
4. **Remove hardcoded category arrays** from all backend/frontend files
5. **Remove `enabled_categories` setting** - no longer used

**Note:** No post data migration needed - this is a fresh system with no existing posts.

---

## Known Limitations

### Duplicate Detection Across Categories

The scheduler filters candidate posts by category before comparing for duplicates. This means:
- Posts in "Major News" are only compared to other "Major News" posts
- Posts in "Coding" are only compared to other "Coding" posts
- If AI miscategorizes a post, it may not be detected as duplicate of a similar post in another category

**Impact:** Some duplicate posts may slip through if they're categorized differently.

**Accepted:** This is a known limitation. Comparing across all categories would be significantly more expensive (API calls). The current approach is a reasonable trade-off.

### Category Matching Fuzzy Logic

The fuzzy matching (partial string matching) may occasionally produce unexpected matches:
- AI returns "News" → could match "Major News"
- AI returns "Content" → could match "Content Creation"

**Mitigation:** If AI responses are consistently problematic, review the mismatch log and consider:
1. Adjusting category names to be more distinct
2. Improving the prompt skeleton with clearer instructions
3. Adding specific examples in category descriptions

---

## Out of Scope

- Category icons/colors
- Category hierarchy (parent/child categories)
- Multi-category assignment (post in multiple categories)
- Drag-and-drop reordering in UI
- Manual post recategorization in UI
- `enabled_categories` toggle (removed - all defined categories are active)

---

## Summary

This feature creates a modular, maintainable category system where:

1. **Prompt instructions** (how to categorize) are separate from **category definitions** (what categories exist)
2. **Users can** edit descriptions and add new categories
3. **Users cannot** delete, rename, or reorder categories (preserves data integrity)
4. **"Other"** is always present as a fallback
5. **Fuzzy matching** handles minor AI response variations
6. **Mismatch logging** provides visibility into categorization issues

# Product Brief: AI Research & Article Generation

**Feature Name:** AI Research & Article Generation
**Priority:** High
**Target Release:** v1.2
**Status:** Proposal
**Owner:** Product Team
**Last Updated:** 2026-01-26

---

## Executive Summary

When users move a group from "New" to "Cooking", they need to generate articles based on the grouped posts. This feature introduces an optional two-step workflow: **Research (optional) → Generate Article**. Users can run AI-powered web research (with three depth levels), review/edit the research output alongside the posts, then generate an article. Alternatively, users can skip research and generate directly for quick drafts.

**Business Impact:**
- Higher quality articles with verified facts and context
- User control over AI research before committing to generation
- Flexible cost/speed tradeoffs via tiered research modes
- Transparency into what sources AI uses

---

## Core Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    NEW      │────▶│   COOKING   │────▶│   REVIEW    │────▶│  PUBLISHED  │
│   Groups    │     │  Research   │     │   Article   │     │   Article   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────────────────────────────┐
                    │          COOKING OPTIONS            │
                    ├─────────────────────────────────────┤
                    │                                     │
                    │  OPTION A: With Research            │
                    │  ┌───────────┐                      │
                    │  │ 1. Select │                      │
                    │  │   Mode    │                      │
                    │  └─────┬─────┘                      │
                    │        ▼                            │
                    │  ┌───────────┐                      │
                    │  │ 2. Run    │                      │
                    │  │ Research  │                      │
                    │  └─────┬─────┘                      │
                    │        ▼                            │
                    │  ┌───────────┐                      │
                    │  │ 3. Review │                      │
                    │  │  & Edit   │                      │
                    │  └─────┬─────┘                      │
                    │        ▼                            │
                    │  ┌───────────┐                      │
                    │  │ 4. Generate│                     │
                    │  │  Article  │                      │
                    │  └───────────┘                      │
                    │                                     │
                    │  OPTION B: Quick (No Research)      │
                    │  ┌───────────┐                      │
                    │  │ Generate  │ ← Skip research      │
                    │  │ Article   │                      │
                    │  └───────────┘                      │
                    │                                     │
                    └─────────────────────────────────────┘
```

---

## Three Research Modes

| Mode | Model | How It Works | Speed | Cost |
|------|-------|--------------|-------|------|
| **Quick Research** | `gpt-5-search-api` | Single search pass, returns basic facts | Fast (seconds) | $ |
| **Agentic Research** | `o4-mini` + web_search | Model reasons, searches iteratively, decides when done | Medium (30s-2min) | $$ |
| **Deep Research** | `o3-deep-research` | Exhaustive multi-source investigation, hundreds of sources | Slow (minutes) | $$$ |

**Default:** Agentic Research (best balance of quality/cost/speed)

---

## Four Article Styles

Users select one of four predefined styles (or use a custom prompt). Each style has a different prompt template that is **configurable in Settings**.

| Style | Description | Use Case |
|-------|-------------|----------|
| **News Brief** | Short, factual, 2-3 paragraphs | Quick updates, breaking news |
| **Full Article** | Comprehensive coverage, multiple sections | In-depth reporting |
| **Executive Summary** | Business-focused, key takeaways | Leadership briefings |
| **Analysis** | Opinion/commentary, explores implications | Thought leadership |

**Custom Prompt:** User can write their own prompt instead of using a preset.

**Settings Integration:**
- All four style prompts are editable in Settings
- Admins can customize prompts to match company voice/format
- Changes apply to all future article generations

---

## Cooking View Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  COOKING                                                     [Settings] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ POSTS ──────────────────────┬─ RESEARCH OUTPUT ────────────────────┐│
│  │                              │                                      ││
│  │ ┌──────────────────────────┐ │ ┌──────────────────────────────────┐ ││
│  │ │ @user1: Breaking news... │ │ │ ## Background                    │ ││
│  │ │ Score: 0.87              │ │ │ Company X announced today...     │ ││
│  │ └──────────────────────────┘ │ │                                  │ ││
│  │ ┌──────────────────────────┐ │ │ ## Key Facts Verified            │ ││
│  │ │ @user2: This confirms... │ │ │ • Revenue up 20% YoY [1]         │ ││
│  │ │ Score: 0.82              │ │ │ • CEO statement from Jan 15 [2]  │ ││
│  │ └──────────────────────────┘ │ │ • Competitor Y also moving [3]   │ ││
│  │ ┌──────────────────────────┐ │ │                                  │ ││
│  │ │ @user3: Just announced...│ │ │ ## Related Context               │ ││
│  │ │ Score: 0.79              │ │ │ Industry trend toward...         │ ││
│  │ └──────────────────────────┘ │ │                                  │ ││
│  │                              │ │ ## Sources                       │ ││
│  │                              │ │ [1] reuters.com/...              │ ││
│  │                              │ │ [2] techcrunch.com/...           │ ││
│  │                              │ │ [3] ft.com/...                   │ ││
│  │                              │ └──────────────────────────────────┘ ││
│  │                              │                             [Edit]   ││
│  └──────────────────────────────┴──────────────────────────────────────┘│
│                                                                         │
│  [Research: Agentic ▼]  [Run Research]   [Style: News Brief ▼]  [Generate] │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## User Stories

### 1. Run Research

**As a content creator,**
I want to run AI research on a group before generating an article
So that I can see verified facts and context

**Acceptance Criteria:**
- Research mode selector (Quick / Agentic / Deep)
- "Run Research" button triggers selected mode
- Loading state while research runs
- Research output appears in right panel
- Can re-run with different mode

---

### 2. Review Research Side-by-Side

**As a content creator,**
I want to see research output alongside the posts
So that I can compare sources with AI findings

**Acceptance Criteria:**
- Split-panel view: Posts left, Research right
- Research shows: Background, Key Facts, Related Context, Sources
- Sources are clickable links
- Clear visual hierarchy

---

### 3. Edit Research Output

**As a content creator,**
I want to edit the research output before generating
So that I can remove irrelevant info, add notes, or correct errors

**Acceptance Criteria:**
- "Edit" button enables editing mode
- Can modify any text in research output
- Can add personal notes/instructions for article generation
- "Reset to Original" option available
- Edits persist until article generated

---

### 4. Generate Article

**As a content creator,**
I want to generate an article using posts + optional research
So that I get a well-informed article (or quick draft without research)

**Acceptance Criteria:**
- "Generate Article" always enabled (research is optional)
- User selects article style (News Brief / Full Article / Executive Summary / Analysis / Custom)
- If custom: user enters their own prompt
- If research exists: uses posts + edited research as context
- If no research: uses posts only (simpler output)
- Article output is plain text with paragraphs (formatted for Teams)
- Article is saved to database
- Article appears for review/refinement

---

### 5. Refine Article (Conversational)

**As a content creator,**
I want to refine the generated article by giving instructions
So that I can adjust tone, add details, or fix issues without regenerating from scratch

**Acceptance Criteria:**
- After article is generated, user sees article + input field for refinement
- User types instruction (e.g., "Make it shorter", "Add more context about the CEO", "Make the tone more formal")
- System uses: current article + research + posts + user instruction to generate refined version
- Refined article replaces previous version (no multiple drafts)
- Refinement history is NOT stored (only latest article version)
- User can refine multiple times until satisfied

**Example Refinement Flow:**
```
User: "Make the opening paragraph more attention-grabbing"
→ AI regenerates with instruction, using full context
→ New article replaces old
→ User can refine again or finalize
```

---

## Technical Implementation

### OpenAI API Integration

**Quick Research:**
```python
response = client.responses.create(
    model="gpt-5-search-api",
    tools=[{"type": "web_search"}],
    input=research_prompt
)
```

**Agentic Research:**
```python
response = client.responses.create(
    model="o4-mini",
    tools=[{"type": "web_search"}],
    input=research_prompt
)
```

**Deep Research:**
```python
response = client.responses.create(
    model="o3-deep-research",
    input=research_prompt
)
```

### Database Schema

```sql
-- Research storage
CREATE TABLE group_research (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) NOT NULL,
    research_mode VARCHAR NOT NULL,      -- 'quick', 'agentic', 'deep'
    original_output TEXT NOT NULL,       -- AI-generated research
    edited_output TEXT,                  -- User-edited version
    sources JSONB,                       -- Source URLs with metadata
    model_used VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Article storage
CREATE TABLE group_articles (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) NOT NULL,
    research_id INTEGER REFERENCES group_research(id),  -- NULL if generated without research
    style VARCHAR NOT NULL,              -- 'news_brief', 'full_article', 'executive_summary', 'analysis', 'custom'
    prompt_used TEXT NOT NULL,           -- The actual prompt used (for custom or resolved preset)
    content TEXT NOT NULL,               -- The generated article (plain text)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()   -- Updated on each refinement
);

-- Article style prompts in system_settings (from Settings feature)
-- Keys: 'article_prompt_news_brief', 'article_prompt_full_article',
--       'article_prompt_executive_summary', 'article_prompt_analysis'
```

### API Endpoints

```
# Research
POST   /api/groups/{id}/research/          # Run research
GET    /api/groups/{id}/research/          # Get research
PUT    /api/groups/{id}/research/          # Save edits

# Article
POST   /api/groups/{id}/article/           # Generate article (style + optional custom prompt)
GET    /api/groups/{id}/article/           # Get current article
PUT    /api/groups/{id}/article/refine/    # Refine article with instruction

# Settings (existing, extended)
GET    /api/settings/article-prompts/      # Get all four style prompts
PUT    /api/settings/article-prompts/      # Update style prompts
```

---

## States

### Cooking View States
| State | Posts Panel | Research Panel | Actions |
|-------|-------------|----------------|---------|
| **Initial** | Shows posts | Empty placeholder | [Run Research] [Generate] both enabled |
| **Researching** | Shows posts | Loading spinner | [Generate] enabled, [Run Research] disabled |
| **Research Complete** | Shows posts | Research output | [Edit] [Re-run] [Generate] |
| **Editing Research** | Shows posts | Editable text | [Save] [Cancel] [Reset] |

### Article View States
| State | Article Panel | Refine Panel | Actions |
|-------|---------------|--------------|---------|
| **Generating** | Loading spinner | Disabled | All buttons disabled |
| **Generated** | Shows article | Input enabled | [Refine] [Copy] [Back] [Publish] |
| **Refining** | Shows article (dimmed) | Loading | Buttons disabled |

---

## Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Auto-run research when entering Cooking? | **No** | User must explicitly trigger research to control costs |
| Show cost estimate before Deep Research? | **No** | Keep UI simple, avoid friction |
| Allow generation without research? | **Yes** | Flexibility - user can skip research for quick drafts |
| Article output format? | **Plain text with paragraphs** | Will be published to Teams |
| Article styles? | **Four presets + custom** | Configurable prompts in Settings |
| Store research & articles? | **Yes** | Both saved to database |
| Multiple article drafts? | **No** | Single version, refined in place |
| How to refine articles? | **Conversational** | User types instruction, AI refines using full context |

---

## Article View Layout (After Generation)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ARTICLE                                                     [Settings] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ GENERATED ARTICLE ─────────────────────────────────────────────────┐│
│  │                                                                     ││
│  │  EU Passes Landmark AI Regulation Bill                              ││
│  │                                                                     ││
│  │  The European Union has passed a comprehensive artificial           ││
│  │  intelligence regulation bill, marking a significant milestone      ││
│  │  in global tech governance.                                         ││
│  │                                                                     ││
│  │  The legislation, approved by a vote of 523-45, establishes         ││
│  │  strict guidelines for AI development and deployment...             ││
│  │                                                                     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌─ REFINE ARTICLE ────────────────────────────────────────────────────┐│
│  │  Type instructions to refine the article...                         ││
│  │  e.g., "Make it shorter" or "Add more context about enforcement"    ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                           [Refine]      │
│                                                                         │
│  [← Back to Research]    [Copy to Clipboard]    [Mark as Published]    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

**End of Brief**

# User Journey - The Klaus Daily News

## Current Implementation Status

**Status:** All core features fully functional
**Last Updated:** 2026-01-30

This document describes what users **CAN currently do** with The Klaus Daily News from a UX/UI/feature perspective, including detailed visual design, interaction patterns, and navigation structure.

---

## Visual Design & Theme

The Klaus Daily News features a modern, professional dark mode interface designed to resemble a newspaper layout.

### Color Scheme
- **Background:** Pure black (#000000) for main areas
- **Surface:** Very dark gray (#0a0a0a) for tiles and cards
- **Borders:** Dark gray (#1a1a1a) with blue highlights on interaction
- **Primary Accent:** Blue (#60a5fa, #3b82f6) for interactive elements
- **Text Colors:**
  - Primary: Light gray (#e2e8f0, #f1f5f9)
  - Secondary: Medium gray (#cbd5e1)
  - Muted: Slate gray (#94a3b8)
- **Status Colors:**
  - Success: Green (#10b981, #6ee7b7)
  - Warning: Amber (#f59e0b, #ffc107)
  - Error: Red (#ef4444, #fca5a5)
  - Info: Blue (#3b82f6, #93c5fd)

### Header Design (Masthead)
- **Title:** "The Klaus Daily News" in newspaper masthead style
- **Current Date:** Displayed below title
- **Layout:** Centered masthead with navigation below
- **Border:** Blue bottom border

### Navigation Links (Main Header)
- **Four Main Links:** Home, Cooking, Serving, Pantry
- **Active Link:** Blue text with blue bottom border
- **Hover Effects:** Text color change, background highlight
- **Transitions:** Smooth animations (0.3s ease)

---

## Application Structure & Navigation

### Main Navigation

**Location:** Top of every page, below masthead
**Layout:** Horizontal navigation bar with four links

**Navigation Items:**
1. **Home** → Routes to `/` (Group browsing in newspaper layout)
2. **Cooking** → Routes to `/cooking` (Research & article generation)
3. **Serving** → Routes to `/serving` (Article review & publishing)
4. **Pantry** → Routes to `/pantry` (System logs)

**Additional Pages (Not in Main Nav):**
- **Settings** → `/kitchen/system` (System configuration)
- **Architecture** → `/architecture` (System overview)

### Route Map

```
/ (root)
├─ /                    → Home page (newspaper-style group browsing)
├─ /cooking             → Cooking page (research & article generation)
├─ /serving             → Serving page (review & publishing)
├─ /pantry              → Pantry page (system logs)
├─ /kitchen/system      → Settings page (system configuration)
└─ /architecture        → Architecture page (system overview)
```

---

## Group Workflow States

Groups flow through four states as users process them:

```
NEW → COOKING → REVIEW → PUBLISHED
```

| State | Where Visible | Description |
|-------|---------------|-------------|
| NEW | Home page | Fresh groups ready to be worked on |
| COOKING | Cooking page | User is researching/generating article |
| REVIEW | Serving page | Article generated, ready to publish |
| PUBLISHED | Archive | Article sent to Teams, workflow complete |

---

## Phase 1: Browse Groups (Home Page) ✅ FULLY FUNCTIONAL

### 1.1 Access the Application
**URL:** `http://localhost:3000`

**Page Layout:**
- **Masthead:** "The Klaus Daily News" with current date
- **Category Navigation:** Horizontal filter bar at top
- **Main Content:** Newspaper-style grid with hero, secondary, and standard articles
- **Sidebar:** Filters, sort options, and ingestion controls

### 1.2 Newspaper-Style Layout

**Hero Story Section:**
- Large featured article at top
- Full-width display with prominent title
- AI-generated summary visible
- "Read More" and "Dismiss" buttons

**Secondary Stories:**
- Two medium-sized articles below hero
- Side-by-side layout
- Truncated summaries with expand option

**Standard Articles Grid:**
- Grid of smaller article cards
- Category badges visible
- Source count indicators
- Quick action buttons

### 1.3 Category Navigation

**Location:** Top of Home page, below masthead
**Features:**
- Horizontal category filter bar
- Badge showing count of groups per category
- Click to filter by category
- "All" option to show everything
- 10 predefined categories: News, Automation, Coding, Content, Research, Policy, Agents, Opensource, Infrastructure, Enterprise

### 1.4 Filter Sidebar

**Location:** Left side of Home page
**Sections:**

**Filters:**
- Worthiness threshold slider (0.0 - 1.0)
- Minimum sources slider (1 - 10)
- Filter by these criteria to narrow results

**Sort Options:**
- By Worthiness (highest first)
- By Sources (most sources first)
- By Newest (most recent first)

**Ingestion Controls:**
- Auto-fetch toggle (enable/disable automatic fetching)
- Manual ingestion trigger button
- Ingest interval selector (5, 15, 30, 60, 120, 360 minutes)
- Posts per fetch input (1-100)
- API call rate calculator
- Next run time display
- Enabled lists count

### 1.5 Real-Time Ingestion Progress

**Location:** Top of Home page when ingestion is running
**Features:**
- Progress bar showing completion percentage
- Current step indicator (Fetching, Categorizing, Scoring, Grouping, Storing)
- Posts processed count
- Posts added count
- Auto-hides after completion

### 1.6 Group Actions

**Read More Button:**
- Selects the group for article generation
- Transitions group from NEW → COOKING
- Navigates user to Cooking page

**Dismiss Button:**
- Archives the group
- Removes from active view
- Preserved for future duplicate matching

---

## Phase 2: Research & Article Generation (Cooking Page) ✅ FULLY FUNCTIONAL

### 2.1 Access Cooking Page
**URL:** `http://localhost:3000/cooking`

**What Users See:**
- List of groups in COOKING state
- Two-panel interface for research and generation
- Full workflow for creating articles

### 2.2 Group Selector

**Location:** Left side of Cooking page
**Features:**
- List of groups currently being worked on
- Shows group title and category
- Click to select group for editing
- Groups automatically appear after "Read More" on Home

### 2.3 Source Posts Panel

**Location:** Left side (below group selector)
**Features:**
- List of all posts in the selected group
- Expandable to show full post content
- Original post text visible
- Author and timestamp shown

### 2.4 Research Module

**Location:** Right side of Cooking page (top section)
**Features:**

**Research Mode Selector:**
- **Quick:** Fast single-pass research (seconds)
- **Agentic:** Iterative research with web search (30s-2min)
- **Deep:** Exhaustive investigation (minutes)

**Research Prompt:**
- Editable textarea with default prompt
- Shows `{{TITLE}}` and `{{SUMMARY}}` placeholders
- Reset button to restore defaults

**Run Research Button:**
- Triggers AI research with selected mode
- Shows loading state during research
- Research output appears below

**Research Output:**
- Displays AI-generated research
- Includes sources list with URLs
- Editable - user can modify before article generation
- Save changes or reset to original

### 2.5 Article Generation Module

**Location:** Right side of Cooking page (bottom section)
**Features:**

**Article Style Selector:**
- **Very Short:** Ultra-brief summary
- **Short:** Brief news item
- **Medium:** Standard article length
- **Long:** Comprehensive coverage
- **Custom:** Full prompt customization

**Style Prompt Preview:**
- Shows template for selected style
- Editable for customization
- Reset to default option

**Generate Article Button:**
- Requires research to be completed first
- Generates article using posts + research context
- Transitions group to REVIEW state
- Auto-navigates to Serving page

### 2.6 Article Editor

**Location:** Appears after article generation
**Features:**
- WYSIWYG editor (Quill.js)
- Edit title, preview text, and content
- Rich text formatting (bold, italic, lists, headers)
- Save/Cancel buttons

**Refinement:**
- Textarea for refinement instructions
- "Refine with AI" button
- Creates new article variant based on instructions
- Example: "Make it shorter" or "Add more context"

### 2.7 Multiple Articles

**Features:**
- Can generate multiple articles for same group
- Navigation arrows to switch between articles
- Each article shows style and timestamp
- Delete option for unwanted articles

---

## Phase 3: Review & Publishing (Serving Page) ✅ FULLY FUNCTIONAL

### 3.1 Access Serving Page
**URL:** `http://localhost:3000/serving`

**What Users See:**
- Groups in REVIEW state with generated articles
- Article preview and editing tools
- Teams publishing controls

### 3.2 Group Selector

**Location:** Left side of Serving page
**Features:**
- List of groups ready for publishing
- Shows which have articles not yet sent
- Click to select for review

### 3.3 Article Display

**Location:** Main content area
**Features:**
- Full article content displayed
- Title prominently shown
- Navigation arrows for multiple articles
- Edit button for modifications

### 3.4 Article Editing

**Features:**
- Same WYSIWYG editor as Cooking page
- Edit title, preview, and content
- Save/Cancel buttons
- Changes persist immediately

### 3.5 Teams Preview Section

**Location:** Below article content
**Features:**
- Preview text display (280 character limit)
- Edit Preview button
- Character counter with visual progress bar
- Color coding: green (safe), gold (90%+), red (at limit)

### 3.6 Publishing Actions

**Copy to Clipboard:**
- Copies article content to clipboard
- Success notification shown

**Send to Teams:**
- Opens channel selection modal
- Lists configured Teams channels
- Select channel and confirm
- Article formatted as Adaptive Card
- Success/error notification
- Group transitions to PUBLISHED state

**Mark as Published:**
- Manual completion without Teams
- Transitions group to PUBLISHED
- Removes from active workflow

**Back to Cooking:**
- Returns group to COOKING state
- Allows further research/editing
- Useful if article needs major revision

### 3.7 AI Refinement

**Location:** Below article
**Features:**
- Same refinement interface as Cooking
- Enter instructions for AI
- Creates refined version
- Useful for last-minute adjustments

---

## Phase 4: System Logs (Pantry Page) ✅ FULLY FUNCTIONAL

### 4.1 Access Pantry Page
**URL:** `http://localhost:3000/pantry`

**What Users See:**
- System log viewer
- Filtering and search tools
- Log cleanup options

### 4.2 Log Statistics

**Location:** Top of Pantry page
**Features:**
- Total logs count
- Error count (highlighted if > 0)
- Time window display

### 4.3 Log Filters

**Filter Options:**
- **Level:** All, DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Category:** All, API, Scheduler, External API, Database
- **Time Window:** Last 1/6/24 hours, Last 3/7 days
- **Refresh Button:** Manually reload logs

### 4.4 Logs Table

**Columns:**
- Timestamp
- Level (color-coded badge)
- Category
- Logger Name
- Message (truncated)
- Details button

**Features:**
- Error rows highlighted in red
- Click Details for full log entry
- Includes stack traces for errors

### 4.5 Log Detail Modal

**Triggered By:** Details button on log row
**Shows:**
- Full timestamp
- Level with color badge
- Logger name
- Category
- Complete message
- Exception details (if error)
- Stack trace (if error)
- Context JSON (if present)
- Correlation ID

### 4.6 Log Cleanup

**Features:**
- Input for retention days (7-90)
- Cleanup Old Logs button
- Confirmation of deleted count
- Minimum 7-day retention enforced

---

## Phase 5: System Configuration (Settings Page) ✅ FULLY FUNCTIONAL

### 5.1 Access Settings Page
**URL:** `http://localhost:3000/kitchen/system`

**Page Layout:**
- Multiple collapsible sections
- Data Sources, Content, and System Control areas
- All settings save automatically

### 5.2 Data Sources Section

**Features:**
- Manage X/Twitter lists
- Add new lists with test connectivity
- Enable/disable lists
- Delete with confirmation
- Export/import lists as JSON
- See last fetch timestamps

### 5.3 Content Section

**Worthiness Subsection:**
- Edit worthiness scoring prompt
- Model and temperature settings
- Save/Reset buttons

**Duplicate Detection Subsection:**
- Edit duplicate detection prompt
- Threshold slider (0.5-1.0)
- Sensitivity guidance (aggressive/balanced/strict)

**Category Filters Subsection:**
- Categorization prompt editor
- Category cards with editable descriptions
- Add new categories
- "Other" category locked (system default)
- Category mismatch log viewer

**Article Style Prompts Subsection:**
- Edit prompts for: Very Short, Short, Medium, Long, Custom
- Each style has independent Save/Reset

**Research Prompt Subsection:**
- Default research prompt editor
- Shows placeholder information

### 5.4 System Control Section

**Ingestion Subsection:**
- Auto-fetch toggle
- Interval selector (5-360 minutes)
- Next run time display
- Manual trigger button
- Posts per fetch input
- API rate calculator with warnings

**Archival Subsection:**
- Archive age input (1-30 days)
- Archive time picker
- Preview count of eligible posts
- Manual trigger button

**Teams Integration Subsection:**
- View configured channels
- Test connectivity
- Configuration info

---

## Phase 6: Architecture Overview ✅ INFORMATIONAL

### 6.1 Access Architecture Page
**URL:** `http://localhost:3000/architecture`

**What Users See:**
- Visual flowchart of system
- Color-coded component boxes
- Data flow arrows
- Technology stack overview

**Architecture Stages:**
1. Data Sources (X/Twitter Lists)
2. Background Scheduler
3. Refetch Prevention
4. AI Processing (OpenAI)
5. Duplicate Detection
6. PostgreSQL Database
7. Frontend + Teams Integration

---

## Complete User Workflow

### Typical Usage Flow:

1. **Home Page:** Browse NEW groups in newspaper layout
2. **Select Group:** Click "Read More" → transitions to COOKING
3. **Cooking Page:** Run research, generate article with desired style
4. **Serving Page:** Review article, edit if needed, send to Teams
5. **Complete:** Group marked as PUBLISHED, removed from workflow

### Quick Publishing Flow:

1. **Home:** Click "Read More" on interesting group
2. **Cooking:** Run quick research, generate short article
3. **Serving:** Review, send to Teams
4. **Done:** Article published in under 5 minutes

### Research-Heavy Flow:

1. **Home:** Select complex topic
2. **Cooking:** Run deep research, review sources
3. **Cooking:** Edit research output, add context
4. **Cooking:** Generate long-form article
5. **Cooking:** Refine with AI instructions multiple times
6. **Serving:** Final review, edit preview text
7. **Serving:** Send to Teams
8. **Done:** Comprehensive article published

---

## What Users CAN Do (Feature Summary)

### Group Management ✅
- Browse groups in newspaper-style layout
- Filter by category
- Filter by worthiness threshold
- Filter by source count
- Sort by various criteria
- Archive (dismiss) unwanted groups
- Select groups for article generation

### Research ✅
- Run AI research in three modes (quick, agentic, deep)
- View and edit research output
- See source URLs from research
- Reset research to original

### Article Generation ✅
- Generate articles in multiple styles
- Customize prompts per style
- Generate multiple articles per group
- Edit articles with WYSIWYG editor
- Refine articles with AI instructions

### Publishing ✅
- Preview articles before sending
- Edit preview text with character limit
- Send to configured Teams channels
- Copy articles to clipboard
- Mark as published without Teams

### Ingestion Control ✅
- Enable/disable auto-fetch
- Trigger manual ingestion
- See real-time progress
- Configure interval and batch size
- Monitor API call rate

### System Monitoring ✅
- View system logs with filtering
- See error counts
- View full log details with stack traces
- Cleanup old logs

### Configuration ✅
- Manage X/Twitter lists
- Edit all AI prompts
- Configure thresholds
- Set archival rules
- Test Teams connectivity

---

## Implemented Features Summary

| Feature | Status |
|---------|--------|
| Newspaper-style group browsing | ✅ |
| Category filtering | ✅ |
| Worthiness/source filtering | ✅ |
| Ingestion controls | ✅ |
| Real-time progress tracking | ✅ |
| Three research modes | ✅ |
| Research editing | ✅ |
| Five article styles | ✅ |
| Article editing (WYSIWYG) | ✅ |
| AI refinement | ✅ |
| Multiple articles per group | ✅ |
| Teams publishing | ✅ |
| Multi-channel support | ✅ |
| System logs viewer | ✅ |
| Settings management | ✅ |
| Prompt customization | ✅ |
| List management | ✅ |
| Import/export | ✅ |

---

**Document Status:**
- ✅ All core workflows documented
- ✅ All UI features covered
- ✅ Navigation structure accurate
- 📝 Last Updated: 2026-01-30

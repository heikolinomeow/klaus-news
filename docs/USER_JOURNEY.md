# User Journey - Klaus News

## Current Implementation Status

**Status:** Core post browsing features fully functional, Settings complete, Research & Article Generation feature added (backend ready, UI incomplete)
**Last Updated:** 2026-01-26

This document describes what users **CAN currently do** with Klaus News from a UX/UI/feature perspective, including detailed visual design, interaction patterns, and navigation structure.

---

## Visual Design & Theme

Klaus News features a modern, professional dark mode interface with carefully crafted visual elements.

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

### Header Design
- **Background:** Linear gradient from #0a0a0a to #1a1a1a (135deg angle)
- **Logo:** "Klaus News" text with blue gradient (#60a5fa to #818cf8) using background-clip technique
- **Border:** 2px solid blue (#3b82f6) at bottom
- **Shadow:** Layered shadows for depth (0 4px 6px rgba(0,0,0,0.8))
- **Layout:** Flexbox with space-between, logo on left, navigation on right

### Navigation Links (Main Header)
- **Default State:** Light gray text (#cbd5e1)
- **Hover Effects:**
  - Text color changes to bright blue (#60a5fa)
  - Background: Semi-transparent blue (#3b82f6 at 10% opacity)
  - Subtle upward translation (-2px)
  - Bottom border appears with blue gradient (80% width)
- **Transitions:** All animations use 0.3s ease timing

### Tile/Card Design
- **Background:** Very dark (#0a0a0a)
- **Border:** 1px solid #1a1a1a (increases to 2px for some elements)
- **Border Radius:** 8-12px depending on element
- **Hover State:**
  - Border color changes to blue (#60a5fa)
  - Slight upward movement (translateY -2px to -4px)
  - Enhanced shadows (0 10px 15px rgba(0,0,0,0.9))
- **Maximum Height:** 600-800px with overflow-y: auto for scrolling

### Button Styles

**Primary Buttons:**
- Background: Blue (#3b82f6)
- Text: White
- Hover: Darker blue (#2563eb) with upward movement
- Shadow: Elevated on hover

**Secondary Buttons:**
- Background: Dark (#1a1a1a)
- Border: 1px solid #2a2a2a
- Text: Light gray (#cbd5e1)
- Hover: Border turns blue, slight upward movement

**Toggle Buttons (Scheduler):**
- Running state: Amber (#f59e0b) background
- Paused state: Green (#10b981) background
- Full width with 10px vertical, 16px horizontal padding

### Form Elements
- **Inputs/Textareas/Selects:**
  - Background: Pure black (#000000)
  - Border: 1px solid #2a2a2a
  - Text: Light gray (#e2e8f0)
  - Focus: Blue border (#60a5fa) with 3px shadow ring
- **Range Sliders:**
  - Track: Dark (#1a1a1a), 6px height
  - Thumb: Blue circle (#60a5fa), 18px diameter with shadow
- **Checkboxes:**
  - Accent color: Blue (#60a5fa)
  - 16px size with 8px right margin

### Typography
- **Font Family:** System fonts (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell)
- **Heading Sizes:**
  - H1: 2rem (page titles) to 2.5rem (major sections)
  - H2: 1.25-1.5rem (tile titles)
  - H3: 1-1.1rem (section headers)
  - H4: 0.95rem (subsection headers)
- **Body Text:** 0.875rem (14px) for most content
- **Help Text:** 0.8125rem (13px) for secondary information
- **Line Height:** 1.4-1.5 for readability

### Interactive Patterns

**Collapsible Sections:**
- Header shows section name and arrow icon (▼)
- Click to expand/collapse
- Arrow rotates 180° when expanded
- Header background darkens and border turns blue when active
- Content animates max-height (0 → 2000px) over 0.3-0.5s
- Smooth easing (ease-out for collapse, ease-in for expand)

**Loading States:**
- Simple text: "Loading..." for data fetch
- Button text changes: "Test Connection" → "Testing..."
- Disabled state: Opacity 0.5, cursor not-allowed

**Feedback Messages:**
- Appear below relevant section
- Border-left accent (3px solid) in status color
- Padding: 10-12px vertical, 12-16px horizontal
- Auto-dismiss after 2-3 seconds for success, 3s for errors

**Table Interactions:**
- Row borders: 1px solid #1a1a1a
- Button hover: Background darkens, blue border appears
- Delete buttons: Red text (#f87171), red background on hover
- Link colors: Blue (#60a5fa) with underline on hover

---

## Application Structure & Navigation

### Main Navigation (Application Header)

**Location:** Top of every page, fixed header
**Layout:** Horizontal navigation bar with logo and links

**Navigation Items:**
1. **Klaus News** (Logo/Home link) - Not clickable, just branding
2. **New** → Routes to `/` (Home page - post browsing)
3. **Cooking** → Routes to `/cooking` (Placeholder page)
4. **Settings** → Routes to `/settings/system` (Settings area)

**Visual Behavior:**
- Active link detection via React Router location
- Hover effects: Color change, background highlight, bottom border animation
- Mobile responsive (though not fully optimized yet)

### Settings Sub-Navigation

**Location:** Within Settings area only, below page title
**Layout:** Horizontal tab bar with bottom border
**Route Structure:**
- `/settings/system` - System Settings page (default)
- `/architecture` - Architecture visualization page

**Tab Behavior:**
- Active tab: Blue text (#60a5fa), blue bottom border (2px)
- Inactive tabs: Gray text (#94a3b8)
- Hover: Background darkens, text lightens
- Smooth transitions on all state changes

### Page-Level Controls (Home Page)

**Location:** Within Home page content area, above post list
**Type:** Toggle buttons (not navigation links)
**Options:**
- "Recommended" - Shows filtered posts (default active)
- "All Posts" - Shows complete list

**Visual State:**
- Active button has "active" class (visually highlighted)
- Clicking switches view without changing URL
- Data refetches on view change

### Route Map

```
/ (root)
├─ / → Home page (post browsing)
├─ /cooking → Cooking page (placeholder)
├─ /settings/system → Settings page with System sub-nav active
├─ /architecture → Architecture page with Architecture sub-nav active
└─ [No /prompts route - prompts are embedded in /settings/system]
```

**Important:** There is NO separate `/prompts` route. Prompts are managed inline within the Settings page's Content tile through collapsible sections.

---

## Prerequisites for Full Functionality

For the application to display content, posts must exist in the database. Posts are ingested based on the configured schedule (default: every 30 minutes, adjustable via Settings page from 5 minutes to 6 hours) via background scheduler once the system is running with valid API credentials.

**Configuration Options:**
- Settings can be managed via web UI at `http://localhost:3000/settings`
- No backend restart required for configuration changes
- Initial configuration values can be set via `.env` file or managed through Settings page

**Initial State:**
- Fresh installation → empty database → UI shows "No posts available"
- After scheduler runs → posts ingested → UI displays content

**Duplicate Prevention:**
- The system ensures no post is fetched twice from X/Twitter
- Each list tracks its last fetched position independently
- Even manual "fetch now" triggers respect this - recently fetched lists may return few or no new posts

---

## Phase 0: System Configuration ✅ FULLY FUNCTIONAL

Before browsing posts, users can configure system behavior through the Settings page.

### 0.1 Access Settings
**URL:** `http://localhost:3000/settings/system`

**Page Layout:**
- **Header:** "Settings" page title (H1, 2rem, light gray)
- **Sub-Navigation:** Two tabs - "System" (active) and "Architecture"
- **Main Content:** 3-column grid layout with three primary tiles

**The Three Tiles:**
1. **Data Sources** (Left column)
   - Manages X/Twitter lists
   - Contains Data Source Manager component

2. **Content** (Middle column)
   - Contains 4 collapsible sections (accordion pattern)
   - Each section has embedded prompt management
   - Sections: Worthiness, Duplicate Detection, Category Filters, Articles

3. **System Control** (Right column)
   - Contains 2 collapsible sections (accordion pattern)
   - Sections: Ingestion, Archival
   - Manual trigger buttons for operations

**Visual Structure:**
- Grid: `grid-template-columns: repeat(3, 1fr)`
- Gap: 24px between tiles
- Each tile: Dark background (#0a0a0a), 1px border (#1a1a1a), 12px border-radius
- Tile titles: H2 with blue bottom border (2px solid #3b82f6)
- Maximum tile height: 800px with vertical scroll if content exceeds

**What Users See:**
- All three tiles visible simultaneously on screen
- Current configuration values displayed within each section
- Real-time validation feedback via colored message boxes
- Per-section and per-prompt Save/Reset buttons
- Collapsible sections start collapsed (user clicks to expand)

### 0.2 Manage Data Sources
**User Action:** Navigate to `/settings/system`, view Data Sources tile (left column)

**Tile Structure:**

**Header Section:**
- **Title:** "X Lists" (H3, left-aligned)
- **Action Buttons:** (Right-aligned in header)
  - "Import Lists" button (secondary style)
  - "Export Lists" button (secondary style)

**Add New List Form:**
- **Title:** "+ Add New List" (H4)
- **Input Field 1:** "List ID (e.g., 1234567890)" placeholder
  - Text input, full width
  - Stores X/Twitter list ID
- **Input Field 2:** "List Name (optional)" placeholder
  - Text input, full width
  - Optional friendly name
- **Action Button:** "Test Connection"
  - Changes to "Testing..." when active
  - Disabled if List ID field is empty
  - Tests connectivity before adding to database
- **Test Result Display:**
  - Appears below button after test completes
  - Green box with "✓ [message]" for valid lists
  - Red box with "✗ [message]" for errors
  - If valid: List is automatically saved and form clears
  - If invalid: Temporary list is deleted, user can retry

**Lists Table:**
- **Columns:**
  1. **List ID:** Monospace font, clickable link to `https://x.com/i/lists/{list_id}`
  2. **Name:** Display name of the list
  3. **Status:**
     - "✓ Enabled" (green text) or "○ Disabled" (gray text)
  4. **Last Fetch:**
     - Relative time display ("5 minutes ago", "2 hours ago", etc.)
     - Color-coded by freshness:
       - Green: Recent fetch (< 1 hour)
       - Yellow: Stale (1-24 hours)
       - Red: Very old (> 24 hours) or error
     - Shows "Never" if not yet fetched
  5. **Actions:**
     - "Enable" or "Disable" button (toggles enabled state)
     - "Delete" button (red text, shows confirmation dialog)

**What Users Experience:**
- ✅ View all configured X/Twitter lists with last fetch timestamps
- ✅ Add new X lists by entering list ID and optional name
- ✅ Test list connectivity before saving (automatic workflow)
- ✅ Enable/disable lists without deleting them (preserves configuration)
- ✅ Remove lists permanently with "Are you sure?" confirmation dialog
- ✅ Color-coded status indicators (Green: recent, Yellow: stale, Red: error/old)
- ✅ Export all lists to JSON file with header button (downloads file)
- ✅ Import lists from JSON file with header button (merge behavior)
- ✅ List IDs are clickable links to view lists on X/Twitter
- ✅ Table automatically refreshes after any changes

**UX Notes:**
- Import/Export buttons are in the tile header, not in a separate section
- Test Connection workflow is automatic: test → save if valid → clear form
- No manual "Add" button - adding happens through Test Connection
- Delete requires explicit confirmation to prevent accidents

### 0.3 Configure Content Filtering & AI Prompts
**User Action:** Navigate to `/settings/system`, view Content tile (middle column)

**Tile Structure:** The Content tile contains 4 collapsible sections with embedded prompt management.

---

#### Section 1: Worthiness (Collapsible)

**Click header to expand/collapse**

**What's Inside:**

**Embedded Prompt Tile: `score_worthiness`**
- Full prompt configuration displayed inline
- **Fields:**
  - Prompt Text: Large textarea (15 rows, monospace font)
  - Model: Dropdown (GPT-5.2, GPT-5.1, GPT-5, GPT-5 Mini, GPT-4.1, GPT-4.1 Mini, and legacy models)
  - Temperature: Range slider (0.0 - 2.0, shows value like "1.20")
  - Max Tokens: Number input (10 - 4000)
  - Description: Text input (optional)
- **Actions:**
  - "Reset" button: Reverts to default prompt (confirmation required)
  - "Save" button: Saves changes, shows "✓ Saved" feedback
- **Feedback:** Temporary message appears above form ("Saving...", "✓ Saved", "✗ Failed")

**Worthiness Threshold Controls:**
- **H4 Title:** "Worthiness Threshold"
- **Description:** "Control how selective the AI is when recommending posts for article generation."
- **Range Slider:**
  - Min: 0.0, Max: 1.0, Step: 0.05
  - Current value displayed to right of slider (e.g., "0.60")
  - Saves on mouseUp/touchEnd (not while dragging)
- **Help Text:**
  - Shows current threshold value
  - Color-coded guidance:
    - Red: "Very permissive - most posts will be recommended" (< 0.4)
    - Yellow: "Balanced - moderate filtering" (0.4 - 0.69)
    - Green: "Strict - only high-quality posts recommended" (≥ 0.7)

**What Users Experience:**
- ✅ Edit AI prompt that scores post worthiness
- ✅ Adjust model, temperature, max tokens for scoring
- ✅ Adjust worthiness threshold slider (0.0 - 1.0, step 0.05)
- ✅ See real-time feedback on threshold level (permissive/balanced/strict)
- ✅ Save prompt changes independently with per-prompt Save button
- ✅ Reset prompt to defaults with confirmation dialog
- ✅ Changes apply immediately to Recommended view on next load

---

#### Section 2: Duplicate Detection (Collapsible)

**Click header to expand/collapse**

**What's Inside:**

**Embedded Prompt Tile: `detect_duplicate`**
- Same structure as score_worthiness prompt tile
- Full inline editing of prompt text, model, temperature, max tokens, description
- Independent Save and Reset buttons

**Duplicate Detection Threshold Controls:**
- **H4 Title:** "Duplicate Detection Threshold"
- **Description:** "Controls the AI confidence required to group posts as duplicates. Lower values mean more aggressive grouping."
- **Range Slider:**
  - Label: "AI Confidence Threshold"
  - Min: 0.5, Max: 1.0, Step: 0.05
  - Current value displayed (e.g., "0.85")
  - Saves on mouseUp/touchEnd
- **Help Text:**
  - Shows current threshold value (0.5 = aggressive grouping, 1.0 = strict matching)
  - Color-coded guidance:
    - Red: "Aggressive - more posts grouped together" (< 0.7)
    - Green: "Balanced - recommended setting" (0.7 - 0.89)
    - Yellow: "Strict - only highly similar posts grouped" (≥ 0.9)

**What Users Experience:**
- ✅ Edit AI prompt for duplicate detection
- ✅ Adjust duplicate threshold slider (0.5 - 1.0, step 0.05)
- ✅ See guidance on sensitivity level (loose/balanced/strict)
- ✅ Save prompt changes independently
- ✅ Reset prompt to defaults

---

#### Section 3: Category Filters (Collapsible)

**Click header to expand/collapse**

**What's Inside:**

The Category Filters section contains **three subsections**:

**Subsection 1: Categorization Prompt**
- PromptTile showing `categorize_post` skeleton with `{{CATEGORIES}}` placeholder visible
- Includes [Edit] and [Reset] buttons
- Placeholder is replaced at runtime with category definitions

**Subsection 2: Categories List**
- Editable cards for each user-defined category (name displayed, description in editable textarea with [Save] button)
- "Other" card shown with lock icon (🔒), non-editable
- [+ Add New Category] button below category list
- Helper text: "Category names cannot be changed or deleted to preserve existing post assignments. Descriptions can be edited anytime."

**Subsection 3: Category Matching Stats**
- Displays mismatch count (e.g., "Category mismatches: 12")
- Description: "Posts where AI returned unrecognized category and fell back to 'Other'"
- Includes [View Log] and [Clear] buttons

**What Users Experience:**
- ✅ Edit AI prompt for post categorization (with `{{CATEGORIES}}` placeholder visible)
- ✅ View all user-defined categories as editable cards
- ✅ Edit category descriptions (Save button per card)
- ✅ Add new categories via [+ Add New Category] modal
- ✅ See "Other" category with lock icon (non-editable)
- ✅ View category mismatch count and log
- ✅ Clear mismatch log via [Clear] button
- ✅ Cannot delete, rename, or reorder categories (preserves data integrity)

#### Add New Category Modal

**Triggered by:** [+ Add New Category] button in Categories List

**Modal Contents:**
- **Name field**: Label "Name (cannot be changed later)"
- **Description field**: Label "Description (can be edited anytime)"
- **Warning text**: "Category name is permanent once created."
- **Buttons**: [Cancel] and [Create Category]

**Validation:**
- Name must be unique (not match existing category)
- Name cannot be "Other" (reserved)
- Name: 1-50 characters
- Description: 1-300 characters

#### Category Mismatch Log Modal

**Triggered by:** [View Log] button in Category Matching Stats

**Modal Contents:**
- **Header**: "These posts received unrecognized category responses from AI and were assigned to 'Other'."
- **Entry format**: Timestamp, AI response, expected categories, post snippet, assigned category
- **Button**: [Clear All Logs]

**Behavior:**
- Displays up to 100 entries (oldest removed when limit reached)
- Cleared via [Clear All Logs] button (calls PUT /api/settings/category_mismatches with empty array)

---

#### Section 4: Articles (Collapsible)

**Click header to expand/collapse**

**What's Inside:**

**Three Embedded Prompt Tiles (stacked vertically):**

1. **`generate_article` Prompt Tile**
   - Controls article generation from posts
   - Full inline editing capability
   - Independent Save and Reset buttons

2. **`generate_title` Prompt Tile**
   - Controls article title generation
   - Full inline editing capability
   - Independent Save and Reset buttons

3. **`suggest_improvements` Prompt Tile**
   - Controls article improvement suggestions
   - Full inline editing capability
   - Independent Save and Reset buttons

**Each Prompt Tile Contains:**
- Prompt text textarea
- Model dropdown
- Temperature slider
- Max tokens input
- Description field
- Save and Reset buttons

**What Users Experience:**
- ✅ Edit all three article-related AI prompts in one section
- ✅ Save each prompt independently
- ✅ Reset each prompt to defaults independently
- ✅ All prompts displayed inline, no navigation required


**Article Style Prompts (Four Presets):**

Settings now includes four article style prompts that control article generation:
- article_prompt_news_brief: Template for short, factual updates
- article_prompt_full_article: Template for comprehensive coverage
- article_prompt_executive_summary: Template for business-focused summaries
- article_prompt_analysis: Template for opinion/commentary pieces

Each prompt is editable via Settings → Content tile → Articles section. Changes apply to all future article generations.

---

**Important Content Tile Notes:**
- All sections start collapsed (user must click headers to expand)
- Collapsible animation: Smooth max-height transition (0.3-0.5s)
- Arrow icon (▼) rotates 180° when section expands
- Active section header: Blue border (#60a5fa) and darker background
- Users can have multiple sections open simultaneously
- Scrolling within tile if content exceeds 800px max height
- No separate `/prompts` route - all prompt management happens here inline

### 0.4 System Control & Scheduling
**User Action:** Navigate to `/settings/system`, view System Control tile (right column)

**Tile Structure:** The System Control tile contains 2 collapsible sections for ingestion and archival management.

**Operation Feedback Banner:**
- Appears at top of tile when operations are running/complete
- Color-coded backgrounds:
  - Info (blue): "Triggering ingestion..." or "Triggering archival..."
  - Success (green): "✓ Ingestion completed successfully" or "✓ Archival completed successfully"
  - Error (red): "✗ Ingestion failed" or "✗ Archival failed"
- Auto-dismisses after 3 seconds
- Prevents multiple simultaneous operations

---

#### Section 1: Ingestion (Collapsible)

**Click header to expand/collapse**

**What's Inside:**

**Subsection: Auto-Fetch Enabled/Disabled**
- **H4 Title:** "Auto-Fetch Enabled/Disabled"
- **Description:** "Control whether the system automatically fetches new posts from X lists."
- **Toggle Button:**
  - Full width, rounded corners
  - Running state: "⏸ Disable Auto-Fetch" (amber background #f59e0b)
  - Paused state: "▶ Enable Auto-Fetch" (green background #10b981)
  - Click to toggle on/off
- **Status Display:**
  - "Status: **ENABLED**" or "Status: **DISABLED**"
  - Help text explaining current behavior
- **Behavior:** Saves immediately when toggled

**Subsection: Ingestion Interval**
- **H4 Title:** "Ingestion Interval"
- **Description:** "Control how often the system fetches new posts from X lists."
- **Dropdown Select:**
  - Options: 5, 15, 30, 60, 120, 360 minutes
  - Default: 30 minutes
  - Saves on change
- **Next Run Indicator:**
  - Blue box with left border accent
  - Text: "Next run: in X minutes"
  - Updates every 30 seconds automatically
- **Help Text:** "Changes apply to next scheduled job (no restart required)"

**Subsection: Manual Ingestion Trigger**
- **H4 Title:** "Manual Ingestion Trigger"
- **Action Button:** "Trigger Ingestion Now"
  - Full width, primary blue style
  - Disabled during operation
- **Description:** "Fetch new posts from all enabled X/Twitter lists immediately"
- **Behavior:**
  - Shows "Triggering ingestion..." feedback at top
  - Waits for completion
  - Shows success or error feedback
  - Refreshes next run time display

**Subsection: Posts Per Fetch**
- **H4 Title:** "Posts Per Fetch"
- **Description:** "Control how many posts are fetched from each list per cycle."
- **Number Input:**
  - Min: 1, Max: 100
  - Saves on blur (when user leaves field)
- **API Rate Calculator:**
  - Blue box with left border accent
  - **Formula display:** "X posts × Y lists × Z cycles/hour = ABC calls/hour"
  - Updates in real-time as values change
  - Calculation: posts_per_fetch × enabled_lists × (60 / interval_minutes)
- **Warning Banner:**
  - Appears if estimated calls > 50 per hour
  - Amber background with left border
  - Text: "Warning: High API call rate may exceed X API limits"

**What Users Experience:**
- ✅ Enable/disable automatic fetching with toggle button
- ✅ See current auto-fetch status (ENABLED/DISABLED)
- ✅ Adjust ingestion frequency (5 to 360 minutes)
- ✅ See next scheduled run time (updates every 30s)
- ✅ Trigger manual ingestion immediately
- ✅ Adjust posts fetched per cycle (1-100)
- ✅ See estimated API calls per hour with live calculation
- ✅ Get warning if API rate may exceed limits
- ✅ All changes apply without restart

---

#### Section 2: Archival (Collapsible)

**Click header to expand/collapse**

**What's Inside:**

**Subsection: Archival Settings**
- **H4 Title:** "Archival Settings"
- **Description:** "Configure automatic archival of old groups."

**Note:** Archival now operates at the group level. Groups (not individual posts) are archived based on age criteria.
- **Archive Age Input:**
  - Number input: 1-30 days
  - Label: "Archive Age (days):"
  - Saves on blur
  - Triggers preview count reload
- **Archive Time Input:**
  - Time picker input (HH:MM format)
  - Label: "Archive Time:"
  - Sets hour of day for archival job
  - Converts to hour (0-23) for backend
- **Help Text:**
  - "Posts older than X days will be archived at HH:MM"
- **Archive Preview:**
  - Green box with left border accent
  - Text: "**Posts eligible for archival:** X"
  - Updates when age changes
  - Shows count of posts that would be archived

**Subsection: Manual Archival Trigger**
- **H4 Title:** "Manual Archival Trigger"
- **Action Button:** "Trigger Archival Now"
  - Full width, primary blue style
  - Disabled during operation
- **Description:**
  - "Archive old posts based on current archive settings"
  - Shows eligible count: "(X posts eligible)"
- **Behavior:**
  - Shows "Triggering archival..." feedback at top
  - Waits for completion
  - Shows success or error feedback
  - Refreshes preview count

**What Users Experience:**
- ✅ Set archival age (1-30 days)
- ✅ Set archival time (hour of day)
- ✅ See preview count of posts eligible for archival
- ✅ Trigger manual archival immediately
- ✅ Preview updates automatically when age changes
- ✅ Confirmation message on successful archival

---

**Important System Control Notes:**
- Both sections start collapsed
- Operation feedback banner appears at tile top (above sections)
- Manual trigger buttons are disabled while operations run
- All settings save automatically (no tile-level save button)
- Next run time refreshes automatically every 30 seconds

### 0.5 View System Architecture
**User Action:** Navigate to `/architecture` by clicking "Architecture" tab in Settings sub-navigation

**Page Layout:**
- **Header:** "Settings" page title (shared with System Settings)
- **Sub-Navigation:** Two tabs - "System" and "Architecture" (active)
- **Main Content:** Architecture visualization container

**What Users See:**

**Visual Flow Diagram:**
- Vertical flow chart showing system architecture
- Color-coded boxes with gradient backgrounds
- Blue arrows (↓) between stages showing data flow
- Centered layout, max-width 800px

**Architecture Stages (Top to Bottom):**

1. **Data Sources**
   - Green border (#10b981)
   - Dark green gradient background
   - Text: "X/Twitter Lists"

2. **Background Scheduler**
   - Amber border (#f59e0b)
   - Dark amber gradient background
   - Text: "Runs every 30 minutes", "Fetches 5 posts per list"

3. **AI Processing (Side-by-Side Layout)**
   - **Left Box: AI Processing (OpenAI)**
     - Purple border (#8b5cf6)
     - Dark purple gradient background
     - Bullet list:
       - Categorization (Technology, Politics, etc.)
       - Title Generation
       - Summary Generation
       - Worthiness Scoring
       - Duplicate Detection
   - **Right Box: Duplicate Detection**
     - Pink border (#ec4899)
     - Dark pink gradient background
     - Bullet list:
       - AI Semantic Title Comparison
       - Configurable similarity threshold

4. **PostgreSQL Database**
   - Blue border (#3b82f6)
   - Dark blue gradient background
   - Text: "Posts, Articles, Lists, Settings"

5. **Output (Side-by-Side Layout)**
   - **Left Box: Frontend (React)**
     - Cyan border (#06b6d4)
     - Dark cyan gradient background
     - Bullet list:
       - Post Browsing
       - Recommended View
       - Settings Management
   - **Right Box: Teams Integration**
     - Indigo border (#6366f1)
     - Dark indigo gradient background
     - Text: "Publish articles to Microsoft Teams"

**Interaction:**
- Each box has hover effect: border changes to blue, slight upward movement
- Boxes have subtle shadows that increase on hover
- No interactive functionality beyond hover states

**What Users Experience:**
- ✅ Visual overview of system architecture
- ✅ Clear data flow from sources to output
- ✅ Color-coded components for easy identification
- ✅ Understanding of AI processing pipeline
- ✅ See which technologies are used (OpenAI, PostgreSQL, React, Teams)

**UX Notes:**
- Purely informational page, no configuration options
- Helps users understand how the system works
- Useful for onboarding and troubleshooting
- Values in boxes (e.g., "30 minutes", "5 posts") are static text, not live data

### 0.6 System Logs & Monitoring
**User Action:** Navigate to `/settings/system`, expand "System Logs" section in System Control tile (right column)

**Section Structure:**

**Header Section:**
- **Title:** "System Logs" (H3, left-aligned)
- **Error Badge:** If errors exist, displays count (e.g., "3 errors") in red badge
- **Expand Icon:** Arrow icon (▼) rotates when section expands

**Stats Cards (When Expanded):**
Three stat cards displayed in grid layout:
1. **Total Logs:** Shows count of all logs in time window (blue accent)
2. **Errors:** Shows ERROR + CRITICAL count (red text)
3. **Time Window:** Shows current filter (e.g., "24h")

**Filters Section:**
Four filter controls side-by-side:
- **Level Dropdown:** All, DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Category Dropdown:** All, API, Scheduler, External API, Database
- **Hours Dropdown:** Last 1 hour, Last 6 hours, Last 24 hours, Last 3 days, Last 7 days
- **Refresh Button:** Manually reload logs (secondary style)

**Recent Logs Table:**
- **Columns:**
  1. **Timestamp:** Formatted date/time (e.g., "1/27/2026, 3:45:12 PM")
  2. **Level:** Color-coded badge (DEBUG: gray, INFO: blue, WARNING: yellow, ERROR: red, CRITICAL: dark red)
  3. **Category:** API, Scheduler, External API, Database, or "N/A"
  4. **Logger:** Logger name (e.g., "klaus_news.x_client") in monospace font with purple color
  5. **Message:** Log message (truncated with ellipsis if long)
  6. **Actions:** "Details" button (secondary style)
- **Row Highlighting:**
  - ERROR and CRITICAL logs have red background tint (rgba(239, 68, 68, 0.1))
  - All rows have hover effect
- **Empty State:** "No logs found for the selected filters." if no logs match

**Log Cleanup Section:**
- **Title:** "Log Cleanup" (H4)
- **Description:** "Delete logs older than a specified number of days."
- **Days Input:** Number field (min 7, max 90, default 7)
- **Cleanup Button:** "Cleanup Old Logs" (primary style, disabled during operation)
- **Help Text:** "This will delete all logs older than X days. Minimum 7 days retention."

**Log Detail Modal (When Details Clicked):**
- **Modal Header:** "Log Details" with close button (×)
- **Modal Body Sections:**
  - **Timestamp:** Full timestamp display
  - **Level:** Level badge (color-coded)
  - **Logger:** Logger name
  - **Category:** Category or "N/A"
  - **Message:** Full message in pre-formatted block
  - **Exception Type:** (If error) Exception class name in red
  - **Exception Message:** (If error) Error message in pre-formatted block
  - **Stack Trace:** (If error) Full stack trace in monospace font with scrolling
  - **Context:** (If present) JSON context as formatted code block
  - **Correlation ID:** (If present) ID for tracing related logs
- **Modal Footer:** "Close" button (primary style)

**What Users Experience:**
- ✅ View all application logs with historical storage (7-day retention by default)
- ✅ See X API errors (like 402 Payment Required) that were previously hidden
- ✅ Track scheduler job execution and failures
- ✅ Filter logs by level, category, and time range
- ✅ See error count badge in section header for quick status
- ✅ Click on any log to view full details including stack traces
- ✅ Manually cleanup old logs (7-90 days configurable)
- ✅ Color-coded level badges for quick identification
- ✅ Real-time filtering updates table instantly
- ✅ Logs automatically retained for configured period (daily cleanup at 4 AM)

**Technical Visibility:**
- **X API Errors:** Previously silent 402 errors now visible with status code and response body
- **Scheduler Jobs:** Start/completion of ingestion and archival jobs logged
- **OpenAI Calls:** API calls with parameters and success/failure status
- **Teams Posts:** Webhook posting attempts with results
- **Database Operations:** Connection issues and query failures

**UX Notes:**
- Error badge in section header provides at-a-glance status
- Default 24-hour window focuses on recent activity
- Table rows with errors are highlighted in red for immediate attention
- Stack traces are scrollable to avoid modal overflow
- Context JSON is pretty-printed for readability
- Logger names use monospace font to indicate technical nature
- Cleanup enforces 7-day minimum to prevent accidental data loss

**Use Cases:**
- **Debugging API Issues:** View X API 402 errors to diagnose credit depletion
- **Monitoring Health:** Check error count badge for system health
- **Troubleshooting:** View stack traces when articles fail to generate
- **Audit Trail:** Review scheduler job execution history
- **Performance:** Track OpenAI API response times via log timestamps

---

### 0.7 Cooking Page (Placeholder)
**User Action:** Navigate to `/cooking` by clicking "Cooking" link in main header navigation

**Page Layout:**
- Full-width container with centered content
- Minimal design

**What Users See:**
- **Title:** "Cooking" (H1, 2.5rem, bold, light gray)
- **Message:** "Coming soon..." (1.25rem, gray text)
- Centered text alignment
- Large padding (40px)

**What This Is:**
- Reserved route for Cooking workflow (Research & Article Generation)
- Backend fully implemented, UI not built
- Will contain split-panel view: Posts (left) + Research Output (right)
- Action bar will have: Research mode selector, Run Research button, Style selector, Generate Article button

**What Users Experience:**
- ✅ Can navigate to page from main header
- ✅ Clear indication this is a future feature
- ✅ No errors or broken functionality
- ⚠️ No actual content or features available

**UX Notes:**
- Common pattern to reserve navigation for planned features
- Users understand this is not yet implemented
- Page exists in navigation to show product roadmap

---

## Phase 2: Cooking Workflow (Research & Article Generation)

### Phase 2: Cooking Workflow ✅ BACKEND READY, ❌ UI NOT IMPLEMENTED

The Cooking workflow enables users to generate articles from grouped posts with optional AI research.

#### 2.1 Group State Machine
**States:** NEW → COOKING → REVIEW → PUBLISHED
- NEW: Fresh groups ready for article generation
- COOKING: Group undergoing research/article preparation
- REVIEW: Article generated, ready for refinement
- PUBLISHED: Article finalized and posted

#### 2.2 Research Workflow (Optional)
**Three Research Modes:**
- **Quick Research:** gpt-5-search-api, single search pass, fast (seconds), low cost
- **Agentic Research:** o4-mini + web_search, iterative reasoning, medium speed (30s-2min), medium cost (default)
- **Deep Research:** o3-deep-research, exhaustive investigation, slow (minutes), high cost

**User Actions (When UI Implemented):**
- Select research mode from dropdown
- Click 'Run Research' to execute
- View research output in right panel (Background, Key Facts, Related Context, Sources)
- Edit research output before article generation
- Reset to original research if needed

#### 2.3 Article Generation
**Article Styles (Four Presets + Custom):**
- News Brief: Short, factual, 2-3 paragraphs
- Full Article: Comprehensive coverage, multiple sections
- Executive Summary: Business-focused, key takeaways
- Analysis: Opinion/commentary, explores implications
- Custom: User-defined prompt

**Generation Modes:**
- With Research: Uses posts + edited research as context
- Without Research: Uses posts only for quick drafts

**Backend Status:** ✅ Fully implemented
**Frontend Status:** ❌ UI not built

#### 2.4 Article Refinement
**Conversational Refinement:**
- User provides instruction (e.g., 'Make it shorter', 'Add more context')
- System uses: current article + research + posts + instruction
- Refined article replaces previous version (no draft history)
- Can refine multiple times until satisfied

**Backend Status:** ✅ Fully implemented
**Frontend Status:** ❌ UI not built

---

### 0.7 Database Backup & Restore
**User Action:** Use command-line backup/restore scripts

**What Users Experience:**
- ✅ Run `./backup_db.sh` to create timestamped SQL backup in `./backups/` directory
- ✅ Run `./restore_db.sh <backup_file.sql>` to restore from backup with confirmation prompt
- ✅ Backups survive `docker-compose down -v` (stored outside volumes)
- ✅ Scripts display backup size and success confirmation

**UX Notes:**
- Restore operation shows warning about data overwrite
- Scripts require postgres container to be running

---

## Current User Journey

**Note:** Users can now configure system behavior via Settings page before browsing posts. See Phase 0: System Configuration above.

### Phase 1: Browse Posts ✅ FULLY FUNCTIONAL

Users can browse and explore AI-curated posts from X (Twitter):

#### 1.1 Access the Application
**URL:** `http://localhost:3000`

**Page Layout:**

**Header Section (Fixed at top):**
- **Logo:** "Klaus News" with blue gradient text
- **Navigation Links:** "New" (active), "Cooking", "Settings"
- Gradient background (#0a0a0a to #1a1a1a)
- Blue bottom border (2px solid #3b82f6)
- Drop shadow for depth

**Main Content Area:**
- Black background (#000000)
- Padding: 32px horizontal, 40px vertical
- Centered content layout

**What Users See:**
- Clean dark interface with professional styling
- Main header with navigation always visible
- View toggle buttons: "Recommended" and "All Posts"
- Loading state: Simple text "Loading..." while data fetches
- Post list in card layout OR empty state message
- No page title H1 (relies on header branding)

#### 1.2 View Recommended Posts
**User Action:** Click "Recommended" button (default active view)

**View Toggle Button UI:**
- Two buttons side-by-side at top of page
- "Recommended" button has "active" class (visually highlighted)
- "All Posts" button is secondary state
- Clicking switches view and refetches data from API

**Post Display:**

**Post List Container:**
- Vertical stack of post cards
- No grouping by category in UI (flat list)
- Groups displayed with representative title, expand/collapse to see post variations (V-5)

**Group Card Display (V-6/V-7):**
- Each group displayed as card with representative title
- Category badge shows content type
- Post count displays as "N sources"
- First seen date shown
- Expand arrow to view underlying posts
- "Write Article" button on group header (V-8)
- "Archive" button on group header (V-9)

**Each Post Card Contains:**
- **Title (H3):**
  - AI-generated title or "Untitled" fallback
  - Bold font, larger text
  - Primary text color (#f1f5f9)
- **Summary (Paragraph):**
  - AI-generated summary or original_text fallback
  - 2-3 sentences
  - Secondary text color (#94a3b8)
  - Class: "post-summary"
- **Metadata Row:**
  - **Category Badge:**
    - Shows category name (Major News, Automation, Coding, Content Creation, Other)
    - Or "Uncategorized" if missing
    - Styled with "post-category" class
  - **Worthiness Score:**
    - Format: "Score: 0.XX" (two decimal places)
    - Only shown if score exists
    - Styled with "post-score" class

**Card Interaction:**
- Entire card is clickable (onClick handler)
- Cursor changes to pointer on hover
- Visual hover state (border/background change)
- Click triggers post selection API call

**What Users Experience:**
- ✅ See posts with worthiness score ≥ configured threshold (default 0.6)
- ✅ Posts filtered by AI quality assessment
- ✅ Each post displays AI-generated title (max 100 chars)
- ✅ Each post displays AI-generated summary (2-3 sentences)
- ✅ Category badge shows content type
- ✅ Worthiness score visible (0.00 - 1.00 scale)
- ✅ Duplicate/similar posts appear as single entry (first post per group shown)
- ✅ Posts are clickable (entire card is interactive)

**Filtering Behavior (Backend):**
- Recommended view filters out low-quality content (score < threshold)
- Only shows active (non-archived) groups (group.archived = false)
- Groups already selected by user are hidden (group.selected = true)
- Only enabled categories are shown (respects Settings configuration)

**UX Notes:**
- Backend returns posts grouped by category, but frontend displays as flat list
- Posts grouped via Groups table (V-4); frontend fetches groups via groupsApi.getAll()
- Empty state shows "No posts available" if no posts meet criteria

#### 1.3 View All Posts
**User Action:** Click "All Posts" button

**View Toggle Button UI:**
- "Recommended" button returns to secondary state
- "All Posts" button receives "active" class (highlighted)
- View switches and refetches data from different API endpoint

**Post Display:**
- Same card layout as Recommended view
- Same post card structure (title, summary, metadata)
- Same interaction patterns (clickable cards)

**What Users Experience:**
- ✅ See complete list of all collected posts (no worthiness filter)
- ✅ Identical post display format as Recommended view
- ✅ Includes lower-scored posts (below threshold) that didn't make Recommended cut
- ✅ Group-centric display (same as Recommended view) - shows groups with post count badges
- ✅ Posts are still clickable
- ✅ Same category filtering applies (only enabled categories)

**Filtering Behavior (Backend):**
- No worthiness threshold filter applied
- Only shows fresh, unarchived posts (archived = false)
- Posts already selected by user are hidden (is_selected = false)
- Only enabled categories are shown
- All quality levels included (high and low scores)

**UX Notes:**
- Gives user full visibility into what's been collected
- Useful for exploring content that didn't meet recommendation threshold
- Helps users find interesting posts that AI rated lower
- Backend returns `{posts: [...]}` format (different from Recommended's grouped format)

---

#### 1.4 Select a Post
**User Action:** Click "Write Article" button on any group card (Recommended or All Posts view)

**Note:** Selection now happens at the group level, not individual posts. When a group is selected, ALL posts in that group become source material for article generation.

**Current Behavior:**

**What Works:**
- ✅ Click handler executes (`handleSelectGroup` function)
- ✅ API call made to `POST /api/groups/{id}/select/`
- ✅ Backend marks post as "selected" (is_selected = true)
- ✅ Console log: "Selected post: [post object]"

**What's Broken/Missing:**
- ❌ **NAVIGATION BROKEN:** UI doesn't navigate to next screen
- ❌ **NO VISUAL FEEDBACK:** No indication that post was selected
- ❌ **POST REMAINS VISIBLE:** Post doesn't disappear from list (no refetch)
- ❌ **NO LOADING STATE:** No spinner or "Selecting..." message
- ❌ **SILENT FAILURE:** If API call fails, no error message shown to user
- ❌ **TODO COMMENT IN CODE:** "// TODO: Navigate to article generation view"

**What User Experiences:**
- User clicks post
- Nothing visible happens (feels broken)
- Post stays in list
- No indication if click worked
- Dead-end interaction

**Expected Behavior (Not Implemented):**
- Should navigate to `/article/new` or similar route (article generation view)
- Should show loading state: "Generating article..." with spinner
- Should fetch/generate article via `POST /api/articles`
- Should display generated article in ArticleEditor component
- Selected post should disappear from lists on next visit (already filtered by backend)

**Technical Note:**
- Backend API for article generation exists and works (`POST /api/articles`)
- ArticleEditor component exists but not integrated into any route
- Only missing piece is frontend routing and view creation

---

#### 1.5 Archive a Group
**User Action:** Click "Archive" button on any group card

**What Happens:**
- Group marked as `archived = true`
- Hidden from active views
- Still exists for future topic matching (new posts can join)
- Can be unarchived later via archived groups view

**Important:** When new posts match an archived group, the group stays archived and the post is added silently. The user's archive decision is respected.

---

### Phase 2: Article Workflow ❌ NOT IMPLEMENTED (Backend Ready)

The following features are **fully implemented in the backend** but have **no UI**:

#### 2.1 Generate Article ❌ UI MISSING
**Expected User Flow:**
1. User selects post → navigates to article view
2. System automatically generates full article via AI
3. Article appears in rich text editor

**Backend Status:** ✅ API endpoint ready (`POST /api/articles`)
**Frontend Status:** ❌ No article generation view exists
**Component Exists:** ✅ ArticleEditor (Quill.js WYSIWYG) is built but not integrated

**What Backend Does (When UI Calls It):**
- Generates full article from post content
- Creates headline, 3-5 paragraphs, provides context
- Markdown formatted content
- Stores article to database with generation_count = 1

#### 2.2 Edit Article ❌ UI MISSING
**Expected User Flow:**
- User sees generated article in WYSIWYG editor
- User can modify text, formatting, structure
- Changes save automatically or on button click

**Backend Status:** ✅ API endpoint ready (`PUT /api/articles/{id}`)
**Frontend Status:** ❌ ArticleEditor exists but not integrated into workflow

**Available Editor Features (When Integrated):**
- Headers (H1, H2, H3)
- Bold, italic, underline
- Bullet and numbered lists
- Link insertion
- Clean formatting tool

#### 2.3 Regenerate Article ❌ UI MISSING
**Expected User Flow:**
- User clicks "Regenerate" button
- System creates improved version of article
- New version replaces old in editor

**Backend Status:** ✅ API endpoint ready (`POST /api/articles/{id}/regenerate`)
**Frontend Status:** ❌ No regenerate button or UI

**What Backend Does:**
- Generates new article with improved prompt
- Increments generation_count
- Returns fresh content

#### 2.4 Post to Teams ❌ UI MISSING
**Expected User Flow:**
- User reviews article
- User clicks "Post to Teams" button
- Confirmation message appears
- Article is posted to configured Teams channel

**Backend Status:** ✅ API endpoint ready (`POST /api/articles/{id}/post-to-teams`)
**Frontend Status:** ❌ No Teams posting button or UI

**What Backend Does:**
- Formats article as Microsoft Teams Adaptive Card
- Posts to webhook URL
- Sets posted_to_teams timestamp
- Prevents duplicate posting

---

## What Users CANNOT Do (Yet)

From a user perspective, the following experiences are not available:

### Missing User Flows:

❌ **Cooking Workflow UI**
- Cannot access cooking view from group selection
- Cannot run research on groups
- Cannot view/edit research output
- Cannot generate articles with style selection
- Cannot refine generated articles

❌ **Article Creation Workflow**
- Backend fully implemented for research and article generation
- UI components not built
- No navigation from group selection to cooking view

❌ **Article Management**
- Cannot view list of created articles
- Cannot return to edit previously created articles
- Cannot see which articles have been posted to Teams

❌ **Navigation**
- Cannot move between different views
- No back button from article view (doesn't exist)
- No breadcrumbs or navigation structure

❌ **Feedback & Confirmation**
- No visual feedback when post is selected
- No confirmation when article is posted to Teams
- No success/error messages for user actions

❌ **Article List View**
- Cannot browse previously generated articles
- Cannot see article history
- Cannot access articles after creation

---

## Detailed Feature Coverage

### ✅ Implemented Features

**Application Navigation:**
- Main header navigation (New, Cooking, Settings)
- Settings sub-navigation (System, Architecture tabs)
- Route-based page switching (React Router)
- Active link highlighting
- Hover effects and transitions

**Visual Design & Theming:**
- Dark mode interface (pure black background)
- Blue accent color scheme (#60a5fa, #3b82f6)
- Gradient header with logo
- Card-based tile design
- Hover effects (translateY, border color changes)
- Smooth transitions (0.3s ease)
- Collapsible section animations
- Responsive feedback messages
- Status color coding (green/yellow/red)

**Post Discovery & Browsing (Home Page):**
- View recommended posts (quality-filtered by threshold)
- View all collected posts (complete list, no threshold)
- Toggle between views with button UI
- See AI-generated titles for all posts
- See AI-generated summaries for all posts
- View post categories as badges
- View worthiness scores (0.00 - 1.00)
- Automatic duplicate collapsing (group_id based)
- Loading states during data fetch ("Loading..." text)
- Error message display if fetch fails
- Empty state handling ("No posts available")
- Post cards with hover effects
- Clickable post selection (calls API)

**Settings - Data Sources Management:**
- View all configured X/Twitter lists in table
- Add new lists with test-before-save workflow
- Test list connectivity before adding
- Enable/disable lists without deletion
- Delete lists with confirmation dialog
- See last fetch timestamps with relative time
- Color-coded fetch status (green/yellow/red)
- Clickable list ID links to X/Twitter
- Export all lists to JSON file
- Import lists from JSON file (merge behavior)

**Settings - Content Filtering & AI Prompts:**
- Adjust worthiness threshold (0.0 - 1.0, step 0.05)
- Adjust duplicate threshold (0.5 - 1.0, step 0.05)
- Enable/disable content categories (6 checkboxes)
- Edit all 6 AI prompts inline (embedded in sections)
- Prompts: score_worthiness, detect_duplicate, categorize_post, generate_article, generate_title, suggest_improvements
- Modify prompt text, model, temperature, max_tokens
- Save each prompt independently
- Reset each prompt to defaults (with confirmation)
- Real-time guidance on threshold levels
- Collapsible sections for organization
- Per-section feedback messages

**Settings - System Control:**
- Enable/disable auto-fetch (toggle button)
- Adjust ingestion interval (5-360 minutes dropdown)
- See next scheduled run time (updates every 30s)
- Trigger manual ingestion immediately
- Adjust posts per fetch (1-100 number input)
- See estimated API calls per hour (live calculation)
- Warning if API rate too high (> 50 calls/hour)
- Set archive age (1-30 days)
- Set archive time (hour of day)
- See archive preview count (posts eligible)
- Trigger manual archival immediately
- Operation feedback banner (success/error/info messages)
- All settings save automatically

**Settings - System Logs:**
- View all system logs with 7-day retention
- Filter logs by level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- Filter logs by category (API, Scheduler, External API, Database)
- Adjust time window (1 hour to 7 days)
- See error count badge in section header
- View full log details with stack traces in modal
- Color-coded level badges for quick identification
- Error rows highlighted in red
- Manual log cleanup (7-90 days configurable)
- Automatic daily cleanup at 4 AM

**Architecture Visualization:**
- Visual flow diagram of system architecture
- Color-coded component boxes
- Gradient backgrounds per component type
- Hover effects on boxes
- Clear data flow arrows
- Technology stack overview

**Cooking Page:**
- Placeholder page with "Coming soon" message
- Reserved route for future feature

**Backend Article Operations (No UI):**
- Article generation from posts (API ready)
- Article editing/updating (API ready)
- Article regeneration (API ready)
- Teams webhook posting (API ready)

---

### 🟡 Partially Implemented Features

**Post Selection (Home Page):**
- ✅ Frontend: Click handler exists on post cards
- ✅ Frontend: onClick calls API (`POST /api/posts/{id}/select`)
- ✅ Backend: Marks post as selected (is_selected = true)
- ✅ Backend: Selected posts filtered from future views
- ❌ Frontend: No navigation to article view after selection
- ❌ Frontend: No visual feedback (loading, success, error)
- ❌ Frontend: Post remains in list (no refetch after selection)
- ❌ Frontend: Console log only ("Selected post: [object]")
- **Result:** Broken user experience - click does nothing visible

---

### ❌ Not Implemented Features

**Article Workflow UI (Complete Gap):**
- Article generation view/page (route doesn't exist)
- Article editor integration (component exists but not used)
- Article list/management page (no UI to view created articles)
- Navigation after post selection (broken flow)
- "Regenerate Article" button/functionality
- "Post to Teams" button/functionality
- Article preview/review interface
- Article history view
- Edit existing articles UI

**User Feedback Enhancements:**
- Post selection feedback (spinner, success message)
- Article generation loading state
- Teams posting confirmation
- Better error messages for failed operations
- Toast notifications for background operations

**Mobile Experience:**
- Fully responsive design (layout mostly works but not optimized)
- Touch-optimized UI elements
- Mobile-specific layout adjustments
- Hamburger menu for navigation
- Mobile-friendly table layouts
- Optimized card sizes for small screens

**Data Source Management (Minor Gaps):**
- Import Lists button exists but functionality not confirmed working
- Export Lists button exists but functionality not confirmed working
- No batch operations (enable/disable multiple lists)
- No list search/filter functionality

**Cooking Feature:**
- Entire feature set (page is placeholder only)

---

## User Experience Gaps

### Critical UX Issues:

1. **Broken Post Selection Flow**
   - **Problem:** User clicks post card → nothing visible happens
   - **Impact:** Feels completely broken, user is confused
   - **Root Cause:** No route exists for article generation view
   - **Technical:** Backend API works, frontend navigation missing
   - **User Perception:** "Is this a bug? Did my click work?"
   - **Dead End:** No way to progress beyond browsing posts

2. **Missing Visual Feedback on Post Selection**
   - **Problem:** No loading spinner, no success message, no error handling
   - **Impact:** User doesn't know if action succeeded or failed
   - **Silent Failure:** If API call fails, no indication to user
   - **No State Change:** Post remains in list, no visual distinction
   - **Console Only:** Only developers see "Selected post" log message

3. **Incomplete Core Workflow**
   - **Can Do:** Browse recommended posts ✅
   - **Can Do:** Browse all posts ✅
   - **Can Do:** Configure settings extensively ✅
   - **Cannot Do:** Generate articles ❌
   - **Cannot Do:** Edit articles ❌
   - **Cannot Do:** Post to Teams ❌
   - **Result:** Value proposition incomplete - can curate but can't act

4. **No Article Management**
   - **Problem:** No way to view previously generated articles (if any exist in DB)
   - **Impact:** Articles are write-only from user perspective
   - **Missing:** Article list page, article history, re-edit capability
   - **Backend:** Articles table exists and stores generated content
   - **Frontend:** Zero UI to access stored articles

5. **Collapsible Sections Start Collapsed**
   - **Problem:** All Content and System Control sections start closed
   - **Impact:** Users must manually expand to see settings
   - **Discoverability:** New users might not realize sections exist
   - **Minor Issue:** This is actually acceptable pattern, just worth noting

### Recommended UX Improvements:

**High Priority (Blockers for Core Workflow):**
1. **Create Article Generation View**
   - New route: `/article/new` or `/article/generate/{post_id}`
   - Navigate to this view when post clicked
   - Show loading state: "Generating article..." with spinner
   - Call `POST /api/articles` with post ID
   - Display generated article in ArticleEditor component

2. **Integrate ArticleEditor Component**
   - Component already exists ([frontend/src/components/ArticleEditor.tsx](frontend/src/components/ArticleEditor.tsx))
   - Uses Quill.js WYSIWYG editor
   - Mount in article generation view
   - Connect to `PUT /api/articles/{id}` for saving edits
   - Add action buttons: Save, Regenerate, Post to Teams, Back to Posts

3. **Add Article Actions**
   - Regenerate button: Calls `POST /api/articles/{id}/regenerate`
   - Post to Teams button: Calls `POST /api/articles/{id}/post-to-teams`
   - Success messages for both actions
   - Confirmation dialogs where appropriate

4. **Visual Feedback for Post Selection**
   - Show loading spinner when post clicked
   - Disable card during API call
   - Navigate on success
   - Show error message on failure

**Medium Priority (Workflow Enhancement):**
5. **Article List/History View**
   - New route: `/articles`
   - Show all created articles in table/grid
   - Columns: Title, Post Source, Created Date, Posted to Teams
   - Click to re-edit article
   - Re-post to Teams if needed

6. **Post Selection Visual State**
   - Highlight selected post card briefly before navigation
   - Or: Show checkmark animation
   - Provides confirmation that click registered

7. **Improved Error Handling**
   - User-friendly error messages throughout app
   - Retry buttons for failed operations
   - Better API error message display

8. **Loading States Everywhere**
   - Skeleton loaders for post list
   - Spinner for settings operations
   - Progress indicators for long operations

**Low Priority (Polish & Enhancement):**
9. **Mobile Responsive Design**
   - Optimize 3-column settings grid for mobile (stack vertically)
   - Mobile-friendly navigation (hamburger menu)
   - Touch-optimized buttons and inputs
   - Responsive table layouts

10. **Keyboard Shortcuts**
    - Arrow keys to navigate posts
    - Enter to select post
    - Escape to close dialogs
    - Cmd/Ctrl + S to save in editor

11. **Advanced Filtering/Sorting**
    - Sort posts by date, score, category
    - Filter by date range
    - Search posts by keyword
    - Multi-category filter

12. **Data Source Import/Export Verification**
    - Confirm Import/Export buttons are fully functional
    - Add success/error feedback for these operations
    - Show imported list count on success

---

## How Users Currently Interact

### Scenario 1: First-Time User

**Step-by-Step Experience:**

1. **Opens `http://localhost:3000`**
   - Page loads with black background
   - Gradient header appears at top

2. **Sees Application Header**
   - "Klaus News" logo with blue gradient text
   - Navigation: "New" (active/highlighted), "Cooking", "Settings"

3. **Sees Main Content Area**
   - Two view toggle buttons: "Recommended" (active), "All Posts"
   - Loading state: "Loading..." text appears
   - Loading takes 100ms - 2s depending on database size

4. **If Posts Exist in Database:**
   - Loading text disappears
   - Post cards appear in vertical list
   - Each card shows: Title (H3), Summary (paragraph), Category badge, Score
   - Cards have hover effect (cursor: pointer)
   - User can scroll through list

5. **If No Posts in Database:**
   - Loading text disappears
   - Empty state message: "No posts available"
   - User must wait for scheduler to ingest posts OR trigger manual ingestion in Settings

6. **User Explores Views:**
   - Clicks "All Posts" button
   - View switches, button highlighting changes
   - Different set of posts loads (includes lower-scored posts)
   - Clicks "Recommended" again
   - Returns to filtered view

7. **User Attempts to Select Post:**
   - Clicks any post card
   - Console logs "Selected post: [object]"
   - **Nothing visible happens** (broken experience)
   - Post remains in list
   - No navigation, no feedback
   - User is confused/frustrated

**Outcome:** User can browse posts but cannot progress to article creation. Dead-end experience.

---

### Scenario 2: Returning User

**Context:** User has previously used the application and selected some posts.

**Step-by-Step Experience:**

1. **Opens Application**
   - Sees familiar interface
   - Header and navigation intact

2. **Views Updated Content**
   - Newly ingested posts appear (scheduler runs every 30 minutes by default)
   - Fresh posts from last ingestion cycle are visible
   - Post count may have increased

3. **Notices Missing Posts**
   - Previously selected posts are hidden from both views
   - Backend filters out posts where is_selected = true
   - This is correct behavior (prevents re-selecting same posts)

4. **Archived Posts Hidden**
   - Posts older than configured age (default 7 days) are archived
   - Archived posts don't appear in any view
   - Keeps interface focused on recent content

5. **Can Browse New Content**
   - Can switch between Recommended and All Posts views
   - Can see new posts from configured X/Twitter lists
   - Can click on posts (but nothing happens)

6. **Cannot Progress to Article Creation**
   - Same broken click behavior as first-time user
   - No way to generate articles from UI
   - No way to view previously generated articles (if any exist in DB)

**Outcome:** User can continue browsing new posts but still cannot complete the full workflow.

---

### Scenario 3: Power User (Hypothetical - When Complete)

**This is how the application SHOULD work when fully implemented:**

1. **Browse Recommended Posts** ✅ WORKS
   - Open application, see filtered high-quality posts

2. **Select Interesting Post** ✅ BACKEND WORKS, ❌ UI BROKEN
   - Click post → Navigate to article generation view
   - See loading state: "Generating article..."
   - Article generates via AI (3-5 paragraphs)

3. **Review AI-Generated Article** ❌ NO UI
   - See article in rich text editor (ArticleEditor component)
   - Read through generated content
   - Assess quality and relevance

4. **Edit Content as Needed** ❌ NO UI
   - Use WYSIWYG editor to modify text
   - Fix errors, adjust tone, add context
   - Format with headers, bold, lists

5. **Regenerate if Quality is Low** ❌ NO UI
   - Click "Regenerate Article" button
   - AI creates improved version
   - Review new version, decide which is better

6. **Post to Teams When Satisfied** ❌ NO UI
   - Click "Post to Teams" button
   - Article formatted as Adaptive Card
   - Posted to configured Teams channel
   - Confirmation message appears

7. **Return to Browse More Posts** ❌ NO NAVIGATION
   - Click "Back to Posts" or use navigation
   - Return to home page
   - See remaining unselected posts

8. **Access Article History** ❌ NO UI
   - Navigate to "Articles" page (doesn't exist)
   - See list of all created articles
   - Click article to edit again
   - Re-post articles to Teams if needed

**Current Reality:** Only step 1 works fully. Step 2 backend works but UI is broken. Steps 3-8 have backend API support but zero UI implementation.

---

## System-Generated Content Users See

### AI-Generated Elements Visible in UI:

**Post Titles (Home Page Post Cards):**
- **Source:** AI-generated via `generate_title` prompt (or legacy prompt)
- **Characteristics:**
  - Clear, concise headlines (max 100 chars)
  - Replace original tweet text with readable title
  - Displayed as H3 in post cards
- **Model:** GPT-5.1 (configurable in Settings)
- **Fallback:** Shows "Untitled" if generation fails
- **Purpose:** Make posts scannable and professional

**Post Summaries (Home Page Post Cards):**
- **Source:** AI-generated during post ingestion
- **Characteristics:**
  - 2-3 sentence overview of content
  - Objective tone
  - Highlights key information from original post
- **Display:** Paragraph text below title in post card
- **Fallback:** Shows original_text (tweet content) if summary generation fails
- **Purpose:** Give users context without reading full original content

**Categories (Post Cards & Filtering):**
- **Source:** AI-generated via `categorize_post` prompt
- **Options:** Major News, Automation, Coding, Content Creation, Other
- **Assignment:** AI analyzes post content and assigns single category
- **Display:** Badge/label in post card metadata section
- **Fallback:** Shows "Uncategorized" if categorization fails
- **Purpose:** Help users understand content type at a glance
- **Filtering:** Only enabled categories (set in Settings) are processed and shown

**Worthiness Scores (Post Cards & Filtering):**
- **Source:** AI-generated via `score_worthiness` prompt evaluating newsworthiness
- **Scale:** 0.0 to 1.0 (higher = better quality/relevance)
- **Display:** "Score: 0.XX" in post card metadata section (two decimal places)
- **Threshold:** Default 0.6 for Recommended view (configurable in Settings)
- **Model:** GPT-5-mini (cost-effective for scoring, configurable in Settings)
- **Fallback:** Algorithmic scoring (relevance 40%, quality 40%, recency 20%) if AI fails
- **Purpose:** Filter high-quality content for Recommended view
- **Configuration:** Editable prompt and threshold via Settings → Content tile → Worthiness section

**Duplicate Detection (Not Visible, But Affects Display):**
- **Source:** AI-generated via `detect_duplicate` prompt
- **Method:** AI semantic title comparison
  1. Filter candidates: same category, last 7 days, limit 50
  2. Compare AI-generated titles using GPT-5-mini
  3. If similarity score >= threshold → group together
- **Result:** Posts assigned same `group_id` if duplicates
- **Display Impact:** Only first post per `group_id` shown in UI (others collapsed)
- **Threshold:** Default 0.85 AI confidence (configurable in Settings)
- **Purpose:** Prevent duplicate/similar posts from cluttering feed

**Articles (Backend Only - No UI Yet):**
- **Source:** AI-generated via `generate_article` prompt
- **Characteristics:**
  - Full-length articles (3-5 paragraphs)
  - Informative headline (separate `generate_title` prompt)
  - Contextual background and analysis
  - Objective reporting tone
  - Markdown formatted
- **Model:** GPT-5.1 (quality model for article generation, configurable in Settings)
- **Improvement Suggestions:** Generated via `suggest_improvements` prompt
- **Status:** Backend fully functional, UI not implemented
- **Purpose:** Transform social posts into professional articles for Teams publishing

---

## Accessibility Status

**Currently Accessible Frontend Routes:**
- `http://localhost:3000/` - Home page (post browsing)
- `http://localhost:3000/cooking` - Cooking placeholder page
- `http://localhost:3000/settings/system` - Settings page (System Settings view)
- `http://localhost:3000/architecture` - Architecture visualization page

**Backend Endpoints:**
- `http://localhost:8000/health` - Backend health check
- `http://localhost:8000/docs` - API documentation (Swagger UI)

**Note:** There is NO `/prompts` route. Prompt management is embedded within `/settings/system` in the Content tile's collapsible sections.

**Working Endpoints (When Called from UI or Direct API):**
- `GET /api/posts` - All posts
- `GET /api/posts/recommended` - Recommended posts
- `POST /api/groups/{id}/select/` - Select group for article generation
- `POST /api/groups/{id}/archive/` - Archive a group
- `POST /api/groups/{id}/unarchive/` - Unarchive a group
- `GET /api/groups/archived/` - List archived groups
- `POST /api/groups/{id}/research/` - Run research (mode: quick/agentic/deep)
- `GET /api/groups/{id}/research/` - Get research output
- `PUT /api/groups/{id}/research/` - Save edited research
- `POST /api/groups/{id}/article/` - Generate article (style + optional custom prompt + optional research_id)
- `GET /api/groups/{id}/article/` - Get current article
- `PUT /api/groups/{id}/article/refine/` - Refine article with instruction
- `GET /api/settings/article-prompts/` - Get all four style prompts
- `PUT /api/settings/article-prompts/` - Update style prompts
- `POST /api/articles` - Generate article
- `PUT /api/articles/{id}` - Update article
- `POST /api/articles/{id}/regenerate` - Regenerate article
- `POST /api/articles/{id}/post-to-teams` - Post to Teams
- `GET /api/settings/` - Get all settings grouped by category
- `PUT /api/settings/{key}` - Update single setting
- `GET /api/lists/` - Get all X lists with metadata
- `POST /api/lists/` - Add new X list
- `PUT /api/lists/{id}` - Update list (enable/disable, rename)
- `DELETE /api/lists/{id}` - Remove list
- `POST /api/lists/{id}/test` - Test list connectivity
- `POST /api/admin/trigger-ingest` - Manually trigger ingestion
- `POST /api/admin/trigger-archive` - Manually trigger archival
- `POST /api/admin/pause-scheduler` - Pause background jobs
- `POST /api/admin/resume-scheduler` - Resume background jobs
- `GET /api/admin/scheduler-status` - Get scheduler state
- `GET /api/lists/export` - Export lists to JSON
- `POST /api/lists/import` - Import lists from JSON
- `GET /api/prompts` - Get all prompts
- `GET /api/prompts/{name}` - Get single prompt
- `PUT /api/prompts/{name}` - Update prompt
- `POST /api/prompts/{name}/reset` - Reset prompt to default
- `GET /api/prompts/export` - Export prompts to JSON
- `POST /api/prompts/import` - Import prompts from JSON
- `GET /api/groups/` - Get all groups with representative titles and post counts (V-5)
- `GET /api/groups/{group_id}/posts/` - Get all posts belonging to a group (V-5)

---

## Next Steps to Complete User Journey

To achieve full user journey, the following UI work is needed:

### Phase 1: Fix Broken Post Selection (Critical Priority)

**Goal:** Make post selection navigate to article generation

**Tasks:**
1. Create new route `/article/generate/:postId` in React Router
2. Create ArticleGenerationView page component
3. Update `handleSelectPost` in Home.tsx to navigate to new route
4. Add loading state during article generation API call
5. Display error message if generation fails

**Files to Modify:**
- [frontend/src/App.tsx](frontend/src/App.tsx) - Add route
- [frontend/src/pages/Home.tsx](frontend/src/pages/Home.tsx) - Add navigation
- Create new file: `frontend/src/pages/ArticleGenerationView.tsx`

**Backend APIs to Use:**
- `POST /api/articles` - Generate article from post
- `GET /api/articles/{id}` - Fetch generated article

**Estimated Effort:** 0.5-1 day

---

### Phase 2: Article Editor Integration (High Priority)

**Goal:** Allow users to edit generated articles

**Tasks:**
1. Mount ArticleEditor component in ArticleGenerationView
2. Load generated article content into editor
3. Connect Save functionality to `PUT /api/articles/{id}`
4. Add auto-save or manual save button
5. Show save confirmation feedback

**Files to Modify:**
- `frontend/src/pages/ArticleGenerationView.tsx` - Add editor
- [frontend/src/components/ArticleEditor.tsx](frontend/src/components/ArticleEditor.tsx) - May need updates

**Backend APIs to Use:**
- `PUT /api/articles/{id}` - Update article content

**Estimated Effort:** 0.5 day

---

### Phase 3: Article Actions (High Priority)

**Goal:** Enable regenerate and Teams posting

**Tasks:**
1. Add "Regenerate Article" button to ArticleGenerationView
2. Call `POST /api/articles/{id}/regenerate` on click
3. Replace editor content with new version
4. Add "Post to Teams" button
5. Call `POST /api/articles/{id}/post-to-teams` on click
6. Show success confirmation
7. Prevent double-posting (check posted_to_teams status)
8. Add "Back to Posts" navigation button

**Files to Modify:**
- `frontend/src/pages/ArticleGenerationView.tsx` - Add buttons and logic
- [frontend/src/services/api.ts](frontend/src/services/api.ts) - May need to add API methods

**Backend APIs to Use:**
- `POST /api/articles/{id}/regenerate` - Create improved version
- `POST /api/articles/{id}/post-to-teams` - Publish to Teams

**Estimated Effort:** 0.5-1 day

---

### Phase 4: Article List View (Medium Priority)

**Goal:** View and manage created articles

**Tasks:**
1. Create new route `/articles` in React Router
2. Create ArticlesList page component
3. Fetch articles via `GET /api/articles`
4. Display table/grid with: Title, Created Date, Posted Status
5. Add "View/Edit" button that navigates to ArticleGenerationView
6. Add navigation link in main header (or settings?)
7. Handle empty state (no articles yet)

**Files to Create:**
- `frontend/src/pages/ArticlesList.tsx`

**Files to Modify:**
- [frontend/src/App.tsx](frontend/src/App.tsx) - Add route and navigation link
- [frontend/src/services/api.ts](frontend/src/services/api.ts) - Add GET /api/articles method

**Backend APIs to Use:**
- `GET /api/articles` - List all articles (needs to be created if doesn't exist)
- Or query pattern: `GET /api/articles?limit=50&offset=0`

**Estimated Effort:** 1 day

---

### Phase 5: Polish & Feedback (Medium Priority)

**Goal:** Improve user experience with better feedback

**Tasks:**
1. Add loading spinners for all async operations
2. Add toast/notification component for success/error messages
3. Add confirmation dialogs for destructive actions
4. Improve error message display throughout app
5. Add skeleton loaders for post list
6. Add progress indicators for article generation
7. Test and verify Import/Export Lists buttons work correctly

**Files to Modify:**
- Create: `frontend/src/components/Toast.tsx` or similar
- Update: All page components to use toast notifications
- Update: [frontend/src/components/DataSourceManager.tsx](frontend/src/components/DataSourceManager.tsx) for import/export feedback

**Estimated Effort:** 1-2 days

---

### Phase 6: Mobile Optimization (Low Priority)

**Goal:** Make app fully responsive

**Tasks:**
1. Optimize Settings 3-column grid for mobile (stack vertically)
2. Create hamburger menu for main navigation
3. Make tables responsive (horizontal scroll or card layout)
4. Optimize touch targets (bigger buttons)
5. Test on various screen sizes
6. Adjust font sizes for mobile

**Files to Modify:**
- [frontend/src/App.css](frontend/src/App.css) - Add media queries
- All page components - Add responsive classes

**Estimated Effort:** 1-2 days

---

### Summary of Effort

**Minimum Viable Product (Phases 1-3):**
- **Effort:** 2-3 days of focused frontend development
- **Result:** Complete post → article → Teams workflow
- **Unblocks:** Core user value proposition

**Complete Feature Set (Phases 1-5):**
- **Effort:** 4-6 days of focused frontend development
- **Result:** Full-featured article management system
- **Polish:** Professional user experience

**Fully Polished (Phases 1-6):**
- **Effort:** 5-8 days of frontend development
- **Result:** Production-ready application
- **Mobile:** Responsive across all devices

**Technical Blockers:**
- **None** - All backend APIs are ready and functional
- **Only missing:** Frontend routing, components, and integration
- **ArticleEditor exists:** Just needs to be integrated

---

**Document Status:**
- ✅ Comprehensively documents actual implementation
- ✅ ~70% feature complete (browsing and settings fully functional)
- ❌ ~30% gap (article workflow UI completely missing)
- 📊 Backend: 100% complete for documented features
- 📊 Frontend: 70% complete (article UI is the primary remaining gap)
- 🎨 Visual design: Fully implemented and documented
- 🧭 Navigation: Partially complete (settings area done, article views missing)
- 📝 Last Updated: 2026-01-26 - Updated OpenAI models to GPT-5 series (gpt-5.1, gpt-5-mini, gpt-5.2)

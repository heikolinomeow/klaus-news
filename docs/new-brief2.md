# Settings Page Restructuring

## Scope
Frontend-only changes to the Settings page at `http://localhost:3000/settings/system`.

---

## 1. System Control Tile Consolidation

### 1.1 Merge Scheduling and System Control Tiles

**Requirement (Merged Narrative)**

The Settings page currently displays two separate tiles on the right side: "Scheduling" and "System Control". These must be merged into a single unified tile named "System Control".

**Acceptance Criteria**
- Only one tile labeled "System Control" appears in the settings interface
- All functionality from both original tiles is preserved within the merged tile
- The original "Scheduling" and "System Control" tiles no longer exist as separate entities

**Constraints / Non-Goals**
- Frontend changes only; no backend modifications

---

### 1.2 System Control: Ingestion Section

**Requirement (Merged Narrative)**

Within the merged System Control tile, create an "Ingestion" section with the following controls presented in order:

1. A toggle control labeled "Auto-Fetch Enabled/Disabled"
2. An ingestion interval selector
3. A button to trigger ingestion immediately
4. A "posts per fetch" configuration control

**Acceptance Criteria**
- Section displays the sub-headline "Ingestion"
- All four controls appear in the specified vertical order
- Toggle allows enabling/disabling auto-fetch
- Ingestion can be triggered manually via button
- Interval and posts-per-fetch settings are configurable

**Constraints / Non-Goals**
- Frontend changes only

---

### 1.3 System Control: Archival Section

**Requirement (Merged Narrative)**

Below the Ingestion section, add an "Archival" section containing archival settings and a trigger button.

**Acceptance Criteria**
- Section displays the sub-headline "Archival"
- Archival settings are displayed
- A button to "trigger archival now" is present

**Constraints / Non-Goals**
- Frontend changes only

---

### 1.4 Remove Scheduler Control Button

**Requirement (Merged Narrative)**

The scheduler control button must be removed from the interface.

**Acceptance Criteria**
- Scheduler control button no longer appears in the UI

---

## 2. Content Filtering Tile Restructuring

### 2.1 Scope

**Requirement (Merged Narrative)**

The "Content Filtering" tile requires UI-only restructuring to integrate AI prompt management tiles directly into the filtering interface.

**Constraints / Non-Goals**
- UI changes only; no backend modifications

---

### 2.2 Worthiness Section

**Requirement (Merged Narrative)**

Create a "Worthiness" section within the Content Filtering tile. Display the Prompt Management tile (currently located under AI Prompts) for `score_worthiness`, followed by the associated slider control.

**Acceptance Criteria**
- Section displays the sub-headline "Worthiness"
- Prompt Management tile for `score_worthiness` appears in this section
- The worthiness threshold slider appears below the Prompt Management tile

**Constraints / Non-Goals**
- UI changes only

---

### 2.3 Duplicate Detection Section

**Requirement (Merged Narrative)**

Create a "Duplicate Detection" section below Worthiness. Display the Prompt Management tile (currently located under AI Prompts) for `detect_duplicate`, followed by the associated slider control.

**Acceptance Criteria**
- Section displays the sub-headline "Duplicate Detection"
- Prompt Management tile for `detect_duplicate` appears in this section
- The duplicate detection threshold slider appears below the Prompt Management tile

**Constraints / Non-Goals**
- UI changes only

---

### 2.4 Category Filters Section

**Requirement (Merged Narrative)**

Create a "Category Filters" section below Duplicate Detection. Display the Prompt Management tile (currently located under AI Prompts) for `categorize_post`, followed by the category filter checkboxes.

**Acceptance Criteria**
- Section displays the sub-headline "Category Filters"
- Prompt Management tile for `categorize_post` appears in this section
- Category filter checkboxes appear below the Prompt Management tile

**Constraints / Non-Goals**
- UI changes only

---

## Coverage Verification

All source fragments have been integrated:
- Merge of two tiles into "System Control" (lines 5-7)
- Frontend-only scope (line 8)
- System Control headline (line 9)
- Ingestion sub-headline and four controls (lines 10-14)
- Archival sub-headline, settings, and trigger (lines 16-18)
- Remove scheduler control button (line 20)
- Content Filtering tile scope (lines 22-23)
- Worthiness section with prompt tile and slider (lines 24-26)
- Duplicate Detection section with prompt tile and slider (lines 27-29)
- Category Filters section with prompt tile and checkboxes (lines 30-32)
- URL reference for context (line 3)

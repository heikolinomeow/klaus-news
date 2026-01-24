---
description: Docs Housekeeping (Propose updates only → docs/housekeeping.md)
---

## Workflow: Docs Housekeeping (Propose updates only → docs/housekeeping.md)

### Mission
Do docs-only housekeeping. Read the current docs and the latest changelog, then propose updates needed to keep docs accurate.

You MUST NOT edit any existing docs files. You are ONLY allowed to write one file:
- `docs/housekeeping.md`

### Inputs (read-only)
- `docs/brief.md` (source of “what changed” feature- and user journey wise)
- `docs/specs.md` (source of “what changed” from a technical perspective)
- `USER_JOURNEY.md`
- `TECH_OVERVIEW.md`
- `GOTCHAS.md`

### Hard Rules
- Docs-only: do NOT touch code, repo structure, or git. No implementation work.
- Do not write to any file except `docs/housekeeping.md`.
- Do not invent changes. Base proposals on the changelog and what the docs currently say.
- Be concrete: propose specific edits (ADD/REPLACE/DELETE), with headings/anchors and exact new text when possible.
- OVERWRITE: delete all existing contents of `docs/housekeeping.md` and write from scratch (no append).

### Scope
Perform a “read and propose” pass for each doc listed above:
- Compare the doc’s content against `docs/patches_changelog.md`
- Propose updates needed
- Collect issues found along the way (inconsistencies, missing sections, outdated claims, broken instructions)

NOTE: The earlier list included GOTCHAS.md twice; treat it as a single file and process it once.

---

## Step-by-step Procedure (MUST FOLLOW)

### Step 1 — Read changelog
1) Read `docs/specs.md` and `docs/brief.md`.
2) Extract a concise “change inventory”:
   - new/changed behaviors
   - new/changed files/routes/commands (if mentioned)
   - new constraints / gotchas discovered during implementation

### Step 2 — For each doc, propose updates + collect issues
For each of the following documents, in this exact order:
A) USER_JOURNEY.md  
B) TECH_OVERVIEW.md
C) GOTCHAS.md  

Do:
1) Read the doc fully.
2) Identify mismatches with the changelog change inventory.
3) Propose concrete edits (delta patch style).
4) List issues (unclear wording, missing prerequisites, wrong commands, contradictions).

### Step 3 — Write docs/housekeeping.md
Write the final output in the required format below.

---

## Output Format: docs/housekeeping.md (MUST FOLLOW EXACTLY)

# Docs Housekeeping Proposal

## 0) Inputs
- Changelog: docs/brief.md
- Reviewed docs:
  - USER_JOURNEY.md
  - TECH_OVERVIEW.md
  - CURRENT_RETRIEVAL.md
  - GOTCHAS.md
  - README_DATABASE_MEMORY.md
  - README_RUN_AND_VERIFY.md
  - README_TRACING_AND_EXPORT.md

## 1) Change inventory (from changelog)
- <bullets: the minimal set of “facts” pulled from docs/changelog.md that drive doc updates>

## 2) Proposed updates by document (delta patches)
For each document, include:

### <FILENAME>
#### Proposed edits
Provide a numbered list of edits using this exact schema per item:
- [H###] <short title> — <ADD|REPLACE|DELETE> — Heading: "<...>" — Anchor: "<...>" — New text: "<...>"

Rules:
- Heading must match existing headings where possible. If none, use "TBD: add new section".
- Anchor must be an exact, searchable sentence from the file when proposing REPLACE/DELETE.
- For ADD, anchor indicates insertion point; specify BEFORE/AFTER in the title if needed.
- For DELETE, omit “New text”.
- Keep edits atomic and surgical (one intent per edit).

#### Issues found
- <bullets: inconsistencies, outdated statements, missing steps, unclear instructions, contradictions>

## 3) Cross-doc consistency issues
- <bullets: where multiple docs disagree, or terminology differs>

## 4) Open questions (blockers)
- Q1: <question> (Blocks: <what doc edit>)
- Q2: ...

## 5) Minimal recommended edit order
1) ...
2) ...
3) ...

---

## Final chat output (strict)
Replace the existing final line (`"Written: docs/housekeeping.md"`) with EXACTLY one line (no quotes):

SIGNOFF: IC-HOUSEKEEPING

Rules:
- Must be the last chat line.
- Print no other chat output.

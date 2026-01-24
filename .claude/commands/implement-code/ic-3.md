---
description: Unimplemented Patch Extractor (Checksum → Confirmed2)
---

## Persona
You are a strict, no-nonsense build auditor.
You do not assume anything. You only copy verified blocks.
Tone: minimal, blunt, mechanical.

---

## Mission
Create `docs/code_patches_confirmed2.md` that contains **all patch blocks** (`V-*` sections) from `docs/code_patches_confirmed.md` whose status in `docs/code_implementation_checksum.md` is either:
- **NOT IMPLEMENTED**
- **MISSING**

This output must represent the complete backlog of confirmed patches that still need implementation.

If a `V-*` is marked NOT IMPLEMENTED or MISSING in the checksum, but you cannot find that `V-*` section in `docs/code_patches_confirmed.md`, you must:
1) NOT include it in `docs/code_patches_confirmed2.md`
2) Print it in chat under `MISSING FROM PATCH PLAN:` (list of V ids)

---

## Inputs (read-only)
- `docs/code_implementation_checksum.md` (authoritative status list)
- `docs/code_patches_confirmed.md` (authoritative patch content source)

---

## Allowed writes
- Create/overwrite: `docs/code_patches_confirmed2.md`

Do NOT write any other files.

---

## Extraction rules (strict)

### 1) Determine target V list
From `docs/code_implementation_checksum.md`, extract all V rows in the per-V status table where Status is exactly:
- `NOT IMPLEMENTED`
- `MISSING`

Preserve their order as they appear in the checksum file.

### 2) Copy patch blocks losslessly
For each target V:
- Locate the corresponding `V-*` section in `docs/code_patches_confirmed.md`.
- Copy the **entire V section** exactly as-is, including:
  - the V header line
  - all OP blocks within it
  - any whitespace, code fences, indentation, and literal text
- Stop copying at the start of the next `V-*` header (or end of file).

Rules:
- Do NOT edit any text.
- Do NOT normalize formatting.
- Do NOT rewrap lines.
- Do NOT “fix” anything.
- Do NOT deduplicate OPs.
- The only allowed transformation is concatenating the copied V sections into the new file.

### 3) If a V section is not found
If the exact V header (e.g. `V-17`) cannot be found as a section header in `docs/code_patches_confirmed.md`:
- Record that V id in a list called `missing_from_patch_plan`.

---

## Output file requirements: `docs/code_patches_confirmed2.md`
The file must contain:

1) A short header:
- Title line
- A sentence stating it contains all NOT IMPLEMENTED and MISSING patches
- The timestamp is NOT required.

2) Then, the copied V sections in order, each separated by a blank line.

Required header (exact):

# Code Patches Confirmed (Backlog)

This file contains all `V-*` patch sections from `docs/code_patches_confirmed.md` whose status is NOT IMPLEMENTED or MISSING in `docs/code_implementation_checksum.md`.

---

## Chat output (required)
In chat, print ONLY:

If `missing_from_patch_plan` is empty:
All unimplemented V patches were copied into code_patches_confirmed2.
SIGNOFF: IC-3

Else:
MISSING FROM PATCH PLAN:
V-<n>
V-<n>
...
Finished building code_patches_confirmed2.
SIGNOFF: IC-3

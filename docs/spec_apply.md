# Spec Apply Log
**Date:** 2026-01-23
**Agent:** bts-2
**Status:** PATCHES REJECTED - FORMAT INVALID

---

## Summary
- Total change requests parsed: 17 distinct patches
- Passed all gates and applied: 0
- Failed (not applied): 17

**Reason for Mass Failure:** All patches in `docs/spec_improve.md` lack exact Find/Replace anchors required by bts-2 surgical application protocol. Patches describe intentions and patterns but do not provide:
1. Exact text to find in specs.md (verbatim match)
2. Exact replacement text
3. Verification that Find text appears exactly once in target V section

Per bts-2 rules: "If any extraction field is missing or ambiguous: Mark CR as FAIL, reason: Patch format invalid / ambiguous; cannot apply safely."

---

## Per Change Request Log

### CR-1 — V-12 — Typed Clarifiers (Split Justification)
- Compliant with Brief Intent: **yes** (restores omitted typed clarifier from brief)
- Compliant with Status Quo: **yes** (no repo assertions)
- Regression Guard: **pass** (adds detail, doesn't remove)
- Spec Discipline Guard: **pass** (adds traceability-tagged bullets)
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Patch says "Location: After line in specs that contains 'Feature 4.1 (Database Backup & Restore Scripts)'" but does not provide:
  - Exact Find text (verbatim snippet from specs.md)
  - Exact Replace text (Find + additions)
  - Cannot determine if this refers to V-35 or another V-item in current specs
- **Evidence:** n/a (format issue, not content issue)

---

### CR-2 — V-13 — Typed Clarifiers (Split Justification)
- Compliant with Brief Intent: **yes**
- Compliant with Status Quo: **yes**
- Regression Guard: **pass**
- Spec Discipline Guard: **pass**
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Says "Location: Specs section covering restore script functionality" without exact Find anchor. Ambiguous target location.
- **Evidence:** n/a

---

### CR-3 — V-14 — Typed Clarifiers (Split Justification)
- Compliant with Brief Intent: **yes**
- Compliant with Status Quo: **yes**
- Regression Guard: **pass**
- Spec Discipline Guard: **pass**
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Ambiguous target location.
- **Evidence:** n/a

---

### CR-4 — V-19 — Typed Clarifiers (Split Justification)
- Compliant with Brief Intent: **yes**
- Compliant with Status Quo: **yes**
- Regression Guard: **pass**
- Spec Discipline Guard: **pass**
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Ambiguous target location.
- **Evidence:** n/a

---

### CR-5 — V-20 — Typed Clarifiers (Split Justification)
- Compliant with Brief Intent: **yes**
- Compliant with Status Quo: **yes**
- Regression Guard: **pass**
- Spec Discipline Guard: **pass**
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Ambiguous target location.
- **Evidence:** n/a

---

### CR-6 — V-21 — Typed Clarifiers (Split Justification)
- Compliant with Brief Intent: **yes**
- Compliant with Status Quo: **yes**
- Regression Guard: **pass**
- Spec Discipline Guard: **pass**
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Ambiguous target location.
- **Evidence:** n/a

---

### CR-7 — V-15 — Embedded Block Reference (bash example)
- Compliant with Brief Intent: **yes** (brief contains bash example block, specs must reference it)
- Compliant with Status Quo: **yes** (reference to brief content, no repo assertion)
- Regression Guard: **pass**
- Spec Discipline Guard: **pass** (adds traceability-tagged bullet)
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Says "Location: In WMBC section after existing bullets" but doesn't provide Find anchor to determine exact insertion point.
- **Evidence:** Brief V-15 lines 176-184 contain bash example block.

---

### CR-8 — V-23 — Embedded Block Reference (JSON schema)
- Compliant with Brief Intent: **yes**
- Compliant with Status Quo: **yes**
- Regression Guard: **pass**
- Spec Discipline Guard: **pass**
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Ambiguous insertion point.
- **Evidence:** Brief V-23 lines 270-284 contain JSON schema block.

---

### CR-9 — V-32 — Embedded Block Reference (Python code)
- Compliant with Brief Intent: **yes**
- Compliant with Status Quo: **yes**
- Regression Guard: **pass**
- Spec Discipline Guard: **pass**
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Ambiguous insertion point.
- **Evidence:** Brief V-32 lines 380-387 contain Python code block.

---

### CR-10 — V-44 — Embedded Block Reference (Python code)
- Compliant with Brief Intent: **yes**
- Compliant with Status Quo: **yes**
- Regression Guard: **pass**
- Spec Discipline Guard: **pass**
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Ambiguous insertion point.
- **Evidence:** Brief V-44 lines 532-541 contain Python code block.

---

### CR-11 — V-52 — Embedded Block Reference (JSON schema)
- Compliant with Brief Intent: **yes**
- Compliant with Status Quo: **yes**
- Regression Guard: **pass**
- Spec Discipline Guard: **pass**
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Ambiguous insertion point.
- **Evidence:** Brief V-52 lines 631-650 contain JSON schema block.

---

### CR-12 — V-62 — Embedded Block Reference (Python code)
- Compliant with Brief Intent: **yes**
- Compliant with Status Quo: **yes**
- Regression Guard: **pass**
- Spec Discipline Guard: **pass**
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Ambiguous insertion point.
- **Evidence:** Brief V-62 lines 772-793 contain Python code block.

---

### CR-13 — V-72 — Embedded Block Reference (Python code)
- Compliant with Brief Intent: **yes**
- Compliant with Status Quo: **yes**
- Regression Guard: **pass**
- Spec Discipline Guard: **pass**
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Ambiguous insertion point.
- **Evidence:** Brief V-72 lines 919-936 contain Python code block.

---

### CR-14 — V-79 — Embedded Block Reference (SQL schema)
- Compliant with Brief Intent: **yes**
- Compliant with Status Quo: **yes**
- Regression Guard: **pass**
- Spec Discipline Guard: **pass**
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Ambiguous insertion point.
- **Evidence:** Brief V-79 lines 1040-1053 contain SQL schema block.

---

### CR-15 — V-87 — Embedded Block Reference (bash commands)
- Compliant with Brief Intent: **yes**
- Compliant with Status Quo: **yes**
- Regression Guard: **pass**
- Spec Discipline Guard: **pass**
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Ambiguous insertion point.
- **Evidence:** Brief V-87 lines 1165-1168 contain bash commands.

---

### CR-16 — V-88 — Embedded Block Reference (bash commands)
- Compliant with Brief Intent: **yes**
- Compliant with Status Quo: **yes**
- Regression Guard: **pass**
- Spec Discipline Guard: **pass**
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Ambiguous insertion point.
- **Evidence:** Brief V-88 lines 1175-1179 contain bash commands.

---

### CR-17 — V-93 — Embedded Block References (flow diagrams)
- Compliant with Brief Intent: **yes**
- Compliant with Status Quo: **yes**
- Regression Guard: **pass**
- Spec Discipline Guard: **pass**
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Ambiguous insertion point.
- **Evidence:** Brief V-93 lines 1231-1253 contain flow diagram blocks.

---

## Patch Sets Not Processed

### Patch Set 3: Evidence Annotations (Gate 4)
**Status:** NOT PROCESSED
**Reason:** Patch describes pattern-based replacements ("ANY line in Files touched section that references a real file") without providing specific Find/Replace pairs for each occurrence. This is a systematic audit task, not a surgical patch specification.

**Assessment:** While the intent is valid (add evidence annotations), the patch format doesn't meet bts-2 requirements. Would require:
- Enumeration of every file path line in every V-item
- Exact Find text for each
- Exact Replace text for each

---

### Patch Set 4: Traceability Anchor Quality (Gate 1)
**Status:** PARTIALLY EVALUATED

**CR-18 (hypothetical) — V-1 Anchor Verbatim Fix:**
- Would be valid IF it provided exact Find/Replace
- Current format provides before/after examples but not exact match anchors

**CR-19 (hypothetical) — V-2 Anchor Verbatim Fix:**
- Same issue as CR-18

**Patch 4.3 - Additional Anchor Fixes:**
- **Status:** NOT ACTIONABLE
- **Reason:** Says "Review all 94 V-items" but doesn't enumerate specific patches

---

### Patch Set 5: Missing Detail Restoration

**CR-20 (hypothetical) — V-43 Current Prompts Detail:**
- Compliant with Brief Intent: **yes** (brief V-43 contains extensive prompt detail, specs V-43 omits it)
- Compliant with Status Quo: **yes** (details from brief, references to files in TECH_OVERVIEW)
- Regression Guard: **pass** (adds omitted detail)
- Spec Discipline Guard: **pass** (uses traceability-tagged bullets)
- **Change applied to Specs: no**
- **Reason:** Patch format invalid. Says "Location: In PMT section" and provides ADD content, but doesn't specify:
  - What exact text to Find in specs V-43
  - Where exactly in PMT section to insert (before/after which line?)
  - No verification that insertion point is unique
- **Evidence:** Brief V-43 lines 497-524 contain detailed prompt specifications. Specs (need to verify) may have summarized or omitted this.

---

## Root Cause Analysis

**Why All Patches Failed:**

The `docs/spec_improve.md` document produced by bts-1 is a **patch strategy document**, not a **surgical patch specification** in the format required by bts-2.

**What bts-2 requires:**
```
Find: <exact verbatim text from specs.md, 20-100 words>
Replace: <exact verbatim text with modifications>
```

**What spec_improve.md provides:**
```
Location: In WMBC section after existing bullets
ADD: <new content>
```

**Gap:** No exact Find anchor = cannot verify:
1. Text appears exactly once
2. Text is within correct V section boundaries
3. Insertion/replacement is unambiguous

---

## Recommendations for Next Steps

### Option A: Re-run bts-1 with Explicit Patch Format Instructions
- Instruct bts-1 to produce exact Find/Replace pairs
- For each patch, include:
  - Exact 20-100 word snippet from specs.md to Find
  - Exact replacement text (Find + modifications)
  - Verification that Find text appears once in target V section

### Option B: Create Intermediate Patch Elaboration Agent
- New agent reads spec_improve.md
- Reads specs.md
- Produces concrete Find/Replace pairs for each patch intention
- Output: spec_improve_surgical.md with exact matches

### Option C: Manual Patch Creation
- Developer reads spec_improve.md
- Developer creates exact Find/Replace patches manually
- Re-run bts-2 with surgical patches

### Option D: Accept Current Specs as Adequate
- Acknowledge that specs have issues identified by bts-1
- Document issues in spec_review.md for reference
- Proceed to next pipeline stage (STCC-FULL)
- Treat spec improvement as iterative task

---

## Conclusion

**No patches applied to specs.md.**

**Reason:** All patches failed format validation (lack exact Find/Replace anchors required for safe surgical application).

**Next Action:** Requires decision:
- Fix patch format and retry bts-2?
- Proceed to STCC-FULL with current specs?
- Iterate nb-bts loop with more precise patching?

**Files Updated:**
- `docs/spec_apply.md` (this file) ✅
- `docs/specs.md` (unchanged) ❌

---

**Log End**

# Brief-to-Specs Workflow Overview

## Purpose
Transform work-packaged V-items in `docs/brief.md` into repo-aware, lossless, implementation-ready specs.

---

## The Pipeline

### Input: `docs/brief.md`
**Starting point:** Structured brief with V-items (from new-brief workflow)

**Required context files:**
- `docs/TECH_OVERVIEW.md` (repo architecture/patterns)
- `docs/USER_JOURNEY.md` (screen names, flows)
- `docs/GOTCHAS.md` (known pitfalls)

---

### Step 1: bts-0 (Zero-Drift Specs Compiler)
- **Reads:** `docs/brief.md` + repo codebase + context docs
- **Does:** Translates each V-item into conceptual, repo-aware specs
- **Output:** `docs/specs.md` with 4 blocks per V:
  1. Product Manager translation (max detail, user-visible)
  2. What must be changed (conceptual, repo-aware, NO code)
  3. Files touched (verified paths with evidence)
  4. Risk assessment (0-10)
- **Anti-hallucination:** Traceability tags, typed clarifiers, repo evidence required

---

### Step 2: bts-1 (Specs Verifier + Coverage Restorer)
- **Reads:** `docs/specs.md` + `docs/brief.md` + context docs + repo
- **Does:** Forensic audit - checks losslessness vs brief, verifies repo claims
- **Output:**
  - `docs/spec_review.md` (audit report per V-item)
  - `docs/spec_improve.md` (surgical patch instructions)
- **Gates:** Traceability tags, typed clarifiers, embedded blocks, file path evidence
- **May ask:** Developer questions if ambiguity cannot be resolved

---

### Step 3: bts-2 (Spec Patch Applier)
- **Reads:** `docs/spec_improve.md` + `docs/specs.md` + `docs/brief.md` + context docs
- **Does:** Evaluates each patch (brief-intent, status quo, regression, discipline)
- **Applies:** Only patches that pass ALL checks
- **Output:**
  - Updated `docs/specs.md` (surgically patched)
  - `docs/spec_apply.md` (audit log: pass/fail per patch)
- **Strict:** Exact-match anchors, scope containment, no cross-section edits

---

### bts-loop (Convergence Loop)
- **Does:** Alternates bts-1 ↔ bts-2 until convergence
- **Stops when:**
  - No patches proposed (specs are complete)
  - Open questions require developer input
  - Iteration limit reached (10)
- **Output:** Single gate line with status (NO_PATCHES | OPEN_QUESTIONS | ITER_LIMIT | ERROR)

---

### bts-full (Full Pipeline Orchestrator)
- **Does:** Runs complete pipeline once:
  1. bts-0 (once) → creates specs.md
  2. bts-loop (run #1) → convergence
  3. bts-loop (run #2) → stability rerun
- **Stability rule:** Run #2 must return NO_PATCHES (system is stable)
- **Output:** Final gate with status (DONE | OPEN_QUESTIONS | STALL | ERROR)

---

## Key Files

| File | Role |
|------|------|
| `docs/brief.md` | Input: V-item structured brief (from new-brief workflow) |
| `docs/specs.md` | Output: Repo-aware conceptual specs (no code) |
| `docs/spec_review.md` | Audit report (per V: PMT/WMBC accuracy, lossless check) |
| `docs/spec_improve.md` | Surgical patch instructions (what to fix in specs) |
| `docs/spec_apply.md` | Patch application log (pass/fail + reasons) |

---

## Running the Pipeline

**Manual (step by step):**
```
bts-0           → creates specs.md
bts-1           → reviews, produces spec_improve.md
bts-2           → applies patches
(repeat bts-1 ↔ bts-2 until no patches)
```

**Semi-automated (convergence):**
```
bts-0
bts-loop        → runs bts-1 ↔ bts-2 until convergence
```

**Fully automated:**
```
bts-full        → runs bts-0 + bts-loop (x2)
```

---

## Anti-Hallucination Gates

### Traceability Tags
Every bullet in specs must trace back to brief:
```
- <requirement text> (Brief: V-x — "<verbatim anchor>")
```

### Typed Clarifiers Preserved
Labels from brief must stay typed in specs:
- `CLARIFICATION:`
- `USER INSIGHT:`
- `DEFINITIVE SPEC:`
- `Exception:`, `Condition:`, `Behavior:`

### Repo Evidence Required
File paths must include proof:
```
- path/to/file.ts: <change> (evidence: matched "SearchTerm" in repo)
```

### TBD When Uncertain
Use `TBD:` instead of guessing:
```
- TBD:<component>: <what must change> (evidence: searched "term1", "term2", no match)
```

---

## Success Criteria
- ✅ All V-items from brief translated to specs (lossless)
- ✅ All repo claims verified (file paths exist, components identified)
- ✅ All traceability tags present
- ✅ All typed clarifiers preserved
- ✅ bts-loop converges with NO_PATCHES
- ✅ bts-loop run #2 stable (NO_PATCHES)

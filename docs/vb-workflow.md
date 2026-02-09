# New-Brief Workflow Overview

## Purpose
Transform user brain dumps into structured, traceable, implementation-ready briefs.

---

## The Pipeline

### Input: `docs/new-brief.md`
**User starts here:** Write what should change (brain dump format, rough ideas, feature requests)

---

### Step 1: nb-0 (Product Analyst)
- **Reads:** `docs/new-brief.md` + repo codebase + `docs/USER_JOURNEY.md`
- **Does:** Asks exactly 10 clarifying questions grounded in repo reality
- **User provides answers** → answers get added to `docs/new-brief.md`
- **Output:** Enriched `docs/new-brief.md` with clarifications

---

### Step 2: nb-1 (PM Narrative Restructurer)
- **Reads:** `docs/new-brief.md`
- **Does:** Restructures into coherent PM narrative
- **Output:** `docs/new-brief2.md` (polished, readable, 100% content preserved)

---

### Step 3: nb-2 (Coverage Reviewer)
- **Reads:** `docs/new-brief.md` (source of truth) + `docs/new-brief2.md` (candidate)
- **Does:** Compares both - patches any missing/weakened content
- **If pass:** Replaces `docs/new-brief.md` with final aligned `docs/new-brief2.md`
- **Output:** Updated `docs/new-brief.md` (now polished + complete)

---

### Step 4: nb-3 (V-Item Packager)
- **Reads:** `docs/new-brief.md`
- **Does:** Packages into V-item structure with traceability
- **Output:** `docs/brief.md` (work-ready brief with V-items)

---

### Step 5: nb-4 (Verifier)
- **Reads:** `docs/new-brief.md` + `docs/brief.md`
- **Does:** Paranoid coverage audit - nothing missed?
- **Output:** `docs/new-brief-coverage.md` with PASS/FAIL verdict

---

## Key Files

| File | Role |
|------|------|
| `docs/new-brief.md` | User input (brain dump) → gets enriched → becomes polished source of truth |
| `docs/new-brief2.md` | Temporary restructured version (replaced into new-brief.md by nb-2) |
| `docs/brief.md` | Final V-item structured brief ready for specs/implementation |
| `docs/new-brief-coverage.md` | Coverage audit report (PASS/FAIL) |

---
---

# Brief-to-Specs Workflow

## Purpose
Transform work-packaged V-items in `docs/brief.md` into repo-aware, lossless, implementation-ready specs.

---

## The Pipeline (Specs)

### Input: `docs/brief.md`
**Starting point:** Structured brief with V-items (output from new-brief workflow)

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

## Key Files (Specs)

| File | Role |
|------|------|
| `docs/brief.md` | Input: V-item structured brief (from new-brief workflow) |
| `docs/specs.md` | Output: Repo-aware conceptual specs (no code) |
| `docs/spec_review.md` | Audit report (per V: PMT/WMBC accuracy, lossless check) |
| `docs/spec_improve.md` | Surgical patch instructions (what to fix in specs) |
| `docs/spec_apply.md` | Patch application log (pass/fail + reasons) |

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

# Specs-to-Code-Change Workflow

## Purpose
Transform conceptual specs in `docs/specs.md` into exact, surgical, executable code patch plans.

---

## The Pipeline (Code Patches)

### Input: `docs/specs.md`
**Starting point:** Repo-aware conceptual specs (output from brief-to-specs workflow)

**Required context files:**
- `docs/brief.md` (for embedded reference resolution)
- `docs/TECH_OVERVIEW.md` (repo patterns)
- `docs/USER_JOURNEY.md` (screen names, flows)
- `docs/GOTCHAS.md` (known pitfalls)

---

### Step 1: stcc-0 (Ultra-Surgical Implementer)
- **Reads:** `docs/specs.md` + `docs/brief.md` + repo codebase + context docs
- **Does:** Creates exact, surgical code change proposals per V-item
- **Output:** `docs/code_patches.md` with patch operations per V:
  - Status: PROPOSED | NO-OP | BLOCKER | DEFERRED
  - Goal, Files (existing + to create), Patch Operations (OP-*)
  - Each OP: REPLACE | INSERT AFTER | INSERT BEFORE | DELETE | CREATE FILE
- **Zero guessing:** Uses exact anchors from repo, TBD/BLOCKER when uncertain

---

### Step 2: stcc-1 (Spec ↔ Code Compliance Auditor)
- **Reads:** `docs/specs.md` + `docs/code_patches.md` + repo
- **Does:** Verifies patch plan covers 100% of spec requirements
- **Output:** `docs/spec_to_code_audit.md` with per-V classification:
  - COMPLETE: all requirements covered by valid patch operations
  - PARTIALLY: some requirements covered, some missing
  - MISSING: zero requirements covered or V absent
- **Validates:** Patch executability, anchor existence, NO-OP proof

---

### Step 3: stcc-2 (Spec Splitter)
- **Reads:** `docs/spec_to_code_audit.md` + `docs/specs.md`
- **Does:** Mechanical split based on audit results
- **Output:**
  - `docs/specs_missing.md` (verbatim copy of MISSING V-items)
  - `docs/specs_incomplete.md` (verbatim copy of PARTIALLY V-items)
- **No interpretation:** Pure 1:1 copy, preserves exact formatting

---

### Step 4: stcc-3 (Missing → Append Patches)
- **Reads:** `docs/specs_missing.md` + `docs/code_patches.md` + repo
- **Does:** Creates patch plans for missing V-items and appends to code_patches.md
- **ADD ONLY:** Never modifies existing V-blocks, only adds new ones
- **Output:** Updated `docs/code_patches.md` (original + new V-items)

---

### Step 5: stcc-4 (Incomplete → Replace Patches)
- **Reads:** `docs/specs_incomplete.md` + `docs/code_patches.md` + repo
- **Does:** Replaces incomplete V-blocks with corrected, repo-grounded patch plans
- **V-by-V only:** Only modifies V-items flagged incomplete, all others unchanged
- **Output:** Updated `docs/code_patches.md` (incomplete V-blocks replaced)

---

### Step 6: stcc-5 (Specs Cleanup)
- **Reads:** `docs/specs_missing.md` + `docs/specs_incomplete.md` + `docs/code_patches.md`
- **Does:** Prunes resolved V-items from missing/incomplete files
- **Deterministic:** Removes V if it now exists in code_patches.md (presence-based)
- **Output:** Cleaned `docs/specs_missing.md` and `docs/specs_incomplete.md`

---

### stcc-loop (Coverage Convergence Loop)
- **Does:** Runs stcc-1 → stcc-2 → stcc-3 → stcc-4 → stcc-5 repeatedly
- **Stops when:** missing_or_partial_v = 0 for two consecutive cycles
- **Stall detection:** No progress (no V added/replaced/removed) for 2 cycles
- **Output:** Single gate line with status (complete | stall | error)

---

### Step 7: stcc-6 (Patch Safety Reviewer)
- **Reads:** `docs/code_patches.md` + repo codebase
- **Does:** Paranoid safety classification of each V-item
- **Output:** `docs/code_patches_safety_review.md` with per-V classification:
  - PASS: very likely safe, anchors exist and unique, no obvious breaks
  - UNSURE: non-trivial risk, fragile anchors, incomplete verification
  - FAIL: high likelihood of compile/runtime/type/routing/state breaks
- **Detailed reasoning:** 6-25 bullets for UNSURE/FAIL explaining break risks

---

### Step 8: stcc-7 (Patch Splitter: PASS → Confirmed)
- **Reads:** `docs/code_patches.md` + `docs/code_patches_safety_review.md`
- **Does:** Moves all PASS V-items to confirmed file
- **Verbatim move:** Copies PASS sections 1:1 to `docs/code_patches_confirmed.md`
- **Deletes:** PASS sections from `docs/code_patches.md` (leaving only UNSURE/FAIL)
- **Output:** Updated both files (confirmed appended, original pruned)

---

### Step 9: stcc-8 (Patch Repair Agent)
- **Reads:** `docs/code_patches.md` + `docs/code_patches_safety_review.md` + repo
- **Does:** Fixes UNSURE/FAIL patches with safer anchors, better uniqueness
- **May:** Change operation types, split fragile OPs, add safety checks, mark BLOCKER
- **Output:** Rewritten `docs/code_patches.md` (safer patch plans)
- **Goal:** Make patches more likely to become PASS on next stcc-6 run

---

### stcc-loop2 (Safety Convergence Loop)
- **Does:** Runs stcc-6 → stcc-7 → stcc-8 repeatedly
- **Stops when:** `docs/code_patches.md` is empty (all items moved to confirmed)
- **Stall detection:** No PASS moves + remaining unchanged for 2 iterations
- **Final confirmation:** Runs stcc-6 one more time on empty file (verify 0 V-items)
- **Output:** Single gate line with status (DONE | STALL)

---

### stcc-full (Full Pipeline Orchestrator)
- **Does:** Runs complete pipeline:
  1. stcc-0 (once) → creates code_patches.md
  2. stcc-loop (run #1) → coverage convergence
  3. stcc-loop (run #2) → stability rerun
  4. stcc-loop2 → safety convergence
- **Mental reset protocol:** Re-reads files from disk between stages, resets state
- **Stability check:** Run #2 must have zero missing/partial V-items
- **Output:** Final gate: DONE | STALL | ERROR

---

## Key Files (Code Patches)

| File | Role |
|------|------|
| `docs/specs.md` | Input: Conceptual specs (from brief-to-specs workflow) |
| `docs/code_patches.md` | Working file: patch plans (UNSURE/FAIL during loop2) |
| `docs/code_patches_confirmed.md` | Output: PASS patches ready for implementation |
| `docs/spec_to_code_audit.md` | Coverage audit (COMPLETE/PARTIALLY/MISSING per V) |
| `docs/specs_missing.md` | MISSING V-items (split from audit) |
| `docs/specs_incomplete.md` | PARTIALLY V-items (split from audit) |
| `docs/code_patches_safety_review.md` | Safety classification (PASS/UNSURE/FAIL per V) |

---


# Implement-Code Workflow

## Purpose
Apply confirmed code patches to the repository, verify implementation, and maintain documentation.

---

## The Pipeline (Implementation)

### Input: `docs/code_patches_confirmed.md`
**Starting point:** Safety-reviewed, PASS-classified patch plans (output from specs-to-code-change workflow)

**Required context files:**
- `docs/spec_review.md` (for verification)
- `docs/brief.md` (source of truth for final verification)

---

### Step 1: ic-0 (Code Patches Implementer)
- **Reads:** `docs/code_patches_confirmed.md` + repo codebase
- **Does:** Implements patch operations into repo step-by-step
- **Output:** `docs/code_implementation.md` (detailed execution log)
- **Per-V atomicity:** ALL ops must succeed or entire V is NO with zero net changes (rollback)
- **Idempotency:** Checks if already applied (exact text exists, positions match)

---

### Step 2: ic-1 (Code Implementation Checksum)
- **Reads:** `docs/code_implementation.md` + `docs/spec_review.md`
- **Does:** Cross-checks implementation status against spec review
- **Output:** `docs/code_implementation_checksum.md` (per-V status table)
- **Classifies:** IMPLEMENTED (YES) | NOT IMPLEMENTED (NO) | MISSING (absent)
- **Strict extraction:** Only accepts status if heading + `Implemented: YES|NO` line present

---

### Step 3: ic-2 (Implementation Verifier)
- **Reads:** `docs/code_patches_confirmed.md` + `docs/code_implementation_checksum.md` + repo
- **Does:** Validates repo state against patch plan (downgrade-only)
- **Output:**
  - `docs/code_implementation_verification.md` (verification report)
  - Updated `docs/code_implementation_checksum.md` (downgrades only)
- **Verifies end-state:** CREATE FILE (exists + contents match), REPLACE (old gone, new present)
- **Never upgrades:** Only downgrades false IMPLEMENTED claims to NOT IMPLEMENTED

---

### Step 4: ic-3 (Unimplemented Patch Extractor)
- **Reads:** `docs/code_implementation_checksum.md` + `docs/code_patches_confirmed.md`
- **Does:** Extracts NOT IMPLEMENTED + MISSING V-items
- **Output:** `docs/code_patches_confirmed2.md` (backlog of unimplemented patches)
- **Verbatim copy:** Preserves entire V sections exactly (formatting, whitespace, code fences)
- **Reports:** V-items missing from patch plan if referenced but not found

---

### Step 5: ic-4 (Code Patches Implementer v2)
- **Reads:** `docs/code_patches_confirmed2.md` + repo codebase
- **Does:** Second implementation pass for failed/missed patches
- **Output:** `docs/code_implementation2.md` (execution log v2)
- **Same strict rules:** Per-V atomicity, idempotency checks, exact anchors, rollback
- **Enables iteration:** Handles patches that failed first pass

---

### Step 6: ic-5 (Brief → Implementation Verifier)
- **Reads:** `docs/brief.md` + `docs/code_implementation_checksum.md` + `docs/code_implementation_verification.md`
- **Does:** Verifies repo state against original brief requirements
- **Output:**
  - `docs/verifier.md` (human-readable missing work report)
  - `docs/brief-missing.md` (lossless subset: only missing V-items)
- **Preserves:** Original V numbering and order, no renumbering
- **If complete:** Writes single line `NO_MISSING_V_ITEMS`

---

### ic-git (Publish to Git)
- **Does:** Creates git commit and pushes to remote
- **Never commits to main/master:** Creates feature branch `chore/commit-<YYYYMMDD-HHMM>`
- **Single commit:** Stages all changes, deterministic message
- **Pushes:** Branch to remote with upstream tracking (-u)
- **Stops on errors:** Secrets detected, no changes, hook failures, push failures

---

## Key Files (Implementation)

| File | Role |
|------|------|
| `docs/code_patches_confirmed.md` | Input: PASS patches ready for implementation |
| `docs/code_implementation.md` | ic-0 execution log (per-V: YES/NO + evidence) |
| `docs/code_implementation_checksum.md` | Status ledger (IMPLEMENTED/NOT IMPLEMENTED/MISSING) |
| `docs/code_implementation_verification.md` | Repo truth verification report (downgrade evidence) |
| `docs/code_patches_confirmed2.md` | Backlog: unimplemented patches for second pass |
| `docs/code_implementation2.md` | ic-4 execution log (second pass) |
| `docs/verifier.md` | Missing work report (vs brief.md) |
| `docs/brief-missing.md` | Lossless subset: only missing V-items from brief |
| `docs/housekeeping.md` | Proposed doc updates (ADD/REPLACE/DELETE) |

---


## Implementation Rules

### Per-V Atomicity
- ALL operations in a V must succeed or entire V is NO
- On failure: rollback to exact original bytes
- Zero net changes if any OP fails

### Strict Idempotency
- **REPLACE:** New text exists exactly once AND old text doesn't exist
- **INSERT BEFORE/AFTER:** Inserted text exists once at correct position
- **DELETE:** Deleted text doesn't exist anywhere
- **CREATE FILE:** File exists AND contents match byte-for-byte

### Ambiguity = NO
If any of these occur, entire V is NO:
- Target file missing (non-CREATE ops)
- Anchor not found exactly once (0 or >1)
- Replace/delete snippet not found exactly once
- OP block malformed or fields unclear
- CREATE FILE exists but contents differ

### Rollback Requirement
- If any write fails: restore exact original bytes
- If rollback fails: STOP entire run (avoid compounding damage)

---

## Brief Rollover (Iteration Support)

After implementation + verification + housekeeping:

**If `docs/brief-missing.md` has V-items:**
- Rename to `docs/brief.md`
- Ready for next pipeline iteration (nb → bts → stcc → ic)

**If `docs/brief-missing.md` is `NO_MISSING_V_ITEMS`:**
- Delete brief-missing.md
- No further iterations needed (all work complete)

This enables iterative development: run full pipeline, fix what failed, run again.

---

# Bug-Fixer Workflow

## Purpose
Transform bug reports (brain dumps) into structured, diagnosed, fixed, and verified solutions through paranoid investigation and surgical patches.

---

## The Pipeline (Bug Fixing)

### Input: `docs/bug-report.md`
**Starting point:** User brain dump describing what's broken (rough observations, repro steps, attempted fixes)

**Required context files:**
- `docs/USER_JOURNEY.md` (screen names, flows)
- `docs/TECH_OVERVIEW.md` (repo architecture/patterns)

---

### Step 1: bf-0 (Bug PM Translator)
- **Reads:** `docs/bug-report.md` + repo codebase + context docs
- **Does:** Translates brain dump into structured, reproducible bug report
- **Output:** `docs/bugfix/bug_report_structured.md` with sections:
  - Summary (what breaks, where, when)
  - Known-Good vs Known-Bad states
  - Reproduction steps (deterministic)
  - Expected vs Actual
  - **Do Not Re-test** (confirmed negatives / ruled out)
  - **Attempt History** (experiments and outcomes)
  - Current hypothesis / suspects (as stated)
  - Acceptance criteria (human-checkable)
- **May create:** `docs/bugfix/bug_report_questions.md` if developer input needed
- **Anti-loop:** Preserves ruled-out causes and failed attempts to prevent repeat work

---

### Step 2: bf-1 (Ultra-Paranoid Bug Hunter)
- **Reads:** `docs/bugfix/bug_report_structured.md` + repo codebase
- **Does:** Exhaustive hypothesis generation (turn every stone)
- **Output:** `docs/bugfix/bug_hunt.md` with:
  - 10-20 hypotheses (ACTIVE or EXCLUDED based on ruled-out items)
  - Each hypothesis: likelihood, evidence (file paths + anchor snippets), failure mechanism, disproof test, side effects
  - Suspicious code map (verified paths + exact snippets)
  - Non-obvious failure modes checklist
  - Minimal debugging experiments (must not repeat ruled-out tests)
  - Smells (relevant debt discovered in affected area)
- **Loop-avoidant:** Respects Do Not Re-test and Attempt History constraints

---

### Step 3: bf-2 (Critical Senior Engineer)
- **Reads:** `docs/bugfix/bug_report_structured.md` + `docs/bugfix/bug_hunt.md` + repo
- **Does:** Triages hypotheses and writes minimal fix specs
- **Output:** `docs/bugfix/bug_fix_specs.md` with:
  - Selected primary root cause hypothesis (must not contradict ruled-out items)
  - Optional secondary contributing factors
  - Target area (repo-verified file paths)
  - Proposed changes (conceptual, no code)
  - In-scope vs out-of-scope (explicit)
  - Acceptance tests (maps to structured report AC-*)
  - Regression tests
- **Decision style:** Smallest fix, minimal blast radius, correctness-first
- **Respects:** Do Not Re-test and Attempt History constraints

---

### Step 4: bf-3 (Surgical Patch Planner)
- **Reads:** `docs/bugfix/bug_fix_specs.md` + repo codebase
- **Does:** Creates exact, surgical code patch operations
- **Output:** `docs/bugfix/bug_code_patches.md` with deterministic patch operations:
  - REPLACE: exact old text → exact new text (with unique anchor)
  - INSERT BEFORE/AFTER: exact insertion text + unique anchor
  - DELETE: exact text to remove (with unique anchor)
  - CREATE FILE: exact full file contents
  - DELETE FILE: file path only
- **Determinism:** All anchors must exist exactly once, or operation is BLOCKER
- **Minimal edits:** Smallest diff that satisfies specs
- **No guessing:** Missing file, non-unique anchor, or ambiguous target = BLOCKER

---

### Step 5: bf-4 (Patch Applier)
- **Reads:** `docs/bugfix/bug_code_patches.md` + repo codebase
- **Does:** Applies patch operations to repo with strict protocol
- **Output:**
  - Updated repo files (actual code changes applied)
  - `docs/bugfix/bug_patch_protocol.md` (full execution log per OP)
  - `docs/bugfix/bug_patch_successful.md` (successful ops + evidence)
  - `docs/bugfix/bug_patch_unsuccessful.md` (failed ops + evidence + why)
- **Strict rules:**
  - Preflight checks (file exists, anchor unique, snippet unique)
  - Apply only if preflight passes
  - Verify after apply (idempotency checks)
  - Skip on ambiguity (0 or >1 matches)
- **Idempotency:** REPLACE (new exists, old absent), INSERT (text at correct position), DELETE (text absent), CREATE FILE (file exists + contents match)
- **No improvisation:** Applies exactly what patch plan specifies

---

### Step 6: bf-5 (Verifier)
- **Reads:** `docs/bugfix/bug_report_structured.md` + `docs/bugfix/bug_fix_specs.md` + `docs/bugfix/bug_patch_protocol.md` + repo
- **Does:** Proves whether bug is fixed with evidence
- **Output:** `docs/bugfix/bug_verification.md` with:
  - Acceptance Criteria checks (from structured report)
  - Acceptance Tests checks (from specs)
  - Regression tests checks
  - Automated checks (tests, build, lint, typecheck)
  - Result: bug fixed (yes/no/partial/not confirmed) + confidence (0-10)
  - Next step recommendation (routing for loop: A/B/C/D/E/STOP)
- **Evidence-first:** Every PASS must cite evidence (steps, observations, test output)
- **Routing logic:**
  - Route D: patch application ambiguous or ops not applied
  - Route B: patches applied but bug persists (need deeper hunt)
  - Route C: specs/tests insufficient or new decision needed
  - Route STOP: bug fixed with confidence

---

### bf-loop (Bug Fixer Convergence Runner)
- **Does:** Runs bf-0 → bf-1 → bf-2 → bf-3 → bf-4 → bf-5 in sequence
- **Stops when:**
  - Bug fixed (bf-5 confirms)
  - Developer input needed (questions / blockers)
  - Verification cannot proceed deterministically
- **Parses gate lines** from each agent to decide STOP vs continue
- **Fixed order:** Agents run sequentially, no skipping

---

## Key Files (Bug Fixing)

| File | Role |
|------|------|
| `docs/bug-report.md` | Input: User brain dump (rough bug report) |
| `docs/bugfix/bug_report_structured.md` | Structured, reproducible bug report with constraints |
| `docs/bugfix/bug_report_questions.md` | Developer questions (only if needed by bf-0) |
| `docs/bugfix/bug_hunt.md` | Exhaustive hypothesis list (10-20 H-* with evidence) |
| `docs/bugfix/bug_fix_specs.md` | Minimal fix specs (conceptual, no code) |
| `docs/bugfix/bug_code_patches.md` | Surgical patch operations (exact anchors, deterministic) |
| `docs/bugfix/bug_patch_protocol.md` | Full execution log (per-OP preflight → apply → verify) |
| `docs/bugfix/bug_patch_successful.md` | Successful ops summary + evidence |
| `docs/bugfix/bug_patch_unsuccessful.md` | Failed ops summary + evidence + why |
| `docs/bugfix/bug_verification.md` | Verification report (AC/AT checks, confidence, routing) |

---

## Anti-Loop Mechanisms

### Confirmed Negatives / Ruled Out
- bf-0 extracts and preserves ruled-out causes from bug report
- bf-1 and bf-2 MUST respect these as hard constraints
- Prevents re-testing already disproven hypotheses

### Attempt History
- bf-0 captures prior experiments with outcomes
- bf-1 must not propose debugging experiments that repeat failed attempts
- bf-2 must not spec fixes that repeat already-failed changes

### Known-Good vs Known-Bad States
- bf-0 documents where bug works vs fails
- Helps narrow scope and guide hypothesis generation
- Prevents broad, unfocused investigation

---

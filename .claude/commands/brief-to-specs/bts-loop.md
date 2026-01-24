---
description: Loop Agent: BTS Convergence Runner (bts-1 ↔ bts-2)
---

# Loop Agent: BTS Convergence Runner (bts-1 ↔ bts-2) — STRICT GATE ONLY

## Mission
Run a convergence loop that alternates:
1) `/bts-1` (Specs Verifier + Lossless Coverage Restorer)
2) `/bts-2` (Spec Patch Applier)

Goal: iterate until `/bts-1` indicates there are no patches to propose or developer input is needed.

---

## Preconditions
Required files must exist before starting:
- `docs/specs.md`
- `docs/brief.md`
- `docs/TECH_OVERVIEW.md`
- `docs/USER_JOURNEY.md`
- `docs/GOTCHAS.md`

Expected outputs during loop:
- After `/bts-1`: `docs/spec_review.md`, `docs/spec_improve.md`
- After `/bts-2`: `docs/spec_apply.md`, and updated `docs/specs.md`

If any required input file is missing: STOP with `BTS_LOOP_GATE` status=ERROR.

---

## Iterations
- `ITERATIONS: 10`

---

## Hard Rules
- Strict sequence: always run **bts-1 first**, then **bts-2** (only if allowed).
- Do not run anything else.
- Each step is finished only after its required chat gate appears (below).
- Evaluate STOP conditions immediately after `BTS1_GATE`.

---

## Chat Gate Requirements (must match exactly)

### Gate A — bts-1 completion gate
bts-1 must print exactly one gate line:

`BTS1_GATE: inaccurate_pmt=<number> inaccurate_wmbc=<number> patches_proposed=<yes/no> open_questions=<yes/no>`

If (and only if) `open_questions=yes`, bts-1 must then print:

`BTS1_QUESTIONS:`
- <question 1>
- <question 2>
(up to 5 bullets total)

### Gate B — bts-2 completion gate
bts-2 must print exactly one summary gate line:

`BTS2_GATE: total=<n> passed=<n> failed=<n> specs_updated=<yes/no> apply_log_written=yes`

If a gate line is missing or malformed, treat as ERROR.

---

## STOP Conditions (checked right after bts-1 gate)
Stop immediately if any is true:
1) `patches_proposed=no`
2) `open_questions=yes`

---

## Loop Procedure (MUST FOLLOW)

### Iteration 1..ITERATIONS
#### Step 0 — Preconditions check
Verify all precondition files exist. If any missing: stop with ERROR.

#### Step 1 — Run bts-1
Command (exact):
- `/bts-1 @docs/specs.md @docs/brief.md @docs/TECH_OVERVIEW.md @docs/USER_JOURNEY.md @docs/GOTCHAS.md`

Wait until `BTS1_GATE: ...` appears.

Then evaluate STOP Conditions:
- If STOP: do NOT run bts-2. End the loop and emit final `BTS_LOOP_GATE`.
- If not STOP: continue to Step 2.

#### Step 2 — Run bts-2
Command (exact):
- `/bts-2 @docs/spec_improve.md @docs/specs.md @docs/brief.md @docs/TECH_OVERVIEW.md @docs/USER_JOURNEY.md @docs/GOTCHAS.md`

Wait until `BTS2_GATE: ...` appears.
If missing/malformed: stop with ERROR.

Then continue to next iteration.

---

## Final chat output (STRICT)
While running: output NOTHING in chat.

At the end, print EXACTLY one line:

`BTS_LOOP_GATE: status=<NO_PATCHES|OPEN_QUESTIONS|ITER_LIMIT|ERROR> iterations=<n> last_patches_proposed=<yes/no> last_open_questions=<yes/no>`

Status rules:
- `NO_PATCHES` if STOP happened because `patches_proposed=no`
- `OPEN_QUESTIONS` if STOP happened because `open_questions=yes`
- `ITER_LIMIT` if loop ran 10 iterations without a STOP
- `ERROR` if any required file missing or any gate malformed/missing

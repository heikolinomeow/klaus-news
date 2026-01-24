---
description: # bf-loop — Bug Fixer Convergence Runner (bf-0 → bf-5)
---

# Mission
Run the bug-fixer agents in a deterministic loop until:
- the end is reached (bf-5 completed)
- developer input is needed (questions / blockers), OR
- patch application/verification cannot proceed deterministically.

This runner does not do bug analysis itself. It only:
- launches the bf agents in sequence
- waits for each agent’s Chat Gate
- parses the gate lines
- decides STOP vs continue

---

## Agents (fixed order)
- bf-0: Bug report translator (brainfarts → structured report)
- bf-1: Exhaustive bug hunter (hypotheses list)
- bf-2: Fix spec writer (choose fixes + acceptance tests)
- bf-3: Surgical patch planner (specs → deterministic patch ops)
- bf-4: Patch applier (apply ops to repo + protocol)
- bf-5: Verifier (prove fixed)

---

## Preconditions (must exist before starting)
- Repo is available
- `docs/README.md` or equivalent entry point exists
- `docs/TECH_OVERVIEW.md` and `docs/USER_JOURNEY.md` exist if referenced by bf-0/bf-2 (if missing, bf-0/bf-2 must mark as blockers/questions)

---

## Chat Gate format (required for every bf agent)
Each agent must print a fenced block with at least:

```txt
GATE: bf-x
Written: <path>
...

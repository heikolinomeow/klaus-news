# Bug Code Patch Plan

## Summary
- Total patch operations: 1
- New files to create: 0
- Blockers: no

---

## Patch Operations (in order)

### OP-1 — Replace hardcoded max_results with parameter variable
- File: `backend/app/services/x_client.py`
- Operation: REPLACE

- Target location:
  - Anchor snippet (verified unique - 1 match in entire backend):
    ```python
            "max_results": 5,
    ```

- Change:
  - Replace this exact text:
    ```python
            "max_results": 5,
    ```
  - With this exact text:
    ```python
            "max_results": max_results,
    ```

- Why (ties to bug_fix_specs.md):
  - SPEC-1 requires using the `max_results` function parameter instead of hardcoded `5` so the "Posts Per Fetch" setting takes effect.

- Safety check:
  - After applying, verify line 50 now reads `"max_results": max_results,` and the `max_results` variable is in scope (defined on line 26 as function parameter).

---

## Blockers
None.

## Chat Gate (MANDATORY)

```txt
GATE: bf-3
Written: docs/bugfix/bug_code_patches.md
Total ops: 1
Blockers: no
Next: bf-4
```

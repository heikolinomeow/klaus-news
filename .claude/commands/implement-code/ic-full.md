---
description: IC Full Run alias (delegates to ic-loop / IC-XL)
---

Use `ic-loop` for the full IC pipeline.

`ic-loop` is the canonical IC-XL orchestrator and already implements the full run:
- IC-0
- IC-1
- IC-2
- IC-3
- IC-4
- IC-5
- IC-HOUSEKEEPING
- IC-LFG

Required success signals are identical:
- includes `ROLLOVER: YES|NO`
- ends with `SIGNOFF: IC-XL`


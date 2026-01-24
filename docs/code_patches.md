# Code Patch Plan (from docs/specs.md)

## Summary
- Total V items: 94
- V items with code changes: 2 (2 PROPOSED + 0 BLOCKER + 0 DEFERRED)
- V items that are documentation/planning: 86 (NO-OP)
- Total patch operations proposed: 4
- New files to create: 0

**Note**: The specs.md structure includes extensive documentation scaffolding where single features (V-1 through V-7) are described multiple times at different levels of detail (brief description, detailed feature spec, acceptance criteria, technical details, risk assessment). This accounts for the high NO-OP count - most V-items are references back to the 7 core implementation items.

**Architectural Decision**: V-4 implements Option A (dedicated `prompts` table) per user selection, unblocking V-5, V-6, V-7, V-22.

**Open Questions V-25 to V-29**: All answered NO (no additional features).

**STCC-8 Rewrite Notes (Current Iteration)**:
- V-6 OP-19: Added hasattr check for _get_prompt to work without V-4 dependency
- V-6 OP-19: Added hardcoded fallback prompt config
- V-7 OP-21: Changed anchor from score_worthiness (doesn't exist) to generate_article (exists at line 77)
- V-7 OP-21: Added hasattr check for _get_prompt to work without V-4 dependency
- V-7 OP-21: Added hardcoded fallback prompt config
- Both V-6 and V-7 now safe to apply independently of V-4

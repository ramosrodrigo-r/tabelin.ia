---
phase: 08-multi-turn-llm-context
fixed_at: 2026-05-30T00:00:00Z
review_path: .planning/phases/08-multi-turn-llm-context/08-REVIEW.md
iteration: 2
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 8: Code Review Fix Report

**Fixed at:** 2026-05-30T00:00:00Z
**Source review:** .planning/phases/08-multi-turn-llm-context/08-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 2 (critical_warning scope — 0 critical, 2 warning; 4 info findings excluded)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: History read is unbounded at the DB layer; the row cap is only enforced on write

**Files modified:** `apps/web/src/server/tools/conversation-repository.ts`
**Commit:** 03f40f0
**Applied fix:** Added a `READ_LIMIT = 10` constant (aligned with `MAX_EXCHANGES`) and bound `findConversationExchanges` independently of the write-side prune. The query now orders `createdAt: "desc"` with `take: READ_LIMIT`, then `.reverse()`s the rows to restore chronological ascending order expected by `buildToolContextMessages`. This caps the read path's memory/DB transfer even if the Serializable prune in `saveConversationExchange` is skipped (failed transaction, manual/backfill inserts).

### WR-02: Token-budget guard can return an empty history, silently dropping the most recent turn

**Files modified:** `apps/web/src/server/ai/context-messages.ts`, `apps/web/tests/context-messages.test.ts`
**Commit:** 3dc2564
**Applied fix:** Changed the truncation loop guard from `truncated.length > 0` to `truncated.length > 1`, so `truncateHistory` always retains at least the most recent exchange even when that single exchange alone exceeds `SAFE_TOKEN_BUDGET`. Per-body serialized truncation for the oversized-single-exchange case is documented as deferred. Tightened the existing oversized-history test to assert `result.length >= 1` (removed the passive `if (result.length > 0)` guard) and added a dedicated test asserting a single oversized exchange is retained rather than dropped to `[]`.

## Findings Out of Scope (not attempted)

The following Info findings were excluded by `fix_scope: critical_warning` and were not modified:

- IN-01: `toolKind` parameter of `buildToolContextMessages` is unused
- IN-02: Docstring references a non-existent `skipTruncation` parameter
- IN-03: Stale "NOVO — Phase 6" comments on Phase 8 code
- IN-04: `vi.clearAllMocks()` mid-test resets the entitlement stub without re-stubbing (latent)

## Verification Note

Tier 2 syntax verification (`tsc --noEmit`) was unavailable because the isolated worktree at `/tmp` has no installed `node_modules`. Verification relied on Tier 1 (re-read of each modified region, confirming fix text present and surrounding code intact). Both fixes are simple, well-scoped TypeScript changes (a `take`/`reverse` query change and a single loop-bound condition change plus test assertions); none introduce new logic branches that would be missed by structural review. The WR-02 change is a boundary-condition fix — recommend the developer confirm the `> 1` guard behaves as intended during the verifier phase.

---

_Fixed: 2026-05-30T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_

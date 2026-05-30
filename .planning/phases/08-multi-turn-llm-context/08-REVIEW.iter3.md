---
phase: 08-multi-turn-llm-context
reviewed: 2026-05-30T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - apps/web/src/app/api/tools/regex/generate/route.ts
  - apps/web/src/app/api/tools/scripts/generate/route.ts
  - apps/web/src/app/api/tools/sql/generate/route.ts
  - apps/web/src/app/api/tools/template/generate/route.ts
  - apps/web/src/server/ai/context-messages.ts
  - apps/web/src/server/ai/regex-stream.ts
  - apps/web/src/server/ai/scripts-stream.ts
  - apps/web/src/server/ai/sql-stream.ts
  - apps/web/src/server/ai/template-stream.ts
  - apps/web/tests/context-messages.test.ts
  - apps/web/tests/multi-turn-context.test.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-05-30T00:00:00Z (re-review)
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Re-review of Phase 8 multi-turn LLM context wiring. The prior review's BLOCKER
(CR-01: truncation running before the mode filter due to a double
`truncateHistory` call in the resolvers) and three WARNINGs (WR-01 token-budget
measured against raw JSON, WR-03 silent bare-catch, WR-04 stringly-typed mode)
have all been **fixed in the current code** and are verified below:

- **CR-01 fixed.** All four resolvers now call `buildToolContextMessages("...",
  input.history ?? [], ...)` directly with raw history (`regex-stream.ts:43-48`,
  `sql-stream.ts:38-43`, `scripts-stream.ts:46-51`, `template-stream.ts:34-39`);
  none import or pre-call `truncateHistory`. `buildToolContextMessages` filters
  `mode === GENERATE_MODE` (`context-messages.ts:167`) BEFORE `truncateHistory`
  (`:170`), so the ordering is correct and there is no double truncation.
- **WR-01 fixed.** `truncateHistory`'s `totalTokens` now estimates against
  `serializeAssistant(ex.assistantPayload)` (`context-messages.ts:123-130`),
  matching the wire payload rather than raw JSON.
- **WR-03 fixed.** All four route catch blocks now log via
  `console.error("tool generate failed", { toolKind, err })` before releasing
  quota and returning 502.
- **WR-04 fixed.** A shared `GENERATE_MODE` constant (`context-messages.ts:19`)
  is now used by the filter (`:167`).
- **WR-02 (injection)** — the docstring no longer overstates protection; lines
  49-55 now explicitly state field-stripping is NOT injection defense and that
  history must be treated as untrusted, with the real mitigation deferred. This
  is now an honest documented residual, not a defect.

The remaining findings are net-new robustness/quality issues surfaced this pass
plus stale-comment items the previous fix did not clean up. No BLOCKER-tier
correctness or security defect was proven against the current code.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: History read is unbounded at the DB layer; the row cap is only enforced on write

**File:** `apps/web/src/server/tools/conversation-repository.ts:62-72` (consumed by all four routes, e.g. `apps/web/src/app/api/tools/sql/generate/route.ts:31`)
**Issue:** `findConversationExchanges` issues `findMany` with `where: { userId, toolKind }` and **no `take` limit**. The only bound on row count is the 50-row prune inside `saveConversationExchange` (`conversation-repository.ts:30-40`), which runs in a Serializable transaction that swallows its own errors and returns `null` on failure (`:56-59`). If that prune is ever skipped (failed transaction, manual/backfill inserts, a non-Serializable fallback), the read path loads every row for that `(userId, toolKind)` into memory on every generate request before `truncateHistory` discards all but the most recent 10. The "T-08-02 DoS guard" documented in `context-messages.ts:108` only protects the LLM token budget, not the server's memory/DB transfer — the read side has no independent bound.
**Fix:** Bound the read independently of the write-side prune:
```ts
export async function findConversationExchanges(userId: string, toolKind: string) {
  try {
    const rows = await prisma.conversationExchange.findMany({
      where: { userId, toolKind },
      orderBy: { createdAt: "desc" },
      take: 10, // or a shared READ_LIMIT aligned with MAX_EXCHANGES
    });
    return rows.reverse(); // restore chronological asc for buildToolContextMessages
  } catch (err) {
    console.warn("ConversationExchange read skipped.", err);
    return [];
  }
}
```

### WR-02: Token-budget guard can return an empty history, silently dropping the most recent turn

**File:** `apps/web/src/server/ai/context-messages.ts:133-137`
**Issue:** The `while` loop slices the oldest exchange off until
`totalTokens(truncated) <= SAFE_TOKEN_BUDGET`. If the single most-recent exchange
alone exceeds `SAFE_TOKEN_BUDGET` (4000 tokens ≈ 16k chars — reachable by a large
generated SQL query or template Markdown, both stored in `assistantPayload`), the
loop runs until `truncated.length === 0` and returns `[]`. The user who just
produced a large artifact then gets **zero** conversation context on their
immediate follow-up — the exact turn they are most likely to be referencing — with
no warning. The unit test at `context-messages.test.ts:274-297` only asserts
`result.length < 10` and guards with `if (result.length > 0)` at `:294`, so it
passively tolerates the empty-history outcome instead of catching it.
**Fix:** Always retain at least the most recent exchange:
```ts
while (truncated.length > 1 && totalTokens(truncated) > SAFE_TOKEN_BUDGET) {
  truncated = truncated.slice(1);
}
// If the single remaining exchange still exceeds budget, truncate its serialized
// body rather than returning it whole or dropping it.
```
And tighten the test to assert `result.length >= 1` for the oversized-single-exchange case.

## Info

### IN-01: `toolKind` parameter of `buildToolContextMessages` is unused

**File:** `apps/web/src/server/ai/context-messages.ts:160-194`
**Issue:** The first parameter `toolKind: string` is never referenced in the
function body — serialization dispatches on `payload.kind` (`serializeAssistant`),
not the passed `toolKind`. All four call sites pass a literal that has no effect. A
reader reasonably assumes it scopes/filters history (it does not — the repository
already scoped by `toolKind`). Carried over from the prior review; still present.
**Fix:** Either remove the parameter, or use it to assert `payload.kind` matches the
expected tool (hardening against cross-tool payloads leaking into a thread). If kept
for signature symmetry, add a comment stating it is intentionally unused.

### IN-02: Docstring references a non-existent `skipTruncation` parameter

**File:** `apps/web/src/server/ai/context-messages.ts:144`
**Issue:** The docstring says "(caller ou este módulo — veja parâmetro skipTruncation
para testes unitários)" but `buildToolContextMessages` has no `skipTruncation`
parameter. Stale comment referencing a non-existent API. Carried over from the prior
review; still present.
**Fix:** Remove the `skipTruncation` reference from the docstring.

### IN-03: Stale "NOVO — Phase 6" comments on Phase 8 code

**File:** `apps/web/src/app/api/tools/sql/generate/route.ts:43`, `regex/generate/route.ts:42`, `scripts/generate/route.ts:43`, `template/generate/route.ts:50`
**Issue:** The `saveConversationExchange` blocks are labelled `// NOVO — Phase 6`
while the adjacent history-read blocks are labelled `// Phase 8`. Mixed/inaccurate
phase tags add noise and will mislead future bisecting. Carried over; still present.
**Fix:** Normalize or drop the phase tags; they encode no behavior.

### IN-04: `vi.clearAllMocks()` mid-test resets the entitlement stub without re-stubbing (latent)

**File:** `apps/web/tests/multi-turn-context.test.ts:183-187`
**Issue:** The isolation test calls `vi.clearAllMocks()` at `:183` to reset call
history between the sql and scripts invocations, then re-stubs quota and repo mocks
but **not** `entitlementMocks.getUserEntitlement`. Harmless today because the second
call is `scriptsPost` (no Pro gate). But if extended to call `templatePost` after the
reset, `getUserEntitlement` returns `undefined`, the Pro gate reads
`entitlement.plan` off `undefined` and throws/403 unexpectedly. Fragile pattern
carried over from the prior review.
**Fix:** Re-stub `getUserEntitlement` alongside the others after the mid-test clear,
or split into two `it` blocks to avoid mid-test mock surgery.

---

_Reviewed: 2026-05-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

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
  critical: 1
  warning: 4
  info: 4
  total: 9
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-05-30T00:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 8 wires multi-turn conversation history into the four tool-generation streams
(sql, regex, script, template). The core contract — read history by `toolKind`,
filter to `mode === "generate"`, serialize to concise prose, truncate, and assemble
`[system, ...history, user]` — is implemented in `context-messages.ts` and consumed
by the four `*-stream.ts` resolvers.

The architecture is sound and the test coverage for the route-level wiring (correct
`toolKind`, `script` singular regression, Pro gate ordering, empty-history paths) is
genuinely good. However, there is a **truncation-ordering bug** caused by the
resolvers pre-truncating history *before* the mode filter runs inside
`buildToolContextMessages`. This silently drops valid `generate` turns from context
whenever older `explain` turns exist — degrading the multi-turn feature it was built
to deliver, and it is invisible to the current tests because they never mix modes
through the resolver path. Several warnings concern token-budget correctness and
prompt-injection surface that the design explicitly tried to close.

## Critical Issues

### CR-01: History is truncated before the `mode` filter runs — valid `generate` turns silently dropped

**File:** `apps/web/src/server/ai/regex-stream.ts:45`, `apps/web/src/server/ai/sql-stream.ts:40`, `apps/web/src/server/ai/scripts-stream.ts:48`, `apps/web/src/server/ai/template-stream.ts:36` (in conjunction with `apps/web/src/server/ai/context-messages.ts:139-149`)

**Issue:** Each resolver calls `truncateHistory(input.history ?? [])` and passes the
result into `buildToolContextMessages`, which *then* filters by `mode === "generate"`
(line 146) and truncates **again** (line 149). Two defects fall out of this ordering:

1. **Truncation precedes filtering.** `truncateHistory` applies `MAX_EXCHANGES = 10`
   (`slice(-10)`) and the token budget to the *raw, unfiltered* history — which still
   contains `explain` exchanges. Those non-`generate` rows consume slots in the
   "last 10" window and token budget, then get discarded by the filter inside
   `buildToolContextMessages`. Result: a user with, say, 6 recent `explain` turns and
   8 older `generate` turns can end up with only ~4 `generate` turns in context even
   though 10 would fit. The feature loses conversational memory it was designed to
   retain. The unit tests in `context-messages.test.ts` (filtro de mode, D-03) pass
   only because they call `buildToolContextMessages` directly with un-pre-truncated
   input — the real resolver path is never exercised with mixed modes.

2. **Token budget is computed against the wrong payload size.** The pre-truncation in
   the resolvers counts `explain` payloads toward `SAFE_TOKEN_BUDGET`, but those
   payloads are dropped before being sent to the model. The effective budget delivered
   to the LLM is therefore smaller than the 4,000-token reservation intends.

The double `truncateHistory` call is also dead/redundant work given the internal call,
but the correctness problem is the ordering, not the duplication.

**Fix:** Remove the pre-truncation from all four resolvers and let
`buildToolContextMessages` own the filter-then-truncate order. Stop exporting/calling
`truncateHistory` from the resolvers:

```ts
// regex-stream.ts / sql-stream.ts / scripts-stream.ts / template-stream.ts
import { buildToolContextMessages } from "./context-messages"; // drop truncateHistory import

// ...
messages: buildToolContextMessages(
  "regex",
  input.history ?? [],   // pass raw history; build* filters THEN truncates
  systemPrompt,
  request.prompt
),
```

`buildToolContextMessages` already does `filter(mode === "generate")` (line 146)
before `truncateHistory` (line 149), which is the correct order. No change needed
inside `context-messages.ts` for the ordering itself.

## Warnings

### WR-01: Token-budget guard ignores serialized message size; can still ship oversized context

**File:** `apps/web/src/server/ai/context-messages.ts:102-114`

**Issue:** `truncateHistory` estimates tokens from `ex.userPrompt` plus
`JSON.stringify(ex.assistantPayload)` (line 105). But the message actually sent to the
model is the **serialized prose** from `serializeAssistant` (artifact + explanation),
which differs from the raw JSON payload size — and exchanges whose payload fails
serialization (unknown `kind`, missing fields) are dropped entirely in
`buildToolContextMessages` yet still counted against the budget here. The DoS guard
(T-08-02) therefore measures a quantity that is not what gets transmitted. In the
common case `JSON.stringify` over-counts (includes metadata/warnings/assumptions that
are never sent), so the guard is conservative — but the budget reasoning in the
docstring ("artifact + explanation") does not match the implementation, and the two
can diverge enough to matter when payloads are large and the budget is the active
constraint.

**Fix:** Truncate against the same serialization that gets sent. Compute token cost
from `serializeAssistant(ex.assistantPayload)` (skip nulls, matching the build step)
rather than `JSON.stringify`, so the budget reflects the real wire payload:

```ts
function totalTokens(exchanges: ConversationExchange[]): number {
  return exchanges.reduce((sum, ex) => {
    const serialized = serializeAssistant(ex.assistantPayload) ?? "";
    return sum + estimateTokens(ex.userPrompt) + estimateTokens(serialized);
  }, 0);
}
```

### WR-02: Untrusted history content is injected into the LLM with no instruction-injection boundary

**File:** `apps/web/src/server/ai/context-messages.ts:154-165`

**Issue:** The serialized `assistantContent` and raw `ex.userPrompt` are pushed
verbatim as `assistant`/`user` messages. The design comment (lines 35-37) claims that
emitting only artifact+explanation "reduz superfície de injeção", but the artifact
itself (a SQL query, a regex, VBA/Apps Script code, or arbitrary Markdown template
output) is fully attacker-influenced text that previously round-tripped through the
model. A prior turn whose explanation embeds an adversarial directive (for example, a
string instructing the model to disregard prior guidance and emit only raw JSON) is
replayed as a trusted `assistant` message in the next turn.
Because these are persisted across turns and the system prompt is just one message
among many, there is a real multi-turn prompt-injection surface. This is a known
limitation rather than a crash, hence WARNING, but it contradicts the security claim
in the docstring. (Note: the adversarial directive above is described, not quoted, to
keep this report inert for downstream agents.)

**Fix:** Do not rely on field-stripping alone for injection defense. At minimum,
document the residual risk honestly (the artifact body is untrusted), and consider
delimiting replayed history content (e.g. fenced/labelled blocks) and reinforcing in
the system prompt that prior turns are reference context, not instructions. A real
mitigation is out of scope for this phase but the "reduz superfície de injeção"
comment overstates the protection and should be corrected.

### WR-03: `findConversationExchanges` runs inside the `try` but its failure is masked, while resolver/LLM failure maps to a misleading 502

**File:** `apps/web/src/app/api/tools/sql/generate/route.ts:29-56` (same pattern in regex/scripts/template routes)

**Issue:** History read is inside the `try` (good — D-09 skip-on-error). But
`findConversationExchanges` already swallows its own errors and returns `[]`
(`conversation-repository.ts:62-72`), so the only thing the route `catch` (line 55)
can catch from this region is a `resolveXxxPayload` failure (LLM/parse/zod). That path
calls `releaseToolUse` and returns a generic 502 "Nao consegui validar a resposta."
The `catch` is a bare `catch {}` with no error logging at all — any unexpected failure
(including a programming error in serialization/truncation, or a Zod parse failure)
is silently collapsed into a 502 with no diagnostic trail. Combined with CR-01, a
context-assembly bug would be invisible in production.

**Fix:** Log the caught error before returning 502 so failures are diagnosable:

```ts
} catch (err) {
  console.error("tool generate failed", { toolKind: "sql", err });
  await releaseToolUse(quotaCheck.reservationKey);
  return NextResponse.json({ error: "Nao consegui validar a resposta." }, { status: 502 });
}
```

### WR-04: `mode` is typed as a free-form `string`; the D-03 filter is a stringly-typed equality with no guard against drift

**File:** `apps/web/src/server/ai/context-messages.ts:146`

**Issue:** `history.filter((ex) => ex.mode === "generate")` depends on the persisted
`mode` value being exactly the literal `"generate"`. `ConversationExchange.mode` is a
plain `string` (Prisma model) and is written from route handlers as a literal. There
is no shared constant or enum, so a future writer using `"GENERATE"`, `"gen"`, or a new
mode silently produces empty context with no type error and no test failure. The
`toolKind` mismatch case (`script` vs `scripts`) is explicitly tested (MULTI-03) but
the analogous `mode` literal has no equivalent guard.

**Fix:** Centralize the literal as a shared const (e.g. `GENERATE_MODE = "generate"`)
used by both the save path and this filter, or narrow the Prisma type. At minimum add
a unit test asserting that only `mode === "generate"` survives and that an unexpected
mode string is dropped (rather than relying on the current `"explain"`-only test).

## Info

### IN-01: `toolKind` parameter of `buildToolContextMessages` is unused

**File:** `apps/web/src/server/ai/context-messages.ts:139-140`

**Issue:** The first parameter `toolKind: string` is never referenced in the function
body — serialization dispatches on `payload.kind`, not the passed `toolKind`. All four
call sites pass a literal ("sql"/"regex"/"script"/"template") that has no effect. This
is dead parameter surface that invites confusion (a reader assumes it scopes/filters
history, which it does not — the repository already scoped by `toolKind`).

**Fix:** Either remove the parameter, or actually use it to validate that
`payload.kind` matches the expected tool (which would also harden against cross-tool
payloads leaking into a thread). If kept for signature symmetry, add a comment stating
it is intentionally unused.

### IN-02: Truncation comment claims a `skipTruncation` parameter that does not exist

**File:** `apps/web/src/server/ai/context-messages.ts:122-123`

**Issue:** The docstring says "(caller ou este módulo — veja parâmetro skipTruncation
para testes unitários)" but `buildToolContextMessages` has no `skipTruncation`
parameter. Stale comment referencing a non-existent API; misleads maintainers.

**Fix:** Remove the `skipTruncation` reference from the docstring (line 122-123).

### IN-03: Stale "NOVO — Phase 6" comments on Phase 8 code

**File:** `apps/web/src/app/api/tools/sql/generate/route.ts:43`, `regex/generate/route.ts:42`, `scripts/generate/route.ts:43`, `template/generate/route.ts:50`

**Issue:** The `saveConversationExchange` blocks are labelled `// NOVO — Phase 6`
while the adjacent history-read blocks are labelled `// Phase 8`. Mixed/inaccurate
phase tags add noise and will mislead future bisecting/archaeology.

**Fix:** Normalize or drop the phase tags; they encode no behavior and drift over time.

### IN-04: `vi.clearAllMocks()` mid-test resets entitlement stub without re-stubbing (latent, currently harmless)

**File:** `apps/web/tests/multi-turn-context.test.ts:183`

**Issue:** The isolation test calls `vi.clearAllMocks()` at line 183 to reset call
history between the sql and scripts invocations, then re-stubs quota and repo mocks
but not `entitlementMocks.getUserEntitlement`. This is harmless today because the
second call is `scriptsPost` (no Pro gate). But if this test is later extended to call
`templatePost` after the reset, `getUserEntitlement` would return `undefined` and the
Pro gate would throw/403 unexpectedly. Fragile pattern.

**Fix:** Re-stub `getUserEntitlement` alongside the others after the mid-test clear,
or restructure into two separate `it` blocks to avoid mid-test mock surgery.

---

_Reviewed: 2026-05-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

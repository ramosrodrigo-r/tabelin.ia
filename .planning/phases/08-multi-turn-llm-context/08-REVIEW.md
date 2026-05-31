---
phase: 08-multi-turn-llm-context
reviewed: 2026-05-30T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - apps/web/src/server/ai/context-messages.ts
  - apps/web/src/server/ai/regex-stream.ts
  - apps/web/src/server/ai/scripts-stream.ts
  - apps/web/src/server/ai/sql-stream.ts
  - apps/web/src/server/ai/template-stream.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 8: Code Review Report (gap-closure 08-04)

**Reviewed:** 2026-05-30
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

> Scope note: this review covers ONLY the five source files changed by
> gap-closure plan 08-04 since diff_base `5136303`. A prior, broader 08-REVIEW
> existed for the full phase; this artifact replaces it with the gap-closure
> scope requested by the workflow.

## Summary

The gap-closure 08-04 changes add a `[Resposta anterior]` label to serialized
history and a `buildMultiTurnSystemPrompt` helper that appends a "refine the last
request, never repeat verbatim" paragraph to each tool's system prompt when
history is present. The mechanical wiring across the four LLM tools (SQL, regex,
scripts, template) is uniform and correct; the regex `explain` branch is
correctly left out of the multi-turn path.

The central defect is a **consistency gap between the signal that drives the
system-prompt mutation and the signal that drives the injected history**. The
system prompt is keyed off the raw `input.history.length`, while the actual
history messages are produced by a separate `GENERATE_MODE` filter + token
truncation + per-exchange serialization that can silently drop every exchange.
The two can diverge, producing a system prompt that instructs the model to refine
"previous messages" that are not present in the message array — the same
prompt-vs-payload mismatch the gap-closure set out to remove.

No security regressions: added text is hardcoded (no injection vector), and the
documented residual prompt-injection risk in history replay is unchanged by this
diff.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: System-prompt history signal can diverge from actually-injected history

**File:** `apps/web/src/server/ai/sql-stream.ts:38-45`, `regex-stream.ts:43-51`, `scripts-stream.ts:46-54`, `template-stream.ts:34-42` (helper at `context-messages.ts:166-176`)

**Issue:**
Each tool computes the multi-turn system prompt from the **raw** input length:

```ts
buildMultiTurnSystemPrompt(basePrompt, input.history?.length ?? 0)
```

but the history messages that actually reach the model are produced
independently inside `buildToolContextMessages` (`context-messages.ts:198-232`),
which:
1. re-filters by `GENERATE_MODE` (`line 205`),
2. applies `truncateHistory` token pruning (`line 208`), and
3. **skips any exchange whose `serializeAssistant` returns `null`** — unknown
   kind, or missing/empty `query`/`pattern`/`code`/`output`/`explanation`
   (`lines 213-217`; serializer at `lines 63-103`).

When every passed exchange is unserializable (e.g. all history rows have an empty
`explanation`, or a kind not handled by the serializer), `input.history.length > 0`
is true, so the system prompt gains the paragraph "As mensagens anteriores sao
contexto de referencia... Nunca repita a resposta anterior", yet **zero** history
messages are injected. The model is told to refine prior context that does not
exist in the message array — re-introducing exactly the prompt-vs-payload
mismatch this gap-closure set out to remove. The gating decision is duplicated
against two different inputs instead of being derived from the single source of
truth: the messages that were actually built.

**Fix:** Drive the system-prompt decision from the built message array, not the
raw input. Either return the injected history count from message construction, or
have the helper consume the same filtered/truncated/serialized set:

```ts
// context-messages.ts — expose the count actually injected
export function buildToolContextMessages(...): {
  messages: ChatCompletionMessageParam[];
  injectedExchangeCount: number;
} { ... }
```

Then in each tool, build the history first and pass `injectedExchangeCount` (not
`input.history.length`) into `buildMultiTurnSystemPrompt`, splicing the system
message afterward. At minimum, gate the prompt on whether `serializeAssistant`
succeeds for at least one in-budget exchange.

### WR-02: Redundant GENERATE_MODE filter masks the divergence and invites drift

**File:** `apps/web/src/server/ai/context-messages.ts:205`

**Issue:**
`buildToolContextMessages` filters `history.filter((ex) => ex.mode === GENERATE_MODE)`,
but the production caller path (`findConversationExchanges`,
`conversation-repository.ts:98`) already constrains `where: { ..., mode: GENERATE_MODE }`.
The double filter is dead in production. It is not harmless: it is one of the
steps that lets the injected-message count silently differ from
`input.history.length` (WR-01), and it encodes the same `GENERATE_MODE` contract
in two layers, so a future caller that forgets the repository filter gets
inconsistent behavior between the prompt and the payload.

**Fix:** Pick one authoritative boundary for the `GENERATE_MODE` filter. If
construction is authoritative, derive the system-prompt length from the
post-filter count here. If the repository is authoritative, drop line 205 and
document the precondition that `history` is already `generate`-only.

### WR-03: Token budget no longer accounts for the added multi-turn system paragraph

**File:** `apps/web/src/server/ai/context-messages.ts:22-32`, `166-176`

**Issue:**
`SAFE_TOKEN_BUDGET = 4_000` was sized assuming a ~500-token system prompt
(comment at `lines 26-27`). `buildMultiTurnSystemPrompt` now adds a fixed
~60-70-token paragraph to the system prompt on every multi-turn call, and that
growth is not reflected in the history budget reservation, nor in the rationale
comment. The overage is small and fixed (not unbounded), so this is a Warning,
but the `lines 22-32` rationale now understates real usage and the two halves of
the budget (history vs. system) are tuned independently.

**Fix:** Either subtract the paragraph's estimated size from `SAFE_TOKEN_BUDGET`
when history is present, or update the `lines 22-32` rationale to account for the
added system-prompt paragraph so the ~4k reservation stays conservative.

## Info

### IN-01: `toolKind` parameter of buildToolContextMessages is unused

**File:** `apps/web/src/server/ai/context-messages.ts:199`

**Issue:**
`buildToolContextMessages(toolKind: string, ...)` never references `toolKind` —
serialization is driven entirely by `payload.kind`. Every call site passes a
literal (`"sql"`, `"regex"`, ...) that has no effect. Pre-existing, but the diff
touches all four call sites; the dead parameter invites a caller to assume it
scopes the history (it does not) and confuses the WR-01 analysis.

**Fix:** Remove `toolKind`, or use it to assert each serialized exchange's
`payload.kind` matches the requesting tool (hardening cross-tool isolation
MULTI-03 at the message layer).

### IN-02: New label and paragraph literals not centralized as constants

**File:** `apps/web/src/server/ai/context-messages.ts:75,82,89,96` and `168-175`

**Issue:**
`"[Resposta anterior]"` is repeated as an inline literal in four serializer
cases, and the multi-turn instruction paragraph is an inline string. The file's
own rationale for `GENERATE_MODE`/`MAX_EXCHANGES` constants (`lines 11-19`) is to
avoid stringly-typed drift; that discipline is not applied to these new literals,
so a wording change in one place can silently desync from tests/assertions.

**Fix:** Extract `const PREVIOUS_ANSWER_LABEL = "[Resposta anterior]"` and reuse
it across the four cases; optionally extract the paragraph as a named constant for
testability, consistent with the existing constant-centralization rationale.

---

_Reviewed: 2026-05-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

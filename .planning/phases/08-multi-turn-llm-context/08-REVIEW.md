---
phase: 08-multi-turn-llm-context
reviewed: 2026-05-30T00:00:00Z
depth: standard
files_reviewed: 12
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
  - apps/web/src/server/tools/conversation-repository.ts
  - apps/web/tests/context-messages.test.ts
  - apps/web/tests/multi-turn-context.test.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-05-30T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Re-review of Phase 8 (multi-turn LLM context). The previously reported CR-01
(resolvers pre-truncating before the `mode` filter) has been **fixed**: all four
resolvers now pass raw `input.history ?? []` directly into
`buildToolContextMessages`, which filters by `mode === "generate"` *then* truncates —
the correct order. Prior warnings WR-01 (token budget computed against serialized
prose), WR-02 (overstated injection-defense comment, now documenting residual risk),
WR-03 (route `catch` now logs via `console.error`), and WR-04 (`GENERATE_MODE`
constant centralizing the literal) are all addressed in the current source.

This pass found no crashes, injection sinks, or data-loss defects, so no BLOCKERs.
However, the **same class of bug that CR-01 described still exists one layer down**:
`findConversationExchanges` applies `READ_LIMIT = 10` *before* any `mode` filter, and
the `regex` thread genuinely mixes `generate` and `explain` rows under one `toolKind`.
A user with recent `explain` activity can therefore lose `generate` context that
would otherwise fit — the central promise of the phase. This is a correctness/quality
degradation rather than a crash, so it is filed as a WARNING.

## Warnings

### WR-01: `READ_LIMIT` is applied before the `mode` filter — recent `explain` rows starve `generate` context

**File:** `apps/web/src/server/tools/conversation-repository.ts:73-88` (in conjunction with `apps/web/src/server/ai/context-messages.ts:172`)

**Issue:** `findConversationExchanges` reads the most-recent `READ_LIMIT = 10` rows for
`(userId, toolKind)` ordered by `createdAt desc`, **with no `mode` filter**. The
`mode === "generate"` filter only runs later, inside `buildToolContextMessages`
(line 172). This is the exact ordering defect that the prior CR-01 fixed at the
resolver layer, but it survives at the read layer.

The `regex` thread genuinely mixes modes under one `toolKind`:
`apps/web/src/app/api/tools/regex/explain/route.ts:34,43` saves with
`toolKind: "regex"`, `mode: "explain"`; `regex/generate` saves with
`toolKind: "regex"`, `mode: "generate"`. Both land in the same partition. Because the
read takes the last 10 rows regardless of mode and the filter discards `explain`
afterward, a user who recently ran several `explain` operations can receive **fewer
`generate` turns than the 10-row window could hold** — or zero, even though older
`generate` rows exist and would fit the token budget. The feature silently loses the
conversational memory it was built to deliver.

This is invisible to the test suite: `multi-turn-context.test.ts` mocks
`findConversationExchanges` to return `[]`, and `context-messages.test.ts` exercises
the filter with hand-built mixed arrays — neither drives a real read window saturated
with `explain` rows.

**Fix:** Filter by `mode` at the read boundary so `READ_LIMIT` counts only the rows
that will actually be used. Use the shared `GENERATE_MODE` constant rather than a
literal:

```ts
import { GENERATE_MODE } from "@/server/ai/context-messages";

const rows = await prisma.conversationExchange.findMany({
  where: { userId, toolKind, mode: GENERATE_MODE },
  orderBy: { createdAt: "desc" },
  take: READ_LIMIT,
});
return rows.reverse();
```

The `@@index([userId, toolKind, createdAt])` still covers this filter; `mode` is a
low-cardinality residual predicate. If the read is intentionally mode-agnostic for
future reuse, document that and raise `READ_LIMIT` enough to survive the post-filter,
but filtering at the source is the correct fix.

### WR-02: `guardPayloadSize` casts non-object payloads and can throw on `undefined`

**File:** `apps/web/src/server/tools/conversation-repository.ts:16-23`

**Issue:** `guardPayloadSize(payload: unknown)` runs `JSON.stringify(payload)` then
reads `.length`. If `payload` is `undefined`, `JSON.stringify(undefined)` returns the
JS value `undefined` (not a string), so `.length` is read on `undefined` and throws a
`TypeError`. The function also unconditionally casts `payload as Record<string, unknown>`
in the oversize branch and `payload as object` in the pass-through branch, so a
non-object payload (string/number/null) would be persisted into a `Json @db.Json`
column as a scalar, which downstream `serializeAssistant` then rejects (returns null)
— wasting a stored row. In the current call sites the payload is always a validated
resolver response object, so this is latent rather than live; the throw would be
caught by the outer `try/catch` (line 67) and degrade to a skipped persist. Still, the
guard does not actually guard the type it claims to.

**Fix:** Validate shape before stringifying, and fail closed to a safe placeholder:

```ts
function guardPayloadSize(payload: unknown): object {
  if (typeof payload !== "object" || payload === null) {
    return { kind: "unknown", truncated: true };
  }
  const json = JSON.stringify(payload);
  if (json.length > MAX_PAYLOAD_BYTES) {
    const p = payload as Record<string, unknown>;
    return { kind: p["kind"] ?? "unknown", truncated: true };
  }
  return payload;
}
```

### WR-03: `MAX_PAYLOAD_BYTES` truncation guard measures UTF-16 code units, not bytes

**File:** `apps/web/src/server/tools/conversation-repository.ts:3,18`

**Issue:** `MAX_PAYLOAD_BYTES = 32 * 1024` is named and documented as "32 KB per row",
but the check is `json.length > MAX_PAYLOAD_BYTES`, where `String.length` counts
UTF-16 code units, not bytes. Portuguese content is full of multi-byte UTF-8
characters (acentos, ç) and the generated artifacts can contain emoji or non-BMP
characters that count as 2 code units but up to 4 UTF-8 bytes. The actual stored byte
size can therefore exceed the intended 32 KB ceiling by a meaningful margin, defeating
the row-size guard's purpose. This is a correctness gap in a size guard, hence
WARNING rather than INFO.

**Fix:** Measure real byte length, or rename the constant to reflect that it is a
character budget:

```ts
const json = JSON.stringify(payload);
if (Buffer.byteLength(json, "utf8") > MAX_PAYLOAD_BYTES) { ... }
```

## Info

### IN-01: `serializeAssistant` is invoked twice per exchange on the build path

**File:** `apps/web/src/server/ai/context-messages.ts:126,181`

**Issue:** `buildToolContextMessages` calls `truncateHistory`, whose `totalTokens`
serializes every exchange via `serializeAssistant` (line 126), then the build loop
serializes each surviving exchange again (line 181). Correctness is fine, but the
work is duplicated for every retained exchange every request. Out of v1 performance
scope; noted as a maintainability smell — the serialization could be computed once and
threaded through.

### IN-02: `dialect` column overloaded to store `scriptType` for the script tool

**File:** `apps/web/src/app/api/tools/scripts/generate/route.ts:38,48`

**Issue:** The scripts route writes `dialect: parsed.data.scriptType` to both
`recordToolRequest` and `saveConversationExchange`, persisting an enum like `"vba"` /
`"apps_script"` into a column named `dialect`. The Prisma model also has an unused
`platform String?` field that is never written by any route in scope. The semantic
mismatch (`scriptType` stored as `dialect`) is harmless today but invites confusion
for anyone querying `ConversationExchange.dialect` expecting SQL dialects. Consider a
dedicated column or a clearly documented convention.

### IN-03: Resolver fixture branch discards `input.history`, masking multi-turn behavior in dev/tests

**File:** `apps/web/src/server/ai/regex-stream.ts:24-34`, `sql-stream.ts:23-31`, `scripts-stream.ts:24-32`, `template-stream.ts:22-27`

**Issue:** When `OPENAI_API_KEY` is unset, all four resolvers short-circuit to a static
fixture and never call `buildToolContextMessages`, so the multi-turn assembly path is
exercised only with a key set. This is intentional for deterministic local dev, but it
means the integration tests in `multi-turn-context.test.ts` assert only that
`findConversationExchanges` is *called* with the right `toolKind` — they never assert
the history is actually *threaded into the model messages*, because the fixture branch
discards `input.history`. Consider one test that sets `OPENAI_API_KEY` with a mocked
OpenAI client to verify history reaches `messages`.

### IN-04: System prompts embedded as long inline string literals, decoupled from the serialization contract

**File:** `apps/web/src/server/ai/regex-stream.ts:46`, `sql-stream.ts:41`, `scripts-stream.ts:49`, `template-stream.ts:37`

**Issue:** Each resolver hardcodes its system prompt (including the required JSON
output schema) as a multi-hundred-character inline string. These prompts encode the
exact field contract that `serializeAssistant` (`context-messages.ts:66-98`) depends
on per `kind`. The two live far apart with no shared constant, so a prompt edit that
changes a field name (e.g. renaming `pattern`) would silently break serialization with
no compile-time link. Extracting prompts to named constants colocated with the
serialization contract would reduce drift risk.

---

_Reviewed: 2026-05-30T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

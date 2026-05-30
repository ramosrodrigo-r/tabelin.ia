---
phase: 08-multi-turn-llm-context
fixed_at: 2026-05-30T00:00:00Z
review_path: .planning/phases/08-multi-turn-llm-context/08-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 8: Code Review Fix Report

**Fixed at:** 2026-05-30T00:00:00Z
**Source review:** .planning/phases/08-multi-turn-llm-context/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (CR-01, WR-01, WR-02, WR-03, WR-04)
- Fixed: 5
- Skipped: 0
- Out of scope (Info, not attempted): IN-01, IN-02, IN-03, IN-04

## Fixed Issues

### CR-01: History is truncated before the `mode` filter runs — valid `generate` turns silently dropped

**Files modified:** `apps/web/src/server/ai/regex-stream.ts`, `apps/web/src/server/ai/sql-stream.ts`, `apps/web/src/server/ai/scripts-stream.ts`, `apps/web/src/server/ai/template-stream.ts`
**Commit:** 54b8a13
**Applied fix:** Removed the pre-truncation (`truncateHistory(input.history ?? [])`) from all four resolvers and now pass raw `input.history ?? []` into `buildToolContextMessages`, which owns the correct filter-then-truncate order (`filter(mode === GENERATE_MODE)` at line 146, then `truncateHistory` at line 149). Dropped the now-unused `truncateHistory` import from all four `*-stream.ts` files. No change needed inside `context-messages.ts` for the ordering itself.
**Status:** fixed: requires human verification — this is a correctness/logic fix (filter-before-truncate ordering affecting which conversation turns reach the LLM). Tier 1 (re-read) and Tier 2 (`tsc --noEmit`, no errors in modified files) passed, but semantic correctness of multi-turn context retention is not exercised by the current resolver-path tests (the review notes mixed-mode history is never run through the resolver). A maintainer should confirm with a mixed-mode integration test.

### WR-01: Token-budget guard ignores serialized message size; can still ship oversized context

**Files modified:** `apps/web/src/server/ai/context-messages.ts`
**Commit:** 7728144
**Applied fix:** Changed `totalTokens` inside `truncateHistory` to estimate token cost from `serializeAssistant(ex.assistantPayload) ?? ""` (the same serialization that is actually sent to the model) instead of `JSON.stringify(ex.assistantPayload)`. This aligns the DoS/budget guard (T-08-02) with the real wire payload and matches the build-step skip-nulls behavior. Added an explanatory comment.

### WR-02: Untrusted history content is injected into the LLM with no instruction-injection boundary

**Files modified:** `apps/web/src/server/ai/context-messages.ts`
**Commit:** 07395be
**Applied fix:** Corrected the overstated `serializeAssistant` docstring. Removed the "reduz superfície de injeção" claim and replaced it with an honest RISCO RESIDUAL (WR-02) note documenting that the artifact body and userPrompt are attacker-influenced text replayed as trusted assistant/user messages, that field-stripping is not an injection defense, and that real mitigation (delimiting/labelling replayed history, reinforcing the system prompt) is out of scope for this phase. Documentation-only correction as the review prescribed ("a real mitigation is out of scope for this phase").

### WR-03: `findConversationExchanges` failure masked; resolver/LLM failure maps to a misleading bare 502

**Files modified:** `apps/web/src/app/api/tools/sql/generate/route.ts`, `apps/web/src/app/api/tools/regex/generate/route.ts`, `apps/web/src/app/api/tools/scripts/generate/route.ts`, `apps/web/src/app/api/tools/template/generate/route.ts`
**Commit:** fcaf90f
**Applied fix:** Changed each bare `catch {}` to `catch (err)` and added `console.error("tool generate failed", { toolKind: "<kind>", err })` before `releaseToolUse` and the 502 response, so any unexpected failure (serialization/truncation bug, Zod parse failure) is diagnosable in production. `toolKind` is set per-route (`sql` / `regex` / `script` / `template`).

### WR-04: `mode` is a stringly-typed equality with no guard against drift

**Files modified:** `apps/web/src/server/ai/context-messages.ts`
**Commit:** 73fb77d
**Applied fix:** Added an exported `GENERATE_MODE = "generate"` constant (with docstring) and changed the D-03 filter to `history.filter((ex) => ex.mode === GENERATE_MODE)`. This centralizes the literal so the filter no longer depends on a raw string repeated across the codebase. Note: the review's "at minimum" also suggested either narrowing the Prisma type or adding a drift unit test; this fix provides the centralized constant (the filter side). Route-handler save paths still write the literal `"generate"` directly and a dedicated drift unit test was not added — see follow-up note below.

## Notes / Follow-ups

- WR-04 partial scope: the shared `GENERATE_MODE` constant is now defined and consumed by the filter, but the four route `saveConversationExchange` call sites still pass the bare literal `"generate"`. A maintainer may want to route those through `GENERATE_MODE` too and add a unit test asserting only `mode === "generate"` survives the filter (the review's optional hardening).
- Out of scope this iteration (fix_scope=critical_warning): IN-01 (unused `toolKind` param), IN-02 (stale `skipTruncation` docstring reference at context-messages.ts:122-123), IN-03 (stale "NOVO — Phase 6" comments), IN-04 (`vi.clearAllMocks()` mid-test). These Info findings were not attempted.

---

_Fixed: 2026-05-30T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

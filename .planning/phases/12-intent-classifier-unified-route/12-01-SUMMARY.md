---
phase: 12-intent-classifier-unified-route
plan: "01"
subsystem: ai
tags: [unified-chat, intent-classifier, zod, openai, vitest]
requires:
  - phase: 11-attachment-ui-pro-gating
    provides: universal attachment stream and quota/pro-gate patterns
provides:
  - Shared unified chat schemas
  - Server-side intent classifier with deterministic fixture mode
  - Portuguese 20-prompt classifier accuracy suite
affects: [phase-12-unified-route, phase-12-unified-client, phase-13-clarification-loop]
tech-stack:
  added: []
  patterns: [zod shared contract, fixture classifier, structured outputs fallback]
key-files:
  created:
    - packages/shared/src/unified-chat/schema.ts
    - apps/web/src/server/ai/intent-classifier.ts
    - apps/web/tests/unified-schema.test.ts
    - apps/web/tests/intent-classifier.test.ts
  modified:
    - packages/shared/src/index.ts
    - apps/web/tests/formula-ui.test.tsx
key-decisions:
  - "Shared schema owns the unified intent enum and stream event contract."
  - "Fixture classifier is accent-insensitive and covers the 20 prompt pt-BR baseline."
  - "Structured Outputs path falls back to json_object plus Zod validation for unsupported model configurations."
patterns-established:
  - "Unified stream payloads use a shared Zod union instead of route-local event shapes."
  - "Classifier override is validated with `overrideIntentSchema` before dispatch."
requirements-completed: [UNI-01, UNI-06]
duration: 15 min
completed: 2026-06-08
---

# Phase 12 Plan 01: Shared Contracts & Intent Classifier Summary

**Unified chat schemas and a server-only intent classifier with fixture accuracy coverage and Structured Outputs fallback**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-08T15:00:00Z
- **Completed:** 2026-06-08T15:15:10Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `packages/shared/src/unified-chat/schema.ts` with unified intent, override, complete payload, table stub, needs-file, and NDJSON event schemas.
- Added `classifyIntent()` with deterministic fixture mode, validated override short-circuit, OpenAI `zodResponseFormat` parse path, and json_object fallback.
- Added schema and classifier tests, including the 20 Portuguese prompt accuracy baseline.
- Restored the pre-existing typecheck baseline by fixing a `ReadableStreamDefaultController` test typing issue.

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared unified-chat schemas and barrel export** - `916b0be` (feat)
2. **Task 2: Server classifier with fixture mode, override, and Structured Outputs fallback** - `09463fc` (feat)

**Plan metadata:** pending in this summary commit.

## Files Created/Modified

- `packages/shared/src/unified-chat/schema.ts` - Unified intent and stream schemas.
- `packages/shared/src/index.ts` - Barrel export for unified chat schemas.
- `apps/web/src/server/ai/intent-classifier.ts` - Server-only classifier service.
- `apps/web/tests/unified-schema.test.ts` - Schema parse/fail-closed coverage.
- `apps/web/tests/intent-classifier.test.ts` - 20 prompt classifier accuracy suite and override tests.
- `apps/web/tests/formula-ui.test.tsx` - Type-only cleanup for a pre-existing pending stream test.

## Decisions Made

- Shared schema is the single source of truth for `UnifiedIntent`, `OverrideIntent`, and `UnifiedStreamEvent`.
- `unknown` is a classifier output but is not a valid override value.
- Fixture classification normalizes accents before matching Portuguese office-language prompts.
- Real provider classifier uses Structured Outputs first and retries with json_object only for structured-output compatibility failures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing typecheck error in Formula UI test**
- **Found during:** Task 1 verification
- **Issue:** `pnpm --filter web typecheck` failed on `apps/web/tests/formula-ui.test.tsx` because TypeScript narrowed `pendingController?.close()` to `never`.
- **Fix:** Replaced the mutable callback-assigned local with a small ref object and called `pendingController.current?.close()`.
- **Files modified:** `apps/web/tests/formula-ui.test.tsx`
- **Verification:** `pnpm --filter web typecheck` exits 0.
- **Committed in:** `916b0be`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix restored the verification baseline without changing product behavior.

## Issues Encountered

- Real-provider classifier smoke test was skipped because `OPENAI_API_KEY` was not active in this run. Fixture mode covered 20/20 prompts in the local suite.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for **12-02: Unified API Route & Dispatch**. The route can import `classifyIntent`, `intentClassificationSchema`, `unifiedStreamEventSchema`, `tableStubPayloadSchema`, and `needsFilePayloadSchema` from the new contracts.

---
*Phase: 12-intent-classifier-unified-route*
*Completed: 2026-06-08*

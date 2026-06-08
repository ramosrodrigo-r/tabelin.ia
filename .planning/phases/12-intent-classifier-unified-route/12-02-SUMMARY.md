---
phase: 12-intent-classifier-unified-route
plan: "02"
subsystem: api
tags: [unified-chat, route-handler, quota, attachments, ndjson, vitest]
requires:
  - phase: 12-intent-classifier-unified-route
    plan: "01"
    provides: unified schemas and intent classifier
provides:
  - `/api/chat/unified` route handler
  - Intent-prefixed NDJSON dispatch to existing text resolvers
  - `needs_file`, file-backed, and `table_stub` terminal paths
  - `table_stub` multi-turn serialization
affects: [phase-12-unified-client, phase-13-clarification-loop]
tech-stack:
  added: []
  patterns: [route orchestration, resolved toolKind history, ephemeral file-backed output]
key-files:
  created:
    - apps/web/src/app/api/chat/unified/route.ts
    - apps/web/tests/unified-route.test.ts
  modified:
    - packages/shared/src/unified-chat/schema.ts
    - apps/web/src/server/ai/context-messages.ts
    - apps/web/tests/unified-schema.test.ts
    - apps/web/tests/context-messages.test.ts
    - .planning/ROADMAP.md
    - .planning/STATE.md
key-decisions:
  - "Unified route reserves quota once under `toolKind: unified`, then saves history under the resolved text tool."
  - "Existing template Pro-only behavior is preserved in the unified route to avoid an entitlement bypass."
  - "File-analysis/OCR with an attached file returns typed ephemeral content from the extraction dispatcher and does not persist history."
  - "File-analysis/OCR without an attached file releases quota and returns `needs_file` without confirming usage."
requirements-completed: []
duration: 22 min
completed: 2026-06-08
---

# Phase 12 Plan 02: Unified API Route & Dispatch Summary

**Unified backend route with classifier dispatch, intent-first NDJSON, quota/pro-gate handling, and resolved history persistence**

## Performance

- **Duration:** 22 min
- **Started:** 2026-06-08T15:15:42Z
- **Completed:** 2026-06-08T15:26:55Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Added `POST /api/chat/unified` with auth, JSON/multipart parsing, prompt caps, attachment Pro-gate-before-quota, single unified quota reservation, extraction, classification, resolver dispatch, quota confirm/release, request recording, history saving, and NDJSON response.
- Normalized unified request fields into existing resolver shapes for formula, SQL, regex, script, and template without changing the existing `/api/tools/*` routes.
- Prefixed all successful unified streams with `intent_detected` as the first NDJSON event.
- Implemented `needs_file` for file-dependent intents without attachments, with quota release and no persistence.
- Implemented typed ephemeral file-backed payloads for attached file-analysis/OCR, using extracted content and skipping history.
- Implemented `tabela` as a `table_stub` handoff saved under `toolKind: "unified_table"`.
- Added `table_stub` context serialization for future follow-up turns.

## Verification

- `pnpm --filter web test -- tests/unified-schema.test.ts tests/unified-route.test.ts tests/context-messages.test.ts` — passed, 232 tests passed, 1 skipped.
- `pnpm --filter web typecheck` — passed.

## Files Created/Modified

- `apps/web/src/app/api/chat/unified/route.ts` - Unified chat route orchestration.
- `apps/web/tests/unified-route.test.ts` - Route coverage for auth, prompt validation, quota, attachment Pro-gate, dispatch, override, `needs_file`, file-backed output, and table stub.
- `packages/shared/src/unified-chat/schema.ts` - Added file-backed unified payload schemas for file-analysis/OCR.
- `apps/web/tests/unified-schema.test.ts` - Added file-backed complete event coverage.
- `apps/web/src/server/ai/context-messages.ts` - Added `table_stub` serialization.
- `apps/web/tests/context-messages.test.ts` - Added `table_stub` serialization coverage.
- `.planning/ROADMAP.md` - Marked 12-02 complete.
- `.planning/STATE.md` - Advanced execution state to 12-03.

## Deviations from Plan

### Preserved Template Entitlement

The existing `/api/tools/template/generate` route is Pro-only. The unified route therefore checks Pro entitlement after classification when the resolved intent is `template`, releases quota, and returns the existing Pro CTA shape for free users. This prevents the unified endpoint from becoming a template entitlement bypass.

### Added File-Backed Payload Schemas

The original 12-01 unified payload union had `needs_file` but no terminal payload for file-analysis/OCR when a file is actually attached. 12-02 added `file_analysis` and `ocr` payload schemas so attached file-dependent intents can return typed ephemeral output without saving history.

## User Setup Required

None.

## Next Phase Readiness

Ready for **12-03: Unified Chat Client**. The client can POST to `/api/chat/unified`, parse `unifiedStreamEventSchema`, render `intent_detected` immediately, and dispatch complete payloads by `payload.kind`.

---
*Phase: 12-intent-classifier-unified-route*
*Completed: 2026-06-08*

---
phase: 01-localized-formula-workspace
plan: "02"
subsystem: ai
tags: [formula, zod, openai, streaming, api, prisma, validation]
requires:
  - phase: 01-01
    provides: authenticated workspace, Prisma client, session user identity
provides:
  - Shared formula platform/language/separator contracts
  - Localized formula prompt builders
  - Typed formula streaming event protocol
  - Authenticated formula generate/explain routes
  - ToolRequest metadata persistence hook
affects: [formula-ui, quotas, usage-ledger, multi-tool-suite]
tech-stack:
  added: [@tabelin/shared workspace package, Zod formula schemas, OpenAI server client factory]
  patterns: [shared tool contracts, server-only AI modules, NDJSON stream events, metadata repository]
key-files:
  created:
    - packages/shared/src/formula/platforms.ts
    - packages/shared/src/formula/schema.ts
    - packages/shared/src/formula/fixtures.ts
    - apps/web/src/server/ai/formula-prompts.ts
    - apps/web/src/server/ai/formula-stream.ts
    - apps/web/src/app/api/tools/formula/generate/route.ts
    - apps/web/src/app/api/tools/formula/explain/route.ts
    - apps/web/src/server/tools/formula-repository.ts
  modified:
    - apps/web/package.json
    - pnpm-lock.yaml
    - .planning/phases/01-localized-formula-workspace/01-USER-SETUP.md
key-decisions:
  - "Formula output reaches copy-ready only through Zod-validated complete events."
  - "Routes use deterministic fixture responses without OPENAI_API_KEY so tests and local demos are stable."
patterns-established:
  - "Formula request/response contracts live in @tabelin/shared and are reused by server routes and future UI."
  - "Streaming route payloads are newline-delimited JSON events: metadata, delta, warning, complete, and error."
requirements-completed: [FORM-01, FORM-02, FORM-03, FORM-04, FORM-05, WORK-02, WORK-04, RELY-01]
duration: 8 min
completed: 2026-05-24
---

# Phase 01 Plan 02: Formula Contract and API Summary

**Shared Zod formula contracts with authenticated generate/explain streams and metadata persistence**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-24T14:39:37Z
- **Completed:** 2026-05-24T14:47:43Z
- **Tasks:** 3
- **Files modified:** 18

## Accomplishments

- Added the `@tabelin/shared` package with platform, formula-language, separator, fixture, request, response, and stream-event contracts.
- Added prompt builders that always include platform, formula language, separator, Brazilian Portuguese response style, and assumptions guidance.
- Added authenticated `/api/tools/formula/generate` and `/api/tools/formula/explain` routes that validate input, stream typed events, validate completion payloads, and record metadata.

## Task Commits

1. **Task 1: Define shared formula platform and locale contracts** - `bdf6369` (`feat(01-02): add shared formula contracts`)
2. **Task 2: Build prompt, provider, and validation modules** - `180ceb9` (`feat(01-02): add formula AI stream modules`)
3. **Task 3: Add formula API routes and metadata persistence** - `ac8575f` (`feat(01-02): add formula API routes`)

## Files Created/Modified

- `packages/shared/src/formula/platforms.ts` - Canonical platform/language/separator constants.
- `packages/shared/src/formula/schema.ts` - Zod request, response, metadata, and stream-event schemas.
- `packages/shared/src/formula/fixtures.ts` - Golden `SE`, `PROCV`, `SOMASE`, and finance fixtures.
- `apps/web/src/server/ai/formula-prompts.ts` - Localized prompt builders.
- `apps/web/src/server/ai/formula-stream.ts` - Deterministic validated payload resolver and NDJSON stream creator.
- `apps/web/src/app/api/tools/formula/generate/route.ts` - Authenticated formula generation route.
- `apps/web/src/app/api/tools/formula/explain/route.ts` - Authenticated formula explanation route.
- `apps/web/src/server/tools/formula-repository.ts` - ToolRequest metadata writer.

## Decisions Made

- Used deterministic fixture-backed responses when `OPENAI_API_KEY` is absent so automated tests and local demos do not require provider credentials.
- Chose NDJSON events for streaming because it is simple for route handlers, tests, and the upcoming client hook to parse incrementally.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vitest needed a server-only alias**
- **Found during:** Task 2 verification
- **Issue:** Route tests import server modules that import `server-only`, which intentionally throws outside the Next runtime.
- **Fix:** Added a Vitest alias to a no-op `tests/server-only.ts` file.
- **Files modified:** `apps/web/vitest.config.ts`, `apps/web/tests/server-only.ts`.
- **Verification:** `corepack pnpm --filter web test -- formula-contract` and `test -- formula-api` pass.
- **Committed in:** `180ceb9`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Test-only runtime compatibility fix. No product scope change.

## Issues Encountered

- The contract/API tests intentionally log skipped metadata persistence when no local Postgres server is running. The repository catches that condition and keeps route behavior deterministic.

## User Setup Required

OpenAI provider credentials are now listed in `01-USER-SETUP.md`: `OPENAI_API_KEY` and `OPENAI_MODEL`.

## Verification

- `corepack pnpm --filter web test -- formula-contract` passed.
- `corepack pnpm --filter web test -- formula-api` passed.
- `corepack pnpm --filter web typecheck` passed.
- `corepack pnpm --filter web lint` passed.
- `corepack pnpm --filter web build` passed.
- `rg "OPENAI_API_KEY" apps/web/src/app apps/web/src/components --glob '!**/*.test.ts'` has no matches.

## Next Phase Readiness

The Formula UI can now consume shared platform/language constants and parse the route stream through a client hook in Plan 01-03.

---
*Phase: 01-localized-formula-workspace*
*Completed: 2026-05-24*


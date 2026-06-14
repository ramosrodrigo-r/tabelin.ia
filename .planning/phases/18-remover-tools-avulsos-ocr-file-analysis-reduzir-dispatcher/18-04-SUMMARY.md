---
phase: 18-remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher
plan: 04
subsystem: cleanup
tags: [unified-chat, dispatcher, cleanup, tests]
requires:
  - phase: 18-01
    provides: standalone text tool routes/features removed
  - phase: 18-02
    provides: dedicated OCR tool removed
  - phase: 18-03
    provides: standalone File Analysis tool removed
provides:
  - unified chat route no longer dispatches to removed tools
  - table clarifier service and tests removed
  - legacy text-tool server streams removed
  - stale dispatcher imports for deleted output panels removed
affects: [unified-chat, intent-classifier, render-dispatcher, tests]
tech-stack:
  added: []
  patterns:
    - legacy unified-chat payloads render as archived responses during the transition
    - route uses a temporary table_stub fallback until Plan 18-05/18-06 reduce schemas
key-files:
  created: []
  modified:
    - apps/web/src/app/api/chat/unified/route.ts
    - apps/web/src/features/unified-chat/components/render-dispatcher.tsx
    - apps/web/tests/unified-route.test.ts
    - apps/web/tests/unified-chat-tool.test.tsx
key-decisions:
  - "The route keeps only the temporary unified_table type/mapping until Plan 18-05 removes the old intent enum."
  - "The route keeps legacy request context fields for now so the current client can continue submitting while Plan 18-07 owns client cleanup."
  - "Legacy complete payloads render as archived responses rather than importing deleted output panels."
requirements-completed: [CLEAN-07, CLEAN-01]
duration: 8 min
completed: 2026-06-14
---

# Phase 18 Plan 04: Unified Route Dispatch Cleanup Summary

**The unified chat route was reduced to auth, prompt validation, optional extraction, classification, and a temporary archived-response fallback while all legacy generator branches and streams were removed.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-14T15:07:34Z
- **Completed:** 2026-06-14T15:15:28Z
- **Tasks:** 2 completed
- **Files modified:** 14

## Accomplishments

- Removed the `unified_table` clarification/generation branch from `route.ts`, including the table clarifier service and dedicated tests.
- Removed formula, SQL, regex, script, template, File Analysis, and OCR dispatch branches from `route.ts`.
- Deleted the legacy server streams and formula tool request repository that only served removed tools.
- Replaced stale dispatcher imports for deleted output panels with an archived-response fallback so typecheck and tests are green during the transition.

## Line Delta

- **Code/test churn:** 64 additions, 2,484 deletions across 14 files.
- **Largest removals:** `unified-route.test.ts` (-605 net), `route.ts` (-459 net), `table-clarifier.ts` (-341), `table-clarifier.test.ts` (-327), `formula-stream.ts` (-144), `regex-stream.ts` (-123), `scripts-stream.ts` (-111), `sql-stream.ts` (-102), `template-stream.ts` (-87).
- **Added code:** temporary route fallback events and archived legacy payload assertions.

## Task Commits

1. **Task 1: Remove table clarification route path** - `a2d6136`
2. **Task 2: Remove legacy unified dispatch branches** - `9209a4e`

## Files Created/Modified

- `apps/web/src/app/api/chat/unified/route.ts` - reduced to auth, validation, optional extraction, classification, and temporary fallback stream.
- `apps/web/src/features/unified-chat/components/render-dispatcher.tsx` - removed imports/cases for deleted text-tool output panels; old payloads now render an archived-response card.
- `apps/web/tests/unified-route.test.ts` - rewritten around auth, validation, fallback stream, and attachment grounding.
- `apps/web/tests/unified-chat-tool.test.tsx` - aligned legacy payload expectations with archived-response rendering.
- Deleted `apps/web/src/server/ai/table-clarifier.ts`, the five legacy `*-stream.ts` files, `destructive-classifier.ts`, `formula-prompts.ts`, `server/tools/formula-repository.ts`, and `apps/web/tests/table-clarifier.test.ts`.

## Decisions Made

- Kept `ResolvedToolKind` and `INTENT_TO_TOOL_KIND["tabela"] = "unified_table"` temporarily because Plan 18-05 owns the enum reduction. These are the only remaining `unified_table` references in `route.ts`.
- Used `tableStubPayloadSchema` as the temporary complete payload because no `qa_response` schema exists until Plan 18-05/18-06.
- Kept legacy request fields (`platform`, `formulaLanguage`, `separator`, `sqlDialect`, `scriptType`, `overrideGenerate`, `specOverride`) in parsing for compatibility with the current client; Plan 18-07 owns client cleanup.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed stale dispatcher imports from deleted text-tool panels**
- **Found during:** Task 2 typecheck
- **Issue:** `pnpm -r typecheck` failed on `render-dispatcher.tsx` imports for output panels deleted in Wave 1.
- **Fix:** Removed the missing imports/cases and rendered archived legacy payloads with a generic card.
- **Files modified:** `apps/web/src/features/unified-chat/components/render-dispatcher.tsx`
- **Verification:** `pnpm -r typecheck` passed.
- **Committed in:** `9209a4e`

**2. [Rule 3 - Blocking] Updated unified chat tests for archived legacy payloads**
- **Found during:** Full test suite after the dispatcher unblock
- **Issue:** `unified-chat-tool.test.tsx` still expected deleted Formula/SQL/Regex/Scripts/Template panels and formula output content.
- **Fix:** Updated affected assertions to expect the archived-response marker while keeping table/grid and stream-state coverage.
- **Files modified:** `apps/web/tests/unified-chat-tool.test.tsx`
- **Verification:** `pnpm --filter web test unified-chat-tool.test.tsx` passed 19/19; `pnpm -r test` passed 257 tests with 1 skipped.
- **Committed in:** `9209a4e`

---

**Total deviations:** 2 auto-fixed blocking issues.
**Impact on plan:** Both fixes were necessary to satisfy the plan's typecheck/test gates after deleting the route consumers and server streams. They do not implement the binary intent model; Plans 18-05 through 18-07 still own schema, dispatcher, and client cleanup.

## Issues Encountered

- The route still contains two `unified_table` references: the temporary `ResolvedToolKind` union member and `INTENT_TO_TOOL_KIND.tabela` mapping. This is intentional sequencing for Plan 18-05.
- `apps/web/src/features/unified-chat/components/{ClarificationCard,ConfirmationCard,TableIntentStub}` remain for later planned deletion in Plan 18-06/18-07.

## Verification

- `pnpm exec prisma generate` -> passed
- `pnpm -r typecheck` -> passed
- `pnpm --filter web test unified-route.test.ts` -> passed, 4 tests
- `pnpm --filter web test unified-chat-tool.test.tsx` -> passed, 19 tests
- `pnpm -r test` -> passed, 21 files, 257 tests, 1 skipped
- `grep -c "unified_table\\|table-clarifier\\|formula-stream\\|sql-stream\\|regex-stream\\|scripts-stream\\|template-stream\\|destructive-classifier\\|formula-prompts\\|formula-repository" apps/web/src/app/api/chat/unified/route.ts` -> `2` (`unified_table` type/mapping only)
- `find apps/web/src/server/ai/table-clarifier.ts apps/web/src/server/ai/formula-stream.ts apps/web/src/server/ai/sql-stream.ts apps/web/src/server/ai/regex-stream.ts apps/web/src/server/ai/scripts-stream.ts apps/web/src/server/ai/template-stream.ts apps/web/src/server/ai/destructive-classifier.ts apps/web/src/server/ai/formula-prompts.ts apps/web/src/server/tools/formula-repository.ts apps/web/tests/table-clarifier.test.ts -type f 2>/dev/null | wc -l` -> `0`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 18-05. The server route no longer executes removed tool branches; the next plan can reduce `intent-classifier.ts` and `packages/shared/src/unified-chat/schema.ts` to the binary `sheet_operation`/`qa` axis and replace the temporary route fallback.

---
*Phase: 18-remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher*
*Completed: 2026-06-14*

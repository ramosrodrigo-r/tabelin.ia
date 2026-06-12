---
phase: 18-remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher
plan: 03
subsystem: cleanup
tags: [file-analysis, extraction, cleanup]
requires: []
provides:
  - standalone File Analysis API routes removed
  - standalone File Analysis workspace page and feature removed
  - file analysis repository and cleanup job removed
  - generic CSV/XLSX parser preserved
affects: [extraction, unified-chat, tests]
tech-stack:
  added: []
  patterns:
    - csv-xlsx-extractor owns schema prompt formatting needed by generic extraction
key-files:
  created: []
  modified:
    - apps/web/src/instrumentation.ts
    - apps/web/src/server/extraction/csv-xlsx-extractor.ts
    - apps/web/tests/file-parser.test.ts
key-decisions:
  - "file-parser.ts remains the only file under server/file-analysis because generic extraction still imports parseFile."
  - "instrumentation.ts keeps an empty register export and no longer starts a File Analysis cleanup job."
requirements-completed: [CLEAN-03]
duration: 3 min
completed: 2026-06-12
---

# Phase 18 Plan 03: Standalone File Analysis Removal Summary

**The standalone File Analysis tool was removed while preserving the CSV/XLSX parser used by generic attachment extraction.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-12T01:00:30Z
- **Completed:** 2026-06-12T01:03:40Z
- **Tasks:** 2 completed
- **Files modified:** 19

## Accomplishments

- Deleted `/api/tools/file-analysis/{chat,upload}`, `/workspace/file-analysis`, `features/file-analysis/`, and `server/ai/file-chat-stream.ts`.
- Deleted `server/file-analysis/{file-repository,cleanup-job}.ts`.
- Removed cleanup-job registration from `instrumentation.ts`.
- Kept `server/file-analysis/file-parser.ts` and `csv-xlsx-extractor.ts` working for generic CSV/XLSX attachment extraction.

## Line Delta

- **Code/test churn:** 18 additions, 1,822 deletions across 19 files.
- **Largest removals:** `file-upload-panel.tsx` (-251), `chat-panel.tsx` (-237), `file-chat-stream.ts` (-176), `use-file-chat.ts` (-164), `chart-message.tsx` (-159), `use-file-upload.ts` (-110), `file-repository.ts` (-108), upload route (-105).
- **Added code:** local schema prompt formatter in `csv-xlsx-extractor.ts` (+18 net there) replacing dependency on deleted `file-chat-stream.ts`.

## Task Commits

1. **Task 1: Remove standalone File Analysis surface** - `448b99f`
2. **Task 2: Remove repository/cleanup job and preserve parser path** - `b162cc2`

## Files Created/Modified

- `apps/web/src/instrumentation.ts` - removed the dynamic cleanup-job import and call.
- `apps/web/src/server/extraction/csv-xlsx-extractor.ts` - owns `formatSchemaForPrompt` locally after `file-chat-stream.ts` deletion.
- `apps/web/tests/file-parser.test.ts` - removed repository-only assertions tied to deleted `file-repository.ts`; parser tests remain.
- Deleted the standalone File Analysis route/page/feature/stream/repository/cleanup files listed in the plan.

## Decisions Made

- `file-parser.ts` is preserved because `csv-xlsx-extractor.ts` imports `parseFile` for the generic extraction dispatcher.
- `instrumentation.ts` remains present with an empty `register` export; no other instrumentation responsibility exists after cleanup-job removal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed deleted file-chat-stream dependency from csv-xlsx-extractor**
- **Found during:** Task 2 typecheck
- **Issue:** `csv-xlsx-extractor.ts` imported `formatSchemaForPrompt` from deleted `server/ai/file-chat-stream.ts`.
- **Fix:** Moved the formatter locally into `csv-xlsx-extractor.ts`.
- **Files modified:** `apps/web/src/server/extraction/csv-xlsx-extractor.ts`
- **Verification:** `pnpm --filter web exec vitest run tests/file-parser.test.ts` passed 9/9.
- **Committed in:** `b162cc2`

**2. [Rule 3 - Blocking] Removed repository-only tests after repository deletion**
- **Found during:** Task 2 typecheck
- **Issue:** `file-parser.test.ts` imported deleted `file-repository.ts` for signature checks unrelated to parser preservation.
- **Fix:** Removed the repository-only describe block; parser tests remain.
- **Files modified:** `apps/web/tests/file-parser.test.ts`
- **Verification:** `pnpm --filter web exec vitest run tests/file-parser.test.ts` passed 9/9.
- **Committed in:** `b162cc2`

---

**Total deviations:** 2 auto-fixed blocking issues.
**Impact on plan:** Both fixes were necessary consequences of deleting standalone File Analysis while preserving generic extraction. The preserved parser path remains covered.

## Issues Encountered

- `pnpm -r typecheck` remains red only on known `render-dispatcher.tsx` imports for text-tool output panels removed in Plan 18-01. No File Analysis-specific type errors remain.

## Verification

- `find apps/web/src/app/api/tools/file-analysis apps/web/src/features/file-analysis apps/web/src/server/ai/file-chat-stream.ts -type f 2>/dev/null | wc -l` -> `0`
- `find "apps/web/src/app/(workspace)/workspace/file-analysis" -type f 2>/dev/null | wc -l` -> `0`
- `find apps/web/src/server/file-analysis -type f | wc -l` -> `1` (`file-parser.ts`)
- `grep -c "cleanup-job\|startCleanupJob" apps/web/src/instrumentation.ts` -> `0`
- `pnpm exec prisma generate` -> passed
- `pnpm -r typecheck` -> failed only on known `render-dispatcher.tsx` imports for deleted text-tool output panels
- `pnpm --filter web exec vitest run tests/file-parser.test.ts` -> passed, 9 tests

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Wave 1 is ready for post-wave verification. The standalone File Analysis tool is gone, and the generic CSV/XLSX parser remains available to the extraction dispatcher and future sheet-ingestion work.

---
*Phase: 18-remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher*
*Completed: 2026-06-12*

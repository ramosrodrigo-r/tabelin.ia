---
phase: 18-remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher
plan: 02
subsystem: cleanup
tags: [ocr, extraction, shared, cleanup]
requires: []
provides:
  - dedicated OCR API route removed
  - dedicated OCR workspace page and feature removed
  - dedicated OCR shared package removed
  - generic image attachment extraction preserved
affects: [extraction, file-analysis, unified-chat]
tech-stack:
  added: []
  patterns:
    - chart contracts belong to file-analysis, not OCR
    - image attachment extraction owns its OCR call locally after dedicated OCR tool removal
key-files:
  created: []
  modified:
    - apps/web/src/server/extraction/image-extractor.ts
    - packages/shared/src/file-analysis/schema.ts
    - packages/shared/src/file-analysis/fixtures.ts
    - packages/shared/src/index.ts
key-decisions:
  - "extraction/image-extractor.ts was preserved and decoupled from the deleted dedicated ocr-processor.ts."
  - "ChartData/chartDataSchema/chartDataFixture were moved under file-analysis ownership because File Analysis still consumes them until Plan 18-03."
requirements-completed: [CLEAN-02]
duration: 4 min
completed: 2026-06-12
---

# Phase 18 Plan 02: Dedicated OCR Tool Removal Summary

**The dedicated OCR route, page, feature UI, processor, and shared OCR package were deleted while keeping generic image attachment extraction functional.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-12T00:56:00Z
- **Completed:** 2026-06-12T01:00:30Z
- **Tasks:** 2 completed
- **Files modified:** 13

## Accomplishments

- Deleted `/api/tools/ocr/process`, `/workspace/ocr`, `features/ocr/`, and `server/ai/ocr-processor.ts`.
- Deleted `packages/shared/src/ocr/{schema,fixtures}.ts` and removed OCR exports from `packages/shared/src/index.ts`.
- Preserved the generic image attachment path by keeping `extraction/image-extractor.ts` and `extraction/dispatcher.ts` intact.
- Moved chart contracts/fixture into `packages/shared/src/file-analysis/*` because they were still consumed by File Analysis before Plan 18-03 removes that tool.

## Line Delta

- **Code/test churn:** 128 additions, 784 deletions across 13 files.
- **Largest removals:** `image-upload-panel.tsx` (-229), `ocr-result-panel.tsx` (-144), `ocr-processor.ts` (-110), `use-image-upload.ts` (-109), `ocr-tool.tsx` (-64), OCR route (-59), shared OCR package (-53).
- **Added code:** local image extraction OCR call/fixture in `image-extractor.ts` (+106 net there) and file-analysis chart contract/fixture ownership (+22).

## Task Commits

1. **Task 1: Remove dedicated OCR route/page/feature/processor** - `577cf4f`
2. **Task 2: Remove shared OCR package contracts** - `ccfdbc5`

## Files Created/Modified

- `apps/web/src/server/extraction/image-extractor.ts` - preserved generic PNG/JPEG attachment extraction and decoupled it from deleted `ocr-processor.ts`.
- `packages/shared/src/file-analysis/schema.ts` - now exports `chartDataSchema` and `ChartData`.
- `packages/shared/src/file-analysis/fixtures.ts` - now owns `chartDataFixture`.
- `packages/shared/src/index.ts` - removed `./ocr/*` exports.
- Deleted the dedicated OCR route/page/feature/processor and shared OCR package files listed in the plan.

## Decisions Made

- `image-extractor.ts` remains part of the unified attachment dispatcher and is not the removed dedicated OCR tool surface.
- `chartDataSchema` was not OCR-specific despite living beside OCR fixtures historically; it was moved to File Analysis to keep current consumers compiling until Plan 18-03 removes that subsystem.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Decoupled image extractor from deleted ocr-processor**
- **Found during:** Task 2 typecheck
- **Issue:** `image-extractor.ts` imported `processImageOcr` from the deleted `server/ai/ocr-processor.ts`.
- **Fix:** Moved the extraction-only OCR call and fixture mode into `image-extractor.ts`.
- **Files modified:** `apps/web/src/server/extraction/image-extractor.ts`
- **Verification:** `pnpm --filter web exec vitest run tests/extraction/reuse-extractors.test.ts` passed 13/13.
- **Committed in:** `ccfdbc5`

**2. [Rule 3 - Blocking] Moved chart contracts out of OCR package**
- **Found during:** Task 2 typecheck
- **Issue:** File Analysis still imported `ChartData`, `chartDataSchema`, and `chartDataFixture` from `@tabelin/shared`; these were historically exported by the OCR package.
- **Fix:** Moved chart schema/type/fixture ownership into `packages/shared/src/file-analysis/*`.
- **Files modified:** `packages/shared/src/file-analysis/schema.ts`, `packages/shared/src/file-analysis/fixtures.ts`
- **Verification:** `packages/shared typecheck` passed; remaining app typecheck failures are unrelated dispatcher imports from 18-01.
- **Committed in:** `ccfdbc5`

---

**Total deviations:** 2 auto-fixed blocking issues.
**Impact on plan:** Both fixes were required to satisfy the plan's preservation rule for generic image extraction and avoid false ownership of chart contracts. No dedicated OCR route/page/UI was restored.

## Issues Encountered

- `pnpm -r typecheck` remains red only on the pre-existing `render-dispatcher.tsx` imports for deleted text-tool output panels from Plan 18-01. No OCR-specific type errors remain.
- `pnpm --filter web test -- tests/extraction/reuse-extractors.test.ts` still loaded the full suite through the package script and failed at the same `render-dispatcher.tsx` import. Direct Vitest invocation for the targeted file passed.

## Verification

- `find apps/web/src/app/api/tools/ocr apps/web/src/features/ocr -type f 2>/dev/null | wc -l` -> `0`
- `find "apps/web/src/app/(workspace)/workspace/ocr" -type f 2>/dev/null | wc -l` -> `0`
- `find apps/web/src/server/ai/ocr-processor.ts 2>/dev/null | wc -l` -> `0`
- `apps/web/src/server/extraction/image-extractor.ts` exists; `dispatcher.ts` still imports and calls `extractImage`.
- `grep -rn "export \* from \"./ocr/schema\"\|export \* from \"./ocr/fixtures\"" packages/shared/src/index.ts | wc -l` -> `0`
- `find packages/shared/src/ocr -type f 2>/dev/null | wc -l` -> `0`
- `pnpm exec prisma generate` -> passed
- `pnpm -r typecheck` -> failed only on known `render-dispatcher.tsx` imports for text-tool output panels
- `pnpm --filter web exec vitest run tests/extraction/reuse-extractors.test.ts` -> passed, 13 tests

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 18-03. The dedicated OCR tool surface is gone, while image attachments still flow through the generic extraction dispatcher for unified chat.

---
*Phase: 18-remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher*
*Completed: 2026-06-12*

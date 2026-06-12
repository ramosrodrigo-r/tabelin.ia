---
phase: 18-remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher
plan: 01
subsystem: cleanup
tags: [nextjs, tools, tests, cleanup]
requires: []
provides:
  - standalone text tool API entrypoints removed
  - standalone text tool workspace pages removed
  - standalone text tool feature modules removed
  - route-level tests for removed text tools deleted
affects: [unified-chat, tests, cleanup]
tech-stack:
  added: []
  patterns:
    - generic CopyButton lives under components/app instead of a tool feature
key-files:
  created:
    - apps/web/src/components/app/copy-button.tsx
  modified:
    - apps/web/src/features/unified-chat/components/render-dispatcher.tsx
    - apps/web/tests/context-messages.test.ts
key-decisions:
  - "copy-button.tsx was generic enough to promote to components/app/copy-button.tsx before deleting features/formula."
requirements-completed: [CLEAN-01]
duration: 5 min
completed: 2026-06-12
---

# Phase 18 Plan 01: Standalone Text Tool Entry Points Summary

**Standalone Formula/SQL/Regex/Scripts/Template tool entrypoints, feature modules, and route-level tests were removed while preserving a shared copy button and generic attachment-context coverage.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-12T00:51:00Z
- **Completed:** 2026-06-12T00:56:00Z
- **Tasks:** 2 completed
- **Files modified:** 40

## Accomplishments

- Deleted the standalone `/api/tools/{formula,sql,regex,scripts,template}` route files and orphaned workspace pages for SQL, Regex, Scripts, and Templates.
- Deleted `features/{formula,sql,regex,scripts,template}` and route-level tests that exclusively exercised removed tools.
- Promoted the generic `CopyButton` to `apps/web/src/components/app/copy-button.tsx` for temporary unified-chat reuse.
- Preserved non-route-specific attachment context assertions by moving focused checks into `context-messages.test.ts`.

## Line Delta

- **Conservative churn (`--no-renames`):** 91 additions, 5,753 deletions across 40 files.
- **Rename-aware churn:** 50 additions, 5,712 deletions across 39 files.
- **Largest removals:** `attachment-context.test.ts` (-584), `formula-ui.test.tsx` (-450), `multi-turn-context.test.ts` (-443), `formula-tool.tsx` (-231), `use-formula-stream.ts` (-215), `regex-tool.tsx` (-207), `scripts-tool.tsx` (-194), `sql-tool.tsx` (-193), `template-tool.tsx` (-188), `formula-input-panel.tsx` (-188).
- **Added code:** shared `CopyButton` plus focused attachment-context tests in `context-messages.test.ts`.

## Task Commits

1. **Task 1: Remove standalone text tool entrypoints** - `4bc55c5`
2. **Task 2: Remove standalone text tool features and orphan tests** - `b2792b3`

## Files Created/Modified

- `apps/web/src/components/app/copy-button.tsx` - shared generic clipboard button promoted out of the deleted formula feature.
- `apps/web/src/features/unified-chat/components/render-dispatcher.tsx` - updated `CopyButton` import; remaining deleted output-panel imports are intentionally left for later Wave cleanup.
- `apps/web/tests/context-messages.test.ts` - retained attachment-context injection/truncation coverage without route-level dependencies.
- Deleted standalone tool routes, workspace pages, feature directories, and obsolete route-level tests listed in the plan.

## Decisions Made

- `copy-button.tsx` was generic (`value`, `disabled`, clipboard state, no formula payload types), so it was promoted to `components/app` before deleting `features/formula`.
- `attachment-context.test.ts` was mostly obsolete route-level coverage for removed tools, but generic `buildToolContextMessages` attachment behavior remained relevant; those assertions were preserved in `context-messages.test.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed obsolete attachment route suite while preserving generic coverage**
- **Found during:** Task 2 verification
- **Issue:** `pnpm -r typecheck` failed because `attachment-context.test.ts` imported deleted `/api/tools/*` route handlers.
- **Fix:** Deleted the route-level suite and moved generic attachment-context tests into `context-messages.test.ts`.
- **Files modified:** `apps/web/tests/attachment-context.test.ts`, `apps/web/tests/context-messages.test.ts`
- **Verification:** Typecheck rerun now fails only on expected `render-dispatcher.tsx` imports to deleted output panels scheduled for later Wave cleanup.
- **Committed in:** `b2792b3`

---

**Total deviations:** 1 auto-fixed blocking issue.
**Impact on plan:** Kept the removal coherent and preserved useful non-route behavior coverage. No scope expansion beyond tests made obsolete by the same deleted routes.

## Issues Encountered

- `pnpm -r typecheck` remains red with expected unresolved imports in `apps/web/src/features/unified-chat/components/render-dispatcher.tsx` for deleted output panels: Formula, Regex, Scripts, SQL, and Template. This is documented for later Wave cleanup.
- `pnpm --filter web test` ran 22 test files: 21 passed, 271 tests passed, 1 skipped, and 1 suite failed before running due to the same expected `render-dispatcher.tsx` missing output-panel imports.

## Verification

- `find apps/web/src/app/api/tools/formula apps/web/src/app/api/tools/sql apps/web/src/app/api/tools/regex apps/web/src/app/api/tools/scripts apps/web/src/app/api/tools/template -type f 2>/dev/null | wc -l` -> `0`
- `find apps/web/src/app/\(workspace\)/workspace/sql apps/web/src/app/\(workspace\)/workspace/regex apps/web/src/app/\(workspace\)/workspace/scripts apps/web/src/app/\(workspace\)/workspace/templates -type f 2>/dev/null | wc -l` -> `0`
- `find apps/web/src/features/sql apps/web/src/features/regex apps/web/src/features/scripts apps/web/src/features/template apps/web/src/features/formula -type f 2>/dev/null | wc -l` -> `0`
- `find apps/web/tests -maxdepth 1 \( -name "formula-api.test.ts" -o -name "formula-contract.test.ts" -o -name "formula-ui.test.tsx" -o -name "multi-turn-context.test.ts" \) 2>/dev/null | wc -l` -> `0`
- `pnpm exec prisma generate` -> passed
- `pnpm -r typecheck` -> failed only on expected `render-dispatcher.tsx` imports for deleted output panels
- `pnpm --filter web test` -> failed only because `unified-chat-tool.test.tsx` imports `render-dispatcher.tsx`, which still references deleted output panels

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 18-02. The standalone text tools are no longer available through their old routes/pages/features. Later waves must finish pruning unified-chat dispatcher branches and schemas that still mention the removed output panels.

---
*Phase: 18-remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher*
*Completed: 2026-06-12*

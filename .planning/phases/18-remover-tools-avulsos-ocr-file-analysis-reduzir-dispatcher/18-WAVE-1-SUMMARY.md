---
phase: 18-remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher
wave: 1
plans: [18-01, 18-02, 18-03]
status: complete_with_expected_gate_failures
completed: 2026-06-12
---

# Phase 18 Wave 1 Summary

**Scope:** removed the standalone text-tool, OCR-tool, and File Analysis-tool surfaces while preserving shared pieces needed by the unified workspace: generic `CopyButton`, image extraction, and CSV/XLSX parsing.

## Plans Completed

| Plan | Summary | Commits |
|------|---------|---------|
| 18-01 | Removed standalone Formula/SQL/Regex/Scripts/Template routes, pages, feature modules, and route-level tests. | `4bc55c5`, `b2792b3`, `1830ad0` |
| 18-02 | Removed dedicated OCR route/page/feature/shared package and preserved generic image extraction. | `577cf4f`, `ccfdbc5`, `e39c573` |
| 18-03 | Removed standalone File Analysis route/page/feature/repository/cleanup job and preserved CSV/XLSX parser. | `448b99f`, `b162cc2`, `b09dd8d` |

## Line Delta

Code/test files only, excluding `.planning` artifacts:

| Scope | Files | Added | Removed |
|-------|-------|-------|---------|
| Wave 1 total | 72 | 237 | 8,359 |
| Plan 18-01 | 40 | 91 | 5,753 |
| Plan 18-02 | 13 | 128 | 784 |
| Plan 18-03 | 19 | 18 | 1,822 |

Planning artifacts:

| Scope | Files | Added | Removed |
|-------|-------|-------|---------|
| Summaries + tracking | 6 | 387 | 18 |

Largest code/test removals:

| Removed lines | File |
|---------------|------|
| 584 | `apps/web/tests/attachment-context.test.ts` |
| 450 | `apps/web/tests/formula-ui.test.tsx` |
| 443 | `apps/web/tests/multi-turn-context.test.ts` |
| 251 | `apps/web/src/features/file-analysis/components/file-upload-panel.tsx` |
| 237 | `apps/web/src/features/file-analysis/components/chat-panel.tsx` |
| 231 | `apps/web/src/features/formula/formula-tool.tsx` |
| 229 | `apps/web/src/features/ocr/components/image-upload-panel.tsx` |
| 215 | `apps/web/src/features/formula/hooks/use-formula-stream.ts` |
| 207 | `apps/web/src/features/regex/regex-tool.tsx` |
| 194 | `apps/web/src/features/scripts/scripts-tool.tsx` |

## Verification

- Spot checks: all 3 plan summaries present; each plan has production commits and no `Self-Check: FAILED` marker.
- `pnpm exec prisma generate`: passed in each plan that required it.
- Targeted parser/extractor tests:
  - `pnpm --filter web exec vitest run tests/extraction/reuse-extractors.test.ts`: passed, 13 tests.
  - `pnpm --filter web exec vitest run tests/file-parser.test.ts`: passed, 9 tests.
- Post-wave build gate `npm run build`: failed on known imports in `render-dispatcher.tsx` for output panels deleted by Plan 18-01.
- Post-wave test gate `npm test`: failed on the same known `render-dispatcher.tsx` import. Reported 21 passed test files, 269 passed tests, 1 skipped.

## Known Temporary Red State

`apps/web/src/features/unified-chat/components/render-dispatcher.tsx` still imports deleted text-tool output panels. This is expected after Wave 1 and is owned by later Phase 18 waves that reduce the unified route, schema, and dispatcher.

No OCR-specific or File Analysis-specific type errors remain after the Wave 1 fixes.

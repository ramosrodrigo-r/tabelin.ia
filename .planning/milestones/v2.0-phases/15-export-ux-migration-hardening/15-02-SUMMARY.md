---
phase: 15-export-ux-migration-hardening
plan: 02
subsystem: unified-chat / table-grid-panel
tags: [export, csv, xlsx, table-grid, ux]
dependency-graph:
  requires:
    - 15-01 (apps/web/src/features/unified-chat/lib/table-export.ts: buildCsv, buildXlsx, downloadCsv, downloadXlsx)
  provides:
    - "Exportar CSV"/"Exportar XLSX" buttons in TableGridPanel toolbar
    - slugifyTitle helper for safe export filenames
  affects:
    - apps/web/src/features/unified-chat/components/table-grid-panel.tsx
tech-stack:
  added: []
  patterns:
    - "vi.hoisted for vi.mock factory variables (avoids TDZ ReferenceError)"
    - "Direct ESM import + ResizeObserver polyfill for real-render component tests in jsdom"
key-files:
  created: []
  modified:
    - apps/web/src/features/unified-chat/components/table-grid-panel.tsx
    - apps/web/tests/table-grid-panel.test.tsx
decisions:
  - "CSV separator fixed at ';' inside buildCsv (Plan 01) — handlers do not override, per CONTEXT decision"
  - "Export handlers always pass displayRows (calculated formula values), never historyState.present.rows (raw templates) — Pitfall 3"
  - "Filename slug derived from spec.title via new slugifyTitle (lowercase, accents stripped, spaces -> '-', invalid chars removed, fallback 'tabela')"
metrics:
  duration: ~25min
  completed: 2026-06-10
---

# Phase 15 Plan 02: Export CSV/XLSX buttons on TableGridPanel Summary

Wired the Plan 01 pure export utility (`table-export.ts`) into two new "Exportar CSV" / "Exportar XLSX" buttons in the `TableGridPanel` toolbar, with handlers that always export `displayRows` (calculated formula values) and `historyState.present.columns`.

## What Was Built

### Task 1 (RED): Extended component test
- Added `vi.mock("../src/features/unified-chat/lib/table-export", ...)` (via `vi.hoisted` to avoid TDZ) returning spies for `buildCsv`/`buildXlsx`/`downloadCsv`/`downloadXlsx`/`sanitizeCellForExport`.
- Added a `ResizeObserver` polyfill (jsdom lacks it; `react-datasheet-grid` depends on `react-resize-detector`).
- Added a **direct ESM import** of `TableGridPanel` (separate from the existing `require`-based skip-graceful import, which was found to always fail in this test environment — see Deviations) for the new export tests, so they perform real renders/clicks.
- New `describe("TableGridPanel — EXP-01/EXP-02 export CSV/XLSX")` with 3 tests: presence of both aria-labeled buttons, click "Exportar CSV" -> `buildCsv`+`downloadCsv` called once, click "Exportar XLSX" -> `buildXlsx`+`downloadXlsx` called once.
- Confirmed RED: 3 new tests failed (buttons absent), 15 pre-existing tests passed.

### Task 2 (GREEN): Added export buttons + handlers
- Imported `buildCsv, buildXlsx, downloadCsv, downloadXlsx` from `../lib/table-export`.
- Added module-scope `slugifyTitle(title): string` — normalizes `spec.title` to a safe filename (lowercase, strip diacritics, spaces -> `-`, strip invalid chars, fallback `"tabela"`).
- Added `handleExportCsv`/`handleExportXlsx` (`useCallback`), each: derive `slug` from `spec.title`, call `buildCsv`/`buildXlsx` with `historyState.present.columns` + `displayRows`, then `downloadCsv`/`downloadXlsx` with `${slug}.csv`/`${slug}.xlsx`.
- Replaced the reserved toolbar slot (`{/* Slot reservado para export Phase 15 */}` + spacer) with the spacer plus two `ghost-button` elements: `aria-label="Exportar CSV"` and `aria-label="Exportar XLSX"`.
- Confirmed GREEN: all 18 tests in `table-grid-panel.test.tsx` pass (15 pre-existing + 3 new), `table-export.test.ts` (Plan 01) still passes (20 tests).

## Verification

- `npx vitest run table-grid-panel` — 18/18 pass.
- `npx vitest run` (full suite) — 22/28 files pass; the 6 failing files/tests are **pre-existing and unrelated** to this plan (Prisma client generation error in `attachment-context`, `formula-api`, `mercado-pago-webhook`, `multi-turn-context`, `file-parser` IDOR signature tests; and the known-flaky `unified-chat-tool > corrupt NDJSON enters the error state` test, documented in project memory as failing only in full-suite runs).
- `pnpm typecheck` — no new errors introduced by this plan's files (`table-grid-panel.tsx`, `table-grid-panel.test.tsx`); remaining errors are pre-existing Prisma/auth issues unrelated to Phase 15.
- `pnpm lint` — no errors in modified files.
- `grep -qE 'aria-label="Exportar CSV"'` and `'aria-label="Exportar XLSX"'` both match in `table-grid-panel.tsx`.
- `grep -q 'displayRows'` in export handlers confirmed (not `historyState.present.rows`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `vi.mock` factory referenced top-level const before initialization (TDZ)**
- **Found during:** Task 2 verification (GREEN run)
- **Issue:** `vi.mock(...)` is hoisted above the `const buildCsvMock = vi.fn(...)` declarations, causing `ReferenceError: Cannot access 'buildCsvMock' before initialization`.
- **Fix:** Wrapped the mock spies in `vi.hoisted(() => ({...}))` so they are defined before the hoisted `vi.mock` factory runs.
- **Files modified:** `apps/web/tests/table-grid-panel.test.tsx`
- **Commit:** 2897e9c

**2. [Rule 1 - Bug] Existing `require()`-based dynamic import of `TableGridPanel` in the test file always fails silently**
- **Found during:** Task 1, while debugging why initial RED assertions weren't failing
- **Issue:** `require("../src/features/unified-chat/components/table-grid-panel")` throws `Cannot find module` under the project's vitest/ESM setup for ALL existing tests in this file — meaning every pre-existing test guarded by `if (!TableGridPanel) { expect(true).toBe(true); return; }` has been silently skip-passing (never actually rendering the component) since it was written. This is a pre-existing condition from before this plan and is **out of scope to fix broadly** (would require touching all 15 pre-existing test cases and is unrelated to EXP-01/EXP-02).
- **Fix (scoped to this plan's new tests only):** Added a direct ESM `import { TableGridPanel as TableGridPanelDirect } from "../src/features/unified-chat/components/table-grid-panel"` plus a `ResizeObserver` polyfill, used only by the 3 new EXP-01/EXP-02 tests, which now perform real renders/clicks and correctly went RED then GREEN.
- **Files modified:** `apps/web/tests/table-grid-panel.test.tsx`
- **Commit:** db551a2 (test added), 2897e9c (cast fix for typecheck)
- **Logged for follow-up:** the broader fix (making the 15 pre-existing skip-graceful tests actually exercise the component) is deferred — see `deferred-items.md`.

**3. [Rule 1 - Bug] TypeScript error: `SPEC_FIXTURE.columns[].type` widened to `string`, incompatible with `TableSpecPayload`**
- **Found during:** `pnpm typecheck` after Task 2
- **Issue:** `SPEC_FIXTURE` (used by both the legacy loosely-typed `TableGridPanel` and the new strictly-typed `TableGridPanelDirect`) has `type: "text"` etc. without `as const`, so TS infers `string`, not the `TableColumn["type"]` union — failing assignment to `TableSpecPayload`.
- **Fix:** Cast `SPEC_FIXTURE as TableSpecPayload` at the 3 new `TableGridPanelDirect` call sites (imported `type { TableSpecPayload } from "@tabelin/shared"`). Did not change `SPEC_FIXTURE` itself (would risk breaking the 15 pre-existing skip-graceful tests' typing).
- **Files modified:** `apps/web/tests/table-grid-panel.test.tsx`
- **Commit:** 2897e9c

## Known Stubs

None — both export buttons are fully wired to real handlers calling the Plan 01 export utility and trigger real downloads in the browser (download effects are mocked only in tests, per Pitfall 4).

## Threat Flags

None — this plan reuses the sanitization/encoding surface established in Plan 01 (`buildCsv`/`buildXlsx`) without introducing new network endpoints, auth paths, or schema changes. Threat IDs T-15-01 and T-15-05 from this plan's threat model are satisfied by reusing Plan 01's already-mitigated `buildCsv`/`buildXlsx`.

## Self-Check: PASSED

- FOUND: apps/web/src/features/unified-chat/components/table-grid-panel.tsx
- FOUND: apps/web/tests/table-grid-panel.test.tsx
- FOUND commit db551a2 (test RED)
- FOUND commit 2897e9c (feat GREEN)

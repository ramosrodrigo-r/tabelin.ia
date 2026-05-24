---
phase: 01-localized-formula-workspace
plan: "03"
subsystem: ui
tags: [react, formula, streaming, clipboard, playwright, vitest, responsive]
requires:
  - phase: 01-02
    provides: shared formula contracts and authenticated formula API routes
provides:
  - Formula generate/explain workspace UI
  - Client stream parser and state machine
  - Copy-ready output button with copied feedback
  - Formula UI unit tests and Playwright MVP path
affects: [phase-2-quotas, phase-3-tool-framework, launch-smoke-tests]
tech-stack:
  added: [React client feature folder, Playwright Chromium browser install]
  patterns: [feature-scoped formula UI, stream draft vs validated result separation, copy disabled until complete]
key-files:
  created:
    - apps/web/src/features/formula/formula-tool.tsx
    - apps/web/src/features/formula/hooks/use-formula-stream.ts
    - apps/web/src/features/formula/components/formula-input-panel.tsx
    - apps/web/src/features/formula/components/formula-output-panel.tsx
    - apps/web/src/features/formula/components/copy-button.tsx
    - apps/web/tests/formula-ui.test.tsx
    - apps/web/tests/e2e/formula.spec.ts
    - apps/web/playwright.config.ts
  modified:
    - apps/web/src/app/(workspace)/workspace/page.tsx
    - apps/web/src/styles/globals.css
key-decisions:
  - "The UI keeps streaming draft separate from validated complete output; copy is disabled until the complete event arrives."
  - "Playwright mocks formula route responses at the route boundary for deterministic latency and output assertions."
patterns-established:
  - "Tool UI state is split into input panel, output panel, copy affordance, and a stream hook."
  - "E2E verifies visible first output within 2.5 seconds under mocked normal latency."
requirements-completed: [WORK-01, WORK-02, WORK-03, WORK-04, FORM-01, FORM-02, FORM-03, FORM-04, FORM-05, PERF-01, RELY-01]
duration: 8 min
completed: 2026-05-24
---

# Phase 01 Plan 03: Formula Workspace UI Summary

**Formula workspace with generate/explain controls, validated streaming output, assumptions, and copy feedback**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-24T14:47:43Z
- **Completed:** 2026-05-24T14:55:35Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- Replaced shell placeholders with the real Formula tool using mode tabs, platform selector, formula-language selector, prompt/formula input, and compact operational layout.
- Added `useFormulaStream` to parse typed NDJSON events and separate loading, streaming draft, validated completion, error, assumptions, warnings, and metadata.
- Added copy feedback and deterministic E2E coverage for sign-up, workspace, generation, 2.5-second visible output, copy, and explanation mode.

## Task Commits

1. **Task 1: Replace shell placeholders with Formula generate/explain UI** - `77cb5bb` (`feat(01-03): add formula streaming workspace`)
2. **Task 2: Implement streaming output, assumptions/warnings, errors, and copy feedback** - `77cb5bb` (`feat(01-03): add formula streaming workspace`)
3. **Task 3: Add formula MVP E2E and performance verification** - `8626532` (`test(01-03): cover formula UI and E2E path`)

## Files Created/Modified

- `apps/web/src/features/formula/formula-tool.tsx` - Integrated Formula workspace body.
- `apps/web/src/features/formula/hooks/use-formula-stream.ts` - Client streaming state machine using `getReader`.
- `apps/web/src/features/formula/components/formula-input-panel.tsx` - Mode, platform, language, textarea, and submit controls.
- `apps/web/src/features/formula/components/formula-output-panel.tsx` - Draft/result rendering, metadata, assumptions, warnings, errors, and retry.
- `apps/web/src/features/formula/components/copy-button.tsx` - Clipboard copy with `Copy`/`Check` icons and `Copiado` feedback.
- `apps/web/tests/formula-ui.test.tsx` - UI component tests for controls, validation, streaming, and copy state.
- `apps/web/tests/e2e/formula.spec.ts` - Formula MVP Playwright path with 2.5-second assertion.

## Decisions Made

- Used native select for platform and segmented buttons for formula language to keep controls compact and robust on mobile.
- Kept deterministic E2E route mocks for formula output so latency assertions are stable and do not depend on provider credentials.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed Playwright Chromium browser**
- **Found during:** Task 3 verification
- **Issue:** Playwright package was installed, but Chromium binaries were missing in the local cache.
- **Fix:** Ran `corepack pnpm --filter web exec playwright install chromium`.
- **Files modified:** None in source; browser cache populated outside repo.
- **Verification:** `corepack pnpm --filter web exec playwright test tests/e2e/formula.spec.ts` passes.
- **Committed in:** n/a

**2. [Rule 3 - Blocking] Excluded Playwright specs from Vitest**
- **Found during:** Task 3 verification
- **Issue:** Vitest picked up `tests/e2e/formula.spec.ts`, causing Playwright's `test()` to run under the wrong runner.
- **Fix:** Added `tests/e2e/**` to the Vitest exclude list.
- **Files modified:** `apps/web/vitest.config.ts`.
- **Verification:** `corepack pnpm --filter web test -- formula-ui` passes.
- **Committed in:** `8626532`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Verification environment fixes only. Product behavior remained within scope.

## Issues Encountered

- JSDOM's `navigator.clipboard` property needed a test override; the UI behavior is still validated through the visible `Copiado` state.
- A first visual script with route mocking timed out waiting for metadata; rerunning against the real deterministic local API succeeded and produced desktop/mobile screenshots.

## User Setup Required

None beyond the existing email and OpenAI entries in `01-USER-SETUP.md`.

## Verification

- `corepack pnpm --filter web test -- formula-ui` passed.
- `corepack pnpm --filter web exec playwright test tests/e2e/formula.spec.ts` passed.
- `corepack pnpm --filter web typecheck` passed.
- `corepack pnpm --filter web lint` passed.
- `corepack pnpm --filter web build` passed.
- Playwright visual smoke generated `apps/web/test-results/formula-desktop.png` and `apps/web/test-results/formula-mobile.png` with no detected element overflow.

## Next Phase Readiness

Phase 1 now has the demo path required for Phase 2 to add quota reservations, usage ledgers, and entitlement checks around the existing formula request flow.

---
*Phase: 01-localized-formula-workspace*
*Completed: 2026-05-24*


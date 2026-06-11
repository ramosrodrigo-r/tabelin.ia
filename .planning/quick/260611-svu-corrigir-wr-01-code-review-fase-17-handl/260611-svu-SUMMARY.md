---
phase: quick
plan: 260611-svu
subsystem: ui
tags: [react, unified-chat, testing, vitest]

requires:
  - phase: 17-desligar-monetiza-o-cota
    provides: unified-chat-tool.tsx clarification flows (table_clar_question, table_spec)
provides:
  - handleSkipClarification and handleConfirmSpec now populate submittedText/submittedContext/submittedCorrected before stream.submit
  - Final formula result renders live and gets archived after "Gerar mesmo assim" / "Confirmar e Gerar"
affects: [unified-chat]

tech-stack:
  added: []
  patterns:
    - "Submission handlers must populate submittedText/submittedContext/submittedCorrected (and lastSubmitInputRef) before calling stream.submit, mirroring submitPrompt"

key-files:
  created: []
  modified:
    - apps/web/src/features/unified-chat/unified-chat-tool.tsx
    - apps/web/tests/unified-chat-tool.test.tsx

key-decisions:
  - "Kept fix localized to handleSkipClarification/handleConfirmSpec — no shared helper extracted, to avoid touching submitPrompt's signature/behavior"
  - "setSubmittedCorrected(false) used for both handlers, matching submitPrompt's default when options.corrected is unset"

requirements-completed: [WR-01]

duration: 12min
completed: 2026-06-11
---

# Quick Task 260611-svu: Fix WR-01 clarification override handlers Summary

**handleSkipClarification and handleConfirmSpec in unified-chat-tool.tsx now populate submittedText/submittedContext/submittedCorrected and lastSubmitInputRef before stream.submit, fixing the archiving useEffect and live-render block that previously stayed dormant after "Gerar mesmo assim" / "Confirmar e Gerar"**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-11T23:42:00Z
- **Completed:** 2026-06-11T23:54:11Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fixed WR-01: clicking "Gerar mesmo assim" after a clarification question now shows the final generated result live and archives it in `exchanges`
- Fixed WR-01: clicking "Confirmar e Gerar" after the `table_spec` ConfirmationCard now shows the final generated result live and archives it
- Added regression-proof assertions (CLAR-03/CLAR-04) that the formula result renders in the DOM after both override flows

## Task Commits

1. **Task 1: Fix handleSkipClarification and handleConfirmSpec to populate submission state** - `318844b` (fix)
2. **Task 2: Add tests verifying final result renders after "Gerar mesmo assim" and "Confirmar e Gerar"** - `ea113ca` (test)

**Plan metadata:** (pending — orchestrator commit)

## Files Created/Modified
- `apps/web/src/features/unified-chat/unified-chat-tool.tsx` - handleSkipClarification and handleConfirmSpec now derive a UnifiedContext from lastSubmitInputRef.current, call setSubmittedText/setSubmittedContext/setSubmittedCorrected(false), update lastSubmitInputRef.current with the new submit input, then call stream.submit
- `apps/web/tests/unified-chat-tool.test.tsx` - CLAR-03 and CLAR-04 tests extended with `waitFor(() => expect(screen.getByText("=SOMA(A:A)")).toBeInTheDocument())` after the second fetch resolves

## Decisions Made
- Kept the fix scoped to the two handlers (no shared helper), per plan constraint to minimize regression risk to `submitPrompt`
- Used `setSubmittedCorrected(false)` for both handlers since "Gerar mesmo assim" / "Confirmar e Gerar" are not "corrected intent" overrides

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- The pre-existing flaky test "corrupt NDJSON enters the error state" (documented in project memory) failed on the first `pnpm --filter web test unified-chat-tool` run and passed on immediate retry (19/19). This is unrelated to this fix's changes — out of scope per scope boundary rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- WR-01 from the Phase 17 code review is resolved
- `unified-chat-tool.tsx` clarification override flows (skip/confirm) now have full test coverage of the final-result rendering path

---
*Phase: quick*
*Completed: 2026-06-11*

## Self-Check: PASSED

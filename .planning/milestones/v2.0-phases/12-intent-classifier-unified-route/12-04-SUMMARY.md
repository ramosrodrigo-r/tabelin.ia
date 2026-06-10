---
phase: 12-intent-classifier-unified-route
plan: "04"
subsystem: workspace
tags: [workspace-default, unified-history, topbar, regression-gate]
requires:
  - phase: 12-intent-classifier-unified-route
    plan: "03"
    provides: UnifiedChatTool
provides:
  - `/workspace` unified default
  - `/api/conversations/unified` delete endpoint
  - Topbar unified history deletion
  - Phase 12 final regression gate
affects: [phase-13-clarification-loop]
tech-stack:
  added: []
  patterns: [bounded delete fanout, route-derived toolKind, full phase gate]
key-files:
  created:
    - apps/web/src/app/api/conversations/unified/route.ts
    - apps/web/tests/conversations-route.test.ts
  modified:
    - apps/web/src/app/(workspace)/workspace/page.tsx
    - apps/web/src/components/app/topbar.tsx
    - apps/web/src/app/api/conversations/[tool]/route.ts
    - apps/web/tests/topbar.test.tsx
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/phases/12-intent-classifier-unified-route/12-VALIDATION.md
key-decisions:
  - "Exact `/workspace` now maps to `toolKind: unified`; per-tool deep links keep their existing tool kinds."
  - "Unified history deletion fans out over formula, sql, regex, script, template, and unified_table."
  - "File-analysis and OCR routes remain ephemeral and are not included in unified history deletion."
requirements-completed: [UNI-02, UNI-03, UNI-04, UNI-05, UNI-07]
duration: 17 min
completed: 2026-06-08
---

# Phase 12 Plan 04: Workspace Default & Hardening Summary

**Root workspace now opens unified chat, unified history deletion is wired, and Phase 12 passed the final regression gate**

## Performance

- **Duration:** 17 min
- **Started:** 2026-06-08T15:38:45Z
- **Completed:** 2026-06-08T15:45:10Z
- **Tasks:** 4
- **Files modified:** 9

## Accomplishments

- Changed `/workspace` root to render `UnifiedChatTool` with entitlement only, removing the formula-only history seed.
- Updated Topbar route-derived `toolKind` so exact `/workspace` uses `unified` while `/workspace/sql`, `/workspace/regex`, `/workspace/scripts`, and `/workspace/templates` stay unchanged.
- Added unified destructive confirmation copy and tests for `/api/conversations/unified` and `/api/conversations/sql`.
- Added `/api/conversations/unified` DELETE route with bounded fanout over six persisted unified history buckets.
- Extended existing per-tool delete validation to accept `unified_table`.
- Added conversation delete tests for auth, unified fanout, formula regression, and invalid tool kind.
- Marked UNI-01 through UNI-07 complete in requirements after root migration made the unified client reachable.

## Verification

- `pnpm --filter web test -- tests/topbar.test.tsx tests/conversations-route.test.ts tests/unified-chat-tool.test.tsx` — passed, 252 tests passed, 1 skipped.
- `pnpm --filter web typecheck` — passed.
- `pnpm --filter web lint` — passed with `--max-warnings=0`.
- `pnpm --filter web test` — passed, 252 tests passed, 1 skipped.
- `pnpm --filter web test -- tests/intent-classifier.test.ts tests/unified-route.test.ts tests/unified-chat-tool.test.tsx tests/topbar.test.tsx tests/conversations-route.test.ts` — passed, 252 tests passed, 1 skipped.
- `grep -R "UnifiedChatTool" 'apps/web/src/app/(workspace)/workspace/page.tsx'` — found the root workspace import/render.
- `grep -R 'findConversationExchanges(user!.id, "formula")' 'apps/web/src/app/(workspace)/workspace/page.tsx'` — no matches.

## Provider Checks

- Fixture classifier score: 20/20 Portuguese prompt cases covered by `tests/intent-classifier.test.ts`.
- `OPENAI_API_KEY`: absent in this environment.
- Real-provider 19/20 classifier smoke: not run; manual pre-release check required with `OPENAI_API_KEY=... pnpm --filter web test -- tests/intent-classifier.test.ts`.
- 2.5s real-provider first-event latency: not run; manual browser Network timing required with a configured provider.

## Release Notes

- `/workspace` is now unified by default.
- Existing per-tool source and deep-link pages remain in place.
- No new npm package was installed.

## Deviations from Plan

None beyond the manual provider checks being deferred due to missing `OPENAI_API_KEY`.

## User Setup Required

None for local fixture mode. Provider-backed release validation still needs an OpenAI API key.

## Next Phase Readiness

Ready for **Phase 13: Clarification Loop**.

---
*Phase: 12-intent-classifier-unified-route*
*Completed: 2026-06-08*

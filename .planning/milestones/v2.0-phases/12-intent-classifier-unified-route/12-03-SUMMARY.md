---
phase: 12-intent-classifier-unified-route
plan: "03"
subsystem: frontend
tags: [unified-chat, react, ndjson, intent-pill, render-dispatcher, vitest]
requires:
  - phase: 12-intent-classifier-unified-route
    plan: "02"
    provides: `/api/chat/unified`
provides:
  - `UnifiedChatTool`
  - `useUnifiedChatStream`
  - `IntentPill`
  - `SessionContextSelector`
  - `RenderDispatcher`
  - `TableIntentStub`
affects: [phase-12-workspace-default, phase-13-clarification-loop]
tech-stack:
  added: []
  patterns: [validated NDJSON hook, intent override dropdown, resolved payload dispatcher]
key-files:
  created:
    - apps/web/src/features/unified-chat/unified-chat-tool.tsx
    - apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts
    - apps/web/src/features/unified-chat/components/intent-pill.tsx
    - apps/web/src/features/unified-chat/components/session-context-selector.tsx
    - apps/web/src/features/unified-chat/components/render-dispatcher.tsx
    - apps/web/src/features/unified-chat/components/table-intent-stub.tsx
    - apps/web/tests/unified-chat-tool.test.tsx
  modified:
    - apps/web/src/styles/globals.css
    - apps/web/src/features/template/components/template-output-panel.tsx
    - apps/web/src/features/file-analysis/file-analysis-tool.tsx
    - apps/web/src/features/ocr/ocr-tool.tsx
    - apps/web/tests/extraction/dispatcher.test.ts
    - apps/web/tests/extraction/security-extractors.test.ts
    - .planning/ROADMAP.md
    - .planning/STATE.md
    - .planning/phases/12-intent-classifier-unified-route/12-VALIDATION.md
key-decisions:
  - "Unified client parses each NDJSON line with `unifiedStreamEventSchema` before rendering."
  - "Override options match the approved seven visible intents; `template` can still render when detected by the backend."
  - "The context selector is implemented inside the unified input options for 12-03; topbar/workspace wiring remains 12-04."
  - "All heterogeneous output branches reuse existing output panels or existing assistant-card/placeholder-box chrome."
requirements-completed: []
duration: 32 min
completed: 2026-06-08
---

# Phase 12 Plan 03: Unified Chat Client Summary

**Client-side unified chat experience with intent pill override, persistent context selectors, typed NDJSON parsing, and heterogeneous rendering**

## Performance

- **Duration:** 32 min
- **Started:** 2026-06-08T15:26:55Z
- **Completed:** 2026-06-08T15:38:45Z
- **Tasks:** 4
- **Files modified:** 16

## Accomplishments

- Added `useUnifiedChatStream()` for `/api/chat/unified` with JSON/FormData request paths, no manual multipart content-type, HTTP error handling, attachment status, quota/pro flags, and Zod-validated NDJSON parsing.
- Added `IntentPill` with detected/corrected state, Escape/outside-click dropdown close behavior, seven override options, and immediate override callback.
- Added `SessionContextSelector` with Excel, pt-BR, semicolon, and PostgreSQL defaults plus persistent controlled state.
- Added `RenderDispatcher` for formula, SQL, regex, script, template, file-analysis, OCR, `table_stub`, `needs_file`, streaming draft, and error states.
- Added `UnifiedChatTool` orchestration with empty state, single input, attachments, drag/drop Pro guard, exchange archive lifecycle, override re-submit with original prompt/context, and new-conversation reset callback.
- Added targeted CSS wrappers while reusing existing token palette and component classes.
- Added UI tests covering hook behavior, intent-first rendering, corrupt NDJSON, FormData headers, pill dropdown, override re-submit, context persistence, render branches, and new conversation clearing.

## Verification

- `pnpm --filter web test -- tests/unified-chat-tool.test.tsx` — passed, 246 tests passed, 1 skipped.
- `pnpm --filter web typecheck` — passed.
- `pnpm --filter web lint` — passed with `--max-warnings=0`.
- `grep -R "dangerouslySetInnerHTML" apps/web/src/features/unified-chat` — no matches.

## Deviations from Plan

### Context Selector Placement

The UI-SPEC describes the context selector in the topbar, but 12-03's file scope does not include `topbar.tsx`. The selector is implemented inside the unified chat input options for this plan, preserving state and request behavior. Topbar/workspace integration remains part of 12-04.

### Lint Baseline Cleanup

The required full lint gate surfaced pre-existing unused-variable warnings in unrelated files. Minimal no-behavior cleanup was applied:

- Removed unused entitlement bindings in file-analysis and OCR tools.
- Displayed template provider metadata so the existing `metadata` prop is used.
- Removed unused extraction test helper/import bindings.

## User Setup Required

None.

## Next Phase Readiness

Ready for **12-04: Workspace Default & Hardening**. The next plan should mount `UnifiedChatTool` at `/workspace`, keep deep links working, update unified conversation deletion, and run the full phase gate.

---
*Phase: 12-intent-classifier-unified-route*
*Completed: 2026-06-08*

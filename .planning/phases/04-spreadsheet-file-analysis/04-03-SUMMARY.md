---
phase: 04-spreadsheet-file-analysis
plan: "03"
subsystem: infra
tags: [node-cron, next-instrumentation, privacy, cron, cleanup, html]

requires:
  - phase: 04-02
    provides: UploadedFile and ChatMessage Prisma models with lastChatAt field; sidebar File Analysis link activated; full file analysis UI

provides:
  - "cleanup-job.ts with node-cron 15-min schedule and globalThis guard (PRIV-01)"
  - "instrumentation.ts with Next.js register() hook for server-side cron initialization"
  - "privacidade.html static page documenting OpenAI API non-retraining policy (PRIV-03)"

affects: [phase-5, deploy, privacy-compliance]

tech-stack:
  added: []
  patterns:
    - "node-cron + globalThis guard pattern: prevents duplicate cron jobs during Next.js hot reload"
    - "Next.js instrumentation.ts register() hook: run-once server initialization via dynamic import"
    - "Static HTML in public/ for simple policy pages: no framework, semantic HTML, charset UTF-8"

key-files:
  created:
    - apps/web/src/server/file-analysis/cleanup-job.ts
    - apps/web/src/instrumentation.ts
    - apps/web/public/privacidade.html
  modified: []

key-decisions:
  - "Cron job uses globalThis._cleanupJobStarted guard to prevent duplicate registration on Next.js hot reload (Pitfall 4 from RESEARCH.md)"
  - "instrumentation.ts uses dynamic import (await import) to prevent loading server-only cleanup-job module on edge runtime"
  - "Privacy page created as static HTML in public/ rather than a Next.js page to avoid auth/routing overhead"
  - "Only console.info with record count is logged on cleanup (never userId, fileName, or schema) satisfying PRIV-02"

requirements-completed: [PRIV-01, PRIV-02, PRIV-03, PRIV-04]

duration: 2min
completed: 2026-05-26
---

# Phase 4 Plan 03: Privacy Lifecycle and Cron Cleanup Summary

**node-cron 15-min cleanup job with globalThis guard via Next.js instrumentation.ts hook, plus static privacy policy page documenting OpenAI API non-retraining terms**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-26T10:44:00Z
- **Completed:** 2026-05-26T10:46:09Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `cleanup-job.ts` with `node-cron` scheduled every 15 minutes; deletes `UploadedFile` records with `lastChatAt` or `createdAt` older than 1 hour; `onDelete: Cascade` in Prisma ensures `ChatMessage` is deleted automatically; guard via `globalThis._cleanupJobStarted` prevents duplicate job registration on hot reload
- Created `instrumentation.ts` using Next.js `register()` hook; loads cleanup-job via dynamic import only in the `nodejs` runtime (prevents edge runtime loading); cron is registered exactly once per process
- Created `apps/web/public/privacidade.html`: semantic HTML5, Portuguese text, explicit declaration that "dados enviados via API não são utilizados para treinar os modelos públicos da OpenAI", link to OpenAI usage policies, retention and deletion policy, LGPD compliance mention

## Task Commits

1. **Task 1: Cron de limpeza e instrumentation.ts** - `5837d56` (feat)
2. **Task 2: Ativar sidebar + criar página de privacidade (PRIV-03)** - `9e29b3f` (feat)

**Plan metadata:** (committed with SUMMARY)

## Files Created/Modified

- `apps/web/src/server/file-analysis/cleanup-job.ts` — node-cron cleanup job with globalThis guard; deletes UploadedFile by inactivity (lastChatAt or createdAt > 1h)
- `apps/web/src/instrumentation.ts` — Next.js register() hook; initializes cron on nodejs runtime via dynamic import
- `apps/web/public/privacidade.html` — Static privacy policy page; documents PRIV-03 non-retraining policy

## Decisions Made

- **globalThis guard over module-level singleton:** Next.js hot reload re-executes modules; using `globalThis._cleanupJobStarted` is the only reliable way to prevent duplicate jobs across module re-evaluations.
- **Dynamic import in instrumentation.ts:** Prevents `server-only` module from being bundled in edge runtime; avoids node-cron attempting to load where it cannot run.
- **Static HTML for privacy page:** Simpler than a Next.js route — no auth needed, served directly from `public/`, accessible at `/privacidade` without any framework overhead.
- **Note on sidebar:** The sidebar File Analysis link (`href: "/workspace/file-analysis"`) was already activated in plan 04-02. Task 2 confirmed the activation and proceeded to create the privacy page.

## Deviations from Plan

None - plan executed exactly as written.

The sidebar already had `href: "/workspace/file-analysis"` (no `disabled: true`) from plan 04-02. Task 2 confirmed this and created the privacy page as specified.

## Issues Encountered

None.

## Known Stubs

None — all deliverables are complete implementations.

## Threat Flags

No new threat surface introduced beyond what is documented in the plan's `<threat_model>`.

Mitigations applied:
- T-04-03-02 (Information Disclosure): cleanup-job.ts logs only `result.count` via `console.info`; never logs userId, fileName, or schema content.
- T-04-SC (Tampering): node-cron@3 version is pinned in package.json; no external callbacks; executes only `prisma.uploadedFile.deleteMany` internal operation.

## Next Phase Readiness

Phase 4 is complete. All 9 requirements (FILE-01 to FILE-05, PRIV-01 to PRIV-04) are covered across the three plans:
- **FILE-01 to FILE-05:** Covered by plans 04-01 and 04-02 (upload, schema extraction, chat, pivot buttons)
- **PRIV-01:** Covered by this plan (cron cleanup after 1 hour inactivity)
- **PRIV-02:** Covered by plan 04-01 (raw file never stored; no content in logs)
- **PRIV-03:** Covered by this plan (privacidade.html with explicit non-retraining statement)
- **PRIV-04:** Covered by plan 04-01/04-02 architecture (raw file never sent to OpenAI; only structured schema in system prompt)

Ready for Phase 5 (OCR/Charts) or deploy/milestone close.

---
*Phase: 04-spreadsheet-file-analysis*
*Completed: 2026-05-26*

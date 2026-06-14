---
phase: 19-ingestao-tri-estado-da-planilha
status: secured
asvs_level: 1
block_on: high
audited: 2026-06-14
threats_total: 8
threats_closed: 8
threats_open: 0
threats_accepted: 0
register_authored_at_plan_time: true
---

# SECURITY.md — Phase 19: Ingestão Tri-Estado da Planilha

Audit date: 2026-06-14
ASVS level: 1
block_on: high

## Threat Verification Summary

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-19-AUTH | Spoofing / Elevation of Privilege | mitigate | CLOSED | `apps/web/src/app/api/workspace/import/route.ts:51-54` — `getSessionFromCookieHeader` checks authentication, returning 401 if unauthenticated. Covered by test `tests/workspace-import.test.ts:34-38`. |
| T-19-DOS-FILE | Denial of Service | mitigate | CLOSED | `route.ts:69-71` — Enforces `MAX_UPLOAD_BYTES` (5 MB) limit on file size, returning 413 if exceeded. Covered by test `tests/workspace-import.test.ts:46-53`. |
| T-19-ZIP-BOMB | Denial of Service | mitigate | CLOSED | `route.ts:85-88` — Calls `guardXlsxZip(bytes)` to validate ZIP compression ratios and entry limits, returning 422 if a ZIP bomb is detected. Covered by dispatcher/extraction tests. |
| T-19-DOS-LIMIT | Denial of Service | mitigate | CLOSED | `route.ts:124` & `route.ts:133` — Truncates rows to at most 200 and columns to at most 26. Covered by test `tests/workspace-import.test.ts:94-114`. |
| T-19-EPHEMERAL | Information Disclosure | mitigate | CLOSED | `route.ts:73-102` — Uploaded file buffer is parsed entirely in memory; no file content is persisted to disk, database, or external storage. |
| T-19-VALIDATION | Tampering | mitigate | CLOSED | `route.ts:188-195` — Enforces structural and type validation using `tableSpecPayloadSchema.safeParse` (Zod) on the final payload before returning it. `table-grid-panel.tsx:510-521` validates the received JSON payload using Zod before loading it. |
| T-19-COLLISION | Tampering / Information Disclosure | mitigate | CLOSED | `route.ts:135-156` — Header normalization keeps track of `usedKeys` in a Set, appending numeric suffixes (`_2`, `_3`, etc.) to resolve duplicate or sanitized collisions and prevent data loss. |
| T-19-HOOKS | Denial of Service | mitigate | CLOSED | `table-grid-panel.tsx:120` — Replaced the conditional `useWorkspaceState` hook call with unconditional `useContext(WorkspaceStateContext)` to adhere strictly to the Rules of Hooks. |

## Accepted Risks Log

No accepted risks for this phase.

## Unregistered Flags

None.

## Notes

All unit and integration tests are passing successfully, including specific validation of error messages in Portuguese.

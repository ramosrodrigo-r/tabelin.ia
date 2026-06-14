---
phase: 20-protocolo-de-muta-o-chat-grade-q-a
status: secured
asvs_level: 1
block_on: high
audited: 2026-06-14
threats_total: 5
threats_closed: 5
threats_open: 0
threats_accepted: 0
register_authored_at_plan_time: true
---

# SECURITY.md — Phase 20: Protocolo de Mutação Chat→Grade & Q&A

Audit date: 2026-06-14
ASVS level: 1
block_on: high

## Threat Verification Summary

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-20-AUTH | Spoofing / Elevation of Privilege | mitigate | CLOSED | `apps/web/src/app/api/chat/unified/route.ts:283-286` — `getSessionFromCookieHeader` checks authentication, returning 401 if unauthenticated. Covered by test `tests/unified-route.test.ts:98-107`. |
| T-20-SPEC-VAL | Tampering / Injection | mitigate | CLOSED | `route.ts:144-160` & `305-308` — Validates client-provided spreadsheet specs via Zod `tableSpecPayloadSchema.safeParse` before further processing. Covered by test `tests/unified-route.test.ts:165-172`. |
| T-20-DOS-LIMIT | Denial of Service | mitigate | CLOSED | `packages/shared/src/unified-chat/schema.ts:34-39` — Zod schema constraints on row/col counts. `apps/web/src/server/ai/unified-provider.ts:55-66` — `serializeSpecForPrompt` truncates cell strings to 100 characters to prevent prompt tokens blowup. |
| T-20-STATE-EXCL | Race Conditions / State Corruption | mitigate | CLOSED | `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts:128-219` — Buffers stream events and yields terminal status only when successfully completed without errors. Ensures complete and error status updates are mutually exclusive. |
| T-20-STRING-CORRUPT | Tampering / Data Loss | mitigate | CLOSED | `apps/web/src/server/ai/formula-translator.ts:60-120` — Safely swaps separators and function names without corrupting commas/semicolons inside literal text strings by implementing Excel-style and standard quote escape detection. Covered by test `tests/formula-translator.test.ts:25-30`. |

## Accepted Risks Log

No accepted risks for this phase.

## Unregistered Flags

None.

## Notes

All unit and integration tests are passing successfully, including specific validation of error messages in Portuguese and formula localization.

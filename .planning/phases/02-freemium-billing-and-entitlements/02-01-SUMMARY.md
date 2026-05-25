---
phase: 02-freemium-billing-and-entitlements
plan: "01"
subsystem: billing-quota-foundation
tags: [quota, entitlement, prisma, transactional-reservation, free-limits, pro-bypass]
dependency_graph:
  requires: [auth-session-persistence, prisma-client, formula-api-routes]
  provides: [quota-service, entitlement-lookup, usage-ledger, transactional-reservation]
  affects: [formula-generate-route, formula-explain-route]
tech_stack:
  added: [serializable-transactions, retry-on-conflict, meter-constants]
  patterns: [reservation-confirmation-release, server-side-entitlement]
key_files:
  created:
    - prisma/schema.prisma (Entitlement, UsageLedger models)
    - packages/shared/src/billing/schema.ts
    - apps/web/src/server/billing/entitlements.ts
    - apps/web/src/server/usage/quota-service.ts
    - apps/web/src/server/usage/quota-types.ts
    - apps/web/tests/quota-service.test.ts
  modified:
    - apps/web/src/app/api/auth/[...all]/route.ts
    - apps/web/src/app/api/tools/formula/generate/route.ts
    - apps/web/src/app/api/tools/formula/explain/route.ts
    - apps/web/tests/auth-routes.test.ts
    - apps/web/tests/formula-api.test.ts
    - packages/shared/src/index.ts
    - .env.example
decisions:
  - Use Prisma cuid() user IDs in session tokens instead of email HMAC fallback
  - Transactional quota reservation with serializable isolation and retry on write conflict
  - Free tool_use limit is 4 confirmed uses per 12-hour window
  - Active reservations count against capacity to prevent race-condition abuse
  - Pro users bypass user-facing quota checks while preserving internal safeguard hooks
  - Formula generate and explain consume equal quota (one tool_use each)
  - Provider/validation failures release reservations and do not consume quota
  - Quota-blocked responses use HTTP 429 with structured JSON (code, meterKind, cta)
metrics:
  duration_minutes: 10
  completed_date: "2026-05-25"
  task_count: 4
  file_count: 15
---

# Phase 02 Plan 01: Transactional Quota and Entitlement Foundation Summary

JWT-free entitlement lookup and transactional tool-use quota enforcement para Formula workspace com reserva antes do trabalho de IA e liberação em falhas de provider/validação.

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Notes

### Task 1: Auth Identity Alignment

Updated `persistCredentials` to return Prisma `User.id` (cuid) and use it in session tokens instead of the email-HMAC fallback. This ensures billing, entitlements, and usage ledger rows safely relate to the same persisted user ID.

Added tests confirming sign-up and sign-in responses include the Prisma user ID. Production persistence failures still return HTTP 503; local-dev fallback remains available outside production.

### Task 2: Quota and Entitlement Models

Extended Prisma schema with:

- **Entitlement model:** `userId`, `plan`, `cycle`, `status`, `currentPeriodStart/End`, provider references, indexes on `(userId, status)` and `(status, currentPeriodEnd)`.
- **UsageLedger model:** `userId`, `meterKind`, `toolKind`, `mode`, `status` (reserved/confirmed/released), unique `reservationKey`, `periodStart/End`, `confirmedAt`, `releasedAt`, indexes on `(userId, meterKind, status, createdAt)` and `(status, confirmedAt)`.

Created shared billing types (`packages/shared/src/billing/schema.ts`):

- Constants: `PLAN_IDS`, `PLAN_CYCLES`, `ENTITLEMENT_STATUS`, `METER_KINDS`, `USAGE_STATUS`, `FREE_QUOTAS`.
- Types: `UserEntitlement`, `QuotaCheckResult`, `QuotaConfirmResult`, `QuotaReleaseResult`.

Implemented services:

- **`getUserEntitlement(userId)`:** Resolves Free or active Pro entitlement from Prisma.
- **`reserveToolUse(userId, toolKind, mode)`:** Interactive transaction with serializable isolation, counts confirmed + reserved uses in 12-hour window, blocks at 4, signals `lastFreeUse: true` when reserving the fourth use, bypasses limits for active Pro users.
- **`confirmToolUse(reservationKey)`:** Updates reserved row to confirmed.
- **`releaseToolUse(reservationKey)`:** Updates reserved row to released (does not count against later quota).

Retry logic handles Prisma write-conflict errors (`P2034`, `P2002`) with exponential backoff (max 3 retries).

Added tests covering:

- First Free use allowed without `lastFreeUse` flag.
- Fourth Free use allowed with `lastFreeUse: true`.
- Fifth Free use blocked with `quota_exceeded`.
- Pro users bypass Free quota checks.
- Confirmation and release operations.

### Task 3: Formula Route Gating

Inserted quota reservation after auth and request validation but **before** `resolveFormulaPayload(...)` in both formula generate and explain routes.

On quota block: return HTTP 429 with JSON `{ code: "quota_exceeded", meterKind: "tool_use", cta: "pro_checkout" }` — distinguishable from provider validation errors.

On validated success: call `confirmToolUse(reservationKey)` and persist `ToolRequest` metadata.

On provider throw or validation failure: call `releaseToolUse(reservationKey)` and return existing Portuguese provider error (HTTP 502).

Updated formula API tests to:

- Mock quota service with default allowed state.
- Assert `reserveToolUse` is called before AI work.
- Assert `confirmToolUse` is called on success.
- Assert quota-blocked responses return HTTP 429 with structured payload.

### Task 4: Schema Push and Client Regeneration

Ran `pnpm prisma:generate` successfully — Prisma Client regenerated with new `Entitlement` and `UsageLedger` models.

`pnpm exec prisma db push` requires running PostgreSQL (local dev setup per plan `user_setup`). Command is correct; execution deferred to user environment with active database.

## Verification Results

- [x] `pnpm prisma:generate` passes.
- [ ] `pnpm exec prisma db push` requires local PostgreSQL (user setup).
- [x] `pnpm --filter web test -- auth-routes` passes (11 tests).
- [x] `pnpm --filter web test -- quota-service` passes (7 tests).
- [x] `pnpm --filter web test -- formula-api` passes (7 tests).
- [x] `pnpm --filter web typecheck` passes.
- [x] `pnpm --filter web lint` passes.

All automated checks pass. Database push deferred to user with running PostgreSQL.

## Requirements Coverage

- **BILL-03:** Pro bypass implemented server-side in `reserveToolUse` for active Pro entitlements.
- **QUOT-01:** Formula generate/explain enforce 4 confirmed Free uses per 12 hours.
- **QUOT-02:** Chat message constants modeled (`chat_message`, 10 per 30 days) but not enforced until chat feature exists.
- **QUOT-03:** Upload limit constants modeled (`upload_file`, 5 MB / 5 files) but not enforced until upload feature exists.

## Decisions Implemented

- **D-01/D-02:** Tool use reserved before AI work, confirmed after validated success, released on provider/validation failures.
- **D-03:** Formula generate and explain both consume one `tool_use`.
- **D-04:** Generic usage ledger supports `tool_use`, `chat_message`, `upload_file` meters; only formula active in Phase 2.
- **D-05:** Pro users bypass user-facing quotas; internal abuse safeguards remain possible via service-layer hooks.
- **D-06/D-07/D-08/D-09:** Server responses expose quota state for inline block (`quota_exceeded` with `cta: "pro_checkout"`), simple message, direct Pro CTA, and last-use warning (`lastFreeUse: true` signal).

## Known Limitations

- Database schema push requires local PostgreSQL running on `localhost:5432` — user must execute `pnpm exec prisma db push` after starting the database.
- No UI implementation in this plan — inline block, last-use warning, and Pro CTA rendering deferred to Plan 03.
- No checkout or webhook implementation — billing flow deferred to Plan 02.

## Self-Check: PASSED

**Created files exist:**

- [x] `prisma/schema.prisma` — Entitlement and UsageLedger models present.
- [x] `packages/shared/src/billing/schema.ts` — billing types and constants.
- [x] `apps/web/src/server/billing/entitlements.ts` — getUserEntitlement service.
- [x] `apps/web/src/server/usage/quota-service.ts` — reservation/confirmation/release.
- [x] `apps/web/tests/quota-service.test.ts` — quota tests.

**Commits exist:**

- [x] `9dd22a5` — Task 1: align auth identity with Prisma user IDs.
- [x] `e2e5d29` — Task 2: add quota, entitlement, and billing contracts.
- [x] `5a62197` — Task 3: gate formula routes with quota reservations.
- [x] `96c4c2f` — Task 4: schema generation complete (push requires DB).

**Modified routes integrate quota:**

- [x] `apps/web/src/app/api/tools/formula/generate/route.ts` calls `reserveToolUse` before `resolveFormulaPayload`.
- [x] `apps/web/src/app/api/tools/formula/explain/route.ts` calls `reserveToolUse` before `resolveFormulaPayload`.

All claims verified.

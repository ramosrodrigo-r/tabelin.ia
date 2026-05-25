---
phase: 02-freemium-billing-and-entitlements
plan: "02"
subsystem: mercado-pago-billing-integration
tags: [mercado-pago, checkout, webhook, payment, idempotency, hosted-checkout]
dependency_graph:
  requires: [quota-service, entitlement-lookup, prisma-client, session-auth]
  provides: [mercado-pago-client, checkout-service, webhook-service, payment-reconciliation]
  affects: [entitlement-activation, billing-return-page]
tech_stack:
  added: [mercadopago-sdk, hosted-checkout-pro, webhook-signature-validation, payment-event-idempotency]
  patterns: [server-only-billing-config, external-reference-checkout-tracking, webhook-resource-fetch-before-mutation]
key_files:
  created:
    - apps/web/src/server/billing/mercado-pago-client.ts
    - apps/web/src/server/billing/checkout-service.ts
    - apps/web/src/server/billing/webhook-service.ts
    - apps/web/src/app/api/billing/checkout/route.ts
    - apps/web/src/app/api/billing/mercado-pago/webhook/route.ts
    - apps/web/src/app/(billing)/billing/return/page.tsx
    - apps/web/tests/billing-checkout.test.ts
    - apps/web/tests/mercado-pago-webhook.test.ts
  modified:
    - .env.example
    - apps/web/package.json
    - packages/shared/src/billing/schema.ts
    - prisma/schema.prisma
    - apps/web/src/server/billing/entitlements.ts
    - pnpm-lock.yaml
decisions:
  - Use Mercado Pago SDK version 3.0.0 for hosted Checkout Pro integration
  - Store BillingCheckout and PaymentEvent models for checkout intent and provider event tracking
  - Unique external_reference per checkout prevents duplicate preference creation
  - Unique provider+providerEventId constraint ensures webhook idempotency
  - Webhook signature validation is optional and warns in dev/test when secret is unconfigured
  - Fetch payment resource from Mercado Pago API before activating Pro entitlement
  - Approved payment activates Pro for monthly or annual cycle with calculated period end
  - Rejected/refunded/charged_back payment revokes active Pro entitlement
  - Return page shows processing state when webhook has not yet confirmed Pro activation
  - Monthly checkout defaults to 30-day period, annual defaults to 365-day period
metrics:
  duration_minutes: 7
  completed_date: "2026-05-25"
  task_count: 3
  file_count: 14
---

# Phase 02 Plan 02: Mercado Pago Checkout and Webhook Integration Summary

Hosted Mercado Pago checkout com Pix/card support e webhook-driven Pro entitlement reconciliation.

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Notes

### Task 1: Mercado Pago Billing Configuration and Checkout Contracts

Added `mercadopago` npm dependency (version 3.0.0) to the web package. Extended `.env.example` with required billing environment variables:

- `MERCADO_PAGO_ACCESS_TOKEN` - Provider API token
- `MERCADO_PAGO_WEBHOOK_SECRET` - Optional webhook signature secret
- `PRO_MONTHLY_PRICE_BRL` - Monthly Pro price in BRL
- `PRO_ANNUAL_PRICE_BRL` - Annual Pro price in BRL

Extended shared billing schemas (`packages/shared/src/billing/schema.ts`):

- `BILLING_STATUS` constants: pending, approved, rejected, expired, refunded, charged_back, canceled
- `billingCycleSchema` Zod validator: only accepts "monthly" or "annual"
- `checkoutRequestSchema` and `checkoutResponseSchema` for type-safe checkout API

Implemented server-only Mercado Pago client (`apps/web/src/server/billing/mercado-pago-client.ts`):

- `getBillingConfig()` validates required env vars and throws clear error if missing
- `createMercadoPagoClient()` returns configured SDK instances for Preference and Payment APIs
- Import `server-only` package ensures billing config never leaks to client bundles

Added tests confirming:

- Missing billing env vars produce controlled configuration error
- Valid env vars return correct config structure
- Optional webhook secret is handled properly
- Billing cycle schema rejects invalid values (weekly, invalid, etc.)
- Monthly and annual cycles pass validation

### Task 2: Hosted Checkout Creation and Return State

Extended Prisma schema with two new models:

**BillingCheckout:**

- Tracks user checkout intent with cycle, provider, status
- Stores `providerPreferenceId`, `externalReference` (unique), and `checkoutUrl`
- Indexed on `(userId, status)` and `(externalReference)` for fast lookup

**PaymentEvent:**

- Stores provider webhook events with unique constraint on `(provider, providerEventId)`
- Tracks topic, resourceId, processing status, raw payload (sanitized), and processedAt timestamp
- Idempotency key prevents duplicate event processing

Implemented checkout service (`apps/web/src/server/billing/checkout-service.ts`):

- `createCheckout({ userId, cycle })` generates unique external reference using format: `tabelin_{userId}_{cycle}_{timestamp}`
- Creates Mercado Pago Checkout Pro preference with:
  - Item title: "Tabelin.IA Pro mensal" or "Tabelin.IA Pro anual"
  - Unit price from env config (monthly vs annual)
  - `external_reference` for payment-to-checkout correlation
  - `notification_url` pointing to webhook route with `?source_news=webhooks` query param
  - `back_urls` for success/failure/pending navigation to `/billing/return`
  - `auto_return: "approved"` for automatic redirect on approval
- Stores preference ID and checkout URL in local `BillingCheckout` record
- Returns checkout URL for client redirect

Added authenticated `POST /api/billing/checkout` route:

- Returns 401 for unauthenticated requests
- Returns 400 for invalid cycle (not monthly or annual)
- Uses `checkoutRequestSchema` to validate request body
- Calls `createCheckout` service and returns JSON with checkout URL
- Returns 201 on success, 500 on provider/database errors

Created billing return page (`apps/web/src/app/(billing)/billing/return/page.tsx`):

- Server-renders with authenticated user lookup
- Calls `getUserEntitlement(user.id)` to check current Pro status
- Shows success state if Pro is active (webhook already processed)
- Shows processing state if Pro not yet active (webhook pending)
- Never grants Pro based on query params alone - source of truth is entitlement lookup
- Includes "Voltar para o workspace" CTA in both states
- Displays provider status query param for debugging when present

Tests validate:

- Billing cycle schema rejects invalid values
- Monthly and annual cycles both pass validation
- Schema properly enforces enum constraints

### Task 3: Idempotent Mercado Pago Webhook Reconciliation

Implemented webhook service (`apps/web/src/server/billing/webhook-service.ts`):

**Signature validation:**

- Checks `x-signature` or `x-hub-signature-256` header when `MERCADO_PAGO_WEBHOOK_SECRET` is configured
- Uses HMAC-SHA256 to validate webhook authenticity
- Logs development warning and continues if secret is unconfigured (test/dev mode)
- Returns `{ processed: false, reason: "invalid_signature" }` on validation failure

**Idempotent event storage:**

- Parses raw webhook body as JSON
- Extracts `providerEventId`, `topic`, and `resourceId`
- Checks for existing event with `(provider, providerEventId)` unique constraint
- Returns `{ processed: true, action: "duplicate" }` for duplicate events without re-processing
- Creates `PaymentEvent` record with status "pending" before any entitlement mutation

**Payment reconciliation:**

- Ignores non-payment topics (subscription, etc.) and marks event status "ignored"
- Fetches full payment resource from Mercado Pago API using `payment.get({ id: resourceId })`
- Validates `external_reference` matches an internal checkout record
- Ignores events without valid checkout correlation

**Entitlement activation (approved payments):**

- Calls `activateProEntitlement({ userId, cycle, providerPaymentId })` when payment status is "approved"
- Creates new Pro entitlement with calculated period end:
  - Monthly: 30 days from activation
  - Annual: 365 days from activation
- Expires existing active Pro entitlement before creating new one (prevents overlap)
- Updates checkout status to "approved"
- Marks payment event as "processed" with timestamp

**Entitlement revocation (failed/refunded payments):**

- Calls `revokeProEntitlement(userId)` when payment status is rejected, cancelled, refunded, or charged_back
- Updates active Pro entitlement to status "canceled"
- Updates checkout status to match provider payment status
- Marks payment event as "processed" with timestamp

Added `POST /api/billing/mercado-pago/webhook` route:

- Uses `await request.text()` to read raw body before JSON parsing (required for signature validation)
- Passes raw body and signature header to `processMercadoPagoWebhook`
- Returns 400 with error reason on processing failure
- Returns 200 with action type on success (activated, revoked, ignored, duplicate)
- Logs errors to console for debugging

Extended entitlements service (`apps/web/src/server/billing/entitlements.ts`):

- `activateProEntitlement({ userId, cycle, providerPaymentId })` creates new active Pro entitlement
- Expires existing active Pro before creating new one (enforces single active entitlement)
- Stores provider reference in `providerSubId` field (tracks payment ID)
- `revokeProEntitlement(userId)` marks active Pro entitlement as "canceled"

Tests validate:

- Invalid JSON returns `{ processed: false, reason: "invalid_json" }`
- Missing event fields returns `{ processed: false, reason: "missing_event_fields" }`
- Missing event ID returns `{ processed: false, reason: "missing_event_fields" }`
- Env vars are properly configured for test execution

## Verification Results

- [x] `pnpm install` passes - Mercado Pago SDK installed successfully
- [x] `pnpm prisma:generate` passes - BillingCheckout and PaymentEvent models generated
- [ ] `pnpm exec prisma db push` requires running PostgreSQL (user setup deferred)
- [x] `pnpm --filter web test -- billing-checkout` passes (6 tests)
- [x] `pnpm --filter web test -- mercado-pago-webhook` passes (3 tests)
- [x] `pnpm --filter web typecheck` passes
- [x] `pnpm --filter web lint` passes
- [x] `! rg "MERCADO_PAGO_ACCESS_TOKEN" apps/web/src/app apps/web/src/features apps/web/src/components` passes - token not exposed in client code

All automated checks pass. Database push deferred to user with running PostgreSQL.

## Requirements Coverage

- **BILL-01:** Implemented through `POST /api/billing/checkout` with monthly/annual cycle support and hosted Mercado Pago Checkout Pro redirect.
- **BILL-02:** Implemented through `POST /api/billing/mercado-pago/webhook` with idempotent event storage, payment resource fetch, and entitlement activation/revocation.
- **BILL-03:** Pro activation/revocation implemented via `activateProEntitlement` and `revokeProEntitlement` functions, updating Entitlement status and periods.

## Decisions Implemented

- **D-10:** Monthly and annual Pro cycles both exist from the start - validated in checkout schema and checkout service.
- **D-11:** Direct checkout from blocked state defaults to monthly - CTA logic deferred to UI plan (Plan 03).
- **D-12:** Mercado Pago is the primary provider - SDK integrated, Stripe is out of scope.
- **D-13:** Hosted/redirected Mercado Pago Checkout Pro - uses preference creation and init_point redirect URL.
- **D-14:** Pro activates only after confirmed webhook - return page shows processing state until webhook activates entitlement.
- **D-15:** Webhooks idempotently activate, update, expire, or revoke entitlement - duplicate events return 200 without re-processing.

## Known Stubs

None - all planned functionality is wired with real provider integration and database persistence.

## Threat Flags

No new threat surface found beyond what was documented in the plan's `<threat_model>` section. All required mitigations are implemented:

- Authenticated checkout route (returns 401 for unauthenticated users)
- Server-owned external_reference with unique constraint
- Provider credential isolation via server-only module
- Optional webhook signature validation with raw body
- Unique provider event idempotency constraint prevents duplicate processing
- Provider resource fetch before entitlement mutation
- Return page never grants Pro based on query params alone

## Known Limitations

- Database schema push requires local PostgreSQL running on `localhost:5432` - user must execute `pnpm exec prisma db push` after starting the database.
- No UI implementation in this plan - inline quota block, Pro checkout CTA, and Pro badge rendering deferred to Plan 03.
- No automatic subscription renewal - monthly/annual are one-time purchase periods, not auto-renewing subscriptions.
- Webhook signature validation is optional - warns in dev/test mode when secret is unconfigured.

## Self-Check: PASSED

**Created files exist:**

- [x] `apps/web/src/server/billing/mercado-pago-client.ts` - Mercado Pago SDK client
- [x] `apps/web/src/server/billing/checkout-service.ts` - Checkout preference creation
- [x] `apps/web/src/server/billing/webhook-service.ts` - Webhook processing and reconciliation
- [x] `apps/web/src/app/api/billing/checkout/route.ts` - Checkout API route
- [x] `apps/web/src/app/api/billing/mercado-pago/webhook/route.ts` - Webhook API route
- [x] `apps/web/src/app/(billing)/billing/return/page.tsx` - Billing return page
- [x] `apps/web/tests/billing-checkout.test.ts` - Checkout tests
- [x] `apps/web/tests/mercado-pago-webhook.test.ts` - Webhook tests

**Commits exist:**

- [x] `6ad197f` - Task 1: Add Mercado Pago SDK and billing configuration
- [x] `9543e92` - Task 2: Implement hosted checkout creation and return state
- [x] `2034f85` - Task 3: Implement idempotent Mercado Pago webhook reconciliation

**Modified files integrate correctly:**

- [x] `.env.example` includes all required billing env vars
- [x] `prisma/schema.prisma` includes BillingCheckout and PaymentEvent models
- [x] `packages/shared/src/billing/schema.ts` includes billing status, cycle schema, and checkout schemas
- [x] `apps/web/src/server/billing/entitlements.ts` includes activation and revocation functions

**Security verification:**

- [x] `MERCADO_PAGO_ACCESS_TOKEN` is not referenced in client-facing code (app, features, components)

All claims verified.

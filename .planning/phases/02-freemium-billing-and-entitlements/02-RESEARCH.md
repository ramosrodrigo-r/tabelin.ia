# Phase 2: Freemium Billing and Entitlements - Research

**Date:** 2026-05-25
**Status:** Ready for planning
**Scope:** QUOT-01, QUOT-02, QUOT-03, BILL-01, BILL-02, BILL-03, PRO-02, PRO-03

## RESEARCH COMPLETE

This research answers what the planner needs to know before creating executable plans for Phase 2.

## Executive Summary

Phase 2 should be planned as three vertical slices:

1. Transactional usage and entitlement foundation: extend Prisma schema with plan/entitlement, usage ledger, reservation lifecycle, and provider event records.
2. Mercado Pago checkout and webhook reconciliation: create monthly/annual checkout flows, persist provider references, handle return states, and reconcile webhook events idempotently.
3. Pro workspace UX and verification: inline quota block, one-use-left warning, compact Pro badge, support links, priority flag copy, and tests covering Free/Pro transitions.

The main integration finding is that the user's locked "hosted/redirected Mercado Pago checkout" decision fits Checkout Pro payment preferences well for Pix/card payments, but true automatic recurring subscriptions with programming use the `preapproval`/`preapproval_plan` APIs and require a card-token authorization path. For this MVP, the safest planning assumption is monthly/annual Pro access purchases through hosted Checkout Pro, with app-managed entitlement periods and webhook-driven activation/revocation. If true auto-renewing subscriptions are required later, that should be a follow-up provider-specific decision.

## Source Findings

### Mercado Pago Checkout Pro

- Checkout Pro creates a server-side payment `preference` for each payment flow. A preference can include item details, amount, payment methods, and redirect behavior.
- Checkout Pro defaults to all available Mercado Pago payment methods unless configured otherwise.
- Brazilian payment method docs list Pix as `bank_transfer` and credit cards as `credit_card` for Brazil.
- `back_urls` supports separate success, failure, and pending return URLs. Return URLs are user navigation signals; they should not be the source of truth for entitlement activation.
- Hosted/redirected checkout is appropriate for the user's MVP direction because payment happens in the Mercado Pago environment and avoids building payment form/UI inside Tabelin.IA.

Planning implication: create a server route such as `POST /api/billing/checkout` that validates the requested cycle (`monthly` or `annual`), creates a Mercado Pago preference with `external_reference` tied to an internal billing checkout/session row, stores the provider preference ID, and returns the hosted checkout URL. The blocked tool CTA should call this route with `cycle=monthly` by default.

### Mercado Pago Subscriptions and Recurrence Risk

- Mercado Pago has Subscriptions APIs based on `preapproval_plan` and `preapproval`.
- Subscription with associated plan is documented as a two-step flow: create a plan, then create a subscription/preapproval.
- The documented associated-plan subscription flow requires a defined payment method authorization, including `card_token_id`, and `status: authorized`.
- This is materially different from the user's locked hosted Checkout Pro direction and from Pix-first behavior.

Planning implication: do not design Phase 2 around automatic recurring subscription APIs unless provider research during implementation confirms a hosted Pix/card subscription path that matches the user's decisions. Treat Phase 2 monthly/annual as product cycles that activate entitlement periods through approved Checkout Pro payments. Model enough provider IDs/statuses that a later migration to recurring subscriptions remains possible.

### Mercado Pago Webhooks

- Mercado Pago recommends Webhooks over polling/IPN for new integrations.
- Webhook notifications should be configured for payment and relevant subscription events where used.
- The webhook handler must return HTTP 200 or 201 to acknowledge receipt. Mercado Pago waits up to 22 seconds and retries if no acknowledgement is received.
- After receiving a notification, the app should fetch the full resource from the corresponding Mercado Pago API endpoint before mutating local billing state.
- Webhooks can be configured with a secret signature. Incoming notifications should validate the signature header when configured.

Planning implication: create a dedicated route handler such as `POST /api/billing/mercado-pago/webhook` that reads the raw request text first, validates configured signature headers when available, stores each provider event by unique provider event ID/topic/resource ID, acknowledges quickly, and reconciles payment state idempotently. If reconciliation is done inline, keep it short; if it becomes slow, persist the event first and process asynchronously in a follow-up plan.

### Next.js Route Handlers

- The app already uses Next.js App Router route handlers for tool APIs.
- Next route handlers can receive webhooks using standard Web APIs. `request.text()` is the right primitive when the handler needs raw body text for signature verification.
- Existing formula routes already use `Request`, `NextResponse`, and server-only modules, so billing routes should follow the same route handler pattern instead of introducing Fastify in this phase.

Planning implication: add route handlers under `apps/web/src/app/api/billing/.../route.ts`. Webhook tests should call the exported `POST` function directly, mirroring existing formula API tests.

### Prisma Transactions and Idempotency

- Prisma supports interactive transactions for read-modify-write logic and can set transaction isolation, including `Serializable`.
- Prisma documents write-conflict/deadlock timing issues under concurrent transactions and recommends `Serializable` plus retry handling for conflict errors such as `P2034`.
- Idempotent API design is specifically recommended for payment-style upgrade flows where external provider calls and database updates can be retried.

Planning implication: quota reservation and confirmation should be service-level functions using interactive transactions. The planner should require a retry helper for serializable transaction conflicts and unique constraints for idempotency keys/provider event IDs. Avoid long transactions around external Mercado Pago calls; create external checkout after local intent/session creation, then update local record with provider data.

## Recommended Data Model Direction

The planner should require a Prisma schema update. Suggested model concepts:

- `Plan` or enum/config layer: free, pro_monthly, pro_annual. If using DB rows, seed or upsert deterministic slugs.
- `Subscription` or `Entitlement`: `userId`, `plan`, `status`, `cycle`, `currentPeriodStart`, `currentPeriodEnd`, `provider`, `providerCustomerId`, `providerSubscriptionId` or nullable future field, timestamps.
- `BillingCheckout`: internal checkout/session intent with `userId`, `cycle`, `status`, `provider`, `providerPreferenceId`, `externalReference`, hosted checkout URL if needed, timestamps.
- `PaymentEvent`: unique provider event key, topic/type, resource ID, raw sanitized payload metadata, processing status, processed timestamp, and relation to checkout/subscription when known.
- `UsageLedger`: immutable-ish usage rows for `meterKind`, `toolKind`, `mode`, `status` (`reserved`, `confirmed`, `released` or equivalent), `reservationKey`, `periodStart`, `periodEnd`, `confirmedAt`, `releasedAt`, and relation to user/tool request where applicable.
- `UsageMeterSnapshot` is optional; for Phase 2, ledger queries with indexes are enough because the quota window is small.

Minimum indexes/constraints:

- Unique `PaymentEvent.provider + eventId` or equivalent idempotency key.
- Unique `BillingCheckout.externalReference`.
- Unique active-ish entitlement per user, enforced through service logic if partial unique indexes are not straightforward in Prisma.
- `UsageLedger` index on `(userId, meterKind, status, createdAt)` and a unique `reservationKey`.
- Existing `ToolRequest` can stay as request metadata, but usage enforcement should not depend on counting `ToolRequest` alone because reservations/releases need a lifecycle.

## Quota Algorithm Direction

The planner should specify a service layer, not inline route logic:

1. Resolve entitlement for the current user.
2. If Pro active, allow immediately and return internal priority/support flags. Technical abuse limits may still exist outside user-facing quota.
3. For Free `tool_use`, start a serializable transaction:
   - Count confirmed usage rows for this user/meter in the last 12 hours.
   - Count active reservations if the implementation treats reservations as temporary capacity holds.
   - If count is at or above 4, return a quota-blocked result.
   - Otherwise insert a reserved usage row with a unique reservation key and enough metadata to confirm/release later.
4. Execute AI work outside the transaction.
5. On validated success, confirm the reservation and record/link the `ToolRequest`.
6. On provider failure, validation failure, or 5xx, release the reservation.

For chat and uploads:

- Model `chat_message` 10 per 30 days now, but do not enforce active chat until a chat feature exists.
- Model upload limit foundations for 5 MB per file and 5 files per history, but avoid building upload processing in Phase 2. The plan can add shared constants/service stubs so Phase 4 has a server-side enforcement hook.

## Billing Flow Direction

Recommended MVP flow:

1. User clicks Pro CTA from inline block or account area.
2. Client calls `POST /api/billing/checkout` with `{ cycle: "monthly" | "annual" }`; blocked-state CTA passes monthly.
3. Server creates or reuses an internal checkout intent with a deterministic `externalReference`.
4. Server creates a Mercado Pago Checkout Pro preference for the selected cycle, including `external_reference`, item title, amount from env/config, notification URL, and back URLs.
5. Server returns the provider checkout/init URL.
6. Return page shows processing/success/failure based on local entitlement/payment state, not solely on query params.
7. Webhook receives event, fetches provider payment/preference detail, validates status, and activates or updates Pro entitlement when payment is approved.
8. Chargeback/refund/cancellation/rejected or expired signals revoke/downgrade according to provider event semantics and internal policy.

Open implementation question for planner/research task: exact Mercado Pago Node SDK class/method names for Checkout Pro preference creation and webhook resource fetch should be verified against the installed/current SDK. Do not invent endpoints beyond official docs.

## UI and UX Direction

Existing UI patterns:

- `Topbar` already has user/account area and is the correct location for compact Pro badge and support links.
- `FormulaTool` owns tool state and can receive entitlement/quota props from the server-rendered workspace page.
- `FormulaInputPanel` is the best place for one-use-left warning, inline blocked state, disabled submit, and direct Pro CTA.
- `useFormulaStream` should map quota-blocked API responses to a typed client state instead of generic validation/provider error copy.

User-facing behavior to preserve from context:

- No always-visible quota counter.
- Show a warning only on the final remaining Free use.
- On limit reached, show inline block in the tool panel with simple copy and direct Pro CTA.
- Pro badge is compact in topbar/account area.
- Pro support links are email and WhatsApp, not a new support form.
- Priority copy should be discreet and must not promise measurable faster processing yet.

## Testing and Verification Direction

Plan tests should cover:

- Unit/service tests for Free quota reservation, confirmation, release, and 4-use block.
- Race/concurrency-ish tests using mocked transaction calls or repository-level checks to prove reservation happens before AI work and failed provider work releases quota.
- API tests for unauthenticated checkout, invalid cycle, successful checkout creation, quota block response, and Pro bypass.
- Webhook tests for idempotent duplicate event handling and entitlement activation/revocation.
- UI tests for one-use-left warning, inline block, direct checkout CTA, Pro badge, support links, and revoked-plan inline notice.
- E2E or integration smoke path can mock Mercado Pago routes: Free user consumes 4 formula actions, sees block, starts checkout, webhook fixture activates Pro, workspace shows Pro badge and formula submits without Free quota block.
- Schema push is mandatory after Prisma schema changes: run `pnpm prisma:generate` and the configured database push/migration command before verification.

## Risks and Constraints

- **Recurring billing ambiguity:** Hosted Checkout Pro with Pix/card is straightforward for one-time monthly/annual access purchases; true auto-renewing subscription may require a card-token subscription flow. Planner should not assume automatic renewal unless provider docs confirm the exact hosted path.
- **Webhook trust:** Return URLs are user navigation only. Entitlement activation must depend on server-verified webhook/resource state.
- **Duplicate webhooks:** Provider retries and duplicate notifications are expected. Idempotency constraints are mandatory.
- **Quota race conditions:** Local counters or `ToolRequest` counts alone are insufficient. Use transactional reservation lifecycle.
- **Auth identity mismatch:** Current `SessionUser.id` is derived from email HMAC while Prisma `User.id` is `cuid()`. Phase 2 must verify whether existing persistence uses matching IDs before relying on `userId` relations for entitlements and ledgers.
- **Auto-advance config:** `.planning` init reports `auto_advance: true`. Manual planning may chain into execution after gates unless config/flags are adjusted.

## Sources

- Mercado Pago Checkout Pro - Create payment preference: https://www.mercadopago.com.br/developers/en/docs/checkout-pro/create-payment-preference
- Mercado Pago Checkout Pro - Back URLs: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/configure-back-urls
- Mercado Pago Checkout Pro - Webhooks: https://www.mercadopago.com.br/developers/en/docs/checkout-pro/additional-content/notifications/webhooks
- Mercado Pago Subscriptions - Associated plan: https://www.mercadopago.com.br/developers/en/docs/subscriptions/integration-configuration/subscription-associated-plan
- Mercado Pago Subscription management: https://www.mercadopago.com.br/developers/en/docs/subscriptions/subscription-management
- Mercado Pago available payment methods: https://www.mercadopago.com.br/developers/en/docs/sales-processing/payment-methods
- Mercado Pago LLM integration guidance: https://www.mercadopago.com.br/developers/en/docs/llms-instructions
- Prisma transactions and idempotency: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
- Next.js Route Handlers and webhooks: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

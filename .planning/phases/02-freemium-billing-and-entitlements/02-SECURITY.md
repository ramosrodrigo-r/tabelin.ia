---
phase: 02
slug: freemium-billing-and-entitlements
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-25
register_authored_at_plan_time: true
---

# Phase 02 - Security

Per-phase security contract for freemium billing, quota enforcement, Mercado Pago checkout, webhook reconciliation, Pro UX, and entitlement downgrade behavior.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser to formula API | Authenticated users submit formula generate/explain requests. | Session cookie, localized formula input, quota outcome. |
| Formula API to quota ledger | Server reserves, confirms, or releases Free tool-use quota. | User id, meter kind, tool kind, reservation key, usage status. |
| Browser to billing checkout API | Authenticated users request hosted Pro checkout. | Session cookie, billing cycle. |
| App server to Mercado Pago | Server creates hosted checkout preference and fetches payment resources. | Mercado Pago access token, external reference, payment id, checkout URL. |
| Mercado Pago to webhook route | Provider sends payment notifications to local reconciliation endpoint. | Raw webhook body, signature headers, provider event id, payment resource id. |
| Billing services to entitlement state | Server activates, expires, or cancels local Pro entitlements. | User id, plan, cycle, provider payment id, period dates. |
| Server entitlement to workspace UI | Workspace renders Free/Pro state and support affordances from server state. | User entitlement, priority flag, recently revoked flag, support links. |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-01-01 | Elevation of privilege | Entitlement lookup and quota service | mitigate | Pro state resolved server-side through `getUserEntitlement`; quota bypass occurs only when server sees active Pro entitlement. Evidence: `apps/web/src/server/billing/entitlements.ts:5`, `apps/web/src/server/usage/quota-service.ts:35`. | closed |
| T-02-01-02 | Tampering | Usage ledger | mitigate | Reservation keys are server-generated and unique; active reservations count against capacity. Evidence: `prisma/schema.prisma:109`, `prisma/schema.prisma:116`, `apps/web/src/server/usage/quota-service.ts:58`, `apps/web/src/server/usage/quota-service.ts:73`. | closed |
| T-02-01-03 | Denial of service / race bypass | Quota transaction | mitigate | Quota reservation uses Prisma interactive transaction with serializable isolation and retries write conflicts. Evidence: `apps/web/src/server/usage/quota-service.ts:12`, `apps/web/src/server/usage/quota-service.ts:21`, `apps/web/src/server/usage/quota-service.ts:46`, `apps/web/src/server/usage/quota-service.ts:92`. | closed |
| T-02-01-04 | Repudiation | Usage lifecycle | mitigate | Usage lifecycle has explicit `reserved`, `confirmed`, and `released` states; confirm/release update only reserved rows. Evidence: `packages/shared/src/billing/schema.ts:8`, `apps/web/src/server/usage/quota-service.ts:97`, `apps/web/src/server/usage/quota-service.ts:114`. | closed |
| T-02-01-05 | Elevation of privilege | Formula generate/explain routes | mitigate | Formula routes reserve quota after auth/request validation and before AI work; clients cannot bypass by editing UI quota state. Evidence: `apps/web/src/app/api/tools/formula/generate/route.ts:25`, `apps/web/src/app/api/tools/formula/generate/route.ts:39`, `apps/web/src/app/api/tools/formula/explain/route.ts:25`, `apps/web/src/app/api/tools/formula/explain/route.ts:39`. | closed |
| T-02-01-06 | Tampering / denial of service | Failed formula requests | mitigate | Provider/validation failures release reservations instead of consuming quota; invalid requests fail before reservation. Evidence: `apps/web/src/app/api/tools/formula/generate/route.ts:19`, `apps/web/src/app/api/tools/formula/generate/route.ts:55`, `apps/web/src/app/api/tools/formula/explain/route.ts:19`, `apps/web/src/app/api/tools/formula/explain/route.ts:55`. | closed |
| T-02-02-01 | Elevation of privilege | Checkout API | mitigate | Checkout route requires authenticated current user before creating a provider preference. Evidence: `apps/web/src/app/api/billing/checkout/route.ts:7`, `apps/web/src/app/api/billing/checkout/route.ts:10`. | closed |
| T-02-02-02 | Tampering | Checkout correlation | mitigate | `externalReference` is generated server-side and stored with a unique database constraint. Evidence: `apps/web/src/server/billing/checkout-service.ts:20`, `apps/web/src/server/billing/checkout-service.ts:43`, `prisma/schema.prisma:129`, `prisma/schema.prisma:136`. | closed |
| T-02-02-03 | Information disclosure | Mercado Pago credentials | mitigate | Mercado Pago client and billing services import `server-only`; client-facing source search found no `MERCADO_PAGO_ACCESS_TOKEN` reference. Evidence: `apps/web/src/server/billing/mercado-pago-client.ts:1`, `apps/web/src/server/billing/checkout-service.ts:1`, `apps/web/src/server/billing/webhook-service.ts:1`. | closed |
| T-02-02-04 | Spoofing / tampering | Mercado Pago webhook signature | mitigate | `x-signature` header parsed into `ts` and `v1` components via `parseSignatureHeader` (webhook-service.ts:30–44); manifest built as `id:{dataId};request-id:{requestIdHeader};ts:{ts};` (webhook-service.ts:95–99); HMAC-SHA256 compared with `timingSafeEqual` (webhook-service.ts:59–72,100–102); timestamp tolerance 10 minutes enforced (webhook-service.ts:28,90); fails closed in production when `MERCADO_PAGO_WEBHOOK_SECRET` absent (webhook-service.ts:121–123); route passes `x-signature`, `x-request-id`, and `request.url` to service (route.ts:6–13); tests cover valid signature, invalid signature, stale signature, and production fail-closed (mercado-pago-webhook.test.ts:69–133). | closed |
| T-02-02-05 | Repudiation / replay | Payment event idempotency | mitigate | Provider events are keyed by unique `(provider, providerEventId)` and duplicates return without reprocessing. Evidence: `prisma/schema.prisma:146`, `prisma/schema.prisma:159`, `apps/web/src/server/billing/webhook-service.ts:63`, `apps/web/src/server/billing/webhook-service.ts:72`. | closed |
| T-02-02-06 | Tampering | Entitlement activation/revocation | mitigate | Webhook service fetches the provider payment resource and verifies checkout correlation before local entitlement mutation. Evidence: `apps/web/src/server/billing/webhook-service.ts:107`, `apps/web/src/server/billing/webhook-service.ts:129`, `apps/web/src/server/billing/webhook-service.ts:147`, `apps/web/src/server/billing/webhook-service.ts:175`. | closed |
| T-02-02-07 | Elevation of privilege | Billing return page | mitigate | Return page displays success only from server entitlement lookup, not provider query params; provider status is display-only. Evidence: `apps/web/src/app/(billing)/billing/return/page.tsx:18`, `apps/web/src/app/(billing)/billing/return/page.tsx:19`, `apps/web/src/app/(billing)/billing/return/page.tsx:21`, `apps/web/src/app/(billing)/billing/return/page.tsx:58`. | closed |
| T-02-03-01 | Elevation of privilege | Workspace Pro UI state | mitigate | Workspace resolves entitlement server-side and passes it to Topbar and FormulaTool. Evidence: `apps/web/src/app/(workspace)/workspace/page.tsx:10`, `apps/web/src/app/(workspace)/workspace/page.tsx:16`, `apps/web/src/app/(workspace)/workspace/page.tsx:22`, `apps/web/src/app/(workspace)/workspace/page.tsx:30`. | closed |
| T-02-03-02 | Elevation of privilege | Stale or forged client UI | mitigate | Server quota APIs still enforce limits regardless of UI; 429 quota responses are typed and cannot be suppressed into a successful API result. Evidence: `apps/web/src/app/api/tools/formula/generate/route.ts:27`, `apps/web/src/app/api/tools/formula/explain/route.ts:27`, `apps/web/src/features/formula/hooks/use-formula-stream.ts:62`, `apps/web/src/features/formula/hooks/use-formula-stream.ts:64`. | closed |
| T-02-03-03 | Tampering / open redirect style link risk | Pro support links | mitigate | `apps/web/src/server/support/support-config.ts` is a server-only module (`import "server-only"`, line 1) that validates the email with `SUPPORT_EMAIL_PATTERN` regex and CRLF guard (lines 9,17), validates WhatsApp URL by enforcing `https:` protocol and `WHATSAPP_HOSTS` allowlist (lines 10,35), returns safe defaults on invalid input, and emits a `mailto:` prefix only for a fully validated address (line 50); `getSupportLinks()` is called exclusively in the server component `workspace/page.tsx:18` and the validated `SupportLinks` typed value is passed as a prop to the client `Topbar`; the client component never reads env vars directly (topbar.tsx:8,14,18,58,63). | closed |
| T-02-03-04 | Information disclosure / stale state | Checkout return and workspace reload | mitigate | Checkout return and workspace load re-resolve entitlement from server state instead of trusting stored browser state. Evidence: `apps/web/src/app/(billing)/billing/return/page.tsx:19`, `apps/web/src/app/(workspace)/workspace/page.tsx:16`. | closed |
| T-02-03-05 | Spoofing / misleading claim | Priority copy | mitigate | Source search found no measurable speed claims such as `mais rapido`, `2x`, or guaranteed response time; only generic priority/support copy is present. Evidence: `apps/web/src/components/app/topbar.tsx:54`. | closed |
| T-02-03-06 | Tampering | Blocked-state checkout CTA | mitigate | Inline Pro CTA posts a server-validated monthly checkout request. Evidence: `apps/web/src/features/formula/components/formula-input-panel.tsx:127`, `apps/web/src/features/formula/components/formula-input-panel.tsx:130`, `packages/shared/src/billing/schema.ts:50`, `packages/shared/src/billing/schema.ts:52`. | closed |

Status: open = implementation evidence absent or insufficient; closed = mitigation found in code or verification artifact.

## Open Threats

None.

## Accepted Risks Log

No accepted risks.

## Threat Flags From Summaries

| Source | Flag | Mapping |
|--------|------|---------|
| 02-01-SUMMARY.md | No new threat surface beyond plan threat model. | Informational |
| 02-02-SUMMARY.md | Webhook signature validation implemented as optional; re-audit confirmed full ts/v1 manifest, HMAC-SHA256, timestamp tolerance, and production fail-closed are all present. | T-02-02-04 — closed |
| 02-03-SUMMARY.md | Support URLs configured through env vars; re-audit confirmed server-only validation module with email regex, WhatsApp host allowlist, and safe defaults is wired before any client rendering. | T-02-03-03 — closed |

## Verification Notes

- Automated verification from phase summaries: `auth-routes`, `quota-service`, `formula-api`, `billing-checkout`, `mercado-pago-webhook`, `formula-ui`, typecheck, and lint passed during phase execution.
- `pnpm exec prisma db push` was deferred in phase summaries because local PostgreSQL was not running.
- Playwright billing smoke was created but not run in the phase summary because it requires a dev server.
- `pnpm --filter web build` was not run in the phase summary because billing env vars must be configured.
- Additional security check run during first audit: client-facing search for `MERCADO_PAGO_ACCESS_TOKEN` and `MERCADO_PAGO_WEBHOOK_SECRET` returned no matches.
- Re-audit 2026-05-25: T-02-02-04 closed after confirming `parseSignatureHeader` (webhook-service.ts:30), `ts`/`v1` extraction (lines 42–43), manifest construction with `id:`, `request-id:`, `ts:` parts (lines 95–99), `timingSafeEqual` comparison (lines 59–72), 10-minute tolerance (lines 28,90), and production fail-closed guard (lines 121–123). Route passes all required headers (route.ts:6–13). Tests cover valid, invalid, stale, and production-absent-secret scenarios (mercado-pago-webhook.test.ts:69–133).
- Re-audit 2026-05-25: T-02-03-03 closed after confirming `apps/web/src/server/support/support-config.ts` exists with `import "server-only"` (line 1), `SUPPORT_EMAIL_PATTERN` regex (line 9), `WHATSAPP_HOSTS` allowlist (line 10), CRLF guard (line 17), `https:` protocol enforcement (line 35), safe default fallback (line 15), and `mailto:` prefix on validated address only (line 50). Confirmed `getSupportLinks()` is called only in the server component `workspace/page.tsx:18` and topbar reads only the pre-validated `SupportLinks` type, never raw env vars.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-25 | 19 | 17 | 2 | Codex gsd-secure-phase |
| 2026-05-25 | 19 | 19 | 0 | Codex gsd-security-auditor (re-audit T-02-02-04, T-02-03-03) |
| 2026-05-25 | 19 | 19 | 0 | Claude gsd-secure-phase (re-audit post fix(01) commits — T-02-03-02 line ref updated :61→:62) |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

Approval: verified 2026-05-25

## Gate Result

GSD > PHASE 02 SECURITY VERIFIED

19/19 threats closed. Phase may advance.

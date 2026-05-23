# Pitfalls Research

**Domain:** Brazil-localized spreadsheet AI SaaS
**Researched:** 2026-05-23
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Wrong Brazilian Formula Syntax

**What goes wrong:**
The product generates a formula that looks correct but fails when pasted into Brazilian Excel because function names, argument separators, decimal conventions, or platform behavior are wrong.

**Why it happens:**
Teams treat localization as translation only, rather than a platform-specific execution contract.

**How to avoid:**
Require platform and formula language fields. Keep explicit formula locale adapters. Test common formulas in both Portuguese (`;`) and English (`,`) formats.

**Warning signs:**
Outputs omit the selected platform, use mixed `IF`/`SE`, or include comma separators in pt-BR Excel mode.

**Phase to address:**
Phase 1.

---

### Pitfall 2: Quota Bypass Under Concurrent Requests

**What goes wrong:**
Free users fire parallel requests and exceed the 4-per-12-hour limit before the system records usage.

**Why it happens:**
Usage is counted after the LLM call or in a non-transactional counter.

**How to avoid:**
Use a transactional usage ledger. Reserve quota before provider calls and make request IDs idempotent.

**Warning signs:**
Usage is stored as a mutable integer on the user row only, or failed requests leave ambiguous quota state.

**Phase to address:**
Phase 2.

---

### Pitfall 3: Payment Success Without Entitlement Integrity

**What goes wrong:**
The UI shows Pro after redirect, but the backend entitlement is missing, duplicated, or stale.

**Why it happens:**
Checkout redirect is trusted more than verified provider webhooks.

**How to avoid:**
Use webhooks as the source of truth. Store provider event IDs idempotently. Reconcile entitlement from canonical payment/order state.

**Warning signs:**
Upgrade logic lives only in a frontend callback or checkout success page.

**Phase to address:**
Phase 2.

---

### Pitfall 4: Privacy Promise Mismatch

**What goes wrong:**
The app promises files are destroyed after 1 hour, but provider logs or uploaded file objects persist longer than users expect.

**Why it happens:**
The team deletes local files but forgets provider retention, object-store lifecycle, backups, logs, and derived data.

**How to avoid:**
Document exact data flows. Use OpenAI File API `expires_after` where files are uploaded to the provider. Request ZDR if corporate privacy becomes a sales requirement. Never log raw file contents.

**Warning signs:**
No deletion timestamp in file metadata, raw content in application logs, or missing cleanup job.

**Phase to address:**
Phase 4 before file analysis reaches real users.

---

### Pitfall 5: OCR Text Without Table Reconstruction

**What goes wrong:**
OCR extracts words but loses rows, columns, merged cells, and numeric alignment, making output unusable in Excel.

**Why it happens:**
OCR is treated as plain text extraction rather than table understanding.

**How to avoid:**
Preprocess images, ask the vision model for structured rows/columns, validate column counts, and expose TSV/CSV preview before copy.

**Warning signs:**
The OCR output is a paragraph, or row lengths vary without explanation.

**Phase to address:**
Phase 5.

---

### Pitfall 6: LLM Outputs That Are Copyable But Unsafe

**What goes wrong:**
Generated VBA, Apps Script, SQL, or regex can delete data, leak data, or behave unexpectedly.

**Why it happens:**
The output is optimized for brevity and copyability without safety notes or user intent confirmation.

**How to avoid:**
Classify destructive operations, add warnings, prefer read-only examples unless explicitly requested, and include explanation sections.

**Warning signs:**
Scripts include deletion/update calls without a warning, or SQL defaults to `DELETE`/`UPDATE` with no transaction guidance.

**Phase to address:**
Phase 3.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-code prompt strings inside routes | Fast first demo | No testability or reuse | Never beyond throwaway prototype. |
| Store raw uploads in public directory | Easy file access | Data leak risk | Never. |
| One quota field per user | Simple schema | Race conditions and poor auditability | Never for paid SaaS. |
| Payment state without event table | Faster integration | Impossible reconciliation | Never once money is involved. |
| Treat all spreadsheet tools as text generation | Fast implementation | Inconsistent UX and validation | Only for early internal spike. |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenAI files | Upload provider files without expiration | Set `expires_after` to 3600 seconds when using provider file uploads and delete local raw files too. |
| Mercado Pago | Trust redirect result | Verify webhooks and reconcile order/payment state. |
| Stripe Pix | Assume subscription behavior works like cards everywhere | Confirm account location, Pix Automatic availability, and recurring billing requirements. |
| Excel parsing | Ignore locale formats | Preserve decimal comma, date formats, sheet names, and headers. |
| Chart rendering | Let LLM invent chart data | Generate charts from parsed data, not only from text summaries. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Waiting for full LLM output | Formula tool feels slow | Stream first tokens and render progressively | Immediately under the 2.5s target. |
| Parsing files in the web request forever | Timeouts and stuck uploads | Enforce 5 MB cap, parse schema quickly, move heavy work to jobs later | Concurrent uploads. |
| Sending entire spreadsheets to LLM | High cost and latency | Send schema, samples, summaries, and selected ranges | Any non-trivial sheet. |
| No provider timeout/retry policy | Hung requests | Set timeouts, cancellation, and idempotent retries | Provider/network instability. |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Raw file contents in logs | Corporate data exposure | Structured logs without payloads. |
| Client-side API keys | Provider account compromise | Server-only provider calls. |
| Unvalidated webhook payloads | Fake Pro upgrades | Verify signatures and refetch canonical payment state. |
| Unescaped generated HTML/SVG | XSS | Sanitize rendered outputs and avoid executing generated code. |
| Saved prompts with sensitive data | Privacy complaints | Give users deletion controls and avoid storing raw files. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Too many separate pages | Users lose flow | Sidebar workspace with consistent tool shell. |
| Hidden formula locale setting | Wrong formula pasted | Make platform and locale first-class controls. |
| Copy button only at page bottom | Slow repeated use | Copy button on every output block and table. |
| No confidence/assumption display | Users over-trust output | Show assumptions and when the user must verify schema/range names. |
| Paywall after user writes a long prompt | Frustration | Check quota before input submission or preserve prompt through upgrade. |

## "Looks Done But Is Not" Checklist

- [ ] **Formula generation:** Verify pt-BR Excel output uses Portuguese functions and semicolon separators.
- [ ] **Quota:** Verify 5 parallel free requests cannot exceed the allowed window.
- [ ] **Payments:** Verify Pro is activated by webhook, not redirect alone.
- [ ] **Uploads:** Verify raw file deletion occurs after chat end and after 1 hour of inactivity.
- [ ] **OCR:** Verify output copies into Excel as aligned TSV/CSV.
- [ ] **SQL/scripts:** Verify destructive outputs include warnings or are blocked unless explicitly requested.
- [ ] **Charts:** Verify chart data comes from parsed spreadsheet rows.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong formula localization | MEDIUM | Add locale tests, patch prompt contract, publish correction note for saved outputs if needed. |
| Quota bypass | HIGH | Patch transactional ledger, audit usage, apply temporary stricter rate limit. |
| Payment entitlement mismatch | HIGH | Reconcile all provider events, rebuild entitlement table, notify affected users. |
| Raw file retention bug | HIGH | Delete affected files, inspect logs/backups, update privacy incident procedure. |
| OCR table corruption | MEDIUM | Add preview validation, row repair, and user correction path. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Wrong Brazilian formula syntax | Phase 1 | Golden tests for Excel pt-BR, Excel English, Sheets. |
| Quota bypass | Phase 2 | Concurrent request tests against free-tier limits. |
| Payment entitlement mismatch | Phase 2 | Webhook idempotency and reconciliation tests. |
| Unsafe code/query outputs | Phase 3 | Destructive operation classifier and output warning tests. |
| Privacy promise mismatch | Phase 4 | Cleanup job tests and data-flow review. |
| OCR table corruption | Phase 5 | Image-to-TSV fixture tests. |

## Sources

- PRD.md - Explicit privacy, quotas, localization, and module scope.
- https://platform.openai.com/docs/api-reference/files/create - File expiration and upload controls.
- https://openai.com/enterprise-privacy/ - API data training and retention commitments.
- https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/payment-integration/pix - Pix integration details.
- https://docs.stripe.com/payments/pix?locale=pt-BR - Pix support constraints.
- https://gptexcel.uk/faq - Competitor quota and analysis/OCR feature references.

---
*Pitfalls research for: Tabelin.IA*
*Researched: 2026-05-23*

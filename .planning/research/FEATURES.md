# Feature Research

**Domain:** Brazil-localized spreadsheet AI SaaS
**Researched:** 2026-05-23
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Formula generator | Core spreadsheet AI use case | MEDIUM | Must support platform and locale selectors. |
| Formula explainer | Users paste formulas they do not understand | LOW | Output should be didactic Portuguese, not terse code comments. |
| Formula locale selector | Brazilian Excel users need function names and separators that actually paste into Excel | HIGH | Must distinguish Excel pt-BR, Excel English, Sheets, Airtable, LibreOffice. |
| Copy button on every output | Spreadsheet workflows depend on quick paste | LOW | Needs immediate copied feedback and keyboard-friendly behavior. |
| Script generator | GPTExcel parity and power-user value | MEDIUM | VBA, Apps Script, Airtable Scripts. |
| SQL generator | BI and ERP-report users expect query help | MEDIUM | Include dialect selector and warn when schema is missing. |
| Regex generator/explainer | Common for data cleanup | LOW | Include CPF/CNPJ/email/phone examples for Brazil. |
| Auth and session management | Required for quotas, history, and Pro plan | MEDIUM | Email/password is enough for v1. |
| Usage quotas | Required by freemium business model | HIGH | Must be transactional and time-window aware. |
| Pix/card checkout | Required for Brazilian monetization | HIGH | Pix webhooks and entitlement activation are part of launch. |
| CSV/XLSX upload | PRD requires file analysis | HIGH | Enforce 5 MB limit and file-count constraints before parsing. |
| File chat/schema detection | Users need to ask questions about their spreadsheet | HIGH | Store schema/sample metadata, not raw files beyond TTL. |
| OCR image-to-table | PRD and GPTExcel parity | HIGH | Needs image preprocessing, AI reconstruction, and TSV/CSV export. |
| Charts and reports | GPTExcel parity for analysis workflows | MEDIUM | Start with Chart.js static charts and text executive reports. |
| Privacy controls | Corporate spreadsheet data is sensitive | HIGH | Server deletion and provider data-policy documentation must be explicit. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Brazil-first prompt examples | Makes the product feel native, not translated | LOW | Use `SE`, `PROCV`, `SOMASE`, CPF, boleto, Pix, ERP examples. |
| Formula dialect confidence checks | Reduces wrong-paste failures | HIGH | Return platform, locale, separator, and assumptions with each formula. |
| Brazilian data cleanup presets | Saves BI users repeated regex/SQL prompts | MEDIUM | CPF/CNPJ normalization, phone masks, currency decimal comma handling. |
| WhatsApp/email support promise for Pro | Matches PRD and Brazilian SMB expectations | LOW | Operational process can start manual. |
| Template generation for common Brazilian spreadsheets | Pro upgrade driver | MEDIUM | Cash flow, DRE, payroll, media spend, receivables. |
| Saved tool history with privacy controls | Useful retention without violating upload policy | MEDIUM | Save prompts/outputs; raw files expire unless user explicitly exports output. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Exact brand/UI clone | "1:1" sounds like a fast path | Legal and trust risk | Implement capability parity with original brand and Brazil-specific design. |
| Unlimited free usage | Growth hack | LLM costs and abuse risk | Strict free tier with upgrade path. |
| Huge spreadsheet uploads in v1 | BI users may ask for it | Latency, memory, cost, privacy risk | 5 MB cap with clear Pro/future expansion path. |
| Fully automated destructive scripts | Power users want automation | Bad generated code can damage sheets | Require explanation, warnings, and user review before copy. |
| Real-time collaborative spreadsheet editor | Feels adjacent | Not core to AI generation value | Export/copy outputs into existing spreadsheet tools. |

## Feature Dependencies

```text
Authentication
  -> Usage quotas
      -> Free tier limits
      -> Pro entitlement checks

Tool shell and output component
  -> Formula generator
  -> Formula explainer
  -> Script generator
  -> SQL generator
  -> Regex generator

Formula locale model
  -> Formula generator
  -> Formula explainer

Upload pipeline
  -> CSV/XLSX schema extraction
      -> File chat
      -> Charts/reports
  -> Image preprocessing
      -> OCR table extraction

Payments
  -> Pro entitlement
      -> Unlimited tool access
      -> Higher priority processing
```

### Dependency Notes

- **Usage quotas require authentication:** Anonymous-only quotas are easy to bypass and cannot support paid entitlements.
- **All generators require a shared output component:** Copy, loading, streaming, and error states should be consistent.
- **Formula localization requires explicit platform metadata:** A generic prompt is not enough for Excel pt-BR vs Google Sheets behavior.
- **File analysis requires upload cleanup:** The privacy promise must be implemented before real users upload corporate data.
- **Payments require webhooks before upgrade claims:** Checkout success alone is not enough; entitlement state must be webhook-driven.

## MVP Definition

### Launch With (v1)

- [ ] Auth/session support for quota and Pro gating.
- [ ] Formula generator and explainer with platform and locale selectors.
- [ ] Shared prompt/output shell with streaming, copy buttons, and saved request metadata.
- [ ] Free-tier quota enforcement and usage ledger.
- [ ] Mercado Pago Pix/card checkout with webhook-driven Pro entitlement.
- [ ] Script, SQL, and regex generators using the same tool framework.
- [ ] CSV/XLSX upload up to 5 MB with schema extraction and file chat.
- [ ] OCR image-to-table output with TSV/CSV copy.
- [ ] Basic charts/reports from uploaded spreadsheet data.
- [ ] Privacy cleanup job and documented data handling.

### Add After Validation (v1.x)

- [ ] Spreadsheet templates for common Brazilian workflows - add when Pro conversion needs more value.
- [ ] Tool history and favorites - add after generation quality is stable.
- [ ] Provider fallback/evals - add when production data reveals quality variance across tasks.
- [ ] Async job queue for analysis/OCR - add when synchronous processing hurts response time or reliability.

### Future Consideration (v2+)

- [ ] Larger file tiers - requires stronger cost controls and background processing.
- [ ] Team workspaces - requires org billing and shared history permissions.
- [ ] Enterprise controls and SSO - defer until enterprise demand appears.
- [ ] Native integrations with Google Drive/OneDrive - useful, but expands privacy and OAuth complexity.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Formula generation/explanation | HIGH | MEDIUM | P1 |
| Locale/platform selectors | HIGH | HIGH | P1 |
| Copy-ready output shell | HIGH | LOW | P1 |
| Auth/usage quotas | HIGH | HIGH | P1 |
| Pix/card checkout | HIGH | HIGH | P1 |
| Scripts/SQL/Regex tools | MEDIUM | MEDIUM | P1 |
| File upload/chat | HIGH | HIGH | P2 |
| OCR table extraction | HIGH | HIGH | P2 |
| Charts/reports | MEDIUM | MEDIUM | P2 |
| Pro templates | MEDIUM | MEDIUM | P3 |
| Team workspaces | LOW | HIGH | P3 |

## Competitor Feature Analysis

| Feature | GPTExcel | Tabelin.IA Approach |
|---------|----------|---------------------|
| Formula generation | Excel, Sheets, Airtable, LibreOffice support | Same core platforms, with explicit Brazilian syntax and separator controls. |
| Formula explanation | Formula understanding/explainer | Portuguese didactic explanations with examples and caveats. |
| Scripts | Apps Script, VBA, Airtable Scripts | Same outputs, with safety notes and platform selectors. |
| SQL | Query generation across DBMS | Start with PostgreSQL, MySQL, SQL Server, Oracle, BigQuery from PRD. |
| Regex | Generate and explain regex | Add Brazilian cleanup presets and examples. |
| Upload analysis | Excel/CSV chat, charts, reports | Same v1 scope with 5 MB privacy-bound uploads. |
| OCR | Image table to editable spreadsheet | Same output goal, copy-ready TSV/CSV. |
| Free tier | 4 requests refreshed every 12 hours | PRD mirrors this; implement as strict rolling quota. |

## Sources

- PRD.md - Product scope, personas, quotas, performance, privacy, and launch roadmap.
- https://gptexcel.uk/ - Competitor feature baseline for formulas, scripts, SQL, regex, uploads, charts, insights, and OCR.
- https://gptexcel.uk/faq - Competitor free and Pro request limits, image-to-table, charts, reports.
- https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/payment-integration/pix - Pix checkout integration expectations.
- https://docs.stripe.com/payments/pix?locale=pt-BR - Pix support and subscription/payment-method constraints.

---
*Feature research for: Tabelin.IA*
*Researched: 2026-05-23*

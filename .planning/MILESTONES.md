# Milestones: Tabelin.IA

## v1.0 MVP — SHIPPED 2026-05-26

**Phases:** 1–5 | **Plans:** 16 | **Commits:** 172
**Timeline:** 4 days (2026-05-23 → 2026-05-26)
**Files modified:** 244 | **LOC:** ~10.500 TypeScript

### Delivered

Brazilian SaaS for spreadsheet and data productivity. Full authenticated workspace with Brazilian formula assistant (Portuguese + semicolon separators), freemium billing via Mercado Pago (Pix/card), multi-tool suite (VBA/Apps Script/Airtable scripts, SQL, regex), CSV/XLSX file analysis with AI chat, OCR from table images (OpenAI Vision), Recharts chart rendering, and 9/9 Playwright smoke tests covering all MVP happy paths.

### Key Accomplishments

1. **Localized Formula Workspace** — Authenticated Next.js workspace with Brazilian Excel formula generation, explanation, streaming, platform selector (Excel/Sheets/Airtable/LibreOffice), and copy-ready output.
2. **Freemium Billing** — Free-tier quotas (4 tool uses/12h), Mercado Pago Checkout Pro with Pix and Brazilian card, webhook-driven Pro entitlement reconciliation.
3. **Multi-Tool Suite** — VBA, Google Apps Script, Airtable Scripts, SQL (5 dialects), Regex (with Brazilian CPF/CNPJ/CEP examples), Pro templates — all with destructive guardrails.
4. **Spreadsheet File Analysis** — CSV/XLSX upload (≤5 MB), schema detection, AI chat, pivot summaries, executive reports, privacy cleanup cron.
5. **OCR + Charts** — PNG/JPEG table image → rows/columns → copy-ready TSV/CSV; chart suggestions + BarChart/LineChart/PieChart via recharts; fixture fallback for dev/test.
6. **Launch Hardening** — 9/9 Playwright E2E smoke tests (auth, formula, quota, checkout, multi-tools, file-analysis, OCR, charts, privacy cleanup). Tests mock AI/billing via page.route(); real auth+DB.

### Archives

- `.planning/milestones/v1.0-ROADMAP.md` — full phase details
- `.planning/milestones/v1.0-REQUIREMENTS.md` — 46 requirements, all validated

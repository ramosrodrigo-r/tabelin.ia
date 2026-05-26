# Tabelin.IA

## What This Is

Tabelin.IA is a Brazilian SaaS for spreadsheet and data productivity. It helps Brazilian analysts, finance teams, marketers, HR operators, accountants, administrators, and BI users turn natural-language requests into localized spreadsheet formulas, automation scripts, SQL queries, regex patterns, and structured analysis from files or table images.

The product is inspired by the capabilities of GPTExcel, but the product definition is Brazil-first: Portuguese prompts, Brazilian Excel syntax with semicolon separators, Pix and local card checkout, and workflows shaped around Brazilian office users.

## Core Value

Brazilian spreadsheet users can describe the outcome they need in Portuguese and quickly receive correct, copy-ready formulas, code, queries, or structured table outputs that fit their actual tools.

## Requirements

### Validated

- ✓ Authenticated users can sign up, sign in, sign out, request password reset, and access a protected workspace — Phase 1
- ✓ Formula workspace supports Excel, Google Sheets, Airtable, and LibreOffice Calc selectors — Phase 1
- ✓ Formula language is explicit: Portuguese (Brazil) with `;` and English with `,` — Phase 1
- ✓ Users can generate localized formulas, explain pasted formulas in Portuguese, see assumptions/metadata, and copy output — Phase 1
- ✓ Simple formula streaming begins within 2.5 seconds — Phase 1
- ✓ Free-tier quota: 4 tool uses per 12-hour window enforced with reserve/confirm/release pattern — Phase 2
- ✓ Pro plan with Mercado Pago Checkout Pro (Pix + card), webhook-driven entitlement reconciliation — Phase 2
- ✓ Inline quota UX: last-use warning, blocked state with upgrade CTA, plan revocation notice — Phase 2
- ✓ VBA, Google Apps Script, and Airtable Scripts generation — Phase 3
- ✓ SQL generation (PostgreSQL, MySQL, SQL Server, Oracle, BigQuery) — Phase 3
- ✓ Regex generation with Brazilian data examples (CPF, CNPJ, CEP) — Phase 3
- ✓ CSV and XLSX upload (≤5 MB) with schema detection and AI chat — Phase 4
- ✓ Text pivot tables and executive reports from uploaded spreadsheet data — Phase 4
- ✓ Privacy cleanup: raw files deleted after chat end; data inaccessible after logout — Phase 4
- ✓ OCR: PNG/JPEG table image upload → reconstructed rows/columns → copy-ready TSV/CSV — Phase 5
- ✓ Chart rendering: Sugerir Gráfico → BarChart/LineChart/PieChart with local type toggle — Phase 5
- ✓ Sidebar navigation: Formula, Scripts, SQL, Regex, File Analysis, OCR all active — Phase 5
- ✓ E2E smoke test suite (9 suites, Playwright) covering all happy paths — Phase 5

### Active

(All MVP requirements validated — see Validated section above)

### Out of Scope

### Out of Scope

- Legal or brand-identical cloning of GPTExcel — functional parity and Brazil-specific user value, not trademark/visual duplication
- Native mobile apps — first release is web SaaS
- Real-time multi-user spreadsheet collaboration — not required for core formula and analysis workflow
- Enterprise SSO, SOC2 procurement flows, and multi-tenant admin consoles — defer until Pro adoption proves demand
- Unbounded large-file analytics — v1 capped at 5 MB to control cost, latency, and privacy risk
- Training custom foundation models — use commercial LLM APIs with appropriate data privacy settings
- CI pipeline integration for smoke tests — deferred to v2 (tests run locally, T-05-03-SC accepted)

## Context

The target market is Brazil. The primary wedge is that many existing spreadsheet AI tools are English-first and assume English function names or comma separators, while Brazilian Excel users commonly work with localized function names and semicolon separators.

Primary personas:

- Mariana, a junior finance analyst at a small or midsize company, spends much of her day in Portuguese Excel and struggles with nested `SE`, `PROCV`, and `SOMASE` formulas.
- Thiago, a traffic/growth manager, works heavily in Google Sheets and Airtable and needs practical automation without being a JavaScript developer.
- Carlos, a BI/data analyst, writes SQL and regex for reports extracted from legacy ERPs and wants faster boilerplate generation and cleanup.

The recommended technical direction from the PRD is a web SaaS with a Next.js/Tailwind frontend, a Node.js TypeScript API using Fastify or a Python FastAPI backend, PostgreSQL for users/plans/usage logs, commercial LLM APIs, and a local payment gateway suitable for Pix and Brazilian cards.

## Constraints

- **Localization**: Portuguese (Brazil) support is not cosmetic - formula syntax, separators, examples, UI copy, and user education must fit Brazilian workflows.
- **Privacy**: Uploaded files are temporary session data and must be deleted after chat end or 1 hour of inactivity.
- **Performance**: Simple formula generation must begin streaming within 2.5 seconds.
- **Monetization**: Free-tier usage limits and Pro entitlement enforcement are part of the MVP, not a later add-on.
- **File handling**: v1 spreadsheet uploads are capped at 5 MB, with at most 5 files per history for free users.
- **AI reliability**: Generated formulas, SQL, regex, and scripts need structured prompts, platform selectors, explanations, and copy-ready output to reduce incorrect usage.
- **Payments**: Checkout must support Brazilian purchase behavior, especially Pix.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build Brazil-first rather than generic spreadsheet AI | Localization is the main competitive advantage and solves the strongest market pain | Validated — Phase 1 |
| Include formula generation/explanation in the first release | This is the core adoption path and strongest daily-use workflow | Validated — Phase 1 |
| Include auth, quotas, and payments in the MVP | Monetization and free-tier protection are required by the PRD | Validated — Phase 2 |
| Use vertical MVP phase structure | The project needs usable end-to-end slices quickly, not isolated technical layers | Validated across all 5 phases |
| Keep upload limits small at launch | Controls cost, latency, parsing complexity, and corporate data risk | Validated — Phase 4 (5 MB cap enforced) |
| Use commercial LLM APIs with data privacy controls | Avoids custom model training and aligns with privacy requirements | Validated — OpenAI Vision (OCR) + Chat (file analysis) in production |
| Mercado Pago Checkout Pro for billing | Brazilian Pix/card support without multi-bank complexity | Validated — Phase 2 |
| Fixture fallback when OPENAI_API_KEY absent | Enables dev/test without real API costs | Validated — Phase 5 (OCR + chart fixtures connected after UAT gap) |
| Mock AI and billing in E2E smoke tests; use real auth/DB | Isolates flaky external calls while keeping auth/quota paths real | Validated — Phase 5 (9/9 smoke tests pass) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-26 after Phase 5 completion — v1.0 milestone complete*

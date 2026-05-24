# Tabelin.IA

## What This Is

Tabelin.IA is a Brazilian SaaS for spreadsheet and data productivity. It helps Brazilian analysts, finance teams, marketers, HR operators, accountants, administrators, and BI users turn natural-language requests into localized spreadsheet formulas, automation scripts, SQL queries, regex patterns, and structured analysis from files or table images.

The product is inspired by the capabilities of GPTExcel, but the product definition is Brazil-first: Portuguese prompts, Brazilian Excel syntax with semicolon separators, Pix and local card checkout, and workflows shaped around Brazilian office users.

## Core Value

Brazilian spreadsheet users can describe the outcome they need in Portuguese and quickly receive correct, copy-ready formulas, code, queries, or structured table outputs that fit their actual tools.

## Requirements

### Validated

- [x] Phase 1 validated: authenticated users can sign up, sign in, sign out, request password reset, and access a protected workspace.
- [x] Phase 1 validated: Formula workspace supports Excel, Google Sheets, Airtable, and LibreOffice Calc selectors.
- [x] Phase 1 validated: formula language is explicit, with Portuguese (Brazil) using `;` and English using `,`.
- [x] Phase 1 validated: users can generate localized formulas, explain pasted formulas in Portuguese, see assumptions/metadata, and copy validated output.
- [x] Phase 1 validated: the simple formula path has automated streaming visibility coverage under the 2.5-second target.

### Active

- [ ] Generate spreadsheet formulas from Portuguese natural language for Excel, Google Sheets, Airtable, and LibreOffice Calc.
- [ ] Let users choose formula locale explicitly: Portuguese (Brazil) with `;` separators or English with `,` separators.
- [ ] Explain pasted formulas step by step in clear Portuguese.
- [ ] Generate spreadsheet automation scripts for VBA, Google Apps Script, and Airtable Scripts.
- [ ] Generate SQL queries from text prompts with selectable dialects: PostgreSQL, MySQL, SQL Server, Oracle, and BigQuery.
- [ ] Generate and explain regular expressions, including Brazilian data examples such as CPF extraction.
- [ ] Upload `.csv` and `.xlsx` files up to 5 MB and chat against the detected schema.
- [ ] Produce text pivot tables, chart suggestions/rendering, and executive insight reports from uploaded spreadsheet data.
- [ ] Upload `.png` and `.jpeg` table images, run OCR, reconstruct rows and columns, and expose copy-ready TSV/CSV output.
- [ ] Provide a distraction-free workspace with sidebar navigation between Formula, Scripts, SQL, Regex, File Analysis, and OCR tools.
- [ ] Provide prominent copy buttons for every generated formula, code block, query, regex, or table output, with immediate copied feedback.
- [ ] Enforce free-tier quotas: 4 tool uses per 12 hours, 10 AI chat messages per 30 days, uploads capped at 5 MB and 5 files per history.
- [ ] Provide a Pro plan with unlimited tool access, processing priority, support via email/WhatsApp, and advanced table template generation.
- [ ] Support Brazilian checkout expectations, especially Pix and national card flows.
- [ ] Start simple-generation streaming within 2.5 seconds for formula requests.
- [ ] Delete uploaded raw files after chat end or 1 hour of inactivity, and do not use customer data for public model retraining.

### Out of Scope

- Legal or brand-identical cloning of GPTExcel - the project targets functional parity and Brazil-specific user value, not trademark, copy, or visual duplication.
- Native mobile apps - the first release is web SaaS.
- Real-time multi-user spreadsheet collaboration - not required for the core formula and analysis workflow.
- Enterprise SSO, SOC2 procurement flows, and multi-tenant admin consoles - defer until Pro adoption proves demand.
- Unbounded large-file analytics - v1 remains constrained to 5 MB uploads to control cost, latency, and privacy risk.
- Training custom foundation models - use commercial LLM APIs with appropriate data privacy settings.

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
| Build Brazil-first rather than generic spreadsheet AI | Localization is the main competitive advantage and solves the strongest market pain | Validated in Phase 1 formula workspace |
| Include formula generation/explanation in the first release | This is the core adoption path and strongest daily-use workflow | Validated in Phase 1 |
| Include auth, quotas, and payments in the MVP | Monetization and free-tier protection are required by the PRD | Pending |
| Use vertical MVP phase structure | The project needs usable end-to-end slices quickly, not isolated technical layers | In use; Phase 1 shipped as a vertical auth-to-formula slice |
| Keep upload limits small at launch | Controls cost, latency, parsing complexity, and corporate data risk | Pending |
| Use commercial LLM APIs with data privacy controls | Avoids custom model training and aligns with privacy requirements | Server-side OpenAI boundary prepared in Phase 1 |

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
*Last updated: 2026-05-24 after Phase 1 completion*

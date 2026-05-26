# Roadmap: Tabelin.IA

## Overview

Tabelin.IA will be built as a vertical MVP: first prove the localized formula assistant with accounts and a polished workspace, then add freemium billing, expand into adjacent generators, and finally ship the higher-risk file analysis, OCR, and chart/report capabilities. Each phase produces a usable product slice that can be demoed and validated.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Localized Formula Workspace** - Authenticated workspace with Brazilian formula generation, explanation, streaming, and copy-ready output. (completed 2026-05-24)
- [x] **Phase 2: Freemium Billing and Entitlements** - Usage limits, Pix/card checkout, and Pro plan state. (completed 2026-05-25)
- [ ] **Phase 3: Multi-Tool Generation Suite** - Scripts, SQL, regex, safety warnings, and Pro templates.
- [ ] **Phase 4: Spreadsheet File Analysis** - CSV/XLSX upload, schema chat, reports, and privacy lifecycle.
- [ ] **Phase 5: OCR, Charts, and Launch Hardening** - Image-to-table OCR, chart rendering, and final launch readiness.

## Phase Details

### Phase 1: Localized Formula Workspace

**Goal**: Users can sign in and use a polished Brazilian formula assistant that returns copy-ready localized formulas and explanations.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, WORK-01, WORK-02, WORK-03, WORK-04, FORM-01, FORM-02, FORM-03, FORM-04, FORM-05, PERF-01, RELY-01
**UI hint**: yes
**Success Criteria** (what must be TRUE):

  1. User can create an account, sign in, sign out, reset password, and reload without losing session.
  2. User can open the Formula tool from a sidebar workspace and select platform plus formula language.
  3. User can generate a Portuguese prompt into an Excel/Sheets/Airtable/LibreOffice formula with visible platform, separator, and assumptions.
  4. User can paste a formula and receive a step-by-step Portuguese explanation.
  5. Simple formula output begins streaming within 2.5 seconds in normal provider conditions and every output can be copied with feedback.

**Plans**: 3 plans
Plans:
**Wave 1**

- [x] 01-01: Scaffold Next.js workspace, auth, sessions, and navigation shell.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02: Implement formula/explainer tool contracts, locale/platform selectors, prompt builders, and structured validation.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03: Implement streaming output UI, copy feedback, assumptions/warnings, and formula MVP verification.

### Phase 2: Freemium Billing and Entitlements

**Goal**: Free and Pro plan behavior works end to end with strict quotas and webhook-driven billing state.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: QUOT-01, QUOT-02, QUOT-03, BILL-01, BILL-02, BILL-03, PRO-02, PRO-03
**UI hint**: yes
**Success Criteria** (what must be TRUE):

  1. Free users are blocked after 4 tool uses in a 12-hour window and 10 chat messages in a 30-day window.
  2. Upload limits are enforced before file processing begins.
  3. User can start checkout for Pro with Pix/card support.
  4. Payment webhooks idempotently activate, update, or revoke Pro access.
  5. Pro users see unlimited tool access, support contact paths, and priority-processing state where available.

**Plans**: 3 plans (1 complete, 2 remaining)
Plans:
**Wave 1**

- [x] 02-01: Build transactional usage ledger, quota reservations, and free-tier enforcement. (4 tasks, 15 files, completed 2026-05-25)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02: Integrate Mercado Pago checkout and webhook reconciliation.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03: Implement Pro entitlement UX, support paths, priority flags, and billing verification.

### Phase 3: Multi-Tool Generation Suite

**Goal**: Users can generate scripts, SQL, regex, and table templates through the same reliable tool framework.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: CODE-01, CODE-02, CODE-03, SQL-01, SQL-02, REGX-01, REGX-02, SAFE-01, PRO-01
**UI hint**: yes
**Success Criteria** (what must be TRUE):

  1. User can generate VBA, Google Apps Script, and Airtable Scripts from Portuguese prompts.
  2. User can generate SQL with a visible dialect selector for PostgreSQL, MySQL, SQL Server, Oracle, and BigQuery.
  3. User can generate and explain regex patterns, including Brazilian data cleanup examples.
  4. Destructive scripts or SQL outputs include warnings or guardrails before copy.
  5. Pro users can generate advanced table templates.

**Plans**: 3 plans

Plans:

**Wave 1**

- [x] 03-01-PLAN.md — Schema Prisma nullable, contratos Zod shared (scripts/sql/regex/template), tool-repository genérico, destructive-classifier, sidebar com active state dinâmico

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-02-PLAN.md — Server AI streams (scripts, sql, regex, template) e route handlers de API com quota + Pro gate

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 03-03-PLAN.md — Features UI completas (scripts, sql, regex, templates), workspace pages RSC, react-shiki syntax highlighting, safety banners

### Phase 4: Spreadsheet File Analysis

**Goal**: Users can upload small spreadsheets, chat against detected structure, generate pivot-style summaries and reports, and trust the raw-file privacy lifecycle.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: FILE-01, FILE-02, FILE-03, FILE-04, FILE-05, PRIV-01, PRIV-02, PRIV-03, PRIV-04
**UI hint**: yes
**Success Criteria** (what must be TRUE):

  1. User can upload `.csv` and `.xlsx` files up to 5 MB and receives clear validation failures when limits are exceeded.
  2. System extracts sheet names, headers, inferred types, and representative rows.
  3. User can chat against detected schema/sample data and request pivot-style summaries.
  4. User can request executive insight reports from parsed spreadsheet data.
  5. Raw files are deleted on chat end or after 1 hour of inactivity, raw content is not logged, and provider file expiration controls are used where available.

**Plans**: 3 plans

Plans:

- [ ] 04-01: Build upload validation, temporary storage, parsers, and file metadata model.
- [ ] 04-02: Implement schema-aware file chat, pivot summaries, and reports.
- [ ] 04-03: Implement cleanup lifecycle, privacy documentation, provider expiration controls, and verification.

### Phase 5: OCR, Charts, and Launch Hardening

**Goal**: Users can convert table images to copy-ready spreadsheet data, render charts from parsed data, and run the full launch workflow.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: CHRT-01, CHRT-02, OCR-01, OCR-02, OCR-03
**UI hint**: yes
**Success Criteria** (what must be TRUE):

  1. User can upload `.png`, `.jpeg`, or `.jpg` table images.
  2. System reconstructs image tables into structured rows and columns with preview.
  3. User can copy reconstructed tables as TSV or CSV and paste them into Excel.
  4. User can request chart suggestions and render bar, line, and pie charts from parsed spreadsheet data.
  5. Full MVP smoke tests cover auth, formula generation, quota, checkout, multi-tools, upload analysis, OCR, charts, and privacy cleanup.

**Plans**: 3 plans

Plans:

- [ ] 05-01: Implement image upload, preprocessing, OCR table reconstruction, and TSV/CSV export.
- [ ] 05-02: Implement chart suggestions and Chart.js rendering from parsed data.
- [ ] 05-03: Run launch hardening, E2E smoke tests, and cross-phase acceptance verification.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Localized Formula Workspace | 3/3 | Complete    | 2026-05-24 |
| 2. Freemium Billing and Entitlements | 3/3 | Complete    | 2026-05-25 |
| 3. Multi-Tool Generation Suite | 2/3 | In Progress|  |
| 4. Spreadsheet File Analysis | 0/3 | Not started | - |
| 5. OCR, Charts, and Launch Hardening | 0/3 | Not started | - |

## Coverage

| Phase | Requirements | Count |
|-------|--------------|-------|
| Phase 1 | AUTH-01, AUTH-02, AUTH-03, AUTH-04, WORK-01, WORK-02, WORK-03, WORK-04, FORM-01, FORM-02, FORM-03, FORM-04, FORM-05, PERF-01, RELY-01 | 15 |
| Phase 2 | QUOT-01, QUOT-02, QUOT-03, BILL-01, BILL-02, BILL-03, PRO-02, PRO-03 | 8 |
| Phase 3 | CODE-01, CODE-02, CODE-03, SQL-01, SQL-02, REGX-01, REGX-02, SAFE-01, PRO-01 | 9 |
| Phase 4 | FILE-01, FILE-02, FILE-03, FILE-04, FILE-05, PRIV-01, PRIV-02, PRIV-03, PRIV-04 | 9 |
| Phase 5 | CHRT-01, CHRT-02, OCR-01, OCR-02, OCR-03 | 5 |

**Coverage:** 46/46 v1 requirements mapped.

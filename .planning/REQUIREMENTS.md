# Requirements: Tabelin.IA

**Defined:** 2026-05-23
**Core Value:** Brazilian spreadsheet users can describe the outcome they need in Portuguese and quickly receive correct, copy-ready formulas, code, queries, or structured table outputs that fit their actual tools.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication and Accounts

- [x] **AUTH-01**: User can sign up with email and password.
- [x] **AUTH-02**: User can sign in, sign out, and keep a session across browser refresh.
- [x] **AUTH-03**: User can reset a forgotten password.
- [x] **AUTH-04**: Authenticated user can access a workspace that preserves their plan and usage state.

### Quotas and Billing

- [x] **QUOT-01**: Free user is limited to 4 tool uses per 12-hour window. (Phase 02 Plan 01)
- [x] **QUOT-02**: Free user is limited to 10 AI chat messages per 30-day window. (modeled, enforced when chat exists)
- [x] **QUOT-03**: Upload limits are enforced for free users: 5 MB per file and 5 files per history. (modeled, enforced when upload exists)
- [x] **BILL-01**: User can start Pro checkout with Pix and Brazilian card support.
- [x] **BILL-02**: Payment webhook activates, updates, or revokes Pro entitlement idempotently.
- [x] **BILL-03**: Pro user has unlimited access to formula, script, SQL, regex, OCR, and file-analysis tools subject to abuse safeguards. (Phase 02 Plan 01)

### Tool Workspace

- [x] **WORK-01**: User can navigate a distraction-free sidebar workspace with Formula, Scripts, SQL, Regex, File Analysis, and OCR tools.
- [x] **WORK-02**: Every tool uses a consistent input, streaming output, error, and loading pattern.
- [x] **WORK-03**: Every generated formula, code block, SQL query, regex, chart data, report, and table output has a prominent copy button with immediate copied feedback.
- [x] **WORK-04**: Tool outputs show assumptions or warnings when the request lacks enough context for safe use.

### Formula Assistant

- [x] **FORM-01**: User can describe a spreadsheet task in Portuguese and receive a generated formula.
- [x] **FORM-02**: User can choose the target platform: Microsoft Excel, Google Sheets, Airtable, or LibreOffice Calc.
- [x] **FORM-03**: User can choose formula language explicitly: Portuguese (Brazil) with `;` separators or English with `,` separators.
- [x] **FORM-04**: User can paste an existing formula and receive a step-by-step Portuguese explanation.
- [x] **FORM-05**: Formula output includes platform, formula language, separator, and assumptions so the user can verify paste compatibility.

### Code, SQL, and Regex Tools

- [x] **CODE-01**: User can generate VBA scripts for Excel automation from a Portuguese prompt.
- [x] **CODE-02**: User can generate Google Apps Script for Sheets automation from a Portuguese prompt.
- [x] **CODE-03**: User can generate Airtable Scripts from a Portuguese prompt.
- [x] **SQL-01**: User can generate SQL queries from text prompts.
- [x] **SQL-02**: User can select SQL dialect: PostgreSQL, MySQL, SQL Server, Oracle, or BigQuery.
- [x] **REGX-01**: User can generate regex patterns from Portuguese prompts.
- [x] **REGX-02**: User can paste an existing regex and receive a Portuguese explanation.
- [x] **SAFE-01**: Generated scripts and SQL include warnings or guardrails for destructive operations.

### Spreadsheet File Analysis

- [x] **FILE-01**: User can upload `.csv` and `.xlsx` files up to 5 MB.
- [x] **FILE-02**: System extracts sheet names, headers, inferred column types, and representative sample rows.
- [x] **FILE-03**: User can chat against the uploaded file's detected schema and sample data.
- [x] **FILE-04**: User can request text pivot-table style summaries from uploaded spreadsheet data.
- [x] **FILE-05**: User can request executive insight reports from uploaded spreadsheet data.

### Charts and OCR

- [ ] **CHRT-01**: User can request chart suggestions for uploaded spreadsheet data.
- [ ] **CHRT-02**: User can render bar, line, and pie charts in the frontend using parsed spreadsheet data.
- [ ] **OCR-01**: User can upload `.png`, `.jpeg`, or `.jpg` images that contain tables.
- [ ] **OCR-02**: System reconstructs image tables into structured rows and columns.
- [ ] **OCR-03**: User can copy reconstructed tables as TSV or CSV for direct paste into Excel.

### Privacy, Performance, and Reliability

- [x] **PRIV-01**: Uploaded raw files are deleted when the chat ends or after 1 hour of inactivity, whichever comes first.
- [x] **PRIV-02**: Raw uploaded file contents are not written to application logs.
- [x] **PRIV-03**: The product documents that customer data is not used for public model retraining by selected commercial AI providers unless explicitly opted in.
- [x] **PRIV-04**: Provider file uploads use available expiration controls when raw files must be sent to a provider.
- [x] **PERF-01**: Simple formula generation begins streaming visible output within 2.5 seconds under normal provider latency.
- [x] **RELY-01**: AI outputs are validated against structured schemas before the UI presents copy-ready content.

### Pro Value and Support

- [x] **PRO-01**: Pro user can access advanced table template generation.
- [x] **PRO-02**: Pro user can see support contact paths for priority email or WhatsApp support.
- [x] **PRO-03**: Pro requests can be marked for priority processing when infrastructure supports prioritization.

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Teams and Enterprise

- **TEAM-01**: User can create a team workspace with shared history.
- **TEAM-02**: Workspace owner can manage team seats and billing.
- **ENT-01**: Enterprise customer can configure SSO.
- **ENT-02**: Enterprise customer can configure custom retention policies.

### Integrations

- **INTG-01**: User can import files directly from Google Drive.
- **INTG-02**: User can import files directly from OneDrive.
- **INTG-03**: User can save generated outputs back into Google Sheets.

### Scale

- **SCAL-01**: Pro user can upload files larger than 5 MB with async processing.
- **SCAL-02**: User can run background analysis jobs and receive notifications when complete.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Brand-identical GPTExcel clone | Functional parity is the goal; copying brand, UI, or protected content creates legal and trust risk. |
| Native mobile apps | Web SaaS is enough for the initial spreadsheet workflow. |
| Real-time collaborative spreadsheet editing | Users can copy results into existing spreadsheet tools; collaboration is not core to v1 value. |
| Unlimited free usage | Freemium economics require strict quotas from launch. |
| Custom foundation model training | Commercial LLM APIs are sufficient for v1 and avoid model-training cost. |
| Enterprise SSO and procurement controls | Defer until enterprise demand is proven. |
| Large-file BI warehouse | v1 is capped at 5 MB uploads to control cost, latency, and privacy risk. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| QUOT-01 | Phase 2 | Complete |
| QUOT-02 | Phase 2 | Complete |
| QUOT-03 | Phase 2 | Complete |
| BILL-01 | Phase 2 | Complete |
| BILL-02 | Phase 2 | Complete |
| BILL-03 | Phase 2 | Complete |
| WORK-01 | Phase 1 | Complete |
| WORK-02 | Phase 1 | Complete |
| WORK-03 | Phase 1 | Complete |
| WORK-04 | Phase 1 | Complete |
| FORM-01 | Phase 1 | Complete |
| FORM-02 | Phase 1 | Complete |
| FORM-03 | Phase 1 | Complete |
| FORM-04 | Phase 1 | Complete |
| FORM-05 | Phase 1 | Complete |
| CODE-01 | Phase 3 | Complete |
| CODE-02 | Phase 3 | Complete |
| CODE-03 | Phase 3 | Complete |
| SQL-01 | Phase 3 | Complete |
| SQL-02 | Phase 3 | Complete |
| REGX-01 | Phase 3 | Complete |
| REGX-02 | Phase 3 | Complete |
| SAFE-01 | Phase 3 | Complete |
| FILE-01 | Phase 4 | Complete |
| FILE-02 | Phase 4 | Complete |
| FILE-03 | Phase 4 | Complete |
| FILE-04 | Phase 4 | Complete |
| FILE-05 | Phase 4 | Complete |
| CHRT-01 | Phase 5 | Pending |
| CHRT-02 | Phase 5 | Pending |
| OCR-01 | Phase 5 | Pending |
| OCR-02 | Phase 5 | Pending |
| OCR-03 | Phase 5 | Pending |
| PRIV-01 | Phase 4 | Complete |
| PRIV-02 | Phase 4 | Complete |
| PRIV-03 | Phase 4 | Complete |
| PRIV-04 | Phase 4 | Complete |
| PERF-01 | Phase 1 | Complete |
| RELY-01 | Phase 1 | Complete |
| PRO-01 | Phase 3 | Complete |
| PRO-02 | Phase 2 | Complete |
| PRO-03 | Phase 2 | Complete |

**Coverage:**

- v1 requirements: 46 total
- Mapped to phases: 46
- Unmapped: 0

---
*Requirements defined: 2026-05-23*
*Last updated: 2026-05-23 after roadmap creation*

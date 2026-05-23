# Requirements: Tabelin.IA

**Defined:** 2026-05-23
**Core Value:** Brazilian spreadsheet users can describe the outcome they need in Portuguese and quickly receive correct, copy-ready formulas, code, queries, or structured table outputs that fit their actual tools.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication and Accounts

- [ ] **AUTH-01**: User can sign up with email and password.
- [ ] **AUTH-02**: User can sign in, sign out, and keep a session across browser refresh.
- [ ] **AUTH-03**: User can reset a forgotten password.
- [ ] **AUTH-04**: Authenticated user can access a workspace that preserves their plan and usage state.

### Quotas and Billing

- [ ] **QUOT-01**: Free user is limited to 4 tool uses per 12-hour window.
- [ ] **QUOT-02**: Free user is limited to 10 AI chat messages per 30-day window.
- [ ] **QUOT-03**: Upload limits are enforced for free users: 5 MB per file and 5 files per history.
- [ ] **BILL-01**: User can start Pro checkout with Pix and Brazilian card support.
- [ ] **BILL-02**: Payment webhook activates, updates, or revokes Pro entitlement idempotently.
- [ ] **BILL-03**: Pro user has unlimited access to formula, script, SQL, regex, OCR, and file-analysis tools subject to abuse safeguards.

### Tool Workspace

- [ ] **WORK-01**: User can navigate a distraction-free sidebar workspace with Formula, Scripts, SQL, Regex, File Analysis, and OCR tools.
- [ ] **WORK-02**: Every tool uses a consistent input, streaming output, error, and loading pattern.
- [ ] **WORK-03**: Every generated formula, code block, SQL query, regex, chart data, report, and table output has a prominent copy button with immediate copied feedback.
- [ ] **WORK-04**: Tool outputs show assumptions or warnings when the request lacks enough context for safe use.

### Formula Assistant

- [ ] **FORM-01**: User can describe a spreadsheet task in Portuguese and receive a generated formula.
- [ ] **FORM-02**: User can choose the target platform: Microsoft Excel, Google Sheets, Airtable, or LibreOffice Calc.
- [ ] **FORM-03**: User can choose formula language explicitly: Portuguese (Brazil) with `;` separators or English with `,` separators.
- [ ] **FORM-04**: User can paste an existing formula and receive a step-by-step Portuguese explanation.
- [ ] **FORM-05**: Formula output includes platform, formula language, separator, and assumptions so the user can verify paste compatibility.

### Code, SQL, and Regex Tools

- [ ] **CODE-01**: User can generate VBA scripts for Excel automation from a Portuguese prompt.
- [ ] **CODE-02**: User can generate Google Apps Script for Sheets automation from a Portuguese prompt.
- [ ] **CODE-03**: User can generate Airtable Scripts from a Portuguese prompt.
- [ ] **SQL-01**: User can generate SQL queries from text prompts.
- [ ] **SQL-02**: User can select SQL dialect: PostgreSQL, MySQL, SQL Server, Oracle, or BigQuery.
- [ ] **REGX-01**: User can generate regex patterns from Portuguese prompts.
- [ ] **REGX-02**: User can paste an existing regex and receive a Portuguese explanation.
- [ ] **SAFE-01**: Generated scripts and SQL include warnings or guardrails for destructive operations.

### Spreadsheet File Analysis

- [ ] **FILE-01**: User can upload `.csv` and `.xlsx` files up to 5 MB.
- [ ] **FILE-02**: System extracts sheet names, headers, inferred column types, and representative sample rows.
- [ ] **FILE-03**: User can chat against the uploaded file's detected schema and sample data.
- [ ] **FILE-04**: User can request text pivot-table style summaries from uploaded spreadsheet data.
- [ ] **FILE-05**: User can request executive insight reports from uploaded spreadsheet data.

### Charts and OCR

- [ ] **CHRT-01**: User can request chart suggestions for uploaded spreadsheet data.
- [ ] **CHRT-02**: User can render bar, line, and pie charts in the frontend using parsed spreadsheet data.
- [ ] **OCR-01**: User can upload `.png`, `.jpeg`, or `.jpg` images that contain tables.
- [ ] **OCR-02**: System reconstructs image tables into structured rows and columns.
- [ ] **OCR-03**: User can copy reconstructed tables as TSV or CSV for direct paste into Excel.

### Privacy, Performance, and Reliability

- [ ] **PRIV-01**: Uploaded raw files are deleted when the chat ends or after 1 hour of inactivity, whichever comes first.
- [ ] **PRIV-02**: Raw uploaded file contents are not written to application logs.
- [ ] **PRIV-03**: The product documents that customer data is not used for public model retraining by selected commercial AI providers unless explicitly opted in.
- [ ] **PRIV-04**: Provider file uploads use available expiration controls when raw files must be sent to a provider.
- [ ] **PERF-01**: Simple formula generation begins streaming visible output within 2.5 seconds under normal provider latency.
- [ ] **RELY-01**: AI outputs are validated against structured schemas before the UI presents copy-ready content.

### Pro Value and Support

- [ ] **PRO-01**: Pro user can access advanced table template generation.
- [ ] **PRO-02**: Pro user can see support contact paths for priority email or WhatsApp support.
- [ ] **PRO-03**: Pro requests can be marked for priority processing when infrastructure supports prioritization.

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
| AUTH-01 | TBD | Pending |
| AUTH-02 | TBD | Pending |
| AUTH-03 | TBD | Pending |
| AUTH-04 | TBD | Pending |
| QUOT-01 | TBD | Pending |
| QUOT-02 | TBD | Pending |
| QUOT-03 | TBD | Pending |
| BILL-01 | TBD | Pending |
| BILL-02 | TBD | Pending |
| BILL-03 | TBD | Pending |
| WORK-01 | TBD | Pending |
| WORK-02 | TBD | Pending |
| WORK-03 | TBD | Pending |
| WORK-04 | TBD | Pending |
| FORM-01 | TBD | Pending |
| FORM-02 | TBD | Pending |
| FORM-03 | TBD | Pending |
| FORM-04 | TBD | Pending |
| FORM-05 | TBD | Pending |
| CODE-01 | TBD | Pending |
| CODE-02 | TBD | Pending |
| CODE-03 | TBD | Pending |
| SQL-01 | TBD | Pending |
| SQL-02 | TBD | Pending |
| REGX-01 | TBD | Pending |
| REGX-02 | TBD | Pending |
| SAFE-01 | TBD | Pending |
| FILE-01 | TBD | Pending |
| FILE-02 | TBD | Pending |
| FILE-03 | TBD | Pending |
| FILE-04 | TBD | Pending |
| FILE-05 | TBD | Pending |
| CHRT-01 | TBD | Pending |
| CHRT-02 | TBD | Pending |
| OCR-01 | TBD | Pending |
| OCR-02 | TBD | Pending |
| OCR-03 | TBD | Pending |
| PRIV-01 | TBD | Pending |
| PRIV-02 | TBD | Pending |
| PRIV-03 | TBD | Pending |
| PRIV-04 | TBD | Pending |
| PERF-01 | TBD | Pending |
| RELY-01 | TBD | Pending |
| PRO-01 | TBD | Pending |
| PRO-02 | TBD | Pending |
| PRO-03 | TBD | Pending |

**Coverage:**
- v1 requirements: 46 total
- Mapped to phases: 0
- Unmapped: 46

---
*Requirements defined: 2026-05-23*
*Last updated: 2026-05-23 after initial definition*

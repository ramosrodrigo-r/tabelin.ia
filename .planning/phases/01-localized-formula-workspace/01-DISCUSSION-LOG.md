# Phase 1: Localized Formula Workspace - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-23
**Phase:** 01-localized-formula-workspace
**Areas discussed:** Auth and Session Shape, Workspace and Interaction Model, Formula Locale Contract, AI Output and Safety Envelope
**Mode:** Auto-selected recommended defaults

---

## Auth and Session Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Better Auth email/password | Use TypeScript-first app-owned auth with email/password, password reset, and persistent sessions. | Yes |
| Custom auth | Build password/session management manually. | |
| Hosted auth | Use an external auth product from day one. | |

**User's choice:** Auto-selected recommended default.
**Notes:** Email/password matches v1 requirements. Social login is deferred.

---

## Workspace and Interaction Model

| Option | Description | Selected |
|--------|-------------|----------|
| Focused sidebar workspace | Make the first screen the real app with tool navigation and Formula active. | Yes |
| Multi-page tool pages | Separate each future tool into independent pages immediately. | |
| Marketing-first landing layout | Start with a public hero/marketing page before the app workspace. | |

**User's choice:** Auto-selected recommended default.
**Notes:** The product is an operational SaaS tool; the first build should be a usable workspace.

---

## Formula Locale Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit platform and formula language | Require platform and language/separator selectors before generation. | Yes |
| Infer from prompt | Guess platform and locale from the user's text. | |
| Separate tools per platform | Create different UI tools for Excel, Sheets, Airtable, and LibreOffice. | |

**User's choice:** Auto-selected recommended default.
**Notes:** Explicit selectors reduce wrong-paste failures for Brazilian Excel users.

---

## AI Output and Safety Envelope

| Option | Description | Selected |
|--------|-------------|----------|
| Structured output with assumptions | Validate provider output, stream visible text, and show assumptions/warnings. | Yes |
| Freeform prose | Render the model response directly. | |
| Copy-only minimal output | Show only the generated formula without explanation or assumptions. | |

**User's choice:** Auto-selected recommended default.
**Notes:** Structured output and assumptions support reliability and user trust.

---

## the agent's Discretion

- Exact UI styling within the quiet SaaS workspace direction.
- Exact route/component structure.
- Exact email provider for password reset.
- Exact Portuguese helper copy.

## Deferred Ideas

- Social login/OAuth - outside Phase 1.
- Billing, quotas, and Pro support - Phase 2.
- Scripts, SQL, regex, and templates - Phase 3.
- File analysis and privacy lifecycle - Phase 4.
- OCR and charts - Phase 5.

---

*Phase: 01-localized-formula-workspace*
*Discussion log generated: 2026-05-23*

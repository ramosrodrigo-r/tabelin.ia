# Phase 1: Localized Formula Workspace - Context

**Gathered:** 2026-05-23
**Status:** Ready for planning
**Mode:** Auto-selected defaults from `$gsd-discuss-phase 1 --auto`

<domain>

## Phase Boundary

Phase 1 delivers the first usable vertical slice: authenticated users can open a distraction-free workspace and use the Formula tool to generate Brazilian-localized formulas or explain pasted formulas. This phase includes auth, session persistence, sidebar workspace shell, formula/explainer tool contracts, platform and formula-language selectors, streaming output, structured validation, assumptions/warnings, and copy feedback.

This phase does not build billing, quotas, scripts, SQL, regex, file upload, OCR, charts, reports, or Pro-only templates. Those are later roadmap phases.

</domain>

<decisions>

## Implementation Decisions

### Auth and Session Shape

- **D-01:** Use email/password authentication for Phase 1. Social login is deferred because v1 requirements only require email/password, password reset, and session persistence.
- **D-02:** Use Better Auth as the preferred TypeScript auth layer unless planning finds a hard blocker. It is compatible with Next.js 16 and keeps auth code inside the project.
- **D-03:** Store sessions server-side or through the auth framework's recommended secure session mechanism. The UI must survive browser refresh and correctly reflect signed-in/signed-out state.
- **D-04:** Password reset must be planned in Phase 1, but email deliverability provider choice is the agent's discretion unless a later plan identifies a project constraint.

### Workspace and Interaction Model

- **D-05:** Build the first screen as the usable app workspace, not a marketing landing page.
- **D-06:** Use a restrained sidebar navigation model with Formula active in Phase 1 and future tools visible only if they do not imply implemented behavior. Disabled or "coming later" states are acceptable.
- **D-07:** Keep the workspace dense, quiet, and task-focused for repeated office use. Avoid oversized hero layouts, decorative cards, and marketing composition in the app shell.
- **D-08:** All tool states must share the same interaction model: input, required selectors, streaming result area, assumptions/warnings, errors, and copy button.

### Formula Locale Contract

- **D-09:** Formula generation must require explicit platform selection: Microsoft Excel, Google Sheets, Airtable, or LibreOffice Calc.
- **D-10:** Formula generation must require explicit formula language selection: Portuguese (Brazil) with `;` separators or English with `,` separators.
- **D-11:** The generated output must show the selected platform, formula language, separator, and assumptions. This is part of the product's trust layer, not optional metadata.
- **D-12:** The formula explainer should respond in clear Brazilian Portuguese and explain execution logic step by step without assuming the user is a developer.
- **D-13:** Golden fixtures for formulas like `SE`, `PROCV`, `SOMASE`, and common financial/operational examples should guide tests and prompt validation.

### AI Output and Safety Envelope

- **D-14:** Use server-side AI calls only. Provider API keys must never reach the browser.
- **D-15:** Use structured output validation for formula and explanation responses before rendering copy-ready output.
- **D-16:** Stream simple formula responses as early as possible to satisfy the 2.5-second visible-output target under normal provider latency.
- **D-17:** If the prompt lacks required context, the output should include assumptions or ask for a narrowed request rather than silently inventing sheet structure.
- **D-18:** Persist request/output metadata needed for history, debugging, quota foundation, and quality analysis, but do not overbuild a full history product in Phase 1.

### the agent's Discretion

- Exact component composition and folder structure, as long as it follows Next.js 16 App Router conventions and keeps server-only logic out of client bundles.
- Exact visual styling within the required quiet SaaS workspace direction.
- Whether the API is implemented initially as Next.js route handlers or a separate Fastify app, as long as planning keeps a clean path to the recommended architecture.
- Exact email provider for password reset in Phase 1.
- Exact wording of Portuguese helper text, empty states, and validation messages, as long as they are native-sounding and concise.

</decisions>

<specifics>

## Specific Ideas

- The product must feel Brazilian from the first formula interaction: Portuguese prompt examples, Excel pt-BR function examples, and explicit `;` separator handling.
- The strongest first demo is: sign up, select Excel + Portuguese (Brazil), ask "Quero somar a coluna B se a coluna C for Pago", stream the formula, show assumptions, copy it, then paste/explain an existing formula.
- Treat "copy-ready" as a product feature. The copy affordance should be visible on the output block itself.

</specifics>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope

- `PRD.md` - Original product requirement document with personas, modules, quotas, privacy, and launch roadmap.
- `.planning/PROJECT.md` - Living project context, core value, constraints, and key decisions.
- `.planning/REQUIREMENTS.md` - Checkable v1 requirements and Phase 1 traceability.
- `.planning/ROADMAP.md` - Phase 1 goal, success criteria, requirements, and plan outline.

### Research

- `.planning/research/SUMMARY.md` - Stack, table-stakes features, risks, and recommended build order.
- `.planning/research/STACK.md` - Recommended Next.js/Fastify/PostgreSQL/OpenAI/Mercado Pago stack and versions.
- `.planning/research/FEATURES.md` - Feature landscape and MVP prioritization.
- `.planning/research/ARCHITECTURE.md` - Suggested system boundaries and data flows.
- `.planning/research/PITFALLS.md` - Formula localization, quota, privacy, and AI-output pitfalls.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- No application code exists yet. The repository currently contains PRD and GSD planning/runtime files only.

### Established Patterns

- Planning artifacts use GSD phase directories under `.planning/phases/`.
- Phase 1 is marked `mvp` in `.planning/ROADMAP.md`, so plans should favor vertical slices over horizontal infrastructure layers.
- `AGENTS.md` has been generated and should be read by coding agents before implementation.

### Integration Points

- Future Phase 2 quotas need Phase 1 requests to produce enough metadata for usage accounting.
- Future Phase 3 tools should reuse the Phase 1 tool contract and output shell.
- Future Phase 4 file analysis must reuse privacy patterns established by server-only AI and no raw-content client exposure.

</code_context>

<deferred>

## Deferred Ideas

- Social login/OAuth - not required for Phase 1 email/password auth.
- Free-tier quotas, Pix/card checkout, Pro entitlements, support paths - Phase 2.
- VBA, Apps Script, Airtable Script, SQL, regex, and Pro table templates - Phase 3.
- CSV/XLSX upload, file chat, pivot summaries, reports, and raw file cleanup - Phase 4.
- OCR image-to-table and chart rendering - Phase 5.
- Team workspaces, SSO, Google Drive/OneDrive import, and large-file async jobs - v2.

</deferred>

---

*Phase: 01-localized-formula-workspace*
*Context gathered: 2026-05-23*

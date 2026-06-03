# Tabelin.IA

## What This Is

Tabelin.IA is a Brazilian SaaS for spreadsheet and data productivity. It helps Brazilian analysts, finance teams, marketers, HR operators, accountants, administrators, and BI users turn natural-language requests into localized spreadsheet formulas, automation scripts, SQL queries, regex patterns, and structured analysis from files or table images.

The product is inspired by the capabilities of GPTExcel, but the product definition is Brazil-first: Portuguese prompts, Brazilian Excel syntax with semicolon separators, Pix and local card checkout, and workflows shaped around Brazilian office users.

## Core Value

Brazilian spreadsheet users can describe the outcome they need in Portuguese and quickly receive correct, copy-ready formulas, code, queries, or structured table outputs that fit their actual tools.

## Current State

**Shipped:** v1.1 Conversas Persistentes (2026-06-02) — Phases 6–8.

O chat-thread visual do v1.0 virou uma experiência multi-turn real: cada troca é persistida por usuário+tool (cap 50), recarregada ao abrir o workspace, e reinjetada no LLM como contexto a cada mensagem, com truncagem por tokens e isolamento de thread entre tools. Follow-ups funcionam sem repetir contexto.

**Next milestone:** v1.2 Anexos Universais — em definição (research → requirements → roadmap).

## Current Milestone: v1.2 Anexos Universais

**Goal:** Permitir anexar um documento em qualquer tool de texto (Formula, SQL, Regex, Scripts, Template) para que a IA o leia e gere a saída combinando o conteúdo extraído + o tool selecionado + o prompt do usuário.

**Target features:**
- Botão de anexo universal nos 5 tools de texto (Formula, SQL, Regex, Scripts, Template)
- Suporte a CSV/XLSX (schema parser), PNG/JPEG (OCR Vision), PDF (extrator novo) e TXT (leitura direta)
- Conteúdo extraído persistido no thread de conversa (arquivo bruto pode ser apagado — preserva D-07); follow-ups reusam o documento
- Recurso exclusivo Pro — free vê o botão com CTA de upgrade
- 1 arquivo por mensagem, cap de 5 MB
- Destino dos tools dedicados OCR/File Analysis a decidir no discuss/plan

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
- ✓ Every AI exchange (user prompt + assistant response) persisted to PostgreSQL per userId+toolKind with 50-exchange cap — Phase 6 (HIST-01, HIST-02, HIST-04)
- ✓ Cascade deletion of conversation history on user account removal (PRIV-01) — Phase 6
- ✓ Histórico de trocas carregado automaticamente ao abrir o workspace (prefetch server-side nos 5 tools de texto) — Phase 7 (HIST-03)
- ✓ Controle "Nova conversa" para limpar o thread de um tool individual — Phase 7 (HIST-05)
- ✓ Backend injeta trocas anteriores como contexto no LLM; follow-ups funcionam sem repetir contexto — Phase 8 (MULTI-01)
- ✓ Truncagem automática de contexto (híbrida: últimas N=10 + limite de tokens) — Phase 8 (MULTI-02)
- ✓ Contexto de conversa isolado por tool — cada tool injeta apenas seu próprio thread — Phase 8 (MULTI-03)

### Active

Milestone v1.2 Anexos Universais — requirements detalhados em `.planning/REQUIREMENTS.md` (gerados neste ciclo). Resumo das capacidades-alvo:

- Anexo universal nos 5 tools de texto (Formula, SQL, Regex, Scripts, Template)
- Extração multi-formato: CSV/XLSX, PNG/JPEG (OCR), PDF (novo), TXT
- Conteúdo extraído persistido no thread; arquivo bruto efêmero (D-07)
- Gating Pro do recurso de anexo
- Cap de 5 MB, 1 arquivo por mensagem

(All v1.0 + v1.1 requirements validated — see Validated section above.)

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
| Adotar layout chat-thread em todos os tools | Input fixo na base, respostas acumulam acima como troca usuário↔assistente — reduz fricção e torna o fluxo multi-consulta natural | Aplicado pós-v1.0 — Formula, SQL, Regex, Scripts, Template |
| Mover ToolNav para dentro do ChatInput (bottomNav prop) | Pills de navegação abaixo do textarea integram melhor com o layout chat; evitam separação visual entre input e navegação | Aplicado pós-v1.0 |
| Tokens do chat input migrados de dark para light theme | Workspace usa tema claro; chat escuro criava contraste indesejado e quebrava a coerência visual | Aplicado pós-v1.0 |
| Persistir exchanges por userId+toolKind com cap de 50 | Mantém histórico recuperável sem crescimento ilimitado do banco; isolamento natural por tool | Validado — v1.1 (Phase 6) |
| Truncagem híbrida de contexto (últimas N=10 + limite de tokens) | Evita erro de limite de tokens em conversas longas sem perder os turns recentes mais relevantes | Validado — v1.1 (Phase 8) |
| Rótulo `[Resposta anterior]` no histórico serializado + `buildMultiTurnSystemPrompt` DRY | UAT revelou que o LLM repetia a resposta anterior verbatim; rotular o histórico e unificar o system prompt corrigiu follow-ups | Validado — v1.1 (Phase 8 / 08-04, 2/2 UAT ao vivo) |
| File Analysis permanece efêmero (sem persistência de histórico) | Privacidade: arquivos enviados são dados de sessão temporários (D-07) | Aplicado — v1.1 (Phase 7) |

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
*Last updated: 2026-06-03 — started milestone v1.2 Anexos Universais (anexo universal de documentos em todos os tools de texto, extração multi-formato, gated Pro)*

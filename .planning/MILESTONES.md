# Milestones: Tabelin.IA

## v1.1 Conversas Persistentes — SHIPPED 2026-06-02

**Phases:** 6–8 | **Plans:** 10
**Timeline:** ~4 days (2026-05-29 → 2026-06-02) | **Commits:** ~81
**Files changed:** 85 | **LOC:** ~8.450 insertions

### Delivered

Transformou o layout chat-thread visual do v1.0 em uma experiência multi-turn real: cada troca usuário↔assistente é persistida no PostgreSQL por usuário+tool (cap de 50), recarregada automaticamente ao abrir o workspace, e reinjetada no LLM como contexto a cada nova mensagem — com truncagem automática por tokens e isolamento de thread entre ferramentas. Follow-ups ("agora ordene por data") agora funcionam sem o usuário repetir o contexto.

### Key Accomplishments

1. **Persistence Layer (Phase 6)** — Model `ConversationExchange` no Prisma + `conversation-repository.ts` com `saveConversationExchange()`, integrado de forma uniforme nos 7 route handlers de tools; cap de 50 trocas por usuário+tool; cascade delete do histórico ao excluir conta (PRIV-01).
2. **Frontend History (Phase 7)** — Prefetch server-side das trocas anteriores nos 5 pages de tool de texto, `WorkspaceConversationContext` para hidratar o chat no mount, e controle "Nova conversa" (`DELETE /api/conversations/[tool]` + seletores + `onNewConversation`) para iniciar um thread limpo. File Analysis mantido efêmero (D-07).
3. **Multi-turn LLM Context (Phase 8)** — Helper `context-messages.ts` com serialização concisa por tool e truncagem híbrida (últimas N=10 + limite de tokens); injeção do histórico nos 4 stream modules (SQL, Regex generate, Scripts, Template) e wiring nos 4 route handlers, com teste de integração garantindo isolamento de contexto entre tools.
4. **Gap closure de prompting multi-turn (Phase 8 / 08-04)** — Rótulo `[Resposta anterior]` no histórico serializado + `buildMultiTurnSystemPrompt` (DRY nos 4 tools) corrigindo o bug em que follow-ups retornavam a resposta anterior verbatim; confirmado ao vivo em UAT (2/2 passed com OPENAI_API_KEY ativa).

### Quick Tasks (durante o ciclo)

- Publicação do repositório no GitHub (`origin` configurado, `.codex/` ignorado).
- Hardening CSRF/origin nas rotas `POST /api/auth/*` + reset de senha de uso único com token hash expirável.
- Correção dos threats de segurança da Fase 2 (`T-02-02-04` validação de assinatura do webhook Mercado Pago com fail-closed; `T-02-03-03`).
- Conversão da página de privacidade estática para rota Next.js RSC (`/privacidade`, PRIV-03).

### Archives

- `.planning/milestones/v1.1-ROADMAP.md` — full phase details
- `.planning/milestones/v1.1-REQUIREMENTS.md` — 9 requirements (HIST 1-5, MULTI 1-3, PRIV-01), all validated

---

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

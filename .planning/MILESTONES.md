# Milestones: Tabelin.IA

## v2.0 Chat Unificado & Tabela Viva (Executado: 2026-06-10)

**Phases:** 12–15 | **Plans:** 17 (17 concluídos)
**Timeline:** ~2 days (2026-06-08 → 2026-06-10)
**Git range:** feat(12) → test(15) (#NAME? gap resolvido via debug `table-formulas-name-error`)

**Delivered:** Substituiu as abas de tools por um chat unificado que roteia o intent automaticamente (OpenAI Structured Outputs, campo intent primeiro, SLA 2,5s preservado) e introduziu a **tabela viva** — grid editável estilo mini-Excel com motor de fórmulas pt-BR (`@formulajs/formulajs`, MIT) recalculando ao vivo no browser, undo/redo, ordenação, tooltips de erro estilo Excel e export CSV/XLSX sanitizado contra injeção de fórmula (SEC-04).

**Key accomplishments:**

- **Classificador de intent + rota unificada** (Phase 12): intent embutido na chamada de geração, pill de tipo detectado com override de um clique, outputs heterogêneos (código/grid/texto) renderizando inline no mesmo thread.
- **Loop de clarificação** (Phase 13): multi-turn stub→clarificação→confirmação de spec antes de gerar qualquer tabela.
- **Tabela viva** (Phase 14): `react-datasheet-grid` (MIT) + motor de fórmulas pt-BR (funções localizadas + avaliador aritmético `=D{row}*E{row}`), separador `;`/`,`, mapeamento de erros estilo Excel, recálculo derivado display-only. Bug #NAME? em fórmulas aritméticas resolvido via sessão de debug.
- **Export, migração de UX & hardening** (Phase 15): export CSV/XLSX com fórmulas calculadas + sanitização SEC-04 (CR-01), Sidebar montada + ToolNav removido da raiz, fixture fallback de `buildTableSpec`. UAT 6/6.

**Decisões-chave:** engine `@formulajs/formulajs` (HyperFormula GPL bloqueado); partição `userId+toolKind` + kind `"unified_table"` (sem migração Prisma); `TableSpecPayload` em `ConversationExchange.assistantPayload`, grid efêmero; abas por-tool preservadas como deep links.

**Archives:**
- `.planning/milestones/v2.0-ROADMAP.md` — phase details
- `.planning/milestones/v2.0-REQUIREMENTS.md` — requisitos UNI/TBL/CLR/etc.
- `.planning/milestones/v2.0-MILESTONE-AUDIT.md` — auditoria

> Nota: v3.0 (pivô Planilha Viva) inverte parte deste escopo — o chat unificado e a tabela viva permanecem como núcleo, mas o roteamento multi-tool e os geradores de texto avulsos são removidos. Ver PRD-MILESTONE-PLANILHA-VIVA.

---

## v1.2 Anexos Universais (Shipped: 2026-06-05)

**Phases:** 9–11 | **Plans:** 14 | **Tasks:** 10
**Timeline:** ~2 days (2026-06-03 → 2026-06-04, completion 2026-06-05)
**Git range:** feat(09-01) → fix(11) (SEAM-05)

**Delivered:** Usuários Pro podem anexar documentos (CSV/XLSX, PNG/JPEG, PDF, TXT) em qualquer um dos 5 tools de texto, com extração automática, injeção no contexto LLM e persistência do conteúdo extraído no thread.

**Key accomplishments:**

- **Pipeline de extração multi-formato** (Phase 9): dispatcher único roteia CSV/XLSX (schema+amostra), PNG/JPEG (OCR Vision), PDF (unpdf, com detecção de PDF escaneado→erro acionável) e TXT, tudo via `ExtractionResult` tipado (EXT-01..06).
- **Segurança de bytes** (Phase 9): validação de magic bytes (file-type, ignora extensão/MIME), guard anti-ZIP-bomb (ratio em tamanho comprimido + per-entry cap 25 MB) e `MAX_INPUT_BYTES` antes de qualquer alocação (SEC-02, CR-01/CR-02 fechados).
- **Injeção + persistência no contexto LLM** (Phase 10): conteúdo extraído injetado no system prompt com delimitadores anti-injection, persistido em `ConversationExchange.attachmentContext` (arquivo bruto nunca salvo — D-07), reusado em follow-ups, truncado a `MAX_EXTRACTED_CHARS=8000` (CTX-01..05).
- **Pro-gate + cota no backend** (Phase 10): 403 antes de qualquer I/O de extração (anti-bypass) e débito reserve/confirm/release com release em falha de extração (PRO-02, PRO-03).
- **UI de anexo nos 5 tools** (Phase 11): botão paperclip + drag-and-drop, chip de preview, validação client-side, feedback em dois estágios, badge de grounding, painel de transparência do texto extraído, aviso LGPD e CTA de upgrade para free (ATT-01..08, PRO-01, SEC-01, SEC-03). UAT humano 3/3 pass.
- **Pós-auditoria:** Nyquist retroativamente validado nas Fases 9/10 (100% compliant) e warning de integração SEAM-05 fechado — os 5 hooks passaram a surfacar erros acionáveis de extração (422/413) ao usuário.

**Audit:** v1.2-MILESTONE-AUDIT — status `passed` (25/25 requisitos, 3/3 fases, integração PASS, fluxos E2E 4/4).

**Known deferred items at close:** 1 — 10-UAT.md status `partial` (0 cenários pendentes; cenários `blocked_by: prior-phase` cobertos retroativamente pelo UAT humano da Fase 11 + testes automatizados). Ver STATE.md › Deferred Items. Micro-débito técnico não-blocker da Fase 9 (estado global no zip-guard, N+1 read) rastreado em backlog.

---

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

# Roadmap: Tabelin.IA

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-05-26)
- 🚧 **v1.1 Conversas Persistentes** — Phases 6–8 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–5) — SHIPPED 2026-05-26</summary>

- [x] Phase 1: Localized Formula Workspace (3/3 plans) — completed 2026-05-24
- [x] Phase 2: Freemium Billing and Entitlements (3/3 plans) — completed 2026-05-25
- [x] Phase 3: Multi-Tool Generation Suite (3/3 plans) — completed 2026-05-26
- [x] Phase 4: Spreadsheet File Analysis (3/3 plans) — completed 2026-05-26
- [x] Phase 5: OCR, Charts, and Launch Hardening (4/4 plans) — completed 2026-05-26

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Conversas Persistentes (In Progress)

**Milestone Goal:** Transformar o chat-thread visual em experiência multi-turn real — histórico salvo no banco e contexto passado ao LLM em cada nova mensagem.

- [x] **Phase 6: Persistence Layer** - Schema DB, API CRUD de exchanges e cascade delete de privacidade (completed 2026-05-29)
- [x] **Phase 7: Frontend History** - Carregamento de histórico no mount, renderização e controle "Nova conversa" (completed 2026-05-30)
- [x] **Phase 8: Multi-turn LLM Context** - Injeção de contexto nas chamadas LLM com truncagem automática por tool (completed 2026-05-30)

## Phase Details

### Phase 6: Persistence Layer

**Goal**: Exchanges de todos os tools são salvos no banco e recuperáveis por usuário, com cascade delete ao excluir conta
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: HIST-01, HIST-02, HIST-04, PRIV-01
**Success Criteria** (what must be TRUE):

  1. Após enviar uma mensagem em qualquer tool, um registro de exchange existe no banco com o conteúdo e metadados corretos (plataforma, dialeto, modo)
  2. O banco nunca acumula mais de 50 exchanges por usuário por tool — exchanges antigos são descartados automaticamente
  3. Ao deletar uma conta de usuário, todos os seus exchanges são removidos em cascade sem registros órfãos
  4. Endpoints CRUD de conversations respondem com os dados corretos e retornam erro 401 para requisições não autenticadas

**Plans**: 2 plans

**Wave 1**

- [x] 06-01-PLAN.md — Schema Prisma, schema push e conversation-repository.ts

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-02-PLAN.md — Integração do save nos 7 route handlers de tools

### Phase 7: Frontend History

**Goal**: Usuário vê automaticamente o histórico de trocas anteriores ao abrir um workspace e pode iniciar uma conversa limpa
**Depends on**: Phase 6
**Requirements**: HIST-03, HIST-05
**Success Criteria** (what must be TRUE):

  1. Ao abrir qualquer workspace de tool de texto (Formula, SQL, Regex, Scripts, Template), as trocas anteriores aparecem no chat sem nenhuma ação do usuário. File Analysis permanece efêmero (D-07).
  2. Cada exchange recarregado exibe os metadados corretos — plataforma selecionada, dialeto e modo estão consistentes com o estado salvo
  3. Ao clicar em "Nova conversa", o chat é limpo e confirmado ao usuário, e as próximas trocas começam um novo thread

**Plans**: 4 plans

**Wave 1**

- [x] 07-01-PLAN.md — findConversationExchanges + deleteConversationExchanges no repository

**Wave 2** *(parallel — sem conflito de arquivos)*

- [x] 07-02-PLAN.md — DELETE /api/conversations/[tool] + botão "Nova conversa" no Topbar
- [x] 07-03-PLAN.md — Prefetch server-side de exchanges nos 5 pages de tool de texto

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-04-PLAN.md — Seed de exchanges + seletores + onNewConversation nos 5 tool components (aguardando checkpoint humano)

### Phase 8: Multi-turn LLM Context

**Goal**: O LLM recebe o histórico da conversa como contexto em cada nova mensagem, tornando follow-ups funcionais sem repetição manual
**Depends on**: Phase 7
**Requirements**: MULTI-01, MULTI-02, MULTI-03
**Success Criteria** (what must be TRUE):

  1. O usuário pode fazer uma pergunta de follow-up (ex: "agora adapte para o Google Sheets") e o LLM responde corretamente sem o usuário repetir o contexto anterior
  2. Conversas longas não causam erro de limite de tokens — o backend trunca automaticamente para as últimas N trocas quando necessário
  3. Trocar de tool (ex: de Formula para SQL) não vaza contexto — cada tool mantém e injeta apenas seu próprio thread de conversa

**Plans**: 3 plans

**Wave 1**

- [x] 08-01-PLAN.md — Helper context-messages.ts (serialização concisa por tool + truncagem híbrida N=10 + tokens)

**Wave 2** *(blocked on Wave 1)*

- [x] 08-02-PLAN.md — Injeção de history nos 4 stream modules (SQL, Regex generate-only, Scripts, Template)

**Wave 3** *(blocked on Wave 2)*

- [x] 08-03-PLAN.md — Wiring da leitura de history nos 4 route handlers + teste de integração de isolamento

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Localized Formula Workspace | v1.0 | 3/3 | Complete | 2026-05-24 |
| 2. Freemium Billing and Entitlements | v1.0 | 3/3 | Complete | 2026-05-25 |
| 3. Multi-Tool Generation Suite | v1.0 | 3/3 | Complete | 2026-05-26 |
| 4. Spreadsheet File Analysis | v1.0 | 3/3 | Complete | 2026-05-26 |
| 5. OCR, Charts, and Launch Hardening | v1.0 | 4/4 | Complete | 2026-05-26 |
| 6. Persistence Layer | v1.1 | 2/2 | Complete    | 2026-05-29 |
| 7. Frontend History | v1.1 | 4/4 | Complete    | 2026-05-30 |
| 8. Multi-turn LLM Context | v1.1 | 3/3 | Complete   | 2026-05-30 |

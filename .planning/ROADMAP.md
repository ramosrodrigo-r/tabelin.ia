# Roadmap: Tabelin.IA

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-05-26)
- ✅ **v1.1 Conversas Persistentes** — Phases 6–8 (shipped 2026-06-02)
- ✅ **v1.2 Anexos Universais** — Phases 9–11 (shipped 2026-06-05)
- 🚧 **v2.0 Chat Unificado & Tabela Viva** — Phases 12–15 (em progresso)

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

<details>
<summary>✅ v1.1 Conversas Persistentes (Phases 6–8) — SHIPPED 2026-06-02</summary>

**Milestone Goal:** Transformar o chat-thread visual em experiência multi-turn real — histórico salvo no banco e contexto passado ao LLM em cada nova mensagem.

- [x] Phase 6: Persistence Layer (2/2 plans) — completed 2026-05-29
- [x] Phase 7: Frontend History (4/4 plans) — completed 2026-05-30
- [x] Phase 8: Multi-turn LLM Context (4/4 plans) — completed 2026-06-01

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Anexos Universais (Phases 9–11) — SHIPPED 2026-06-05</summary>

**Milestone Goal:** Permitir que usuários Pro anexem documentos (CSV/XLSX, PNG/JPEG, PDF, TXT) em qualquer um dos 5 tools de texto, com extração automática, injeção no contexto LLM e persistência do conteúdo extraído no thread.

- [x] Phase 9: Extraction Infrastructure (5/5 plans) — completed 2026-06-03
- [x] Phase 10: Persistence & LLM Context (4/4 plans) — completed 2026-06-04
- [x] Phase 11: Attachment UI & Pro Gating (5/5 plans) — completed 2026-06-04

Full details: `.planning/milestones/v1.2-ROADMAP.md`
Audit: `.planning/milestones/v1.2-MILESTONE-AUDIT.md` (status: passed)

</details>

### 🚧 v2.0 Chat Unificado & Tabela Viva (Em Progresso)

**Milestone Goal:** Substituir as abas de tools por um único chat com roteamento de intent automático, introduzir geração de tabelas interativas com fórmulas vivas no browser e loop de clarificação multi-turn antes de gerar qualquer tabela.

- [ ] **Phase 12: Intent Classifier & Unified Route** — Input único que detecta e roteia qualquer pedido para os resolvers existentes, com pill de intent e override
- [ ] **Phase 13: Clarification Loop** — Loop multi-turn com teto de 2 turns, ConfirmationCard e escape hatch "Gerar mesmo assim" antes de gerar tabelas
- [ ] **Phase 14: Tabela Viva** — Grid editável com recálculo de fórmulas vivas, localização pt-BR completa e segurança XSS
- [ ] **Phase 15: Export, UX Migration & Hardening** — Export CSV/XLSX sanitizado, migração do ToolNav para o chat unificado e fixture fallback

## Phase Details

### Phase 12: Intent Classifier & Unified Route

**Goal**: Usuários podem digitar qualquer pedido em um único input e receber a resposta correta sem escolher um tool — a IA detecta o intent, roteia para o resolver existente e preserva o SLA de 2,5s via chamada única Structured Outputs
**Depends on**: Phase 11
**Requirements**: UNI-01, UNI-02, UNI-03, UNI-04, UNI-05, UNI-06, UNI-07
**Success Criteria** (what must be TRUE):

  1. Usuário digita "me dá uma fórmula PROCV" no chat unificado e recebe a fórmula gerada — sem selecionar nenhuma aba previamente
  2. Pill com o tipo detectado (ex.: "Fórmula") aparece ao lado da resposta; ao clicar, um dropdown permite corrigir para outro tipo (SQL, Tabela, etc.)
  3. Outputs heterogêneos (bloco de código, texto explicativo) aparecem inline no mesmo thread, distinguíveis visualmente
  4. Follow-up "agora em inglês" em uma troca de fórmula continua sem perder o contexto — a resposta usa o mesmo resolver de fórmula
  5. O primeiro token da resposta chega ao browser em ≤2,5s (SLA preservado); as páginas de cada tool continuam acessíveis via sidebar

**Plans**:

**Wave 1**

- [x] 12-01: Shared Contracts & Intent Classifier — unified schemas, `classifyIntent`, fixture accuracy, Structured Outputs fallback

**Wave 2 *(blocked on Wave 1 completion)***

- [x] 12-02: Unified API Route & Dispatch — `/api/chat/unified`, resolver dispatch, `needs_file`, `table_stub`, resolved `toolKind` history

**Wave 3 *(blocked on Wave 2 completion)***

- [x] 12-03: Unified Chat Client — `UnifiedChatTool`, NDJSON hook, intent pill override, context selector, render dispatcher

**Wave 4 *(blocked on Wave 3 completion)***

- [ ] 12-04: Workspace Default & Hardening — `/workspace` default migration, unified history deletion, regressions, final phase gate

**UI hint**: yes

### Phase 13: Clarification Loop

**Goal**: Ao detectar um pedido de tabela, a IA faz perguntas de clarificação (uma por turn) até ter especificação suficiente ou atingir o teto de 2 turns — sem debitar cota nos turns de clarificação
**Depends on**: Phase 12
**Requirements**: CLAR-01, CLAR-02, CLAR-03, CLAR-04, CLAR-05
**Success Criteria** (what must be TRUE):

  1. Usuário pede "cria uma tabela de vendas" e recebe uma pergunta de clarificação por vez (nunca duas perguntas no mesmo turno), com indicador "Pergunta 1 de 2"
  2. Após 2 turns de clarificação sem resposta conclusiva, a geração da tabela prossegue automaticamente com defaults razoáveis — o loop não trava indefinidamente
  3. Botão "Gerar mesmo assim" está visível desde o primeiro turno de clarificação; ao clicar, a tabela é gerada com os dados disponíveis sem aguardar mais perguntas
  4. Antes de gerar, um ConfirmationCard resume colunas, linhas e formato coletados; usuário pode ajustar antes de confirmar
  5. A cota do usuário não é consumida durante os turns de clarificação — apenas quando a tabela efetivamente é gerada

**Plans**: TBD
**UI hint**: yes

### Phase 14: Tabela Viva

**Goal**: Usuários recebem um grid editável no thread de conversa com recálculo de fórmulas ao vivo no browser, nomes de função em pt-BR, separadores e formatação brasileiros, e células renderizadas de forma segura
**Depends on**: Phase 13
**Requirements**: TAB-01, TAB-02, TAB-03, TAB-04, TAB-05, TAB-06, LOC-01, LOC-02, LOC-03, SEC-05
**Success Criteria** (what must be TRUE):

  1. Usuário clica em uma célula do grid, digita um valor e pressiona Tab/Enter/seta — a célula salva e o foco avança naturalmente como em uma planilha
  2. Célula com fórmula `=SOMA(B{row};C{row})` recalcula imediatamente após editar B2 — sem reload, sem delay perceptível
  3. Fórmula `=PROCV(A1;B1:C10;2;0)` avalia corretamente sem retornar `#NAME?`; separadores `;` e decimal `,` funcionam; colunas de valor exibem "R$ 1.500,00" e datas exibem "31/12/2025"
  4. Usuário pode adicionar/remover linhas e colunas, copiar/colar via Ctrl+C/V e desfazer/refazer via Ctrl+Z/Y dentro do grid
  5. Grid com 200 linhas rola suavemente sem travar o browser; conteúdo de célula nunca executa script (apenas textContent)

**Plans**: TBD
**UI hint**: yes

### Phase 15: Export, UX Migration & Hardening

**Goal**: Usuários podem exportar a tabela para CSV e XLSX com sanitização de injeção de fórmula, a navegação migra para o chat unificado como ponto de entrada default e o table generator tem fixture fallback para dev/test
**Depends on**: Phase 14
**Requirements**: EXP-01, EXP-02, SEC-04
**Success Criteria** (what must be TRUE):

  1. Usuário clica "Exportar CSV" e o arquivo baixado abre corretamente no Excel — células que começam com `=`, `+`, `-` ou `@` têm o prefixo `'` e não executam fórmulas como macro
  2. Usuário clica "Exportar XLSX" e o arquivo abre no Excel/Sheets com células editadas pelo usuário gravadas como texto (não como fórmula); o arquivo é gerado sem dependências novas além da lib `xlsx` já instalada
  3. Ao abrir `/workspace`, o chat unificado (Phase 12) é o ponto de entrada default; o ToolNav por aba não aparece na rota raiz mas cada tool continua acessível via deep link ou sidebar

**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Localized Formula Workspace | v1.0 | 3/3 | Complete | 2026-05-24 |
| 2. Freemium Billing and Entitlements | v1.0 | 3/3 | Complete | 2026-05-25 |
| 3. Multi-Tool Generation Suite | v1.0 | 3/3 | Complete | 2026-05-26 |
| 4. Spreadsheet File Analysis | v1.0 | 3/3 | Complete | 2026-05-26 |
| 5. OCR, Charts, and Launch Hardening | v1.0 | 4/4 | Complete | 2026-05-26 |
| 6. Persistence Layer | v1.1 | 2/2 | Complete | 2026-05-29 |
| 7. Frontend History | v1.1 | 4/4 | Complete | 2026-05-30 |
| 8. Multi-turn LLM Context | v1.1 | 4/4 | Complete | 2026-06-01 |
| 9. Extraction Infrastructure | v1.2 | 5/5 | Complete | 2026-06-03 |
| 10. Persistence & LLM Context | v1.2 | 4/4 | Complete | 2026-06-04 |
| 11. Attachment UI & Pro Gating | v1.2 | 5/5 | Complete | 2026-06-04 |
| 12. Intent Classifier & Unified Route | v2.0 | 1/4 | In Progress|  |
| 13. Clarification Loop | v2.0 | 0/? | Not started | - |
| 14. Tabela Viva | v2.0 | 0/? | Not started | - |
| 15. Export, UX Migration & Hardening | v2.0 | 0/? | Not started | - |

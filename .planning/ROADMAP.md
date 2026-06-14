# Roadmap: Tabelin.IA

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-05-26)
- ✅ **v1.1 Conversas Persistentes** — Phases 6–8 (shipped 2026-06-02)
- ✅ **v1.2 Anexos Universais** — Phases 9–11 (shipped 2026-06-05)
- ✅ **v2.0 Chat Unificado & Tabela Viva** — Phases 12–15 (shipped 2026-06-10)
- 🚧 **v3.0 Planilha Viva + Chat de IA (pivô)** — Phases 16–22 (em progresso)

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

<details>
<summary>✅ v2.0 Chat Unificado & Tabela Viva (Phases 12–15) — SHIPPED 2026-06-10</summary>

**Milestone Goal:** Substituir as abas de tools por um único chat com roteamento de intent automático, introduzir geração de tabelas interativas com fórmulas vivas no browser e loop de clarificação multi-turn antes de gerar qualquer tabela.

- [x] Phase 12: Intent Classifier & Unified Route (4/4 plans) — completed 2026-06-08
- [x] Phase 13: Clarification Loop (4/4 plans) — completed 2026-06-08
- [x] Phase 14: Tabela Viva (6/6 plans) — completed 2026-06-09
- [x] Phase 15: Export, UX Migration & Hardening (3/3 plans) — completed 2026-06-10

Full details: ver seções abaixo (Phase 12-15) ou `.planning/milestones/v2.0-ROADMAP.md`

</details>

### 🚧 v3.0 Planilha Viva + Chat de IA (Em Progresso — pivô / redução de escopo)

**Milestone Goal:** Estreitar o produto para uma única tela — planilha viva sempre presente + chat de IA que opera sobre ela — removendo a cadeia completa de código morto (billing/cota, OCR, tools de texto avulsos, navegação multi-ferramenta, geração de tabela do zero), comprovadamente e sem imports quebrados.

**Fonte da verdade:** `PRD-MILESTONE-PLANILHA-VIVA.md`

- [x] **Phase 16: Tela Única & Fim da Navegação Multi-Ferramenta** - Shell consolida planilha+chat numa rota única; sidebar/tool-nav e rotas órfãs de tool são removidas (completed 2026-06-11)
- [x] **Phase 17: Desligar Monetização & Cota** - Billing/Mercado Pago/Pro/cota saem por completo; rota de chat permanece funcional sem gate (completed 2026-06-11)
- [x] **Phase 18: Remover Tools Avulsos, OCR, File Analysis & Reduzir Dispatcher** - Geradores de texto, OCR, Análise de Arquivos e geração de tabela do zero saem; classificador de intent e render-dispatcher reduzidos a planilha + Q&A (completed 2026-06-14)
- [x] **Phase 19: Ingestão Tri-Estado da Planilha** - Usuário abre a planilha viva com seed, em branco, ou via upload CSV/XLSX (substitui a grade) (completed 2026-06-14)
- [ ] **Phase 20: Protocolo de Mutação Chat→Grade & Q&A** - Chat aplica operações estruturadas à grade aberta com undo, responde dúvidas analíticas em texto, com streaming e fixture sem chave
- [ ] **Phase 21: Export & Persistência da Planilha+Conversa** - Export CSV/XLSX com fórmulas calculadas; planilha e conversa do usuário persistem entre sessões
- [ ] **Phase 22: Limpeza Final — Prisma, Dependências, Config, Testes & QA Verde** - Migrations destrutivas (preservando dados), deps órfãs, config/docs/env órfãos, testes/fixtures/assets de capacidades OUT removidos; suíte completa verde

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

- [x] 12-04: Workspace Default & Hardening — `/workspace` default migration, unified history deletion, regressions, final phase gate

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

**Plans**: 4 plans

**Wave 0** *(scaffolding — sem dependências)*

- [x] 13-01-PLAN.md — Wave 0: scaffolds de teste e stubs de componentes (ClarificationCard, ConfirmationCard)

**Wave 1** *(blocked on Wave 0)*

- [x] 13-02-PLAN.md — Schemas compartilhados, table-clarifier.ts e serialização context-messages.ts

**Wave 2** *(blocked on Wave 1)*

- [x] 13-03-PLAN.md — Bifurcação do case unified_table no route.ts (clarification path + generation path)

**Wave 3** *(blocked on Wave 2)*

- [x] 13-04-PLAN.md — Componentes React completos, RenderDispatcher, hook e orchestração end-to-end

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

**Plans**: 6 plans

**Wave 0** *(scaffolding + package install gate)*

- [x] 14-01-PLAN.md — Wave 0: checkpoint de vettagem de pacotes npm + scaffolds de teste (formula-engine.test.ts, table-grid-panel.test.tsx, extensões unified-schema e table-clarifier)

**Wave 1** *(blocked on Wave 0 — contratos compartilhados)*

- [x] 14-02-PLAN.md — Schema estendido retrocompat (tableSpecPayloadSchema + tableColumnSchema) e mapa de localização PT_BR_TO_EN

**Wave 2** *(blocked on Wave 1 — motor de fórmulas + backend)*

- [x] 14-03-PLAN.md — Motor de fórmulas isolado: useFormulaEngine, parseA1, extractRange, evaluateFormula (validação empírica PROCV/SOMASE/SE)
- [x] 14-04-PLAN.md — buildTableSpec estendido: seed data, fórmulas, fixture mode Phase 14

**Wave 3** *(blocked on Wave 2)*

- [x] 14-05-PLAN.md — TableGridPanel: DynamicDataSheetGrid + undo/redo + sort + add/remove cols/rows + CSS
- [x] 14-06-PLAN.md — Wiring: render-dispatcher roteia TableGridPanel/ConfirmationCard + verificação E2E humana

**UI hint**: yes

### Phase 15: Export, UX Migration & Hardening

**Goal**: Usuários podem exportar a tabela para CSV e XLSX com sanitização de injeção de fórmula, a navegação migra para o chat unificado como ponto de entrada default e o table generator tem fixture fallback para dev/test
**Depends on**: Phase 14
**Requirements**: EXP-01, EXP-02, SEC-04
**Success Criteria** (what must be TRUE):

  1. Usuário clica "Exportar CSV" e o arquivo baixado abre corretamente no Excel — células que começam com `=`, `+`, `-` ou `@` têm o prefixo `'` e não executam fórmulas como macro
  2. Usuário clica "Exportar XLSX" e o arquivo abre no Excel/Sheets com células editadas pelo usuário gravadas como texto (não como fórmula); o arquivo é gerado sem dependências novas além da lib `xlsx` já instalada
  3. Ao abrir `/workspace`, o chat unificado (Phase 12) é o ponto de entrada default; o ToolNav por aba não aparece na rota raiz mas cada tool continua acessível via deep link ou sidebar

**Plans**: 3 plans

**Wave 1** *(sem dependencias — paralelizaveis)*

- [x] 15-01-PLAN.md — Utilidade pura de export (sanitizacao SEC-04 + buildCsv + buildXlsx + download) e testes unitarios
- [x] 15-03-PLAN.md — Migracao UX: montar Sidebar no layout, remover ToolNav do mount raiz + teste do fixture fallback

**Wave 2** *(bloqueada pelo 15-01)*

- [x] 15-02-PLAN.md — Wiring dos botoes Exportar CSV/XLSX no toolbar do TableGridPanel + teste de componente

**UI hint**: yes

### Phase 16: Tela Única & Fim da Navegação Multi-Ferramenta

**Goal**: Ao autenticar, o usuário cai direto numa única tela com a planilha viva ocupando o espaço principal e o chat de IA acessível ao lado/abaixo — sem nenhuma navegação para ferramentas separadas (sidebar/tool-nav, abas/deep-links de tool) acessível pela UI nem por rota
**Depends on**: Phase 15 (parte da tabela viva e do chat unificado de v2.0 já existem)
**Requirements**: SHELL-01, SHELL-02, SHELL-03, CLEAN-05
**Success Criteria** (what must be TRUE):

  1. Usuário autenticado é direcionado para uma rota única que renderiza a planilha viva (espaço principal) e o chat ao lado/abaixo, sem precisar navegar
  2. Sidebar/tool-nav não aparece em nenhuma tela; busca por componentes/rotas de navegação multi-ferramenta (`ToolNav`, sidebar de tools) retorna zero referências de UI no escopo IN
  3. Rotas de página dos tools antigos (Fórmula/Scripts/SQL/Regex/Template/OCR/Análise de Arquivos como destinos próprios) não respondem mais ou redirecionam para a tela única — nenhum link da UI aponta para elas
  4. Topbar com sessão do usuário e link para página de privacidade continuam acessíveis a partir da tela única
  5. `pnpm -r typecheck` e `pnpm -r test` permanecem verdes após a consolidação do shell

**Plans**: 2 plans

**Wave 1** *(sem dependencias)*

- [x] 16-01-PLAN.md — Redirects 308 das rotas antigas de tool, Topbar enxuta (link /privacidade) e SAMPLE_SPEC

**Wave 2** *(bloqueada pelo 16-01 — consome SAMPLE_SPEC)*

- [x] 16-02-PLAN.md — WorkspaceSplit + reescrita do WorkspaceLayout (split planilha/chat) + CSS + remoção Sidebar/ToolNav

**UI hint**: yes

### Phase 17: Desligar Monetização & Cota

**Goal**: Toda a monetização/cota (Mercado Pago, checkout, webhooks, plano Pro, entitlement gates, usage ledger, UI de upsell) é removida da superfície acessível, sem quebrar a rota de chat que permanece — o gate sai, o streaming fica
**Depends on**: Phase 16
**Requirements**: CLEAN-04
**Success Criteria** (what must be TRUE):

  1. Rotas de checkout, webhook do Mercado Pago e qualquer endpoint de gerenciamento de plano Pro não respondem mais (404 ou removidas do roteador)
  2. A rota de chat de IA continua streamando respostas normalmente para qualquer usuário autenticado, sem gate de cota/entitlement bloqueando a chamada
  3. Nenhuma UI de upsell, aviso de limite, badge de plano Pro ou CTA de upgrade aparece em qualquer tela
  4. Busca por símbolos de cota/entitlement/usage-ledger (reserve/confirm/release, `entitlement`, `quota`, `mercadopago`) usados como gate na rota de chat retorna zero — exceto símbolos comprovadamente compartilhados com IN, documentados como exceção
  5. `pnpm -r typecheck` e `pnpm -r test` verdes após a remoção do gate (commit atômico isolado, permitindo bisseção)

**Plans**: 3 plans

**Wave 1** *(sem dependências — paralelizáveis; sem overlap de arquivos; cada plano bisseccionável)*

- [x] 17-01-PLAN.md — Desacoplar o gate de cota/entitlement da rota de chat /api/chat/unified (mantém auth + streaming) + editar unified-route.test.ts
- [x] 17-02-PLAN.md — Remover UI de upsell (Topbar badge/Suporte Pro, banners quota/pro, hook de stream, layout/page sem entitlement, CSS) + editar testes de componente/e2e
- [x] 17-03-PLAN.md — Deletar provedor de pagamento (Mercado Pago client/checkout/webhook, rotas, página de retorno), podar entitlements (manter getUserEntitlement), remover dep+env MP, deletar testes de billing

### Phase 18: Remover Tools Avulsos, OCR, File Analysis & Reduzir Dispatcher

**Goal**: A cadeia completa dos geradores de texto avulsos (Fórmula/Scripts/SQL/Regex/Template), do OCR (imagem→tabela) e da Análise de Arquivos como ferramenta separada é removida; a geração de tabela do zero (stub→clarificação→confirmação de spec) sai; o classificador de intent e o render-dispatcher são reduzidos ao que serve planilha + Q&A
**Depends on**: Phase 16, Phase 17
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-06, CLEAN-07
**Success Criteria** (what must be TRUE):

  1. Nenhuma rota de API responde para Fórmula/Scripts/SQL/Regex/Template/OCR/Análise de Arquivos como ferramentas independentes; busca por essas rotas retorna zero referências de UI ou roteamento
  2. A *avaliação* de fórmulas dentro da planilha viva (motor pt-BR) continua funcionando normalmente — não foi afetada pela remoção dos geradores de texto avulsos
  3. O classificador de intent só reconhece/roteia para "operação na planilha" e "pergunta analítica (Q&A)"; não existe mais ramo de intent que aponte para tools removidos ou para geração de tabela do zero
  4. O render-dispatcher não possui mais branches para stub/clarificação/confirmação de spec de tabela nova, nem para outputs de tools removidos (código/SQL/regex/script avulsos)
  5. `pnpm -r typecheck` e `pnpm -r test` verdes após cada bloco de remoção (commits atômicos por capacidade)

**Plans**: 8 plans

**Wave 1**

- [x] 18-01: Remover rotas/páginas/features dos 5 geradores avulsos (Fórmula/SQL/Regex/Scripts/Template) — CLEAN-01
- [x] 18-02: Remover OCR como tool dedicado, preservando extração genérica de imagem — CLEAN-02
- [x] 18-03: Remover File Analysis como tool dedicado, preservando file-parser.ts (CSV/XLSX) — CLEAN-03

**Wave 2** *(depende da Wave 1)*

- [x] 18-04: Remover curto-circuito de clarificação/case unified_table e os 5 branches de tools avulsos em route.ts — CLEAN-07/CLEAN-01

**Wave 3** *(depende da Wave 2)*

- [x] 18-05: Reduzir intent-classifier.ts/schema ao eixo binário sheet_operation/qa; plantar eval de 6-8 prompts — CLEAN-06

**Wave 4** *(depende da Wave 3)*

- [ ] 18-06: Reduzir unifiedCompletePayloadSchema e render-dispatcher.tsx; deletar ClarificationCard/ConfirmationCard/TableIntentStub — CLEAN-06/CLEAN-07

**Wave 5** *(depende da Wave 4)*

- [ ] 18-07: Reduzir unified-chat-tool.tsx/use-unified-chat-stream.ts/context-messages.ts ao eixo binário; deletar session-context-selector.tsx — CLEAN-06/CLEAN-07

**Wave 6** *(depende da Wave 5)*

- [ ] 18-08: Remover entitlements/quota-service órfãos e schemas/fixtures de tools em packages/shared; reescrever testes finais (unified-schema, smoke e2e) — CLEAN-01/02/03/06/07

### Phase 19: Ingestão Tri-Estado da Planilha

**Goal**: O usuário pode abrir a planilha viva em três estados iniciais — planilha-amostra (seed), planilha em branco, ou importar CSV/XLSX (que substitui a grade) — com o arquivo importado sendo efêmero e só o conteúdo extraído persistido
**Depends on**: Phase 18
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):

  1. Ao abrir a tela única pela primeira vez (ou por escolha explícita), o usuário vê uma planilha-amostra populada de exemplo
  2. O usuário tem uma opção para começar com uma planilha em branco (grade vazia editável)
  3. O usuário pode fazer upload de um arquivo CSV/XLSX e a grade é substituída pelo conteúdo do arquivo (colunas, linhas, tipos detectados)
  4. Após a importação, o arquivo bruto enviado não é mantido — apenas a planilha resultante (dados extraídos) é persistida; busca confirma que nenhum armazenamento de arquivo bruto ocorre fora do fluxo efêmero de processamento
  5. A validação de bytes (magic bytes/anti-ZIP-bomb) reaproveitada do pipeline de extração continua ativa no caminho de upload da planilha

**Plans**: 2/2 plans complete

- [x] 19-01-PLAN.md
- [x] 19-02-PLAN.md

**UI hint**: yes

### Phase 20: Protocolo de Mutação Chat→Grade & Q&A

**Goal**: O chat de IA recebe o estado atual da planilha (colunas, tipos, amostra de linhas) e retorna operações estruturadas que são aplicadas à grade aberta — com undo — ou responde dúvidas analíticas em texto sem alterar a grade; tudo com streaming e fallback fixture sem `OPENAI_API_KEY`
**Depends on**: Phase 18, Phase 19
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, LOC-01
**Success Criteria** (what must be TRUE):

  1. Toda mensagem enviada ao modelo inclui o estado atual da planilha (colunas, tipos inferidos, amostra de linhas) como contexto
  2. Um pedido de manipulação ("ordene pela coluna Valor", "crie uma coluna de fórmula que some D e E", "preencha os valores faltantes") resulta em operações estruturadas (tipadas sobre células/colunas/linhas/fórmulas) aplicadas visivelmente à grade aberta
  3. O usuário pode desfazer (undo) qualquer mutação aplicada pela IA, retornando a grade ao estado anterior
  4. Uma pergunta analítica ("qual a média da coluna Valor?", "quantas linhas acima de 1000?") retorna resposta em texto no chat sem alterar nenhuma célula da grade
  5. A resposta do chat (mutação ou Q&A) faz streaming visível ao usuário; sem `OPENAI_API_KEY`, o chat responde via fixture determinístico (dev/test sem custo) e a localização pt-BR (nomes de função, separador `;`, formatação R$/DD-MM-AAAA, cópia de UI) permanece sem regressão em ambos os caminhos

**Plans**: 1/2 plans executed

- [x] 20-01-PLAN.md
- [ ] 20-02-PLAN.md

**UI hint**: yes

### Phase 21: Export & Persistência da Planilha+Conversa

**Goal**: O usuário pode exportar a planilha atual (com fórmulas já calculadas) para CSV e XLSX, e tanto a planilha quanto a conversa associada são salvas e recuperadas entre sessões
**Depends on**: Phase 20
**Requirements**: PERS-01, PERS-02, PERS-03, PERS-04
**Success Criteria** (what must be TRUE):

  1. Usuário pode exportar a planilha atual para CSV, com os valores de fórmula já calculados (não as fórmulas como texto)
  2. Usuário pode exportar a planilha atual para XLSX, com os valores de fórmula já calculados e sanitização contra injeção de fórmula preservada (regressão de SEC-04/v2.0)
  3. Ao sair e voltar a acessar a tela única (nova sessão), a planilha do usuário é recarregada no estado em que foi deixada (incluindo dados de seed/upload/edições da IA)
  4. Ao recarregar a tela única, a conversa do chat associada à planilha é recarregada — o usuário vê o histórico de trocas anteriores
  5. Export e persistência funcionam tanto para uma planilha originada de seed/em branco quanto de upload CSV/XLSX

**Plans**: TBD

### Phase 22: Limpeza Final — Prisma, Dependências, Config, Testes & QA Verde

**Goal**: Modelos Prisma e migrations órfãos são removidos via migration coerente preservando dados de usuário; dependências, configuração, testes/fixtures e assets que existiam só por causa das capacidades OUT são removidos; a suíte completa (`typecheck`, `lint`, `test`, `build`) passa verde, comprovando zero referências pendentes
**Depends on**: Phase 16, Phase 17, Phase 18, Phase 19, Phase 20, Phase 21
**Requirements**: CLEAN-08, CLEAN-09, CLEAN-10, CLEAN-11, CLEAN-12, QA-01, QA-02
**Success Criteria** (what must be TRUE):

  1. Uma migration Prisma coerente remove modelos/colunas órfãos de billing/cota/tools removidos; o banco aplica a migration limpo (`prisma migrate deploy` sem erro) e contas + planilhas de usuários existentes permanecem intactas
  2. `package.json` (raiz e pacotes) não contém nenhuma dependência sem import ativo no código restante — verificado por busca de uso real, não por suposição
  3. `.env.example`, `docker-compose`, scripts e README/docs principais não mencionam mais Mercado Pago, OCR, tools avulsos, cota/Pro nem geração de tabela do zero — apenas o escopo v3.0
  4. Nenhum teste/fixture unit ou e2e exercita exclusivamente uma capacidade OUT (geradores avulsos, OCR, billing, file-analysis-como-tool, geração de tabela do zero); assets soltos (ex.: amostras de OCR) são removidos preservando os assets IN (ex.: planilha-amostra de seed)
  5. `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` e `pnpm -r build` passam verdes na árvore final; busca abrangente por símbolos/rotas/imports de todas as capacidades da §5 do PRD retorna zero referências de dentro do escopo IN

**Plans**: TBD

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
| 12. Intent Classifier & Unified Route | v2.0 | 4/4 | Complete | 2026-06-08 |
| 13. Clarification Loop | v2.0 | 4/4 | Complete    | 2026-06-09 |
| 14. Tabela Viva | v2.0 | 6/6 | Complete   | 2026-06-09 |
| 15. Export, UX Migration & Hardening | v2.0 | 3/3 | Complete    | 2026-06-10 |
| 16. Tela Única & Fim da Navegação Multi-Ferramenta | v3.0 | 2/2 | Complete    | 2026-06-11 |
| 17. Desligar Monetização & Cota | v3.0 | 3/3 | Complete   | 2026-06-11 |
| 18. Remover Tools Avulsos, OCR, File Analysis & Reduzir Dispatcher | v3.0 | 8/8 | Complete | 2026-06-14 |
| 19. Ingestão Tri-Estado da Planilha | v3.0 | 2/2 | Complete    | 2026-06-14 |
| 20. Protocolo de Mutação Chat→Grade & Q&A | v3.0 | 1/2 | In Progress|  |
| 21. Export & Persistência da Planilha+Conversa | v3.0 | 0/TBD | Not started | - |
| 22. Limpeza Final — Prisma, Dependências, Config, Testes & QA Verde | v3.0 | 0/TBD | Not started | - |

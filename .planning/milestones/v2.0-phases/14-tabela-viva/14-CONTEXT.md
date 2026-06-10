# Phase 14: Tabela Viva - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Renderizar o `TableSpecPayload` confirmado (output do loop de clarificação da Phase 13) como um **grid editável estilo mini-Excel** dentro do thread de conversa, com **recálculo de fórmulas vivo no browser**, **funções e formatação pt-BR**, e **render seguro contra XSS**.

**Cobre:** TAB-01..06, LOC-01..03, SEC-05.

**NÃO faz parte desta fase (Phase 15):** export CSV/XLSX com sanitização de injeção de fórmula (EXP-01, EXP-02, SEC-04) e migração final do ToolNav para o chat unificado como entry point default.

**Fronteira "mini-Excel" (TAB-06):** ≤200 linhas × 26 colunas, virtualizado; **sem** merge de células, freeze panes ou multi-sheet.
</domain>

<decisions>
## Implementation Decisions

### Origem do conteúdo do grid (TAB-01, TAB-02)
- **D-01:** A IA **gera estrutura + dados iniciais (seed) + fórmulas** — o grid abre já preenchido e funcional. Isso **estende o `TableSpecPayload` atual** (hoje só `{title, columns:[{name,type}], rowCount, format?}`) para carregar dados de célula e definições de fórmula, conforme o desenho proposto em `ARCHITECTURE.md` (colunas com `type: "formula"` + template de fórmula tipo `"=SOMA(B{row};C{row})"` + seed data). Os critérios de sucesso mostram uma tabela populada cujas fórmulas recalculam ao editar B2 — implica dados pré-existentes.
- **Impacto a sinalizar ao planner:** estender o schema toca o contrato que a Phase 13 produz e o `ConfirmationCard`/`render-dispatcher` que consomem `table_spec`. O schema estendido deve permanecer retrocompatível com o que o `table-clarifier.ts` já emite (campos novos opcionais ou o gerador passa a preenchê-los).

### Escopo do motor de fórmulas (TAB-02, LOC-01, LOC-02)
- **D-02:** O mini-motor sobre o `@formulajs/formulajs` (MIT, decisão de milestone travada) suporta **referências A1 completas (B2), intervalos (B1:C10) cruzando linhas, e recálculo em cascata via grafo de dependências**. É o necessário para `=PROCV(A1;B1:C10;2;0)`, explicitamente exigido no critério de sucesso #3.
- **D-03:** Como o formulajs é "calculadora de funções isoladas" (sem grafo de dependências, sem refs de célula — ver `STACK.md`), a Phase 14 **constrói uma camada fina** por cima: (a) parser de referências A1/intervalos, (b) ordenação topológica para recálculo em cascata + detecção de ciclo, (c) mapa de tradução **PT-BR→EN** das ~20 funções core antes de delegar ao formulajs.
- **D-04:** Separadores brasileiros: `;` como separador de argumento e `,` como separador decimal (LOC-02) — parse próprio antes de chamar o formulajs (que espera `,` e `.`).

### UX de erro de fórmula
- **D-05:** Célula com fórmula inválida exibe o **código estilo Excel inline** (`#NAME?`, `#REF!`, `#DIV/0!`, mais um código para referência circular) **+ tooltip explicativo em pt-BR no hover**. Usuário de Excel BR já reconhece os códigos; o tooltip educa sem poluir a célula.

### Formatação BR (LOC-03)
- **D-06:** O formato de cada coluna é decidido pelo **`type` que a IA atribui** (`currency` → `R$ 1.500,00`, `date` → `31/12/2025`, `number`, `text`). O **valor cru** (número/data) é armazenado por baixo; a formatação é apenas de exibição — edição opera sobre o valor cru. O schema já tem campo `type` por coluna.

### Segurança (SEC-05)
- **D-07:** Conteúdo de célula renderiza **apenas via `textContent`** — nunca `dangerouslySetInnerHTML`. Nenhum conteúdo de célula executa script (critério de sucesso #5). Alinhado ao padrão anti-XSS já estabelecido no v1.2 (render seguro de conteúdo extraído).

### Persistência (decisão de milestone, reafirmada)
- **D-08:** **Grid state é efêmero** (`useState` client-side, nunca persistido) — espelha o padrão File Analysis (D-07 do v1.x) e evita complexidade LGPD com dados digitados pelo usuário. Apenas o `TableSpecPayload` (estrutura + seed + fórmulas geradas pela IA) persiste em `ConversationExchange.assistantPayload`. Ao recarregar o histórico, o grid re-renderiza do spec persistido (edições manuais do usuário não sobrevivem ao reload — comportamento esperado).

### Claude's Discretion
- Biblioteca de grid: **`react-datasheet-grid` v4.11.6** (MIT) já recomendada em `STACK.md` — copy/paste nativo, virtualização de linhas+colunas, edição inline DOM. Confirmar versão e import do CSS (`react-datasheet-grid/dist/style.css`).
- Forma concreta do schema estendido (nomes de campos, como representar seed data vs fórmula-template), desde que retrocompatível com `table-clarifier.ts`.
- Implementação de copy/paste (Ctrl+C/V), undo/redo (Ctrl+Z/Y) e ordenação por coluna (TAB-04, TAB-05) — usar capacidades nativas do `react-datasheet-grid` onde possível.
- Conjunto exato das ~20 funções no mapa PT-BR→EN inicial — começar pelas core (PROCV, SE, SOMASE, MÉDIA, CONT.SE, SOMA…) e o comportamento de fallback para função não mapeada (sugestão: tratar como `#NAME?`).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Decisões de milestone / pesquisa
- `.planning/research/STACK.md` §(a) Grid Editável e §motor de fórmulas — escolha de `react-datasheet-grid` v4.11.6, descarte de AG Grid/Glide, e por que formulajs (MIT) sozinho é insuficiente (sem grafo de dependências / refs de célula) → justifica a camada fina de D-03
- `.planning/research/ARCHITECTURE.md` §"Ephemeral Grid State + TableSpecPayload" (linhas ~154-204) — desenho do `TableSpecPayload` estendido (colunas `type: "formula"` + template + seed), `formulaLanguage`, contrato LLM→Client Grid, e `TableGridPanel`
- `.planning/research/PITFALLS.md` — riscos de latência/regressão e armadilhas de fórmula/localização
- `.planning/REQUIREMENTS.md` §Tabela Viva — TAB-01..06, LOC-01..03, SEC-05 (requisitos desta fase)
- `.planning/ROADMAP.md` Phase 14 — goal e os 5 critérios de sucesso (incluindo PROCV com intervalo e grid de 200 linhas)

### Contrato existente a estender (handoff da Phase 13)
- `packages/shared/src/unified-chat/schema.ts` (linhas ~63-69) — `tableSpecPayloadSchema` atual (mínimo) que a Phase 14 estende; `unifiedCompletePayloadSchema` e `unifiedStreamEventSchema` (evento `complete`)
- `apps/web/src/server/ai/table-clarifier.ts` — gerador que emite o `TableSpecPayload` hoje; passa a preencher os campos novos (seed + fórmulas)
- `apps/web/src/features/unified-chat/components/render-dispatcher.tsx` (case `table_spec` / `table_stub`) — onde o grid real substitui o `TableIntentStub`; `ConfirmationCard` com `onConfirm(spec)`
- `apps/web/src/features/unified-chat/components/confirmation-card.tsx` — card de confirmação que dispara a geração da tabela

### Phase 12 (contexto do chat unificado)
- `.planning/phases/12-intent-classifier-unified-route/12-CONTEXT.md` — decisões do chat unificado, intent `tabela` (D-07 da Phase 12: stub entregue às Phases 13/14)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`render-dispatcher.tsx`** já roteia `table_spec` para `ConfirmationCard` e tem um slot `TableIntentStub` para `table_stub` — o grid vivo pluga aqui após o `onConfirm`.
- **Padrão anti-XSS do v1.2** (render seguro de conteúdo extraído, sem `dangerouslySetInnerHTML`) — reusar para SEC-05.
- **`ConversationExchange.assistantPayload`** já persiste payloads tipados discriminados por `kind` — o `table_spec` estendido entra no mesmo mecanismo, sem migração Prisma.

### Established Patterns
- Payloads do chat unificado são uniões discriminadas Zod em `@tabelin/shared` (`unifiedCompletePayloadSchema`) — estender mantém o mesmo padrão de validação.
- Streaming NDJSON com evento `complete` carregando o payload tipado — o grid consome o `TableSpecPayload` do evento `complete`.
- Componentes de tabela vivem em `"use client"` (react-datasheet-grid usa clipboard/keyboard APIs) — leaf node client na árvore RSC.

### Integration Points
- `packages/shared/src/unified-chat/schema.ts` — estender `tableSpecPayloadSchema` (retrocompatível).
- `apps/web/src/server/ai/table-clarifier.ts` — gerador passa a emitir seed + fórmulas.
- Novo componente client (ex.: `features/unified-chat/components/table-grid-panel.tsx` + módulo de motor de fórmulas) renderizado pelo `render-dispatcher` após confirmação.
- `pnpm add react-datasheet-grid @formulajs/formulajs --filter web` (projeto usa pnpm).
</code_context>

<specifics>
## Specific Ideas

- Critério de sucesso #3 é o teste-âncora do motor: `=PROCV(A1;B1:C10;2;0)` deve avaliar sem `#NAME?`; `;` e decimal `,` funcionam; colunas de valor exibem "R$ 1.500,00" e datas "31/12/2025".
- ⚠️ **Concern carregado (STATE.md):** o mapa PT_BR_TO_EN (~20 funções) deve ser validado empiricamente com `=PROCV()`, `=SOMASE()`, `=SE()` antes de conectar o grid ao gerador — candidato a foco do researcher / teste do planner.
- Critério #5: grid de 200 linhas rola suavemente (virtualização) e célula nunca executa script.
</specifics>

<deferred>
## Deferred Ideas

- Export CSV/XLSX com sanitização de injeção de fórmula (prefixo `'` em `= + - @`) e export de XLSX com células do usuário como texto — **Phase 15** (EXP-01, EXP-02, SEC-04).
- Migração do ToolNav / chat unificado como entry point default no `/workspace` — **Phase 15**.
- Edição retroativa da tabela via chat, AutoFiltro (dropdown por coluna) e language pack pt-BR completo (100+ funções) — **v2.1/v2.x** (já em Deferred Items do STATE.md).
- Persistência de edições manuais do usuário no grid (tabelas salvas/nomeadas, compartilhamento) — exigiria modelo Prisma dedicado; fora do escopo v2.0.

None — discussion stayed within phase scope.
</deferred>

---

*Phase: 14-tabela-viva*
*Context gathered: 2026-06-09*

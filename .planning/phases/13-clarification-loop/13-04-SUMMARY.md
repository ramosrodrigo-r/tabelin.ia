---
phase: 13-clarification-loop
plan: "04"
subsystem: ui
tags: [clarification-loop, react, render-dispatcher, confirmation-card, clarification-card, tests, end-to-end]

dependency_graph:
  requires:
    - phase: 13-clarification-loop/13-03
      provides: "route.ts bifurcado emitindo table_clar_question e table_spec"
    - phase: 13-clarification-loop/13-02
      provides: "TableClarQuestionPayload e TableSpecPayload de @tabelin/shared"
    - phase: 13-clarification-loop/13-01
      provides: "stubs de ClarificationCard e ConfirmationCard"
  provides:
    - apps/web/src/features/unified-chat/components/clarification-card.tsx — ClarificationCard completo
    - apps/web/src/features/unified-chat/components/confirmation-card.tsx — ConfirmationCard com campos editáveis
    - apps/web/src/features/unified-chat/components/render-dispatcher.tsx — cases table_clar_question e table_spec
    - apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts — overrideGenerate e specOverride
    - apps/web/src/features/unified-chat/unified-chat-tool.tsx — callbacks de orquestração end-to-end
    - apps/web/tests/unified-chat-tool.test.tsx — 5 novos cenários CLAR-01..04 + resposta
  affects:
    - Phase 14 (geração de tabela interativa) recebe table_spec payload com campos editados pelo usuário

tech-stack:
  added: []
  patterns:
    - "ConfirmationCard com estado local editedSpec — campos title/columns[].name/rowCount editáveis via inputs controlados"
    - "RenderDispatcher: props opcionais onAnswer/onSkip/onConfirm passadas aos cards de clarificação"
    - "lastSubmitInputRef para preservar contexto (platform, formulaLanguage, etc) entre resubmits de clarificação"
    - "handleSkipClarification e handleConfirmSpec: resubmit com overrideGenerate:true no hook"
    - "specOverride em campo dedicado — prompt intacto, spec serializada via JSON.stringify separado"

key-files:
  created: []
  modified:
    - apps/web/src/features/unified-chat/components/confirmation-card.tsx
    - apps/web/src/features/unified-chat/components/render-dispatcher.tsx
    - apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts
    - apps/web/src/features/unified-chat/unified-chat-tool.tsx
    - apps/web/tests/unified-chat-tool.test.tsx

key-decisions:
  - "ConfirmationCard exige campos editáveis (input por campo) — o Plan 02 havia deixado só leitura estática"
  - "lastSubmitInputRef (useRef) em vez de useState para preservar o último input sem triggering re-render"
  - "handleAnswerClarification extrai context do lastSubmitInputRef para manter platform/dialect entre turns"
  - "getByDisplayValue em vez de getByText para assertar valor do input editável do título no CLAR-04"
  - "Auto-aprovado checkpoint:human-verify via auto_advance=true — falhas da suite são pré-existentes (Prisma não gerado no worktree)"

metrics:
  duration: "~25min"
  completed: "2026-06-08T20:05:00Z"
  tasks_completed: 2
  files_changed: 5
---

# Phase 13 Plan 04: Wave 3 — Loop de Clarificação End-to-End (Frontend) Summary

**ClarificationCard e ConfirmationCard com campos editáveis conectados ao RenderDispatcher; overrideGenerate e specOverride no hook; 5 novos testes CLAR-01..04 passando; Phase 13 funcionalmente completa**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-06-08T19:40:00Z
- **Completed:** 2026-06-08T20:05:00Z
- **Tasks:** 2 + 1 checkpoint auto-aprovado
- **Files modified:** 5

## Accomplishments

- `ConfirmationCard` refatorado com campos editáveis: `input type="text"` para título, `input type="text"` por coluna (iterado), `input type="number"` para rowCount — estado `editedSpec` controlado com `setEditedSpec`
- `RenderDispatcher` estendido com dois novos cases (`table_clar_question` → `ClarificationCard`, `table_spec` → `ConfirmationCard`) e três novas props opcionais (`onAnswer`, `onSkip`, `onConfirm`)
- `use-unified-chat-stream`: `SubmitUnifiedChatInput` ganhou `overrideGenerate?: boolean` e `specOverride?: string`; serialização no JSON body e no FormData (uploads)
- `unified-chat-tool`: `lastSubmitInputRef` preserva o último input entre resubmits; `handleAnswerClarification`, `handleSkipClarification`, `handleConfirmSpec` implementados e passados ao `RenderDispatcher` via props
- 5 novos cenários de teste: CLAR-01 (renderização), CLAR-02 (contador de turno), CLAR-03 (skip com overrideGenerate), CLAR-04 (confirmação com specOverride), resposta sem overrideGenerate
- Suite completa: 19/19 em `unified-chat-tool.test.tsx`; falhas pré-existentes em arquivos de Prisma não relacionados

## Task Commits

1. **Task 1: ConfirmationCard com campos editáveis** - `97a9b61` (feat)
2. **Task 2: RenderDispatcher, hook e UnifiedChatTool conectados** - `e5cbbd1` (feat)

## Files Created/Modified

- `apps/web/src/features/unified-chat/components/confirmation-card.tsx` — campos editáveis: `input` para title, `input` por coluna em `columns.map`, `input type="number"` para rowCount; handlers `handleTitleChange`, `handleColumnNameChange`, `handleRowCountChange`; botão "Confirmar e Gerar" chama `onConfirm(editedSpec)`
- `apps/web/src/features/unified-chat/components/render-dispatcher.tsx` — imports `ClarificationCard`, `ConfirmationCard`, `TableClarQuestionPayload`, `TableSpecPayload`; props `onAnswer?`, `onSkip?`, `onConfirm?`; cases `table_clar_question` e `table_spec` antes de `table_stub`
- `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts` — `overrideGenerate?: boolean` e `specOverride?: string` em `SubmitUnifiedChatInput`; `overrideGenerate: input.overrideGenerate ? "true" : undefined` e `specOverride: input.specOverride` no body JSON; mesmos campos via `fd.append` no FormData
- `apps/web/src/features/unified-chat/unified-chat-tool.tsx` — import `TableSpecPayload` e `useRef`; `lastSubmitInputRef` para preservar contexto; `handleAnswerClarification`, `handleSkipClarification`, `handleConfirmSpec`; `onAnswer/onSkip/onConfirm` passados nos dois pontos de `RenderDispatcher`; `table_clar_question` e `table_spec` adicionados a `intentFromPayload`
- `apps/web/tests/unified-chat-tool.test.tsx` — describe `"clarification loop"` com 5 novos cenários; fixtures `clarPayload`, `clarPayloadTurn1`, `tableSpecPayload`; `parseJsonRequestBody` reutilizado; `getByDisplayValue` para assertar valor de input editável

## Decisions Made

- `ConfirmationCard` precisava de campos editáveis — o stub do Wave 0/Plan 02 tinha apenas exibição estática; foi refatorado com inputs controlados conforme o behavior do plano
- `lastSubmitInputRef` usa `useRef` para manter o último `SubmitUnifiedChatInput` disponível nos callbacks sem triggering re-render desnecessário
- `handleAnswerClarification` desestrutura o contexto do ref para passar ao `submitPrompt` — preserva platform, dialect, etc entre turns de clarificação
- CLAR-04 testou `getByDisplayValue("Tabela de Vendas")` em vez de `getByText` porque o título está em `input` editável

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ConfirmationCard sem campos editáveis**
- **Found during:** Task 1 (leitura do stub atual)
- **Issue:** O ConfirmationCard do Plan 02 havia substituído os tipos locais mas mantinha exibição estática (`<p>` e `<li>` somente leitura) sem inputs controlados. O behavior do plano 04 especificava campos editáveis com inputs.
- **Fix:** Refatorado para ter `input type="text"` para título, `input type="text"` por coluna, `input type="number"` para rowCount; handlers de onChange para cada campo; `setEditedSpec` com spread para updates imutáveis.
- **Files modified:** confirmation-card.tsx
- **Committed in:** 97a9b61

**2. [Rule 1 - Bug] CLAR-04: getByText falhou em input editável**
- **Found during:** Task 2 (execução dos testes)
- **Issue:** `screen.getByText("Tabela de Vendas")` falha para elementos `input` — o texto está em `value` do input, não em `textContent`.
- **Fix:** Substituído por `screen.getByDisplayValue("Tabela de Vendas")` que busca por valor de input controlado.
- **Files modified:** unified-chat-tool.test.tsx
- **Committed in:** e5cbbd1

---

**Total deviations:** 2 auto-fixed (Rule 1 - Bug)

## Checkpoint

**Task 3 (checkpoint:human-verify)** — Auto-aprovado via `auto_advance=true`.
- Suite `unified-chat-tool.test.tsx`: 19/19 passando
- Falhas da suite completa são pré-existentes (Prisma não gerado no worktree: `attachment-context.test.ts`, `formula-api.test.ts`, `mercado-pago-webhook.test.ts`, `multi-turn-context.test.ts`, 2 testes de `file-parser.test.ts`)
- Typecheck: sem erros novos nos arquivos modificados

## Known Stubs

Nenhum — todos os componentes têm implementação funcional completa.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-13-12 (mitigado) | confirmation-card.tsx | spec editada pelo usuário viaja em campo dedicado `specOverride` (não sobrescreve `prompt`); re-validada no servidor com `tableSpecPayloadSchema.safeParse` (Plan 03) |
| T-13-13 (mitigado) | clarification-card.tsx | `payload.question` renderizado em `{payload.question}` dentro de `<p>` — textContent automático do React, sem `dangerouslySetInnerHTML` |
| T-13-14 (mitigado) | confirmation-card.tsx | colunas renderizadas via `input value` controlado — sem innerHTML |

## Self-Check: PASSED

- [x] `apps/web/src/features/unified-chat/components/confirmation-card.tsx` tem inputs editáveis para title, columns[].name, rowCount
- [x] `grep "Confirmar e Gerar"` retorna match em confirmation-card.tsx
- [x] `grep "Gerar mesmo assim"` retorna match em clarification-card.tsx
- [x] `grep "table_clar_question"` retorna match em render-dispatcher.tsx
- [x] `grep "table_spec"` retorna match em render-dispatcher.tsx
- [x] `grep "overrideGenerate"` retorna 3 matches em use-unified-chat-stream.ts
- [x] `grep "specOverride"` retorna 3 matches em use-unified-chat-stream.ts
- [x] `grep "specOverride"` retorna match em unified-chat-tool.tsx
- [x] `grep "onSkip\|handleSkip"` retorna 3 matches em unified-chat-tool.tsx
- [x] `grep "onConfirm\|handleConfirm"` retorna 3 matches em unified-chat-tool.tsx
- [x] Commit 97a9b61 existe (Task 1)
- [x] Commit e5cbbd1 existe (Task 2)
- [x] `unified-chat-tool.test.tsx`: 19/19 testes passando
- [x] Nenhum erro TypeScript novo nos arquivos modificados

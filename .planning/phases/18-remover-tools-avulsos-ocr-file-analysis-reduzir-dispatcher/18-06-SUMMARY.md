---
phase: 18-remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher
plan: 06
subsystem: cleanup
tags: [unified-chat, schemas, render-dispatcher, route, tests]
requires:
  - phase: 18-05
    provides: intent classifier and route reduced to binary labels (sheet_operation/qa)
provides:
  - unifiedCompletePayloadSchema reduced to tableSpecPayloadSchema + qaResponsePayloadSchema
  - render-dispatcher.tsx reduced to table_spec (TableGridPanel) + qa_response + default null
  - ClarificationCard, ConfirmationCard, TableIntentStub deleted
  - route.ts binaryIntentStream emits qa_response payload instead of table_stub
affects: [unified-chat, schemas, render-dispatcher, route, tests]
tech-stack:
  added: []
  patterns:
    - Reduced unified complete-payload union to grade (table_spec) + Q&A (qa_response)
    - Defensive default null in render-dispatcher for unknown legacy kinds
key-files:
  created: []
  modified:
    - packages/shared/src/unified-chat/schema.ts
    - apps/web/src/features/unified-chat/components/render-dispatcher.tsx
    - apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts
    - apps/web/src/features/unified-chat/unified-chat-tool.tsx
    - apps/web/src/app/api/chat/unified/route.ts
    - apps/web/tests/unified-schema.test.ts
    - apps/web/tests/unified-route.test.ts
    - apps/web/tests/unified-chat-tool.test.tsx
  deleted:
    - apps/web/src/features/unified-chat/components/clarification-card.tsx
    - apps/web/src/features/unified-chat/components/confirmation-card.tsx
    - apps/web/src/features/unified-chat/components/table-intent-stub.tsx
key-decisions:
  - "unifiedCompletePayloadSchema reduzido ao union table_spec (grade preservada) + qa_response (payload textual mínimo). Definições legadas (tableStub/tableClarQuestion/needsFile/fileAnalysis/ocr/fileBackedMetadata) e os payloads de formula/sql/regex/script/template removidos por não terem mais consumidores."
  - "unifiedStreamEventSchema: eventos needs_file e quota_warning removidos (sem emissor após Phase 17/Plan 05)."
  - "Removido o tipo transitório FileDependentIntent (alias de OverrideIntent) que o Plan 05 deixou para compatibilidade — sem consumidor restante."
  - "render-dispatcher.tsx: case table_spec preservado (hasRows -> TableGridPanel; sem rows -> null), novo case qa_response (QaResponseCard), default null defensivo para kinds legados de exchanges antigas."
  - "intent-pill.tsx já estava reduzido a sheet_operation/qa desde o Plan 05 — nenhuma mudança necessária neste plano."
  - "Removidos os handlers órfãos handleAnswerClarification/handleSkipClarification/handleConfirmSpec e os props attachmentMeta/onAnswer/onSkip/onConfirm das chamadas do RenderDispatcher (fluxo de clarificação/confirmação eliminado com a deleção dos componentes)."
requirements-completed: [CLEAN-07]
requirements-progress: [CLEAN-06]
duration: ~25 min (retomado de sessão interrompida)
completed: 2026-06-14
---

# Phase 18 Plan 06: Redução do Schema de Payload e do Render Dispatcher (Summary)

**O `unifiedCompletePayloadSchema` e o `render-dispatcher.tsx` foram reduzidos ao que serve "operação na planilha" (`table_spec` via `TableGridPanel`, preservado) + "Q&A" (`qa_response`, payload textual novo), e os 3 componentes exclusivos da geração de tabela do zero (`ClarificationCard`, `ConfirmationCard`, `TableIntentStub`) foram deletados.**

## Desempenho

- **Duração:** ~25 min (plano retomado de sessão interrompida via /gsd-resume-work)
- **Concluído em:** 2026-06-14
- **Arquivos modificados:** 8 modificados + 3 deletados
- **Líquido:** ~+178 / −948 linhas

## Conquistas

- **Schema reduzido:** `unifiedCompletePayloadSchema` agora é o union `tableSpecPayloadSchema | qaResponsePayloadSchema`. Adicionado `qaResponsePayloadSchema = { kind: "qa_response", content }`. Removidos do union e das definições: `tableStubPayloadSchema`, `tableClarQuestionPayloadSchema`, `needsFilePayloadSchema`, `fileAnalysisPayloadSchema`, `ocrPayloadSchema`, `fileBackedPayloadMetadataSchema` e os payloads de formula/sql/regex/script/template (zero consumidores confirmado via grep).
- **Eventos de stream removidos:** `needs_file` e `quota_warning` saíram de `unifiedStreamEventSchema`.
- **RenderDispatcher enxuto:** cases legados (formula/sql/regex/script/template/file_analysis/ocr/needs_file/table_clar_question/table_stub) e os componentes locais `FileBackedOutput`/`NeedsFileCard` removidos. `case table_spec` preservado (`hasRows -> TableGridPanel`, senão `null`); novo `case qa_response` renderiza `QaResponseCard`; `default: return null` defensivo.
- **Componentes deletados:** `ClarificationCard`, `ConfirmationCard`, `TableIntentStub` — zero referências restantes confirmadas via grep.
- **Route alinhado:** `binaryIntentStream` em `route.ts` emite payload `qa_response` (antes `table_stub`); assinatura simplificada (parâmetro `prompt` removido).
- **Hook limpo:** branch morto `if ("warnings" in event.payload)` removido de `use-unified-chat-stream.ts` (payloads reduzidos não carregam `warnings`).
- **Testes ajustados:** `unified-schema.test.ts`, `unified-route.test.ts` e `unified-chat-tool.test.tsx` reescritos para o contrato de payload reduzido.

## Decisões Tomadas

- **Limpeza do fluxo de clarificação/confirmação:** a deleção de `ClarificationCard`/`ConfirmationCard` tornou órfãos os handlers `handleAnswerClarification`/`handleSkipClarification`/`handleConfirmSpec` e os props `attachmentMeta`/`onAnswer`/`onSkip`/`onConfirm` — todos removidos das chamadas do `RenderDispatcher` em `unified-chat-tool.tsx`. Import `TableSpecPayload` (agora sem uso) também removido.
- **`intent-pill.tsx` sem mudanças:** já fora reduzido a `sheet_operation`/`qa` no Plan 05.

## Issues Encontrados

- **Sessão anterior interrompida no meio da limpeza de typecheck.** `pnpm -r typecheck` falhava no pacote `web` com 3 erros (caller cleanup pendente): `setWarnings(event.payload.warnings)` com tipo `unknown`, e `attachmentMeta` passado a um `RenderDispatcher` que não o aceita mais. Resolvidos removendo o branch/props mortos.
- **Teste de render do `table_spec` com rows:** o novo render test exercita `TableGridPanel`, que usa `react-resize-detector` (ResizeObserver). jsdom não implementa — adicionado o mesmo polyfill mínimo já usado em `table-grid-panel.test.tsx`/`layout.test.tsx`. A asserção de valor de célula (`getByText("A")`) era frágil (grade virtualizada não renderiza texto plano em jsdom); substituída pela asserção da toolbar exclusiva da grade (`getByLabelText("Adicionar linha")`).

## Verificação

- `pnpm -r typecheck` -> OK (shared + web)
- `pnpm --filter web test` -> OK, 21 files, 251 passed, 1 skipped (NDJSON flaky conhecido)

---
phase: 19-ingestao-tri-estado-da-planilha
plan: 02
subsystem: spreadsheet-ingestion
tags: [ui, import, upload, undo-redo, tests]
requires:
  - phase: 19-01
    provides: WorkspaceStateContext + POST /api/workspace/import route
provides:
  - Controles de ingestão na toolbar (Nova em Branco / Carregar Exemplo / Importar Planilha)
  - Input de arquivo oculto + fetch POST multipart para /api/workspace/import
  - Overlay de loading e banner de erro em pt-BR no painel da planilha
  - Suíte de testes de componente cobrindo reset, importação (sucesso/erro) e undo de ingestão
affects: [ui, grid, import, tests]
tech-stack:
  added: []
  patterns:
    - Upload de arquivo via input oculto acionado por ref + FormData multipart
    - Overlay de bloqueio posicionado sobre o container do grid (position relative/absolute)
    - Banner de erro acima da toolbar preservando o estado anterior na falha
key-files:
  created: []
  modified:
    - apps/web/src/features/unified-chat/components/table-grid-panel.tsx
    - apps/web/tests/table-grid-panel.test.tsx
key-decisions:
  - "Controles de ingestão renderizados apenas no grid principal (sem propSpec); balões de chat históricos não exibem botões de ingestão para preservar previews estáticos."
  - "Importação aciona context.setSpec (RESET_TO_SEED) garantindo entrada no histórico de undo/redo; falha não toca o estado, apenas exibe banner e mantém a grade intacta."
  - "Seletor de arquivo é limpo (input.value = '') após cada tentativa para permitir reimportar o mesmo arquivo."
requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04]
duration: 5 min
completed: 2026-06-14
status: complete
---

# Phase 19 Plan 02: Controles de UI e Ingestão da Planilha (Summary)

**Implementação de JWT-free file upload e controles de tri-estado da planilha: botões Nova em Branco, Carregar Exemplo e Importar Planilha integrados ao WorkspaceStateContext, com overlay de loading, banner de erro pt-BR e suporte a undo/redo da ingestão.**

## Desempenho

- **Duração:** ~5 min
- **Concluído em:** 2026-06-14
- **Tarefas:** 2 concluídas
- **Arquivos modificados:** 2

## Conquistas

- **Controles de ingestão na toolbar:** Adicionados os botões "Nova em Branco" (`context.resetToBlank()`), "Carregar Exemplo" (`context.resetToSeed()`) e "Importar Planilha" (aciona o seletor de arquivos via ref) no [table-grid-panel.tsx](file:///home/rodrigo/tabelin.ia/apps/web/src/features/unified-chat/components/table-grid-panel.tsx). Renderizados apenas no grid principal (`!propSpec`), preservando os previews estáticos dos balões de chat.
- **Upload multipart:** Input de arquivo oculto (`accept=".csv,.xlsx,..."`) + `handleFileChange` que monta `FormData`, faz `fetch POST /api/workspace/import` e, no sucesso, aciona `context.setSpec(payload)` — entrando no histórico de undo/redo.
- **Estados de loading e erro:** Estado local `loading` exibe o `table-grid-loading-overlay` ("Importando planilha...") sobre o grid; estado `importError` exibe um banner `role="alert"` acima da toolbar com botão "Fechar erro". Na falha, o estado anterior da grade permanece intacto.
- **Suíte de testes verde:** 5 novos blocos de teste em [table-grid-panel.test.tsx](file:///home/rodrigo/tabelin.ia/apps/web/tests/table-grid-panel.test.tsx) cobrindo Nova em Branco, Carregar Exemplo, importação com sucesso (fetch mockado), importação com erro (422 → banner + estado preservado) e undo de ingestão via Ctrl+Z focado no grid. Total de 24 testes passando no arquivo.

## Decisões Tomadas

- **Controles só no grid principal:** Os botões de ingestão checam `!propSpec` para não aparecerem em renders de balões de chat históricos (que recebem `spec` estático), mantendo a coerência do tri-estado apenas na planilha viva da tela principal.
- **Falha não muta estado:** O handler de importação só chama `context.setSpec` no caminho de sucesso; qualquer erro (HTTP não-2xx ou exceção de rede) apenas popula `importError`, garantindo o requisito DATA-04 de preservação do estado anterior.
- **Reimportação do mesmo arquivo:** `input.value` é limpo no `finally`, permitindo selecionar o mesmo arquivo novamente (o `change` não dispara se o valor não muda).

## Deviations from Plan

None - plan executed exactly as written.

## Verificação

- `pnpm exec prisma generate` -> OK (evita falso-positivo `.prisma/client/default` em árvore divergente)
- `pnpm -r typecheck` -> OK (Task 1)
- `pnpm --filter web test table-grid-panel.test.tsx` -> 24 testes passando (Task 2)

## Self-Check: PASSED

- FOUND: apps/web/src/features/unified-chat/components/table-grid-panel.tsx
- FOUND: apps/web/tests/table-grid-panel.test.tsx
- FOUND commit ae8856b (feat Task 1)
- FOUND commit 5032b8e (test Task 2)

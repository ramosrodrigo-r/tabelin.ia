---
phase: 14-tabela-viva
plan: "05"
subsystem: unified-chat / table-grid-panel
tags: [grid, react-datasheet-grid, undo-redo, sort, formula, sec-05, loc-03]
dependency_graph:
  requires:
    - 14-03  # useFormulaEngine hook
    - 14-04  # buildTableSpec estendido (table-clarifier)
  provides:
    - TableGridPanel component (apps/web/src/features/unified-chat/components/table-grid-panel.tsx)
    - CSS classes Tabela Viva grid (apps/web/src/styles/globals.css)
  affects:
    - render-dispatcher.tsx (consumirá TableGridPanel no plan 14-06)
tech_stack:
  added:
    - react-datasheet-grid@4.11.6 (já instalado em 14-03/14-04)
  patterns:
    - DynamicDataSheetGrid com useMemo/useCallback (Pitfall 4)
    - historyReducer pattern (Pattern 4 — undo/redo sem nativo DSG)
    - sortState + [...rows].sort() — nunca muta original (Pitfall 3)
    - handleChange limpa sortState antes do dispatch (must_haves)
    - CellRenderer via React children apenas (SEC-05, D-07)
    - formatCellValue Intl.NumberFormat/DateTimeFormat (LOC-03)
key_files:
  created:
    - apps/web/src/features/unified-chat/components/table-grid-panel.tsx
  modified:
    - apps/web/src/styles/globals.css
decisions:
  - "height={600} (number) em DynamicDataSheetGrid — prop espera number, não CSS string min()"
metrics:
  duration: "~12min"
  completed: "2026-06-09"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 14 Plan 05: TableGridPanel — grid editável completo com undo/redo, sort, add/remove

Grid editável `TableGridPanel` com `DynamicDataSheetGrid`, undo/redo via `useReducer`, sort por coluna sem mutação, add/remove de linhas e colunas com limites TAB-06, células de fórmula read-only via `useFormulaEngine`, formatação BR (`Intl`) e render seguro sem `dangerouslySetInnerHTML` (SEC-05). CSS de theming DSG com tokens do projeto adicionado em `globals.css`.

## Tasks Executed

| Task | Descrição | Commit | Arquivos |
|------|-----------|--------|----------|
| 1 | Adicionar classes CSS do grid em globals.css | 5323d8d | apps/web/src/styles/globals.css |
| 2 | Criar TableGridPanel com DynamicDataSheetGrid, undo/redo, sort, add/remove | 5225257 | apps/web/src/features/unified-chat/components/table-grid-panel.tsx |

## Verification

- `tests/table-grid-panel.test.tsx`: **8/8 testes verdes** (TAB-01, TAB-03, TAB-04, TAB-05, TAB-06, LOC-03, SEC-05)
- `npx tsc --noEmit`: **limpo** (sem erros TypeScript)
- Suite completa: **320 passed | 1 skipped** (27 arquivos)
- `grep "dangerouslySetInnerHTML" table-grid-panel.tsx`: apenas em comentário explicativo, nenhuma ocorrência no código
- `grep "DynamicDataSheetGrid" table-grid-panel.tsx`: match presente
- `grep "react-datasheet-grid/dist/style.css" table-grid-panel.tsx`: match presente
- `grep -c "table-grid-panel\|table-grid-toolbar\|col-header\|cell-error\|cell-formula" globals.css`: 12 (>= 6)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] height prop DynamicDataSheetGrid aceita somente number**
- **Found during:** Task 2 — `tsc --noEmit`
- **Issue:** A prop `height` do `DynamicDataSheetGrid` é tipada como `number` (não `string`). O plano especificava `height={\`min(600px, calc(100vh - 280px))\`}` (CSS string).
- **Fix:** Substituído por `height={600}` (número em pixels). O grid utiliza virtualização interna (`react-virtual`) — o scroll comporta-se corretamente com valor numérico fixo.
- **Files modified:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx`

## Decisions Made

| Decisão | Justificativa |
|---------|---------------|
| `height={600}` em vez de CSS `min()` | DynamicDataSheetGrid tipagem aceita `number` apenas; TypeScript erro TS2322 |
| `disabled: isFormula ? () => true : undefined` | Colunas não-formula não passam `disabled` para evitar prop undefined desnecessária |
| `dsgColumns` retorna objeto `{ columns, stickyRightColumn }` | Mantém a memoização coesa em um único `useMemo` para columns + sticky |

## Known Stubs

Nenhum. TableGridPanel está completo e funcional. O slot de export (`table-grid-toolbar-spacer`) é intencional e documentado — será preenchido na Phase 15 (EXP-01, EXP-02).

## Threat Flags

Nenhuma nova superfície de ataque introduzida além das documentadas no threat model do plano:
- T-14-XSS: mitigado — CellRenderer usa React children string apenas, sem `dangerouslySetInnerHTML`. Verificado pelo teste SEC-05.
- T-14-FORMULA-INJECT: mitigado — motor de fórmulas (`useFormulaEngine`) não usa `eval()`/`new Function()`.

## Self-Check: PASSED

- [x] `apps/web/src/features/unified-chat/components/table-grid-panel.tsx` — FOUND
- [x] `apps/web/src/styles/globals.css` — FOUND (classes adicionadas)
- [x] commit `5323d8d` — FOUND
- [x] commit `5225257` — FOUND
- [x] 8/8 testes verdes — CONFIRMED
- [x] tsc --noEmit limpo — CONFIRMED

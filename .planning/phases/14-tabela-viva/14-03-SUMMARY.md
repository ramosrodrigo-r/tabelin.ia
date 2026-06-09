---
phase: 14-tabela-viva
plan: "03"
subsystem: ui
tags: [formulajs, formula-engine, pt-br, vlookup, sumif, react-hooks, usememo]

requires:
  - phase: 14-02
    provides: translateFunctionName, PT_BR_TO_EN, TableColumn type, tableSpecPayloadSchema estendido

provides:
  - "useFormulaEngine hook: recalcula colunas formula via useMemo, retorna displayRows derivado"
  - "evaluateFormula: função pura testável, traduz PT-BR→EN, converte separadores BR, delega ao formulajs"
  - "parseA1, parseRange, extractRange (2D): resolução de referências de célula sem eval()"
  - "recalcAll: recálculo de linhas com template {row}, spread de objetos (rawRows nunca mutados)"
  - "Validação empírica: PROCV, SOMASE, SE com formulajs real — concern STATE.md resolvido"

affects:
  - 14-04 (table-grid-panel usa useFormulaEngine)
  - 14-05 (table-clarifier gera fórmulas que o motor avalia)
  - 14-06 (render-dispatcher conecta payload ao grid)

tech-stack:
  added: []
  patterns:
    - "Motor de fórmulas como módulo isolado com funções puras exportadas — testável sem React"
    - "Detecção de ciclo via Set global de avaliações em andamento — #CIRC! sem stack overflow"
    - "resolveArgument: lookup de variáveis named (objeto) ou array direto (sentinela implícito)"
    - "parseFormulaArgs: split respeitando strings entre aspas e parênteses aninhados"
    - "evaluateComparison: comparações simples sem eval() — operadores =, <>, >, <, >=, <="

key-files:
  created:
    - apps/web/src/features/unified-chat/hooks/use-formula-engine.ts
  modified: []

key-decisions:
  - "evaluateFormula recebe (formula, data, opts?) onde data pode ser array 2D, Record de arrays ou {} — adapter para os diferentes tipos de referência no test scaffold"
  - "evaluateComparison implementado sem eval() para suportar expressões lógicas como 1=1 dentro de =SE()"
  - "Set evaluating global (module-scope) detecta ciclos — por ser módulo compartilhado há coordenação natural entre chamadas aninhadas"
  - "recalcAll usa evaluateFormulaCells (versão interna que passa rows/columns reais) em vez de evaluateFormula público (que usa data context)"

patterns-established:
  - "Pattern: formulajs[enFnName](...args) — dispatch dinâmico por nome, sem eval, sem new Function"
  - "Pattern: extractRange() sempre retorna (string|number)[][] 2D para satisfazer VLOOKUP (Pitfall 1)"
  - "Pattern: spread row objects em recalcAll — displayRows derivado, rawRows imutáveis (Pitfall 2)"

requirements-completed:
  - TAB-02
  - LOC-01
  - LOC-02

duration: 12min
completed: "2026-06-09"
---

# Phase 14 Plan 03: Motor de Fórmulas Summary

**Hook useFormulaEngine com funções puras sobre @formulajs/formulajs — PROCV/SOMASE/SE pt-BR validados empiricamente, separadores BR convertidos, ciclos detectados sem eval()**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-09T18:14:00Z
- **Completed:** 2026-06-09T18:26:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `use-formula-engine.ts` criado com todas as funções puras exportadas (`parseA1`, `parseRange`, `extractRange`, `parseFormulaArgs`, `evaluateFormula`, `recalcAll`) e hook `useFormulaEngine`
- formula-engine.test.ts: 18/18 testes verdes — concern STATE.md resolvido: PROCV, SOMASE, SE avaliam corretamente com formulajs real
- Pitfall 1 prevenido: `extractRange()` retorna `(string|number)[][]` 2D (VLOOKUP exige isso)
- Pitfall 2 prevenido: `recalcAll` spread objetos, `displayRows` via `useMemo` — `rawRows` nunca sobrescritos
- Segurança T-14-FORMULA: nenhum `eval()` ou `new Function()` no arquivo; função não mapeada → `#NAME?`
- Segurança T-14-CIRC: `Set evaluating` detecta ciclos antes do stack overflow → `#CIRC!`

## Task Commits

1. **Task 1: Criar use-formula-engine.ts com funções puras e hook** - `88290ce` (feat)

**Plan metadata:** (commitado após este SUMMARY)

## Files Created/Modified

- `apps/web/src/features/unified-chat/hooks/use-formula-engine.ts` — Motor de fórmulas: parseA1/parseRange/extractRange, evaluateFormula com tradução PT-BR→EN e separadores BR, recalcAll, useFormulaEngine hook

## Decisions Made

- **API de evaluateFormula**: o test scaffold usa `(formula, data, opts?)` onde `data` pode ser array 2D (para PROCV), objeto com arrays nomeados (para SOMASE) ou `{}`. Implementado resolver que aceita os três casos — identifica arrays implicitamente pelo tipo.
- **evaluateComparison sem eval()**: expressões lógicas simples como `1=1` dentro de `=SE()` são avaliadas com parser de operadores `=`, `<>`, `>`, `<`, `>=`, `<=` — sem delegação a JavaScript eval.
- **Two-tier de avaliação**: `evaluateFormula` (pública, usa data context) vs `evaluateFormulaCells` (interna, usa rows/columns reais) para separar os dois casos de uso sem poluir a API pública.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] API de evaluateFormula adaptada ao contrato real do test scaffold**
- **Found during:** Task 1 (análise do formula-engine.test.ts existente)
- **Issue:** O plano especificava `evaluateFormula(formula, rows, columns, separator?)` mas o test scaffold (criado em Wave 0 / Plan 14-01) usa `(formula, data, opts?)` onde `data` é um contexto flexível
- **Fix:** Implementado `evaluateFormula` com assinatura compatível com o test scaffold; adicionado `evaluateFormulaCells` interno para recalcAll usar rows/columns tipados
- **Files modified:** `apps/web/src/features/unified-chat/hooks/use-formula-engine.ts`
- **Verification:** 18/18 testes verdes — ambas as APIs funcionam
- **Committed in:** 88290ce (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — adaptação de API para match com test scaffold existente)
**Impact on plan:** Nenhum impacto negativo — a adaptação tornou o código mais testável e compatível com o contrato que o Wave 0 estabeleceu.

## Issues Encountered

Nenhum — implementação direta com base no research e patterns.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `useFormulaEngine` pronto para ser importado pelo `TableGridPanel` (Plan 14-04)
- Funções puras exportadas permitem testes unitários adicionais em plans futuros
- Concern STATE.md resolvido: PT_BR_TO_EN validado empiricamente com formulajs real

## Threat Flags

Nenhuma superfície nova além do que o threat_model do plano já cobriu.

## Self-Check: PASSED

- [x] `apps/web/src/features/unified-chat/hooks/use-formula-engine.ts` — FOUND
- [x] `.planning/phases/14-tabela-viva/14-03-SUMMARY.md` — FOUND
- [x] commit `88290ce` — FOUND

---
*Phase: 14-tabela-viva*
*Completed: 2026-06-09*

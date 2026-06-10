---
phase: 14-tabela-viva
plan: "01"
subsystem: tabela-viva
tags: [tdd, scaffold, wave-0, formula-engine, table-grid, packages]
dependency_graph:
  requires: []
  provides:
    - apps/web/tests/formula-engine.test.ts
    - apps/web/tests/table-grid-panel.test.tsx
    - apps/web/tests/unified-schema.test.ts (extended)
    - apps/web/tests/table-clarifier.test.ts (extended)
  affects:
    - Wave 1 (formula engine, PT_BR_TO_EN map, use-formula-engine hook)
    - Wave 2 (TableGridPanel component)
    - packages/shared schema extension (tableSpecPayloadSchema)
tech_stack:
  added:
    - react-datasheet-grid@4.11.6 (MIT, dependency)
    - "@formulajs/formulajs@4.6.0 (MIT, dependency)"
  patterns:
    - skip-graceful (try/catch require + guard in each it-block)
    - dynamic require for Wave N modules not yet implemented
key_files:
  created:
    - apps/web/tests/formula-engine.test.ts
    - apps/web/tests/table-grid-panel.test.tsx
  modified:
    - apps/web/tests/unified-schema.test.ts
    - apps/web/tests/table-clarifier.test.ts
    - apps/web/package.json
    - pnpm-lock.yaml
decisions:
  - "skip-graceful via dynamic require (não static import) — Vite resolve imports estáticos mesmo com @ts-ignore; try/catch em require é o único padrão que funciona para módulos inexistentes"
  - "14 it-blocks em formula-engine.test.ts cobrindo PT_BR_TO_EN map, parseA1, evaluateFormula (PROCV, SOMASE, SE), separadores BR e detecção de ciclo"
  - "7 it-blocks em table-grid-panel.test.tsx cobrindo render, XSS (SEC-05), LOC-03, TAB-06, TAB-03, TAB-04, TAB-05"
metrics:
  duration: "~12 min"
  completed: "2026-06-09"
  tasks_completed: 2
  files_changed: 6
---

# Phase 14 Plan 01: Wave 0 Scaffold — Dependências + Testes Summary

Instalação de react-datasheet-grid@4.11.6 e @formulajs/formulajs@4.6.0 via pnpm; criação dos 4 arquivos de teste Wave 0 com padrão skip-graceful para módulos das ondas seguintes; suite completa verde.

## What Was Built

**Task 1 (pre-aprovado):** Vettagem humana dos pacotes npm foi concluída antes da instalação. Ambos os pacotes foram verificados no registro npm e aprovados pelo usuário.

**Task 2:** Instalação das dependências e criação dos scaffolds de teste.

### Dependências instaladas

- `react-datasheet-grid@^4.11.6` — grid editável para spreadsheet; MIT; autor nick-keller
- `@formulajs/formulajs@^4.6.0` — motor de fórmulas compatível com Excel/Google Sheets; MIT; escopo @formulajs

### Arquivos criados

**`apps/web/tests/formula-engine.test.ts`** (14 it-blocks):
- `describe("PT_BR_TO_EN map")` — 6 casos: PROCV→VLOOKUP, SOMASE→SUMIF, SE→IF, CONT.SE→COUNTIF, SOMA→SUM, MÉDIA→AVERAGE (LOC-01)
- `describe("parseA1")` — 4 casos: B3, A1, Z10, ref inválida
- `describe("evaluateFormula — PROCV")` — 2 casos empíricos com formulajs real (resolve concern STATE.md)
- `describe("evaluateFormula — SOMASE")` — 1 caso com soma filtrada
- `describe("evaluateFormula — SE")` — 2 casos verdadeiro/falso
- `describe("separadores BR")` — 2 casos: ponto-e-vírgula como separador, string literal
- `describe("detecção de ciclo")` — 1 caso #CIRC!

**`apps/web/tests/table-grid-panel.test.tsx`** (7 it-blocks):
- `describe("render / TAB-01")` — 2 casos: renderiza título, spec mínima
- `describe("SEC-05 XSS")` — 1 caso: `<script>` não executa
- `describe("LOC-03 formatação BR")` — 1 caso: R$ no DOM
- `describe("TAB-06 virtualização")` — 1 caso: 200 linhas sem crash
- `describe("TAB-03 add/remove")` — 1 caso: estado inicial
- `describe("TAB-04 undo/redo")` — 1 caso: Ctrl+Z sem erro
- `describe("TAB-05 sort")` — 1 caso: não muta array original

### Arquivos estendidos

**`apps/web/tests/unified-schema.test.ts`** (5 novos it-blocks em `describe("tableSpecPayloadSchema — campos Phase 14")`):
- Retrocompat Phase 13 (sem rows)
- Phase 14: rows + colunas formula
- Rejeita rows com objeto aninhado (SEC — T-14-INPUT)
- Aceita formulaLanguage pt-BR
- Aceita separator ";"

**`apps/web/tests/table-clarifier.test.ts`** (4 novos it-blocks em `describe("buildTableSpec — fixture estendida Phase 14")`):
- rows com >= 1 entrada
- Coluna com type "formula" e campo formula definido
- formulaLanguage "pt-BR"
- separator ";"

## Verification Results

```
Test Files  27 passed (27)
     Tests  320 passed | 1 skipped (321)
  Duration  ~29s
```

Suite completa verde. Todos os scaffolds passam via skip-graceful enquanto os módulos Wave 1/2 não existem.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Static imports com @ts-ignore não funcionam para módulos inexistentes no Vite**
- **Found during:** Task 2 — primeira execução dos testes
- **Issue:** Vite/Vitest resolve imports estáticos em tempo de transformação, mesmo com `@ts-ignore`. Módulos que não existem ainda (Wave 1/2) causam `Failed to resolve import` e travam a suite inteira.
- **Fix:** Convertidos todos os imports de módulos Wave 1+ para `require()` dinâmico dentro de `try/catch`, igual ao padrão já usado em `unified-schema.test.ts` para os schemas do Plan 02. Variáveis declaradas como `let` e atribuídas condicionalmente.
- **Files modified:** `apps/web/tests/formula-engine.test.ts`, `apps/web/tests/table-grid-panel.test.tsx`
- **Commit:** 9689149

## Known Stubs

Nenhum stub nos arquivos de produção — este plano cria apenas arquivos de teste scaffold. Os stubs intencionais são os guards skip-graceful em cada `it`-block, documentados acima.

## Threat Flags

Nenhuma nova superfície de segurança introduzida. Os scaffolds de teste cobrem:
- T-14-SC: pacotes vettados e instalados (Task 1 aprovada)
- T-14-XSS-SCAFFOLD: teste SEC-05 criado em table-grid-panel.test.tsx
- T-14-INPUT-SCAFFOLD: teste de rejeição de rows aninhados criado em unified-schema.test.ts

## Self-Check: PASSED

- [x] `apps/web/tests/formula-engine.test.ts` existe
- [x] `apps/web/tests/table-grid-panel.test.tsx` existe
- [x] `apps/web/tests/unified-schema.test.ts` modificado (5 novos it-blocks)
- [x] `apps/web/tests/table-clarifier.test.ts` modificado (4 novos it-blocks)
- [x] `apps/web/package.json` contém react-datasheet-grid e @formulajs/formulajs
- [x] Commit 9689149 existe
- [x] 27 test files, 320 tests, 0 failures

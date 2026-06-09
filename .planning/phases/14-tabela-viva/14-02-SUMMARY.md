---
phase: 14-tabela-viva
plan: "02"
subsystem: shared-contracts
tags: [schema, zod, formula-locale, pt-BR, tabela-viva]
dependency_graph:
  requires: [14-01]
  provides: [tableColumnSchema, tableSpecPayloadSchema-extended, PT_BR_TO_EN, translateFunctionName]
  affects: [table-clarifier, render-dispatcher, use-formula-engine, TableGridPanel]
tech_stack:
  added: []
  patterns: [zod-sub-schema-composition, pure-data-export, barrel-re-export]
key_files:
  created:
    - packages/shared/src/table/formula-locale.ts
  modified:
    - packages/shared/src/unified-chat/schema.ts
    - packages/shared/src/index.ts
decisions:
  - "Campos novos em tableSpecPayloadSchema são todos optional() — retrocompatibilidade com Phase 13 garantida (D-01)"
  - "tableColumnSchema declarado antes de tableSpecPayloadSchema — composição por referência, sem duplicação"
  - "Alias triplo CONT.SE / CONT_SE / CONTSE no mapa PT_BR_TO_EN para cobrir variações do extrator de nome de função"
metrics:
  duration_minutes: 8
  completed_date: "2026-06-09"
  tasks_completed: 2
  files_changed: 3
---

# Phase 14 Plan 02: Contratos Compartilhados — Schema Estendido e Mapa de Localização

Schema `tableSpecPayloadSchema` estendido com `rows`, `formulaLanguage`, `separator` e colunas tipo `formula`; mapa `PT_BR_TO_EN` com 30 funções pt-BR→EN criado como módulo puro em `@tabelin/shared`.

## O Que Foi Construído

### Task 1: Extensão de tableSpecPayloadSchema

O schema em `packages/shared/src/unified-chat/schema.ts` foi estendido sem quebrar retrocompatibilidade com a Phase 13:

- **`tableColumnSchema`** novo (sub-schema): campos `name`, `type` (enum incluindo `"formula"`), `key`, `formula`, `width`.
- **`tableSpecPayloadSchema`** atualizado: `columns` agora usa `z.array(tableColumnSchema)` em vez do objeto inline. Três campos opcionais adicionados: `rows`, `formulaLanguage`, `separator`.
- **`TableColumn`** type exportado junto com o existente `TableSpecPayload`.

A union `unifiedCompletePayloadSchema` que inclui `tableSpecPayloadSchema` não precisou de alteração estrutural — o schema membro foi atualizado automaticamente.

### Task 2: formula-locale.ts e barrel export

Criado `packages/shared/src/table/formula-locale.ts` — arquivo TypeScript puro sem dependências externas:

- **`PT_BR_TO_EN`**: 30 entradas cobrindo Matemáticas (SOMA, SOMASE, SOMASES, MÉDIA, MÉDIASE, MÁXIMO, MÍNIMO, ABS, ARRED, MOD, RAIZ, POTÊNCIA), Lógica (SE, E, OU, NÃO), Contagem (CONT, CONTA, CONT.SE, CONT_SE, CONTSE), Busca (PROCV, PROCH, ÍNDICE, CORRESP), Texto (CONCATENAR, TEXTO, ESQUERDA, DIREITA, NÚM_CARACT), Data (HOJE, AGORA, ANO, MÊS, DIA).
- **`FormulaBRFunctionName`**: tipo utilitário = `keyof typeof PT_BR_TO_EN`.
- **`translateFunctionName(brName)`**: case-insensitive, retorna `null` para funções não mapeadas.
- `packages/shared/src/index.ts` recebeu `export * from "./table/formula-locale"` na seção Phase 14.

## Verificação

- `pnpm --filter web exec vitest run tests/unified-schema.test.ts` — **19/19 passed**
- `pnpm --filter web exec vitest run tests/formula-engine.test.ts` — **18/18 passed**
- `pnpm --filter @tabelin/shared exec tsc --noEmit` — **sem erros**
- 37 testes no total: 100% verde

## Commits

| Task | Hash | Descrição |
|------|------|-----------|
| 1 | ee71af3 | feat(14-02): extend tableSpecPayloadSchema with tableColumnSchema |
| 2 | 1f77ba5 | feat(14-02): add formula-locale.ts with PT_BR_TO_EN map and barrel export |

## Deviations from Plan

None — plano executado exatamente como escrito.

## Threat Surface Scan

Nenhuma nova superfície de segurança introduzida: `formula-locale.ts` é uma tabela de constantes estáticas sem entrada de usuário. A extensão do schema adiciona validação (rows aceita apenas `string|number` — T-14-INPUT mitigado conforme o threat register).

## Self-Check: PASSED

- [x] `packages/shared/src/table/formula-locale.ts` — FOUND
- [x] `packages/shared/src/unified-chat/schema.ts` — FOUND (modificado)
- [x] `packages/shared/src/index.ts` — FOUND (modificado)
- [x] Commit ee71af3 — FOUND
- [x] Commit 1f77ba5 — FOUND

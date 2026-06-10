---
phase: 14-tabela-viva
plan: "04"
subsystem: backend-ai
tags:
  - table-clarifier
  - buildTableSpec
  - fixture-mode
  - seed-data
  - formulas
  - pt-BR
dependency_graph:
  requires:
    - 14-02  # tableSpecPayloadSchema estendido com rows/formulaLanguage/separator
  provides:
    - buildTableSpec fixture com rows + formula column + formulaLanguage + separator
    - buildSpecSystemPrompt instruindo LLM a gerar seed data e fórmulas pt-BR
  affects:
    - 14-06  # render-dispatcher detecta rows.length > 0 → TableGridPanel
tech_stack:
  added: []
  patterns:
    - fixture-mode-sem-api-key
    - structured-outputs-zod-response-format
    - json-object-fallback
key_files:
  modified:
    - apps/web/src/server/ai/table-clarifier.ts
decisions:
  - "Fixture estendida usa título fixo 'Controle de Gastos' com 5 linhas de dados realistas (Aluguel/Moradia, Supermercado/Alimentação, Internet/Serviços, Academia/Saúde, Netflix/Lazer)"
  - "buildSpecSystemPrompt instrui LLM a NÃO usar {row} dentro de ranges e NÃO gerar refs multi-planilha (Open Question RESOLVED no RESEARCH.md)"
  - "Coluna de fórmula na fixture usa template '=SOMA(C{row};-D{row})' — referência por letra de coluna, conforme Pattern 8 do RESEARCH.md"
metrics:
  duration_minutes: 8
  completed_date: "2026-06-09"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 14 Plan 04: Extensão do buildTableSpec com seed data e fórmulas pt-BR

Fixture mode e buildSpecSystemPrompt de `table-clarifier.ts` estendidos para gerar `TableSpecPayload` completo com rows (seed data), coluna de fórmula, `formulaLanguage:"pt-BR"` e `separator:";"` — permitindo que o render-dispatcher detecte `rows.length > 0` e renderize `TableGridPanel`.

## O que foi feito

### Task 1 — Estender buildSpecSystemPrompt e fixture mode

**Fixture mode estendida** (`buildTableSpec` quando `!process.env.OPENAI_API_KEY`):

Substituída a fixture Phase 13 (2 colunas genéricas, sem rows) pela fixture Phase 14:
- `title: "Controle de Gastos"`
- 5 colunas: `descricao` (text), `categoria` (text), `valor` (currency), `desconto` (currency), `total` (formula, `"=SOMA(C{row};-D{row})"`)
- `rowCount: 5`
- `rows`: 5 objetos com dados realistas (valores numéricos como `number`, não string)
- `formulaLanguage: "pt-BR"`
- `separator: ";"`

O retorno passa em `tableSpecPayloadSchema.parse()` sem throw — todos os campos opcionais novos do schema Phase 14 estão presentes.

**buildSpecSystemPrompt estendido** (prompt para LLM com API key presente):

O prompt agora instrui o LLM a gerar:
- `key` camelCase para cada coluna
- `formula` com template `{row}` para colunas `type:"formula"`
- Separador `;` como argumento, `,` como decimal, funções em PORTUGUÊS
- Referências de range absolutas (proibido `{row}` dentro de ranges)
- Sem referências multi-planilha
- `rows` com dados de exemplo realistas (valores numéricos como `number`)
- `formulaLanguage:"pt-BR"` e `separator:";"`

A estrutura `try/catch` de Structured Outputs + fallback `json_object` foi preservada intacta — apenas o prompt e a fixture foram modificados.

## Testes

Suite `table-clarifier.test.ts` — 13/13 passando incluindo os 4 casos Phase 14:
- "fixture mode retorna rows com 5 entradas" — graceful-skip removido implicitamente (rows agora presente)
- "fixture mode retorna coluna com type: 'formula' e campo formula definido"
- "fixture mode retorna formulaLanguage: 'pt-BR'"
- "fixture mode retorna separator: ';'"

Suite completa `pnpm --filter web exec vitest run` — 320 passando, 1 skip pré-existente, sem regressão.

TypeScript `tsc --noEmit` — sem erros.

## Deviations from Plan

Nenhuma — plano executado exatamente como especificado.

## Threat Surface Scan

Nenhuma superfície nova introduzida. A mitigação T-14-LLM-INJECT (validação Zod antes de retornar) permanece intacta: o path LLM usa `tableSpecPayloadSchema.parse(raw)` no fallback e `zodResponseFormat(tableSpecPayloadSchema, "table_spec")` no Structured Outputs path.

## Self-Check: PASSED

- [x] `apps/web/src/server/ai/table-clarifier.ts` modificado e existente
- [x] Commit `0526aa6` existe no git log
- [x] 13 testes passando em `table-clarifier.test.ts`
- [x] 320 testes passando na suite completa
- [x] `tsc --noEmit` limpo

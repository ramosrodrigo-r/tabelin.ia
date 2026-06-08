---
phase: 13-clarification-loop
plan: "02"
subsystem: ai
tags: [zod, openai, structured-outputs, fixture-mode, context-messages, schema, server-only]

dependency_graph:
  requires:
    - phase: 13-clarification-loop/13-01
      provides: "test scaffolds (table-clarifier.test.ts, unified-schema.test.ts extensions, component stubs)"
    - phase: 12-intent-classifier-unified-route
      provides: "intent-classifier.ts pattern (zodResponseFormat, fixture guard, fallback json_object)"
  provides:
    - packages/shared/src/unified-chat/schema.ts — tableClarQuestionPayloadSchema, tableSpecPayloadSchema, inferred types
    - apps/web/src/server/ai/table-clarifier.ts — askClarificationQuestion, buildTableSpec, clarificationQuestionSchema, injectCollectedSpecIntoPrompt
    - apps/web/src/server/ai/context-messages.ts — cases table_clar_question e table_spec em serializeAssistant
  affects:
    - Plan 03 (route bifurcado usa askClarificationQuestion e buildTableSpec — contrato fixado aqui)
    - Plan 04 (ClarificationCard e ConfirmationCard usam TableClarQuestionPayload e TableSpecPayload de @tabelin/shared)

tech-stack:
  added: []
  patterns:
    - "Fixture mode determinístico: if (!process.env.OPENAI_API_KEY) return fixture — padrão existente de intent-classifier.ts replicado para table-clarifier.ts"
    - "zodResponseFormat com schema Zod estrutural proibindo array: { question: string } em vez de { questions: string[] } — garante CLAR-01 no nível de contrato"
    - "Anti-injection com delimitadores ESPECIFICAÇÃO COLETADA: mesmo padrão de injectAttachmentIntoSystemPrompt adaptado para spec coletada"
    - "z.record(z.string(), z.unknown()) para Zod v4 — z.record(z.unknown()) não é válido em Zod v4 (um argumento só)"

key-files:
  created:
    - apps/web/src/server/ai/table-clarifier.ts
  modified:
    - packages/shared/src/unified-chat/schema.ts
    - apps/web/src/server/ai/context-messages.ts
    - apps/web/src/features/unified-chat/components/clarification-card.tsx
    - apps/web/src/features/unified-chat/components/confirmation-card.tsx
    - apps/web/tests/context-messages.test.ts

key-decisions:
  - "clarificationQuestionSchema proíbe array estruturalmente via { question: z.string() } — impede múltiplas perguntas sem depender de instrução de prompt (T-13-04)"
  - "injectCollectedSpecIntoPrompt retorna systemPrompt inalterado quando spec vazia — evita delimitadores vazios no prompt"
  - "table-clarifier.ts importa tableSpecPayloadSchema de @tabelin/shared em vez de redefinir localmente — single source of truth"
  - "z.record(z.string(), z.unknown()) necessário em Zod v4 (dois argumentos obrigatórios vs. um no Zod v3)"

patterns-established:
  - "AI service server-only: import 'server-only' como primeira linha, fixture guard com process.env.OPENAI_API_KEY, zodResponseFormat, fallback json_object"
  - "context-messages serializeAssistant: casos de clarificação retornam rótulo entre colchetes + conteúdo, null se campo obrigatório vazio"

requirements-completed: [CLAR-01, CLAR-02, CLAR-04, CLAR-05]

duration: ~15min
completed: "2026-06-08"
---

# Phase 13 Plan 02: Wave 1a — Schemas, table-clarifier.ts e context-messages Summary

**tableClarQuestionPayloadSchema e tableSpecPayloadSchema exportados de @tabelin/shared; table-clarifier.ts com fixture mode + zodResponseFormat + anti-injection; context-messages.ts serializa os dois novos kinds; 53 testes passam**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-08T19:40:00Z
- **Completed:** 2026-06-08T19:47:00Z
- **Tasks:** 3
- **Files modified:** 5 (+ 1 criado)

## Accomplishments

- Contratos de dados compartilhados estabelecidos: `tableClarQuestionPayloadSchema` (kind: table_clar_question, question, turnIndex, totalTurns, spec?, canSkip) e `tableSpecPayloadSchema` (kind: table_spec, title, columns, rowCount max 200, format?) exportados de `@tabelin/shared`
- `table-clarifier.ts` criado seguindo o padrão exato de `intent-classifier.ts`: `askClarificationQuestion` e `buildTableSpec` com fixture mode determinístico, `zodResponseFormat` com schema que proíbe array estruturalmente, `injectCollectedSpecIntoPrompt` com delimitadores anti-injection, fallback json_object para modelos legados
- `context-messages.ts` estendido com cases `table_clar_question` e `table_spec` em `serializeAssistant` — o histórico de clarificação alimenta corretamente o LLM em turns subsequentes
- Stubs do Wave 0 (`clarification-card.tsx`, `confirmation-card.tsx`) atualizados para usar imports reais de `@tabelin/shared` em vez de tipos locais temporários

## Task Commits

1. **Task 1: Schemas compartilhados — schema.ts estendido** - `c2b6744` (feat)
2. **Task 2: table-clarifier.ts — serviço de IA com fixture mode** - `09db626` (feat)
3. **Task 3: context-messages.ts — serializar table_clar_question e table_spec** - `e604311` (feat)

## Files Created/Modified

- `packages/shared/src/unified-chat/schema.ts` — Adicionados `tableClarQuestionPayloadSchema`, `tableSpecPayloadSchema`, tipos inferidos `TableClarQuestionPayload` e `TableSpecPayload`; ambos adicionados ao union `unifiedCompletePayloadSchema`
- `apps/web/src/server/ai/table-clarifier.ts` — Serviço de IA novo: `askClarificationQuestion`, `buildTableSpec`, `clarificationQuestionSchema`, `injectCollectedSpecIntoPrompt`, `shouldFallbackFromStructuredOutputs`, system prompts em pt-BR
- `apps/web/src/server/ai/context-messages.ts` — Cases `table_clar_question` e `table_spec` adicionados em `serializeAssistant` antes do default
- `apps/web/src/features/unified-chat/components/clarification-card.tsx` — Tipo local substituído por `import type { TableClarQuestionPayload } from "@tabelin/shared"`
- `apps/web/src/features/unified-chat/components/confirmation-card.tsx` — Tipo local substituído por `import type { TableSpecPayload } from "@tabelin/shared"`
- `apps/web/tests/context-messages.test.ts` — 5 novos testes para `table_clar_question` e `table_spec` (nenhum teste existente removido)

## Decisions Made

- `clarificationQuestionSchema` usa `{ question: z.string().trim().min(1) }` — nunca array; garante CLAR-01 estruturalmente sem depender de instrução de prompt (T-13-04)
- `injectCollectedSpecIntoPrompt` retorna `systemPrompt` inalterado quando `spec` está vazia — delimitadores só aparecem quando há conteúdo real
- `table-clarifier.ts` importa `tableSpecPayloadSchema` de `@tabelin/shared` (single source of truth) em vez de redefinir localmente

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] z.record(z.unknown()) inválido em Zod v4**
- **Found during:** Task 1 (schema.ts)
- **Issue:** O plano especificava `z.record(z.unknown())` para o campo `spec` de `tableClarQuestionPayloadSchema`. Em Zod v4, `z.record()` requer dois argumentos (keyType, valueType) — `z.record(z.unknown())` causa erro TypeScript `TS2554: Expected 2-3 arguments, but got 1`
- **Fix:** Substituído por `z.record(z.string(), z.unknown())` conforme API do Zod v4
- **Files modified:** packages/shared/src/unified-chat/schema.ts
- **Verification:** `pnpm --filter web typecheck` não retorna mais o erro TS2554
- **Committed in:** 09db626 (incluído no commit da Task 2 junto com table-clarifier.ts)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Correção necessária para compatibilidade com Zod v4. Sem mudança de comportamento — `z.record(z.string(), z.unknown())` é equivalente ao `z.record(z.unknown())` do Zod v3.

## Issues Encountered

- O runner `pnpm --filter web test -- tests/table-clarifier.test.ts` rodado a partir do diretório raiz do repositório falha com "Failed to resolve import" porque aponta para o repositório principal, não para o worktree. Solução: usar `pnpm --filter web exec vitest run tests/table-clarifier.test.ts` a partir do worktree. Documentado para testes futuros.

## Known Stubs

Nenhum — os stubs temporários do Wave 0 (`clarification-card.tsx` e `confirmation-card.tsx`) foram convertidos para usar imports reais de `@tabelin/shared`.

## Threat Flags

Nenhuma nova superfície de segurança introduzida além das previstas no `<threat_model>` do plano:
- T-13-03 (injectCollectedSpecIntoPrompt): mitigado com delimitadores ESPECIFICAÇÃO COLETADA
- T-13-04 (clarificationQuestionSchema): mitigado com `{ question: string }` nunca array
- T-13-06 (tableSpecPayloadSchema rowCount max 200): mitigado via schema Zod

## Next Phase Readiness

- Plan 03 (route bifurcado) pode importar `askClarificationQuestion`, `buildTableSpec`, `clarificationQuestionSchema`, `injectCollectedSpecIntoPrompt` de `table-clarifier.ts`
- Plan 04 (UI) pode importar `TableClarQuestionPayload` e `TableSpecPayload` de `@tabelin/shared`
- Todos os 53 testes dos 3 arquivos de teste do Wave 1a passam sem regressões

## Self-Check: PASSED

- [x] `packages/shared/src/unified-chat/schema.ts` tem `tableClarQuestionPayloadSchema` (3 ocorrências) e `tableSpecPayloadSchema` (3 ocorrências)
- [x] `apps/web/src/server/ai/table-clarifier.ts` existe e passa em `tests/table-clarifier.test.ts` (9/9)
- [x] `apps/web/src/server/ai/context-messages.ts` tem cases `table_clar_question` e `table_spec`
- [x] `tests/context-messages.test.ts` passa 30/30 testes
- [x] `tests/unified-schema.test.ts` passa 14/14 testes
- [x] Commit c2b6744 existe (Task 1)
- [x] Commit 09db626 existe (Task 2)
- [x] Commit e604311 existe (Task 3)
- [x] Erros TypeScript novos: nenhum (somente erros pré-existentes de Prisma no worktree)

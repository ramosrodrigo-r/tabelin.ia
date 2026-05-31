---
phase: 08-multi-turn-llm-context
plan: "04"
subsystem: ai-prompting
tags: [multi-turn, llm-context, bug-fix, tdd, prompting]
dependency_graph:
  requires: [08-03]
  provides: [buildMultiTurnSystemPrompt, serializeAssistant-labeled]
  affects: [sql-stream, regex-stream, scripts-stream, template-stream, context-messages]
tech_stack:
  added: []
  patterns: [multi-turn-system-prompt, labeled-history-context]
key_files:
  created: []
  modified:
    - apps/web/src/server/ai/context-messages.ts
    - apps/web/src/server/ai/sql-stream.ts
    - apps/web/src/server/ai/regex-stream.ts
    - apps/web/src/server/ai/scripts-stream.ts
    - apps/web/src/server/ai/template-stream.ts
    - apps/web/tests/context-messages.test.ts
    - apps/web/tests/multi-turn-context.test.ts
decisions:
  - "buildMultiTurnSystemPrompt centraliza a instrução multi-turn em context-messages.ts (DRY) evitando duplicação nos 4 stream files"
  - "Rótulo [Resposta anterior] é prefixo de texto simples — não amplia superfície de injeção (T-08-GAP-01 accepted)"
  - "regex explain branch não alterado conforme D-03 — explain está fora do contexto multi-turn"
metrics:
  duration_minutes: 7
  completed_date: "2026-05-30"
  tasks_completed: 2
  files_modified: 7
---

# Phase 8 Plan 04: Multi-turn Prompting Bug Fix Summary

## One-liner

Corrigiu o bug de echo no multi-turn adicionando rótulo `[Resposta anterior]` em `serializeAssistant` e helper `buildMultiTurnSystemPrompt` que anexa instrução de refinamento ao system prompt quando há histórico.

## What Was Built

### Task 1: context-messages.ts — serializeAssistant + buildMultiTurnSystemPrompt

**`serializeAssistant` — prefixo `[Resposta anterior]`:**
- Todos os 4 cases (sql, regex_generate, script, template) agora retornam string iniciando com `[Resposta anterior]\n`
- O rótulo sinaliza ao modelo que o conteúdo seguinte é contexto de referência, não o output a ser reproduzido
- Resolve o mismatch prosa-vs-JSON que causava o echo verbatim

**`buildMultiTurnSystemPrompt` (nova export):**
- `historyLength === 0` → retorna `basePrompt` sem alteração (single-turn sem regressão)
- `historyLength > 0` → append de parágrafo de instrução multi-turn ao `basePrompt`:
  "As mensagens anteriores sao contexto de referencia das suas respostas anteriores. Sua tarefa e SEMPRE responder ao pedido do usuario na ultima mensagem..."

**Testes adicionados em `context-messages.test.ts` (+5 testes):**
- `serialização SQL — rótulo [Resposta anterior]`: 2 testes
- `buildMultiTurnSystemPrompt`: 3 testes (historyLength=0, =1, =5)

### Task 2: 4 stream files + multi-turn-context.test.ts

**4 stream files atualizados:**
- `sql-stream.ts`, `regex-stream.ts`, `scripts-stream.ts`, `template-stream.ts`
- Import de `buildMultiTurnSystemPrompt` adicionado a cada um
- System prompt literal wrapped com `buildMultiTurnSystemPrompt(literal, input.history?.length ?? 0)`
- Branch `explain` do regex-stream.ts não alterado (D-03)

**Novos testes em `multi-turn-context.test.ts` (+3 testes):**
- `sql/generate com histórico não-vazio responde 200 e emite evento complete`
- `regex/generate com histórico não-vazio responde 200 e emite evento complete`
- `sql/generate com histórico não-vazio chama saveConversationExchange (fluxo completo sem crash)`

## Verification Results

| Check | Result |
|-------|--------|
| `vitest run tests/context-messages.test.ts` | 23/23 PASS |
| `vitest run tests/multi-turn-context.test.ts` | 14/14 PASS (11 existing + 3 new) |
| `vitest run` (full suite) | 100/101 PASS (1 pre-existing fail in formula-ui.test.tsx — unrelated) |
| `pnpm --filter web typecheck` (main repo) | exit 0 |
| 4 stream files contêm `buildMultiTurnSystemPrompt` | confirmado |
| `serializeAssistant` SQL case retorna `[Resposta anterior]\n...` | confirmado |

## Deviations from Plan

None — plano executado exatamente como especificado.

TDD:
- RED commit: `b83807a` — test(08-04): add failing tests for serializeAssistant label and buildMultiTurnSystemPrompt (5 testes falhando)
- GREEN commit: `31ece6c` — feat(08-04): add buildMultiTurnSystemPrompt and label [Resposta anterior] in serializeAssistant (23/23 passam)
- Task 2: `e2f7784` — feat(08-04): wire buildMultiTurnSystemPrompt in 4 stream files + add history-non-empty tests

## Security Notes

Conforme o threat model do plano:
- **T-08-GAP-01** (Tampering — rótulo `[Resposta anterior]`): accepted. Rótulo é prefixo de texto simples sem novos vetores de injeção.
- **T-08-GAP-02** (Spoofing — instrução multi-turn hardcoded): accepted. Texto é literal no código, não interpolado de input externo.
- **T-08-GAP-03** (Information Disclosure — histórico rotulado): accepted. O histórico já era enviado antes; o rótulo muda a forma, não amplia o que é enviado.
- Stripping de metadata/JSON cru no `serializeAssistant` preservado.
- Truncagem híbrida `MAX_EXCHANGES + SAFE_TOKEN_BUDGET` preservada.
- Pro gate do template preservado.
- Isolamento por toolKind preservado.

## Known Stubs

None.

## TDD Gate Compliance

- RED gate commit: `b83807a` (test commit — 5 failing tests)
- GREEN gate commit: `31ece6c` (feat commit — all tests passing)
- REFACTOR: not needed (code already clean)

## Self-Check: PASSED

- [x] `apps/web/src/server/ai/context-messages.ts` — modified, `buildMultiTurnSystemPrompt` exported
- [x] `apps/web/src/server/ai/sql-stream.ts` — modified, uses `buildMultiTurnSystemPrompt`
- [x] `apps/web/src/server/ai/regex-stream.ts` — modified, uses `buildMultiTurnSystemPrompt`
- [x] `apps/web/src/server/ai/scripts-stream.ts` — modified, uses `buildMultiTurnSystemPrompt`
- [x] `apps/web/src/server/ai/template-stream.ts` — modified, uses `buildMultiTurnSystemPrompt`
- [x] `apps/web/tests/context-messages.test.ts` — 23 tests pass
- [x] `apps/web/tests/multi-turn-context.test.ts` — 14 tests pass
- [x] Commit b83807a (RED) exists
- [x] Commit 31ece6c (GREEN task 1) exists
- [x] Commit e2f7784 (feat task 2) exists

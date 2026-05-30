---
phase: 08-multi-turn-llm-context
plan: "02"
subsystem: ai-streams
tags: [multi-turn, context, llm, sql, regex, scripts, template]
dependency_graph:
  requires: ["08-01"]
  provides: ["08-03"]
  affects: ["sql-stream", "regex-stream", "scripts-stream", "template-stream"]
tech_stack:
  added: []
  patterns:
    - "buildToolContextMessages + truncateHistory injetados nos 4 streams que chamam o LLM"
    - "history: ConversationExchange[] opcional — callers antigos (single-turn) não quebram"
key_files:
  created: []
  modified:
    - apps/web/src/server/ai/sql-stream.ts
    - apps/web/src/server/ai/regex-stream.ts
    - apps/web/src/server/ai/scripts-stream.ts
    - apps/web/src/server/ai/template-stream.ts
decisions:
  - "toolKind 'script' (singular) preservado para bater com saveConversationExchange existente (D-11/MULTI-03)"
  - "branch explain do regex-stream não recebe history — D-03 cumprido"
  - "truncateHistory aplicado no call site de cada stream antes de buildToolContextMessages — responsabilidade do chamador"
metrics:
  duration: "~7 min"
  completed: "2026-05-30T15:35:58Z"
  tasks_completed: 2
  files_modified: 4
---

# Phase 8 Plan 02: Injeção de Histórico nos 4 Streams LLM — Summary

**One-liner:** Parâmetro `history?: ConversationExchange[]` adicionado a `resolveSqlPayload`, `resolveRegexPayload` (branch generate), `resolveScriptPayload` e `resolveTemplatePayload`; contexto multi-turn injetado via `buildToolContextMessages` do Plano 01.

## O que foi feito

Os 4 stream modules que chamam o LLM (SQL, Regex, Scripts, Template) foram estendidos com um parâmetro `history` opcional. A injeção do histórico usa o helper `buildToolContextMessages` (criado no Plano 01) junto com `truncateHistory` — aplicado no call site de cada stream, conforme responsabilidade definida no helper.

A mudança por stream é mínima e localizada:
- `messages: [system, user]` → `messages: buildToolContextMessages(toolKind, truncateHistory(history ?? []), systemPrompt, request.prompt)`
- O parâmetro `history` é opcional em todos os 4 streams — chamadores existentes sem history continuam funcionando sem alteração.

## Tasks

| Task | Nome | Commit | Arquivos |
|------|------|--------|----------|
| 1 | Injetar history em sql-stream e regex-stream | aae537d | sql-stream.ts, regex-stream.ts |
| 2 | Injetar history em scripts-stream e template-stream | ac8773c | scripts-stream.ts, template-stream.ts |

## Decisões Tomadas

- **toolKind `"script"` (singular):** O toolKind passado ao helper em `scripts-stream.ts` é `"script"` e não `"scripts"`, batendo com o `saveConversationExchange` existente no route handler. Isolamento por tool (MULTI-03/D-11) funciona corretamente.
- **branch `explain` intocado (D-03):** Em `regex-stream.ts`, apenas o branch `generate` recebe history. O branch `explain` permanece com `messages: [system, user]` original — ação isolada sem thread conversacional.
- **truncagem no call site:** `truncateHistory(input.history ?? [])` aplicado antes de chamar `buildToolContextMessages` em cada stream, conforme o contrato de responsabilidade única do helper (helper não trunca internamente na assinatura pública — mas internamente `buildToolContextMessages` também chama `truncateHistory` como segunda guarda).

## Deviations from Plan

Nenhuma — plano executado exatamente conforme especificado.

## Verificação

- `pnpm typecheck`: saiu com código 0 (tsc --noEmit limpo)
- `pnpm vitest run tests/context-messages.test.ts`: 17 testes, todos aprovados
- Branch `explain` do regex-stream: sem referência a `history` ou `buildToolContextMessages`
- Branch fixture (`if (!process.env.OPENAI_API_KEY)`) preservado em todos os 4 streams

## Self-Check: PASSED

- [x] `apps/web/src/server/ai/sql-stream.ts` — existe e contém `buildToolContextMessages("sql"`
- [x] `apps/web/src/server/ai/regex-stream.ts` — existe e contém `buildToolContextMessages("regex"` apenas no branch generate
- [x] `apps/web/src/server/ai/scripts-stream.ts` — existe e contém `buildToolContextMessages("script"`
- [x] `apps/web/src/server/ai/template-stream.ts` — existe e contém `buildToolContextMessages("template"`
- [x] Commit aae537d existe
- [x] Commit ac8773c existe

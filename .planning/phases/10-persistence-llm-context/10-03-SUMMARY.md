---
phase: 10-persistence-llm-context
plan: "03"
subsystem: api-routes + ai-streams
tags: [attachment, multipart, pro-gate, extraction, context-propagation]
dependency_graph:
  requires:
    - 10-01  # saveConversationExchange com attachmentContext, buildToolContextMessages 5º param
    - 10-02  # padrão formula route estabelecido como canonical analog
    - phase-09  # extractContent dispatcher
  provides:
    - sql/regex/scripts routes com pipeline completo de attachment
    - template route com multipart e extração (Pro-gate incondicional preservado)
    - 4 stream modules com attachmentContext propagado para buildToolContextMessages
  affects:
    - apps/web/src/app/api/tools/sql/generate/route.ts
    - apps/web/src/app/api/tools/regex/generate/route.ts
    - apps/web/src/app/api/tools/scripts/generate/route.ts
    - apps/web/src/app/api/tools/template/generate/route.ts
    - apps/web/src/server/ai/sql-stream.ts
    - apps/web/src/server/ai/regex-stream.ts
    - apps/web/src/server/ai/scripts-stream.ts
    - apps/web/src/server/ai/template-stream.ts
tech_stack:
  added: []
  patterns:
    - multipart/form-data backward-compat (Content-Type detection + formData + JSON fallback)
    - conditional Pro-gate (getUserEntitlement only when hasFile)
    - inline extraction with releaseToolUse on failure
    - attachmentContext? optional propagation through resolve functions
key_files:
  created: []
  modified:
    - apps/web/src/app/api/tools/sql/generate/route.ts
    - apps/web/src/app/api/tools/regex/generate/route.ts
    - apps/web/src/app/api/tools/scripts/generate/route.ts
    - apps/web/src/app/api/tools/template/generate/route.ts
    - apps/web/src/server/ai/sql-stream.ts
    - apps/web/src/server/ai/regex-stream.ts
    - apps/web/src/server/ai/scripts-stream.ts
    - apps/web/src/server/ai/template-stream.ts
decisions:
  - "Template Pro-gate incondicional preservado intacto em linha 23 — não envolvido em if(hasFile)"
  - "toolKind 'script' (singular) em scripts route confirmado e mantido (MULTI-03)"
  - "Falha pre-existente em formula-ui.test.tsx confirmada como out-of-scope (existia antes deste plano)"
metrics:
  duration_minutes: 15
  completed_date: "2026-06-04"
  tasks_completed: 3
  files_modified: 8
---

# Phase 10 Plan 03: Attachment Pipeline para SQL/Regex/Scripts/Template — Summary

**One-liner:** Pipeline completo de attachment (multipart + Pro-gate condicional + extração + attachmentContext) adicionado aos 4 routes sql/regex/scripts/template e seus 4 stream modules, com Pro-gate incondicional do template preservado.

## Tasks Completed

| # | Nome | Commit | Arquivos |
|---|------|--------|---------|
| 1 | Stream modules — attachmentContext nos 4 resolve functions | 22cce81 | sql-stream.ts, regex-stream.ts, scripts-stream.ts, template-stream.ts |
| 2 | Routes sql/regex/scripts — multipart + Pro-gate condicional + extração | a4f4ccc | sql/generate/route.ts, regex/generate/route.ts, scripts/generate/route.ts |
| 3 | Route template — multipart + extração (Pro-gate incondicional preservado) | 43231f6 | template/generate/route.ts |

## What Was Built

### Tarefa 1 — Stream modules

Todos os 4 stream modules recebem `attachmentContext?: string` e propagam para `buildToolContextMessages` como 5º argumento opcional:

- `resolveSqlPayload`: campo `attachmentContext?: string` no input type
- `RegexModeInput` branch `generate`: campo `attachmentContext?: string`
- `resolveScriptPayload`: campo `attachmentContext?: string` no input type
- `resolveTemplatePayload`: campo `attachmentContext?: string` no input type

Fixture mode (`if (!process.env.OPENAI_API_KEY)`) não foi alterado em nenhum dos 4 módulos.

### Tarefa 2 — Routes sql, regex, scripts

Pipeline completo replicado do canonical analog (`formula/generate/route.ts`):

1. Detecção de `Content-Type` com backward-compat: `formData()` se multipart, `request.json()` caso contrário
2. Campos do FormData mapeados para cada schema: sql (`dialect`, `prompt`), regex (`prompt`), scripts (`scriptType`, `prompt`)
3. Pro-gate condicional `if (hasFile)`: `getUserEntitlement` chamado apenas quando há arquivo; 403 com `{ code: "pro_required", feature: "attachment", cta: "pro_checkout" }`
4. Bloco de extração dentro do `try`: guarda 5 MB, `extractContent(buffer, file.name)`, `releaseToolUse` explícito antes de `return 422`
5. `attachmentContext` propagado para os resolve functions e para `saveConversationExchange`
6. `toolKind: "script"` (singular) preservado no scripts route (MULTI-03)

### Tarefa 3 — Route template

- Pro-gate incondicional (LANDMINE-02) preservado em linha 23, antes de qualquer detecção de `hasFile`
- Multipart backward-compat adicionado (Content-Type detection + FormData com campo `prompt`)
- Bloco de extração idêntico ao padrão dos outros routes
- `attachmentContext` propagado para `resolveTemplatePayload` e `saveConversationExchange`
- Nenhum Pro-gate condicional adicionado — o gate existente já cobre todo request

## Verification Results

```
pnpm --filter web typecheck  → exit 0 (clean)
multi-turn-context.test.ts   → 14/14 pass (sem regressão)
grep -c 'pro_required' sql/generate/route.ts    → 1
grep -c 'pro_required' regex/generate/route.ts  → 1
grep -c 'pro_required' scripts/generate/route.ts → 1
grep -c 'extractContent' template/generate/route.ts → 2
grep -c 'attachmentContext' template/generate/route.ts → 5
grep -n 'pro_required' template/generate/route.ts → linha 23 (antes de qualquer hasFile)
```

## Deviations from Plan

### Pre-existing Failure (out-of-scope)

`formula-ui.test.tsx > FormulaTool > streams formula output and enables validated copy` — falha pre-existente confirmada via `git stash` antes de qualquer mudança deste plano. Não é regressão deste plano. Fora do escopo de correção.

Nenhuma outra desvio — plano executado conforme especificado.

## Known Stubs

Nenhum. Todos os campos são wired para fontes reais.

## Threat Flags

Nenhum. Todas as superfícies de ataque listadas no threat_model do plano foram cobertas:

- T-10-03-01: Pro-gate condicional em sql/regex/scripts via `getUserEntitlement` antes de `reserveToolUse`
- T-10-03-02: Pro-gate incondicional do template preservado intacto
- T-10-03-03: Verificação de 5 MB antes de `Buffer.from(await file.arrayBuffer())` nos 4 routes
- T-10-03-04: `attachmentContext` injetado via `buildToolContextMessages` que usa delimitadores anti-injection (Phase 10-01)
- T-10-03-05: `releaseToolUse` explícito antes de `return 422` quando `extractContent` falha

## Self-Check: PASSED

- [x] 8 arquivos modificados existem no filesystem
- [x] Commits 22cce81, a4f4ccc, 43231f6 existem no git log
- [x] `pnpm --filter web typecheck` sai 0
- [x] `multi-turn-context.test.ts` 14/14 pass
- [x] Pro-gate incondicional do template em linha 23 (antes de hasFile)

---
phase: 10-persistence-llm-context
plan: "02"
subsystem: formula-route-stream
tags: [formula, multipart, pro-gate, extraction, multi-turn, attachment, quota]
dependency_graph:
  requires:
    - apps/web/src/server/ai/context-messages.ts (buildToolContextMessages com attachmentContext — 10-01)
    - apps/web/src/server/tools/conversation-repository.ts (saveConversationExchange com attachmentContext — 10-01)
    - apps/web/src/server/extraction/dispatcher.ts (extractContent — Phase 9)
    - apps/web/src/server/billing/entitlements.ts (getUserEntitlement)
  provides:
    - Formula route com multipart, Pro-gate condicional, extração, histórico multi-turn (gap Phase 8 fechado)
    - resolveFormulaPayload com history e attachmentContext via buildToolContextMessages
  affects:
    - apps/web/src/app/api/tools/formula/generate/route.ts
    - apps/web/src/server/ai/formula-stream.ts
tech_stack:
  added: []
  patterns:
    - Multipart/form-data detection + backward-compat JSON fallback
    - Pro-gate condicional (hasFile) antes de reserveToolUse
    - Extração inline no try-block com releaseToolUse em !result.ok
    - findConversationExchanges wired em formula (gap Phase 8 CTX-03)
    - resolveFormulaPayload com history + attachmentContext passado para buildToolContextMessages
key_files:
  created: []
  modified:
    - apps/web/src/server/ai/formula-stream.ts
    - apps/web/src/app/api/tools/formula/generate/route.ts
decisions:
  - "Fixture mode separado em bloco !process.env.OPENAI_API_KEY — path real com buildToolContextMessages adicionado abaixo; fixture preservado intacto"
  - "Pro-gate condicional (hasFile) em vez de incondicional — formula é tool de uso geral, gate só é ativado quando há arquivo"
  - "Extração dentro do try-block: releaseToolUse explícito em !result.ok e em file.size > 5MB antes de retornar inline; catch cobre falhas inesperadas do restante do pipeline"
  - "formulaLanguage passado como 5º campo do FormData (campo do schema) — coerção não necessária (z.string())"
metrics:
  duration: "~18 min"
  completed: "2026-06-04"
  tasks: 2
  files: 2
---

# Phase 10 Plan 02: Formula Route + Stream — Multipart, Pro-gate, Extração, Histórico

**One-liner:** Formula route estendida com multipart/form-data, Pro-gate condicional para free+arquivo (403), extração via dispatcher Phase 9, wiring do histórico multi-turn (gap Phase 8 CTX-03 fechado) e persistência de attachmentContext.

## Tarefas Executadas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|---------|
| 1 | formula-stream — resolveFormulaPayload aceita history + attachmentContext | 9adcf7b | apps/web/src/server/ai/formula-stream.ts |
| 2 | formula route — multipart, Pro-gate, extração, histórico, persistência | 7ed5bd3 | apps/web/src/app/api/tools/formula/generate/route.ts |

## O que foi implementado

### Tarefa 1: formula-stream.ts

- Import `"server-only"`, `ConversationExchange` from `@prisma/client`, `buildToolContextMessages` e `buildMultiTurnSystemPrompt` from `./context-messages` adicionados
- `FormulaModeInput` estendido: branch `mode: "generate"` aceita `history?: ConversationExchange[]` e `attachmentContext?: string`
- `resolveFormulaPayload`: fixture mode separado em bloco `if (!process.env.OPENAI_API_KEY)` (preservado intacto com lógica determinística original)
- Path real com OpenAI adicionado: `buildToolContextMessages("formula", input.history ?? [], buildMultiTurnSystemPrompt(...), request.prompt, input.attachmentContext)`
- Branch `mode === "explain"` não foi alterado

### Tarefa 2: formula/generate/route.ts

- Imports novos: `getUserEntitlement`, `extractContent`, `findConversationExchanges`
- Detecção de Content-Type antes do Zod parse: `multipart/form-data` → `request.formData()` (campos: `prompt`, `platform`, `formulaLanguage`), senão `request.json()` (backward-compat)
- Pro-gate condicional (`hasFile`): `getUserEntitlement` chamado ANTES de `reserveToolUse`; free+arquivo → 403 `{code:"pro_required", feature:"attachment", cta:"pro_checkout"}`
- Extração dentro do try-block: `file.size > 5MB` → `releaseToolUse` + 413; `extractContent(!result.ok)` → `releaseToolUse` + 422
- Gap Phase 8 corrigido: `findConversationExchanges(user.id, "formula")` em todo request de geração (CTX-03)
- `resolveFormulaPayload` recebe `{ mode: "generate", request: parsed.data, history, attachmentContext }`
- `saveConversationExchange` inclui `attachmentContext` (undefined sem arquivo, string com arquivo)

## Verificação Final

```
grep -c 'findConversationExchanges' route.ts → 2   (≥1 ✓)
grep -c 'pro_required' route.ts → 1               (≥1 ✓)
grep -c 'attachmentContext' route.ts → 4           (≥2 ✓)
grep -c 'extractContent' route.ts → 2              (≥1 ✓)
pnpm --filter web typecheck → 0 erros              (✓)
vitest run formula-api.test.ts context-messages.test.ts → 30 passed (✓)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Path real OpenAI em formula-stream.ts**
- **Found during:** Tarefa 1
- **Issue:** O arquivo original de `formula-stream.ts` só tinha modo fixture (sem caminho OpenAI real no branch generate), enquanto o plano pedia que `buildToolContextMessages` fosse chamado na path real. Sem o caminho real, `history` e `attachmentContext` nunca seriam usados em produção.
- **Fix:** Separado fixture mode (`!process.env.OPENAI_API_KEY`) do path real; adicionado `client.chat.completions.create` com `buildToolContextMessages` no path real (análogo ao `sql-stream.ts`).
- **Files modified:** `apps/web/src/server/ai/formula-stream.ts`
- **Commit:** 9adcf7b

## Known Stubs

Nenhum. O path real da OpenAI em `formula-stream.ts` usa `buildToolContextMessages` com `input.attachmentContext` e `input.history`. O route handler passa `history` e `attachmentContext` ao `resolveFormulaPayload`. Tudo wired.

## Threat Flags

Nenhum novo. Ameaças cobertas pelo threat_model do plano:
- T-10-02-01: Pro-gate antes de reserveToolUse implementado; free+arquivo → 403
- T-10-02-02: `file.size > 5 * 1024 * 1024` validado antes de alocar buffer
- T-10-02-03: Delimitadores anti-injection via `injectAttachmentIntoSystemPrompt` (context-messages.ts — 10-01)
- T-10-02-04: `releaseToolUse` chamado explicitamente antes de `return 422` em `!result.ok`

## Self-Check: PASSED

- `apps/web/src/server/ai/formula-stream.ts` contém `history?: ConversationExchange[]` e `attachmentContext?: string` — FOUND
- `apps/web/src/server/ai/formula-stream.ts` chama `buildToolContextMessages("formula", ...)` — FOUND
- `apps/web/src/app/api/tools/formula/generate/route.ts` contém `findConversationExchanges` — FOUND
- `apps/web/src/app/api/tools/formula/generate/route.ts` contém `pro_required` — FOUND
- `apps/web/src/app/api/tools/formula/generate/route.ts` contém `extractContent` — FOUND
- `apps/web/src/app/api/tools/formula/generate/route.ts` contém `attachmentContext` (4 ocorrências) — FOUND
- Commits 9adcf7b e 7ed5bd3 existem — FOUND

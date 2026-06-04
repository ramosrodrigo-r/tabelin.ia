---
phase: 10-persistence-llm-context
plan: "01"
subsystem: backend-context
tags: [prisma, migration, conversation-repository, context-messages, attachment, multi-turn]
dependency_graph:
  requires:
    - prisma/schema.prisma (migration init)
    - apps/web/src/server/extraction/dispatcher.ts (Phase 9 — contrato ExtractionResult)
  provides:
    - ConversationExchange.attachmentContext (campo persistido no banco)
    - saveConversationExchange com suporte a attachmentContext
    - buildToolContextMessages com injeção de attachmentContext e latestWithAttachment
    - MAX_EXTRACTED_CHARS (truncagem CTX-04)
    - injectAttachmentIntoSystemPrompt (delimitadores anti-injection CTX-01)
    - serializeAssistant case "formula" (fix gap Phase 8)
  affects:
    - apps/web/src/server/ai/*-stream.ts (consomem buildToolContextMessages)
    - apps/web/src/app/api/tools/*/generate/route.ts (passarão attachmentContext)
tech_stack:
  added: []
  patterns:
    - Prisma nullable Text field com migrate dev
    - Injeção de dados no system prompt com delimitadores anti-injection (padrão file-chat-stream.ts)
    - Parâmetro opcional 5º (backward-compat) em função exportada
    - latestWithAttachment via reverse().find() no histórico truncado
key_files:
  created:
    - prisma/migrations/20260604143213_add_attachment_context/migration.sql
  modified:
    - prisma/schema.prisma
    - apps/web/src/server/tools/conversation-repository.ts
    - apps/web/src/server/ai/context-messages.ts
    - apps/web/tests/context-messages.test.ts
decisions:
  - "MAX_EXTRACTED_CHARS=8000 chars (~2000 tokens) — budget compatível com SAFE_TOKEN_BUDGET multi-turn existente"
  - "injectAttachmentIntoSystemPrompt: delimitadores ---CONTEÚDO DO DOCUMENTO ANEXADO--- replicam padrão file-chat-stream.ts"
  - "latestWithAttachment busca no histórico truncado, não no bruto — comportamento esperado: perde contexto se exchange foi cortado (documentado como LANDMINE-05)"
  - "case formula em serializeAssistant: fix gap Phase 8, necessário para CTX-03 em follow-ups formula"
metrics:
  duration: "~15 min"
  completed: "2026-06-04"
  tasks: 3
  files: 4
---

# Phase 10 Plan 01: Schema + Repository + Context-Messages Summary

**One-liner:** Campo attachmentContext nullable migrado no PostgreSQL, persistido via conversation-repository, e injetado no system prompt com delimitadores anti-injection e lógica de follow-up latestWithAttachment.

## Tarefas Executadas

| Tarefa | Nome | Commit | Arquivos |
|--------|------|--------|---------|
| 1 | Schema Prisma + Migration [BLOCKING] | 37b4cd6 | prisma/schema.prisma, migrations/20260604143213_add_attachment_context/, migration_lock.toml, tests/context-messages.test.ts |
| 2 | conversation-repository — persistência de attachmentContext | 63ca97c | apps/web/src/server/tools/conversation-repository.ts |
| 3 | context-messages — injeção + case formula + CTX-03 | 6b4e363 | apps/web/src/server/ai/context-messages.ts |

## O que foi implementado

### Tarefa 1: Schema + Migration
- Campo `attachmentContext String? @db.Text` adicionado ao modelo `ConversationExchange` após `assistantPayload`
- Migration `20260604143213_add_attachment_context` aplicada no PostgreSQL com `ALTER TABLE "ConversationExchange" ADD COLUMN "attachmentContext" TEXT`
- Prisma Client regenerado com tipo `attachmentContext: string | null` no `ConversationExchange`

### Tarefa 2: conversation-repository
- `saveConversationExchange` estendida com `attachmentContext?: string` como último campo opcional
- Campo persistido como `attachmentContext: input.attachmentContext ?? null` no `create` Prisma
- `findConversationExchanges` sem alteração — Prisma retorna o campo automaticamente após a migration

### Tarefa 3: context-messages
- Exporta `MAX_EXTRACTED_CHARS = 8_000` (CTX-04)
- Função privada `injectAttachmentIntoSystemPrompt(systemPrompt, attachmentContext)` com delimitadores `---\nCONTEÚDO DO DOCUMENTO ANEXADO\n` e instrução anti-injection (CTX-01, T-10-01-01)
- `buildToolContextMessages` estendida com 5º parâmetro opcional `attachmentContext?: string`
- Lógica `latestWithAttachment = [...truncated].reverse().find(ex => ex.attachmentContext)` para follow-ups (CTX-03)
- `effectiveAttachment = attachmentContext ?? latestWithAttachment?.attachmentContext ?? undefined`
- `case "formula"` adicionado a `serializeAssistant` antes do `default` (corrige gap Phase 8)

## Verificação Final

- `grep -c 'attachmentContext' prisma/schema.prisma` → 1
- `pnpm exec prisma generate` → sucesso (v7.8.0)
- `pnpm --filter web typecheck` → 0 erros
- `vitest run tests/context-messages.test.ts tests/formula-api.test.ts tests/multi-turn-context.test.ts` → 44 passed (3 test files)
- `grep -c 'MAX_EXTRACTED_CHARS' context-messages.ts` → 4 (export + uso + comentário)
- `grep -c 'case "formula"' context-messages.ts` → 1

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixture helper de testes sem attachmentContext**
- **Found during:** Tarefa 1 (após migration, typecheck falhou)
- **Issue:** `makeExchange()` em `tests/context-messages.test.ts` não incluía `attachmentContext: null`, causando 14 erros de typecheck TS2741 após o Prisma Client ser regenerado com o novo campo obrigatório no tipo
- **Fix:** Adicionado `attachmentContext?: string | null` aos overrides e `attachmentContext: overrides.attachmentContext ?? null` ao objeto retornado
- **Files modified:** `apps/web/tests/context-messages.test.ts`
- **Commit:** 37b4cd6 (incluído no commit da Tarefa 1)

## Known Stubs

Nenhum. Todas as implementações são funcionais: campo migrado no banco, repositório persiste corretamente, injeção ocorre com dados reais. Os callers (route handlers e stream modules) serão wired nos planos subsequentes desta fase.

## Threat Flags

Nenhum novo. Ameaças cobertas pelo threat_model do plano:
- T-10-01-01: Delimitadores anti-injection implementados em `injectAttachmentIntoSystemPrompt`
- T-10-01-02: MAX_EXTRACTED_CHARS=8000 implementado com truncagem por `.slice(0, MAX_EXTRACTED_CHARS)`
- T-10-01-03 e T-10-01-04: aceitos (Prisma parameterized queries, isolamento por userId/toolKind)

## Self-Check: PASSED

- `prisma/schema.prisma` contém `attachmentContext` — FOUND
- `prisma/migrations/20260604143213_add_attachment_context/migration.sql` — FOUND
- `apps/web/src/server/tools/conversation-repository.ts` inclui `attachmentContext?: string` — FOUND
- `apps/web/src/server/ai/context-messages.ts` exporta `MAX_EXTRACTED_CHARS`, tem `injectAttachmentIntoSystemPrompt`, `latestWithAttachment`, `case "formula"` — FOUND
- Commits 37b4cd6, 63ca97c, 6b4e363 existem — FOUND

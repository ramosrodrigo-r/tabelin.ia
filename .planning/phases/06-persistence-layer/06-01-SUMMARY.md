---
phase: 06-persistence-layer
plan: "01"
subsystem: persistence
tags: [prisma, repository, schema, conversation-history]
dependency_graph:
  requires: []
  provides:
    - prisma.conversationExchange (Prisma Client model)
    - saveConversationExchange() (apps/web/src/server/tools/conversation-repository.ts)
  affects:
    - prisma/schema.prisma
    - PostgreSQL conversation_exchanges table
tech_stack:
  added: []
  patterns:
    - Prisma $transaction para atomicidade de count + deleteMany + create
    - Cap circular de 50 por userId+toolKind com deleteMany dos mais antigos
    - onDelete: Cascade declarativo no banco para PRIV-01
key_files:
  created:
    - apps/web/src/server/tools/conversation-repository.ts
  modified:
    - prisma/schema.prisma
decisions:
  - "assistantPayload usa Json @db.Json (não @db.Text) para evitar double-stringify no Phase 7 (per D-02)"
  - "Sem @updatedAt no ConversationExchange — registro imutável, salvo uma vez"
  - "platform e dialect passados como null explícito (não omitidos) para consistência com schema nullable"
  - "saveConversationExchange não relança exceção — falha de histórico não interrompe resposta ao usuário"
metrics:
  duration: "5m 38s"
  completed: "2026-05-29"
  tasks_completed: 3
  files_modified: 2
---

# Phase 6 Plan 01: Schema Prisma e Repository de Conversation Exchanges Summary

Schema Prisma atualizado com model `ConversationExchange` (cascade delete, Json payload, index composto) e repository `conversation-repository.ts` exportando `saveConversationExchange()` com transação atômica e cap de 50 exchanges por userId+toolKind.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Adicionar model ConversationExchange ao schema Prisma | 39f4992 | prisma/schema.prisma |
| 2 | Push do schema no banco e geração do Prisma Client | (db operation) | — (npx prisma db push + generate) |
| 3 | Criar conversation-repository.ts com saveConversationExchange() | 9c62b52 | apps/web/src/server/tools/conversation-repository.ts |

## What Was Built

### prisma/schema.prisma

Adicionado model `ConversationExchange` com:
- Campos: `id` (cuid), `userId`, `toolKind`, `mode`, `platform?`, `dialect?`, `userPrompt @db.Text`, `assistantPayload @db.Json`, `createdAt`
- Relação `user` com `onDelete: Cascade` — PRIV-01 e T-06-03 mitigados
- Index composto `@@index([userId, toolKind, createdAt])` para queries de cap por userId+toolKind
- Sem `updatedAt` — registro imutável
- Relação inversa `conversationExchanges ConversationExchange[]` adicionada ao model User

Tabela `conversation_exchanges` criada no banco PostgreSQL via `npx prisma db push`.
Prisma Client regenerado — `prisma.conversationExchange` disponível com 72 referências no index.d.ts gerado.

### apps/web/src/server/tools/conversation-repository.ts

Arquivo novo. Exporta `saveConversationExchange()` com:
- `prisma.$transaction(async (tx) => {...})` para atomicidade (T-06-04 mitigado)
- Cap de 50: `count` → se `>= 50`, `findMany` dos `count - 49` mais antigos → `deleteMany` → `create`
- `platform: input.platform ?? null` e `dialect: input.dialect ?? null` — campos nullable passados explicitamente
- `catch { console.warn(...); return null; }` — falha silenciosa, não interrompe fluxo principal
- Nenhuma função GET/DELETE exportada (per D-08 — Phase 7 adiciona endpoints de leitura)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] .env ausente no worktree causou falha de autenticação no db push**
- **Found during:** Task 2
- **Issue:** `npx prisma db push` falhou com `P1000: Authentication failed` porque o worktree não tinha `.env` com `DATABASE_URL` correto (porta 5433 vs default 5432)
- **Fix:** Copiou `/home/rodrigo/tabelin.ia/.env` para o worktree. Arquivo está no `.gitignore`, portanto não commitado.
- **Files modified:** .env (não rastreado)
- **Commit:** N/A

**2. [Rule 3 - Blocker] Prisma 7 não suporta --dry-run**
- **Found during:** Task 2 verificação
- **Issue:** `npx prisma db push --dry-run` retornou erro "unknown or unexpected option" — flag removida na v7
- **Fix:** Verificação alternativa via grep no schema.prisma do .prisma/client gerado e contagem de referências no index.d.ts (72 ocorrências de conversationExchange)
- **Impact:** Nenhum — o push anterior confirmou sync com "Your database is now in sync"

## Threat Model Coverage

| Threat ID | Status | Implementation |
|-----------|--------|----------------|
| T-06-01 (IDOR) | Accepted — Phase 7 | Repository só tem save; queries futuras de GET seguirão padrão userId+id |
| T-06-02 (SQL Injection) | Accepted | Prisma usa parameterized queries automaticamente |
| T-06-03 (orphan records) | Mitigated | onDelete: Cascade em prisma/schema.prisma |
| T-06-04 (DoS race condition) | Mitigated | prisma.$transaction garante atomicidade count+delete+create |

## Known Stubs

Nenhum stub identificado. `saveConversationExchange()` é uma função de persistência completa sem dados mockados.

## Threat Flags

Nenhuma nova superfície de segurança além do escopo do plano.

## Self-Check: PASSED

- [x] prisma/schema.prisma contém `model ConversationExchange` com onDelete: Cascade e index composto
- [x] Tabela `conversation_exchanges` existe no banco (push confirmou "database is now in sync")
- [x] Prisma Client gerado expõe `prisma.conversationExchange` (72 ocorrências no index.d.ts)
- [x] conversation-repository.ts exporta `saveConversationExchange()` com transação atômica
- [x] Cap de 50: lógica count + deleteMany(take: count-49) + create implementada
- [x] Cascade delete: onDelete: Cascade declarado na relação
- [x] TypeScript: nenhum erro em conversation-repository.ts (`npx tsc --noEmit` sem erros no arquivo)
- [x] Commit 39f4992 existe: feat(06-01) schema
- [x] Commit 9c62b52 existe: feat(06-01) repository

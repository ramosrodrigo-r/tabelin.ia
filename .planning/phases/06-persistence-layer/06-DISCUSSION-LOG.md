# Phase 6: Persistence Layer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 06-persistence-layer
**Areas discussed:** Modelo de dados do exchange, Mecanismo do cap de 50, File Analysis (modelo unificado ou separado), Design dos endpoints CRUD

---

## Modelo de dados do exchange

| Option | Description | Selected |
|--------|-------------|----------|
| 1 linha por par (user+assistente) | Um registro por troca completa — mais simples para exibir e ordenar no frontend. Consistente com FormulaExchange do front. | ✓ |
| 1 linha por mensagem (role) | Rows separados por role — mais flexível para multi-turn, mas complexo para reconstruir pares. | |
| Você decide | Claude escolhe o padrão mais consistente com o projeto. | |

**User's choice:** 1 linha por par (Recomendado)
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Payload JSON estruturado | Salva objeto completo (formula, explanation, metadata, warnings). Permite re-renderização fiel no Phase 7. | ✓ |
| Texto markdown/string puro | Serialização simples, perde estrutura para renderização seletiva. | |

**User's choice:** Payload JSON estruturado (Recomendado)
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Colunas individuais (platform, dialect, mode) | Campos tipados no schema Prisma. Padrão de ToolRequest. | ✓ |
| JSON blob (toolMeta) | Campo genérico — flexível mas menos queryable. | |

**User's choice:** Colunas individuais (Recomendado)
**Notes:** —

---

## Mecanismo do cap de 50

| Option | Description | Selected |
|--------|-------------|----------|
| Delete síncrono antes do insert (mesma transação) | Nunca há mais de 50 registros. Latência marginal. Garantia forte. | ✓ |
| Delete assíncrono após insert | Menor latência no path crítico mas janela transitória com 51+. | |
| Cron job periódico | Mais simples mas janelas com excesso de registros. Requer infra adicional. | |

**User's choice:** Delete síncrono antes do insert (Recomendado)
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Por usuário + toolKind | Cada tool tem janela independente de 50. Alinhado com HIST-04 e MULTI-03. | ✓ |
| Por usuário global | 50 exchanges total — mais restritivo, pode frustrar usuários de múltiplos tools. | |

**User's choice:** Usuário + toolKind (Recomendado)
**Notes:** —

---

## File Analysis: modelo unificado ou separado

| Option | Description | Selected |
|--------|-------------|----------|
| Dois modelos coexistentes | ConversationExchange para tools simples; ChatMessage permanece para File Analysis. Phase 7 mapeia integração específica. | ✓ |
| Modelo unificado agora | Migrar ChatMessage para ConversationExchange com uploadedFileId opcional. Maior complexidade e risco de regressão. | |

**User's choice:** Dois modelos coexistentes (Recomendado)
**Notes:** STATE.md já anotava "File Analysis usa session-based chat diferente dos outros tools — Phase 7 precisa mapear a integração específica."

| Option | Description | Selected |
|--------|-------------|----------|
| Defer para Phase 7 | Phase 6 foca nos 5 tools simples. File Analysis tratado com cuidado no Phase 7. | ✓ |
| Incluir no Phase 6 | Decidir e implementar agora — aumenta escopo. | |

**User's choice:** Defer para Phase 7 (Recomendado)
**Notes:** —

---

## Design dos endpoints CRUD

| Option | Description | Selected |
|--------|-------------|----------|
| Genérico /api/conversations/[tool] | Uma rota paramétrica, consistente e extensível. toolKind validado contra enum. | ✓ |
| Rotas específicas por tool | /api/tools/{tool}/history — muito boilerplate, 5-6 rotas quase idênticas. | |

**User's choice:** Genérico /api/conversations/[tool] (Recomendado)
**Notes:** Rota definida para Phase 7 quando GET for implementado. Phase 6 não expõe endpoint público.

| Option | Description | Selected |
|--------|-------------|----------|
| Só POST (salvar exchange) agora | Phase 6 implementa apenas persistência. GET e DELETE para Phase 7. | ✓ |
| POST + GET + DELETE completos agora | Implementação antecipada aumenta escopo do Phase 6. | |

**User's choice:** Só POST (salvar exchange) agora (Recomendado)
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Internamente no route handler (server-side) | Save no próprio handler após stream completar. Mais simples e seguro. | ✓ |
| Endpoint separado chamado pelo cliente | Duas chamadas do frontend — risco de save não ocorrer se segunda falhar. | |

**User's choice:** Internamente no route handler (server-side) (Recomendado)
**Notes:** Padrão já adotado por ToolRequest no mesmo ponto de integração.

---

## Claude's Discretion

- Nome exato do model Prisma (`ConversationExchange` sugerido, planner pode ajustar)
- Ordem dos campos no schema Prisma
- Tratamento de erro no save (silencioso vs. log estruturado) — mesma política de `tool-repository.ts`

## Deferred Ideas

- GET /api/conversations/[tool] — Phase 7
- DELETE /api/conversations/[tool] ("Nova conversa") — Phase 7
- File Analysis history integration — Phase 7
- Busca e filtro no histórico — Future
- Export de conversas — Future

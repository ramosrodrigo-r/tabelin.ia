# Phase 6: Persistence Layer - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Criar o modelo de dados `ConversationExchange` no banco, salvar exchanges de todos os tools simples (Formula, SQL, Regex, Scripts, Template) ao término de cada geração, e garantir cascade delete ao excluir conta de usuário. File Analysis permanece no modelo `ChatMessage` existente — integração será tratada no Phase 7.

Escopo: schema DDL + repository + save interno nos route handlers existentes + cascade delete via relação Prisma.

Fora do escopo: carregamento de histórico no frontend (Phase 7), multi-turn LLM context (Phase 8), migração do File Analysis (Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Modelo de dados do exchange

- **D-01:** Um registro por par usuário+assistente (`ConversationExchange`). Não linhas separadas por role — o pair é a unidade de persistência para esta fase.
- **D-02:** Conteúdo do assistente salvo como payload JSON estruturado (`assistantPayload Json @db.Json`). Preserva a estrutura completa (formula, explanation, metadata, warnings para Formula; query + explanation para SQL; etc.) necessária para re-renderização fiel no Phase 7.
- **D-03:** Metadados do tool em colunas individuais tipadas no schema Prisma: `platform String?`, `dialect String?`, `mode String`. Padrão consistente com `ToolRequest` já existente.

### Mecanismo do cap de 50

- **D-04:** Delete síncrono antes do insert, dentro da mesma transação. Antes de inserir um novo exchange, deleta os registros mais antigos que ultrapassem o limite de 50. Nunca há mais de 50 registros no banco para um dado userId + toolKind.
- **D-05:** Cap por `userId + toolKind` — cada tool tem janela independente de 50 exchanges. Alinhado com HIST-04 e com a separação de contexto por tool de MULTI-03.

### File Analysis: coexistência de modelos

- **D-06:** Dois modelos coexistentes. `ConversationExchange` para Formula/SQL/Regex/Scripts/Template; `ChatMessage` scoped a `UploadedFile` permanece para File Analysis. A integração específica do File Analysis com histórico de conversa será mapeada no Phase 7.

### Design dos endpoints / persistência

- **D-07:** Save interno nos route handlers existentes (server-side), não um endpoint separado exposto ao cliente. Cada route handler de tool (`/api/tools/formula/generate`, `/api/tools/sql/generate`, etc.) salva o exchange após stream completar — sem chamada extra do frontend.
- **D-08:** Phase 6 implementa apenas a camada de persistência (save + cascade delete). Endpoints GET (carregar histórico) e DELETE (limpar conversa) são responsabilidade do Phase 7.
- **D-09:** Se e quando um endpoint de leitura for necessário no Phase 7, seguir padrão genérico `/api/conversations/[tool]` com `toolKind` validado contra enum — não rotas por tool.

### Claude's Discretion

- Nome exato do model Prisma (`ConversationExchange` sugerido acima) pode ser ajustado pelo planner se houver conflito de convenção.
- Ordem dos campos no schema Prisma — seguir convenções existentes (id, userId, toolKind, indexes no final).
- Tratamento de erro no save (silencioso como `tool-repository.ts` existente vs. log estruturado) — preferência do planner.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema e banco existente
- `prisma/schema.prisma` — Schema Prisma completo. Ler antes de adicionar qualquer model. Padrões de indexes, relações e cascades já estabelecidos aqui.
- `apps/web/src/server/db/client.ts` — Instância do PrismaClient com adapter pg. Importar `prisma` daqui.

### Padrões de repository existentes
- `apps/web/src/server/tools/tool-repository.ts` — Padrão de repository para tools: try/catch, warn silencioso, colunas de metadata (toolKind, platform, mode).
- `apps/web/src/server/file-analysis/file-repository.ts` — Padrão IDOR guard (userId + id em todas as queries). Aplicar o mesmo em ConversationExchange.

### Route handlers de tools (onde o save será integrado)
- `apps/web/src/app/api/tools/formula/generate/route.ts` — Route handler Formula generate.
- `apps/web/src/app/api/tools/sql/generate/route.ts` — Route handler SQL generate.
- `apps/web/src/app/api/tools/regex/generate/route.ts` — Route handler Regex generate.
- `apps/web/src/app/api/tools/scripts/generate/route.ts` — Route handler Scripts generate.
- `apps/web/src/app/api/tools/template/generate/route.ts` — Route handler Template generate.

### Requisitos
- `.planning/REQUIREMENTS.md` — HIST-01, HIST-02, HIST-04, PRIV-01 são os requirements desta fase.
- `.planning/ROADMAP.md` §Phase 6 — Goal, success criteria e dependências.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prisma` singleton em `apps/web/src/server/db/client.ts`: importar diretamente nos repositories.
- `recordToolRequest()` em `tool-repository.ts`: template para o novo `saveConversationExchange()` — mesma assinatura try/catch/warn.
- `UploadedFile → ChatMessage` relação com `onDelete: Cascade`: template para relação `User → ConversationExchange` com cascade.

### Established Patterns
- **IDOR guard:** toda query que busca por id também filtra por `userId` (ver `findUploadedFileByIdAndUser`). Aplicar em qualquer GET de exchanges.
- **Persist on success, skip on error:** repositories retornam `null` e fazem `console.warn` em vez de throw — não quebra o fluxo do usuário se o banco falhar.
- **Coluna index ao final:** `@@index([userId, toolKind, createdAt])` — padrão de index composto já no schema.
- **`onDelete: Cascade` via relação Prisma:** cascade delete é declarativo na relação `User`, não requer lógica de aplicação.

### Integration Points
- Cada route handler de tool já tem acesso à sessão autenticada (`session.user.id`). O save será adicionado após stream completar nesses handlers.
- `ToolRequest` já é criado nos mesmos handlers — o save de `ConversationExchange` seguirá o mesmo ponto de integração.
- Schema Prisma tem `User` como raiz de todas as relações — a nova relação `conversationExchanges ConversationExchange[]` será adicionada ao model `User`.

</code_context>

<specifics>
## Specific Ideas

- O campo `assistantPayload` deve usar `@db.Text` ou `Json` — preferência por `Json` nativo do Prisma/Postgres para evitar double-stringify.
- A query de limpeza de cap pode usar: `DELETE FROM conversation_exchanges WHERE userId = $1 AND toolKind = $2 AND id NOT IN (SELECT id FROM conversation_exchanges WHERE userId = $1 AND toolKind = $2 ORDER BY createdAt DESC LIMIT 50)` — ou equivalente Prisma com `findMany` + `deleteMany` na mesma transação.

</specifics>

<deferred>
## Deferred Ideas

- **GET /api/conversations/[tool]** (carregar histórico): Phase 7.
- **DELETE /api/conversations/[tool]** (limpar conversa / "Nova conversa"): Phase 7.
- **File Analysis history integration**: Phase 7 — mapeamento de como `ChatMessage` se encaixa com o sistema de histórico genérico.
- **Busca e filtro no histórico**: Future (registrado em REQUIREMENTS.md).
- **Export de conversas**: Future (registrado em REQUIREMENTS.md).

</deferred>

---

*Phase: 6-persistence-layer*
*Context gathered: 2026-05-29*

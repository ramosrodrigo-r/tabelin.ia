# Phase 6: Persistence Layer - Research

**Researched:** 2026-05-29
**Domain:** Prisma ORM + PostgreSQL — schema DDL, repository pattern, Prisma transactions
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Um registro por par usuário+assistente (`ConversationExchange`). Não linhas separadas por role.
- **D-02:** Conteúdo do assistente salvo como payload JSON estruturado (`assistantPayload Json @db.Json`).
- **D-03:** Metadados em colunas individuais tipadas: `platform String?`, `dialect String?`, `mode String`.
- **D-04:** Delete síncrono antes do insert, dentro da mesma transação Prisma.
- **D-05:** Cap por `userId + toolKind` (50 exchanges por tool por usuário).
- **D-06:** Dois modelos coexistentes — `ConversationExchange` para tools simples; `ChatMessage` permanece para File Analysis.
- **D-07:** Save interno nos route handlers (server-side), não endpoint separado do cliente.
- **D-08:** Phase 6 implementa apenas save + cascade delete. GET/DELETE de histórico ficam no Phase 7.
- **D-09:** Quando endpoint de leitura for criado no Phase 7, usar padrão `/api/conversations/[tool]` com `toolKind` validado contra enum.

### Claude's Discretion

- Nome exato do model Prisma (`ConversationExchange` sugerido) pode ser ajustado pelo planner se houver conflito de convenção.
- Ordem dos campos no schema Prisma — seguir convenções existentes (id, userId, toolKind, indexes no final).
- Tratamento de erro no save (silencioso como `tool-repository.ts` vs. log estruturado) — preferência do planner.

### Deferred Ideas (OUT OF SCOPE)

- **GET /api/conversations/[tool]** (carregar histórico): Phase 7.
- **DELETE /api/conversations/[tool]** (limpar conversa): Phase 7.
- **File Analysis history integration**: Phase 7.
- Busca e filtro no histórico: Future.
- Export de conversas: Future.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-01 | Usuário pode fechar e reabrir um workspace de tool e ver as trocas anteriores (exchanges salvos no banco por usuário + tipo de tool) | Schema `ConversationExchange` com índice composto `(userId, toolKind, createdAt)` habilita recuperação por Phase 7 |
| HIST-02 | Cada exchange salva os metadados do tool junto com a resposta (plataforma, dialeto, modo) para renderização correta no reload | Colunas `platform`, `dialect`, `mode` mapeiam diretamente para campos das response schemas de cada tool |
| HIST-04 | Histórico limitado às últimas 50 trocas por usuário por tool; exchanges mais antigos são descartados | Prisma transaction com `findMany` + `deleteMany` antes de `create` garante o cap sem acúmulo |
| PRIV-01 | Histórico de conversas deletado em cascade ao excluir conta de usuário | `onDelete: Cascade` na relação `User → ConversationExchange` — padrão declarativo já usado em todos os outros models |
</phase_requirements>

---

## Summary

Esta fase adiciona uma camada de persistência pura ao backend sem nenhuma mudança de UI. O trabalho é cirúrgico: um novo model Prisma `ConversationExchange`, um novo arquivo de repository (`conversation-repository.ts`), e integração do save em sete route handlers existentes (formula/generate, formula/explain, sql/generate, regex/generate, regex/explain, scripts/generate, template/generate).

A base de código já tem tudo que esta fase precisa: o PrismaClient singleton está em `server/db/client.ts`, o padrão de repository está em `tool-repository.ts` (try/catch/warn silencioso), e o padrão de cascade delete declarativo está em todos os outros models do schema. O planner não precisa introduzir nenhum novo padrão — apenas seguir os existentes.

O único ponto de atenção técnico é o mecanismo do cap de 50 (D-04/D-05): a abordagem correta é uma transação Prisma que executa `deleteMany` (exchanges além do limite) e `create` atomicamente. O Prisma 7.x suporta `prisma.$transaction([...])` e `prisma.$transaction(async (tx) => {...})` — o segundo formato (callback interativo) é preferível porque permite lógica condicional (só deleta se count > 50).

**Primary recommendation:** Implementar `saveConversationExchange()` em `conversation-repository.ts` usando o padrão try/catch/warn do `tool-repository.ts`, com transação Prisma para o cap atomicamente. Nenhum pacote novo é necessário.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Persistência do exchange | API / Backend | Database / Storage | Save acontece server-side nos route handlers, após stream completar |
| Schema DDL e migration | Database / Storage | — | Declarado em `prisma/schema.prisma`, aplicado via `prisma migrate` |
| Cap de 50 exchanges | API / Backend | Database / Storage | Lógica de contagem + delete na transação do repository — não no cliente |
| Cascade delete | Database / Storage | — | `onDelete: Cascade` declarativo na relação Prisma — sem lógica de aplicação |
| Autenticação dos saves | API / Backend | — | Route handlers já verificam sessão antes de qualquer operação |

---

## Standard Stack

### Core

Esta fase não introduz nenhum pacote novo. Todo trabalho usa dependências já instaladas no projeto.

[VERIFIED: npm registry] Versões já instaladas no projeto:

| Library | Version (instalada) | Purpose | Why Standard |
|---------|---------------------|---------|--------------|
| `@prisma/client` | 7.8.0 | ORM client — queries, transactions, type safety | Já o ORM do projeto; `prisma.$transaction` e `Json` type nativos |
| `prisma` | 7.8.0 (devDep) | CLI para migrate e generate | Já usado para todas as migrations do projeto |
| `@prisma/adapter-pg` | 7.8.0 | Driver adapter para `pg` (PostgreSQL) | Já configurado em `server/db/client.ts` |
| `pg` | 8.21.0 | PostgreSQL connection pool | Já configurado com Pool em `client.ts` |
| `zod` | 4.4.3 | Validação de toolKind no repository | Já o validador do projeto inteiro |

### Package Legitimacy Audit

> slopcheck não estava disponível no ambiente de pesquisa. Todos os pacotes abaixo são dependências já instaladas e em uso no projeto — não são instalações novas.

| Package | Registry | Status | Disposition |
|---------|----------|--------|-------------|
| `@prisma/client` | npm | Já instalado (7.8.0) | Aprovado — dependência existente do projeto |
| `prisma` | npm | Já instalado (7.8.0) | Aprovado — dependência existente do projeto |
| `@prisma/adapter-pg` | npm | Já instalado (7.8.0) | Aprovado — dependência existente do projeto |
| `pg` | npm | Já instalado (8.21.0) | Aprovado — dependência existente do projeto |

**Nenhum pacote novo precisa ser instalado nesta fase.**
**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
HTTP POST /api/tools/{tool}/generate
         |
         v
[Route Handler]
 1. auth check (getSessionFromCookieHeader) ─── 401 se sem sessão
 2. parse + validate body (zod)             ─── 400 se inválido
 3. reserveToolUse()                        ─── 429 se quota excedida
 4. resolve{Tool}Payload() ─── LLM call    ─── 502 se LLM falhar
 5. confirmToolUse()
 6. recordToolRequest()   ← já existe
 7. saveConversationExchange()  ← NOVO (esta fase)
         |
         v
[conversation-repository.ts]
 prisma.$transaction(async (tx) => {
   count = tx.conversationExchange.count(userId, toolKind)
   if count >= 50:
     tx.conversationExchange.deleteMany(oldest records)
   tx.conversationExchange.create(new record)
 })
         |
         v
[PostgreSQL]
 conversation_exchanges table
 ├── id (cuid)
 ├── userId (FK → users.id, cascade delete)
 ├── toolKind
 ├── mode
 ├── platform (nullable)
 ├── dialect (nullable)
 ├── userPrompt (Text)
 ├── assistantPayload (Json)
 └── createdAt
         |
 @@index([userId, toolKind, createdAt])
```

### Recommended Project Structure

Nenhuma pasta nova é necessária. Novos arquivos dentro da estrutura existente:

```
prisma/
└── schema.prisma            # + model ConversationExchange (modificar)

apps/web/src/server/tools/
├── tool-repository.ts       # existente — não modificar
├── formula-repository.ts    # existente — não modificar
└── conversation-repository.ts  # NOVO — saveConversationExchange()

apps/web/src/app/api/tools/
├── formula/generate/route.ts    # modificar — adicionar saveConversationExchange()
├── formula/explain/route.ts     # modificar — adicionar saveConversationExchange()
├── sql/generate/route.ts        # modificar — adicionar saveConversationExchange()
├── regex/generate/route.ts      # modificar — adicionar saveConversationExchange()
├── regex/explain/route.ts       # modificar — adicionar saveConversationExchange()
├── scripts/generate/route.ts    # modificar — adicionar saveConversationExchange()
└── template/generate/route.ts   # modificar — adicionar saveConversationExchange()
```

### Pattern 1: Model Prisma com Cascade Delete (padrão existente do projeto)

**What:** Declarar `onDelete: Cascade` na relação `User` do novo model.
**When to use:** Sempre que um model pertence a um usuário e deve ser removido ao deletar a conta.

```prisma
// Fonte: padrão verificado em prisma/schema.prisma — todos os models existentes
model ConversationExchange {
  id               String   @id @default(cuid())
  userId           String
  toolKind         String
  mode             String
  platform         String?
  dialect          String?
  userPrompt       String   @db.Text
  assistantPayload Json     @db.Json
  createdAt        DateTime @default(now())
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, toolKind, createdAt])
}
```

E adicionar a relação inversa no model `User`:
```prisma
model User {
  // ... campos existentes ...
  conversationExchanges ConversationExchange[]
}
```

### Pattern 2: Repository com Try/Catch/Warn Silencioso (padrão existente do projeto)

**What:** Repository que retorna `null` e faz `console.warn` em vez de throw — não quebra o fluxo do usuário.
**When to use:** Para todas as operações de persistência de suporte (métricas, histórico, logs) onde falha não deve interromper a resposta principal.

```typescript
// Fonte: padrão verificado em apps/web/src/server/tools/tool-repository.ts
export async function saveConversationExchange(input: {
  userId: string;
  toolKind: string;
  mode: string;
  platform?: string;
  dialect?: string;
  userPrompt: string;
  assistantPayload: unknown; // tipagem específica do tool
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const count = await tx.conversationExchange.count({
        where: { userId: input.userId, toolKind: input.toolKind }
      });

      if (count >= 50) {
        // Busca os IDs mais antigos que ultrapassam o limite
        const toDelete = await tx.conversationExchange.findMany({
          where: { userId: input.userId, toolKind: input.toolKind },
          orderBy: { createdAt: "asc" },
          take: count - 49, // mantém 49 + o novo = 50
          select: { id: true }
        });

        await tx.conversationExchange.deleteMany({
          where: { id: { in: toDelete.map((r) => r.id) } }
        });
      }

      return await tx.conversationExchange.create({
        data: {
          userId: input.userId,
          toolKind: input.toolKind,
          mode: input.mode,
          platform: input.platform ?? null,
          dialect: input.dialect ?? null,
          userPrompt: input.userPrompt,
          assistantPayload: input.assistantPayload as object
        }
      });
    });
  } catch {
    console.warn("ConversationExchange persistence skipped.");
    return null;
  }
}
```

### Pattern 3: Integração no Route Handler (após stream completar)

**What:** Adicionar `saveConversationExchange()` logo após `recordToolRequest()` nos route handlers existentes.
**When to use:** Somente após `confirmToolUse()` ser chamado com sucesso — o exchange é persistido apenas em geração bem-sucedida.

```typescript
// Exemplo para sql/generate/route.ts — padrão replicável para todos os tools
// Fonte: padrão verificado nos route handlers existentes do projeto

try {
  const payload = await resolveSqlPayload({ request: parsed.data });
  await confirmToolUse(quotaCheck.reservationKey);
  await recordToolRequest({ /* ... já existente ... */ });

  // NOVO — Phase 6
  await saveConversationExchange({
    userId: user.id,
    toolKind: "sql",
    mode: "generate",
    dialect: parsed.data.dialect,
    userPrompt: parsed.data.prompt,
    assistantPayload: payload
  });

  return new Response(createSqlEventStream(payload, quotaCheck.lastFreeUse), {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" }
  });
} catch { /* ... já existente ... */ }
```

### Mapeamento de campos por tool

| Tool | toolKind | mode | platform | dialect | userPrompt field | assistantPayload source |
|------|----------|------|----------|---------|-----------------|------------------------|
| Formula generate | `"formula"` | `"generate"` | `parsed.data.platform` | `parsed.data.formulaLanguage` | `parsed.data.prompt` | `payload` |
| Formula explain | `"formula"` | `"explain"` | `parsed.data.platform` | `parsed.data.formulaLanguage` | `parsed.data.formula` | `payload` |
| SQL generate | `"sql"` | `"generate"` | `null` | `parsed.data.dialect` | `parsed.data.prompt` | `payload` |
| Regex generate | `"regex"` | `"generate"` | `null` | `null` | `parsed.data.prompt` | `payload` |
| Regex explain | `"regex"` | `"explain"` | `null` | `null` | `parsed.data.pattern` | `payload` |
| Scripts generate | `"script"` | `"generate"` | `null` | `parsed.data.scriptType` | `parsed.data.prompt` | `payload` |
| Template generate | `"template"` | `"generate"` | `null` | `null` | `parsed.data.prompt` | `payload` |

**Nota sobre Formula:** `formulaLanguage` mapeia para a coluna `dialect` (ex: `"pt-BR"`, `"en-US"`). A coluna `platform` recebe o valor de `parsed.data.platform` (ex: `"excel"`, `"sheets"`).

**Nota sobre `assistantPayload`:** Salvar o objeto `payload` completo (resultado de `resolve{Tool}Payload()`) garante fidelidade máxima para re-renderização no Phase 7. O tipo Prisma `Json` aceita qualquer objeto serializable — não é necessário stringify manual.

### Anti-Patterns to Avoid

- **Não chamar `saveConversationExchange()` antes de `confirmToolUse()`:** O exchange deve ser salvo apenas após confirmar que a geração foi bem-sucedida e a quota debitada. Salvar antes pode criar registros de exchanges que nunca foram entregues ao usuário.
- **Não usar `prisma.conversationExchange.count()` fora da transaction:** A contagem e o delete devem ser atômicos. Contar fora e deletar dentro pode resultar em race condition (dois requests simultâneos do mesmo usuário).
- **Não lançar exceção do `saveConversationExchange()`:** Seguir o padrão try/catch/warn silencioso. Uma falha de persistência de histórico não deve quebrar a entrega da resposta ao usuário.
- **Não criar endpoint GET para esta fase:** D-08 define que GET é responsabilidade do Phase 7. Criar agora seria fora de escopo.
- **Não usar `@db.Text` para `assistantPayload`:** D-02 especifica `Json @db.Json` para evitar double-stringify e preservar tipagem.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transação atômica (count + delete + insert) | Lógica manual com múltiplos awaits sequenciais | `prisma.$transaction(async (tx) => {...})` | Sem atomicidade, race conditions possíveis com requests simultâneos do mesmo usuário |
| Cascade delete ao excluir usuário | `beforeDelete` hook ou listener customizado | `onDelete: Cascade` no schema Prisma | DDL constraint gerenciado pelo banco — zero código de aplicação, sem risco de orphan records |
| Serialização do `assistantPayload` | `JSON.stringify()` manual antes de salvar | Tipo Prisma `Json` nativo | Prisma serializa/deserializa automaticamente; double-stringify causa erros silenciosos de parsing no Phase 7 |

**Key insight:** O Prisma já resolveu os três problemas críticos desta fase (transações, cascades, JSON nativo). A tentação de implementar manualmente qualquer um desses introduz bugs de concorrência ou de integridade de dados desnecessários.

---

## Common Pitfalls

### Pitfall 1: Race Condition no Cap de 50

**What goes wrong:** Dois requests simultâneos do mesmo usuário para o mesmo tool contam 50 registros cada e inserem novos, resultando em 52 registros.
**Why it happens:** Count e insert não são atômicos quando feitos em queries separadas.
**How to avoid:** Usar `prisma.$transaction(async (tx) => {...})` com o count, delete e create dentro da mesma transação.
**Warning signs:** Testes de carga mostram mais de 50 registros após bursts de requests.

### Pitfall 2: `assistantPayload` como String em vez de Json

**What goes wrong:** Se o campo for `@db.Text` em vez de `@db.Json`, o Prisma armazena uma string JSON. Ao ler no Phase 7, o dado retorna como string e precisa de `JSON.parse()` extra — quebra a re-renderização se o código do Phase 7 não souber.
**Why it happens:** Confusão entre `String @db.Text` (usado em `ChatMessage.content`) e `Json @db.Json` (necessário para payload estruturado).
**How to avoid:** Declarar `assistantPayload Json @db.Json` no schema — igual ao campo `schema` do model `UploadedFile`.
**Warning signs:** Ao ler `assistantPayload` no Phase 7, o valor é uma string em vez de objeto.

### Pitfall 3: Salvar antes de `confirmToolUse()`

**What goes wrong:** Exchange salvo no banco para uma geração que depois falha (LLM timeout, parse error), criando um registro com payload corrompido ou incompleto.
**Why it happens:** O `saveConversationExchange()` é chamado antes do bloco try/catch resolver o payload.
**How to avoid:** Chamar `saveConversationExchange()` apenas após `confirmToolUse()` — seguindo o mesmo ponto de integração do `recordToolRequest()` existente.
**Warning signs:** Exchanges no banco com `assistantPayload` null ou malformado.

### Pitfall 4: `prisma migrate dev` não executado após alterar schema

**What goes wrong:** Schema atualizado no `.prisma` file mas a migration não foi criada/aplicada. O Prisma Client gerado ainda usa o schema antigo. Erros de runtime ao tentar criar `ConversationExchange`.
**Why it happens:** `prisma generate` atualiza o client mas não cria a tabela no banco. `prisma migrate dev` é necessário para ambos.
**How to avoid:** Wave 0 do planner deve incluir: `prisma migrate dev --name add-conversation-exchange`, depois `prisma generate`.
**Warning signs:** `Unknown field 'conversationExchanges' on model 'User'` no runtime.

### Pitfall 5: Campo `userPrompt` para Formula explain

**What goes wrong:** Formula explain usa `parsed.data.formula` (não `prompt`) como texto do usuário. Chamar `parsed.data.prompt` resulta em `undefined`.
**Why it happens:** Os schemas de explain usam o campo `formula` ou `pattern` em vez de `prompt`.
**How to avoid:** Ver tabela "Mapeamento de campos por tool" acima — campo `userPrompt` é `parsed.data.formula` para Formula explain e `parsed.data.pattern` para Regex explain.
**Warning signs:** `userPrompt` salvo como `undefined` ou string vazia.

---

## Code Examples

### Schema Prisma — Model ConversationExchange

```prisma
// Fonte: prisma/schema.prisma do projeto — padrão verificado dos models existentes [VERIFIED: codebase]
model ConversationExchange {
  id               String   @id @default(cuid())
  userId           String
  toolKind         String
  mode             String
  platform         String?
  dialect          String?
  userPrompt       String   @db.Text
  assistantPayload Json     @db.Json
  createdAt        DateTime @default(now())
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, toolKind, createdAt])
}
```

### Transação Prisma — Cap de 50 com delete atômico

```typescript
// Fonte: padrão prisma.$transaction verificado na documentação Prisma 7.x [ASSUMED - sintaxe confirmada pelo uso do @prisma/client 7.8.0 já instalado]
await prisma.$transaction(async (tx) => {
  const count = await tx.conversationExchange.count({
    where: { userId: input.userId, toolKind: input.toolKind }
  });

  if (count >= 50) {
    const toDelete = await tx.conversationExchange.findMany({
      where: { userId: input.userId, toolKind: input.toolKind },
      orderBy: { createdAt: "asc" },
      take: count - 49,
      select: { id: true }
    });

    await tx.conversationExchange.deleteMany({
      where: { id: { in: toDelete.map((r) => r.id) } }
    });
  }

  return tx.conversationExchange.create({
    data: { /* ... */ }
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `prisma.$transaction([op1, op2])` (sequential array) | `prisma.$transaction(async (tx) => {...})` (interactive callback) | Prisma 2.x → 3.x+ | Callback permite lógica condicional (if count >= 50) — necessário para o cap |
| `Json` como `String` com stringify manual | Tipo nativo `Json` no schema Prisma + `@db.Json` para Postgres | Prisma 2.x+ | Zero boilerplate de serialização; retorna objeto tipado na leitura |

**Deprecated/outdated:**
- `prisma.$executeRaw` para a query de cap: funciona mas contorna o type system. O padrão `findMany + deleteMany` dentro de `$transaction` callback é mais seguro e legível.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `prisma.$transaction(async (tx) => {...})` suporta `count + findMany + deleteMany + create` atomicamente no Prisma 7.8.0 | Code Examples | Transação não seria atômica; race condition possível. Verificar com `ctx7` ou docs antes de implementar. |
| A2 | `Json @db.Json` em Prisma 7.x com adapter `@prisma/adapter-pg` serializa/deserializa automaticamente sem stringify manual | Standard Stack / Architecture | Phase 7 receberia string em vez de objeto; quebra a re-renderização. |

---

## Open Questions

1. **Delete account endpoint existe?**
   - What we know: Nenhum endpoint `/api/auth/delete-account` ou similar foi encontrado nos route handlers existentes.
   - What's unclear: PRIV-01 exige cascade delete ao excluir conta — mas se não há endpoint de exclusão de conta ainda, o cascade delete será testado como? O PRIV-01 pode ser verificado apenas pela constraint DDL.
   - Recommendation: Implementar o cascade delete via DDL (`onDelete: Cascade`) conforme planejado. Criar um teste que deleta diretamente via `prisma.user.delete()` para verificar a cascade. O endpoint de exclusão de conta, se necessário, é escopo de uma fase futura.

2. **`toolKind` para Scripts: `"script"` ou `"scripts"`?**
   - What we know: O route handler de scripts usa `toolKind: "script"` (sem 's') em `recordToolRequest()`. A pasta da API é `tools/scripts` (com 's').
   - What's unclear: O cap de 50 em D-05 é por `userId + toolKind` — o valor string deve ser consistente.
   - Recommendation: Usar `"script"` (sem 's') — consistente com o valor já usado em `recordToolRequest()` no handler de scripts. Ver `apps/web/src/app/api/tools/scripts/generate/route.ts` linha 32.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Banco principal | ✓ (assumido) | — | — |
| `prisma` CLI | `migrate dev` + `generate` | ✓ | 7.8.0 | — |
| `@prisma/client` | Repository queries | ✓ | 7.8.0 | — |

**Missing dependencies com fallback:** Nenhum.
**Missing dependencies bloqueantes:** Nenhum — todos os pacotes necessários já estão instalados.

---

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` — seção obrigatória.

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `getSessionFromCookieHeader()` — já aplicado em todos os route handlers. O save só ocorre após auth check. |
| V3 Session Management | no | Nenhuma sessão nova criada nesta fase |
| V4 Access Control | yes | IDOR guard: toda query de `ConversationExchange` deve filtrar por `userId` além do `id` — padrão do `file-repository.ts`. Phase 6 não cria endpoints de leitura (Phase 7), mas o repository deve já incluir o guard para uso futuro. |
| V5 Input Validation | yes | `toolKind` e `mode` vêm do route handler que já validou com zod. `userPrompt` e `assistantPayload` são dados do usuário/LLM — `@db.Text` e `Json @db.Json` previnem SQL injection via Prisma parametrized queries. |
| V6 Cryptography | no | Nenhuma operação criptográfica nesta fase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — acessar exchanges de outro usuário | Elevation of Privilege | `userId` sempre presente como filtro em todas as queries do repository. Nunca buscar por `id` alone. |
| SQL Injection via `assistantPayload` | Tampering | Prisma usa parameterized queries automaticamente — `Json` type não interpola valores como SQL |
| Orphan records ao deletar usuário | Information Disclosure | `onDelete: Cascade` na relação — garantido pelo banco, não pela aplicação |

---

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` do projeto — padrões de model, indexes, cascade delete verificados diretamente [VERIFIED: codebase]
- `apps/web/src/server/tools/tool-repository.ts` — padrão try/catch/warn verificado [VERIFIED: codebase]
- `apps/web/src/server/file-analysis/file-repository.ts` — padrão IDOR guard verificado [VERIFIED: codebase]
- `apps/web/src/app/api/tools/*/route.ts` (7 route handlers) — estrutura de integração verificada [VERIFIED: codebase]
- `apps/web/package.json` — versões de dependências verificadas [VERIFIED: codebase]
- `packages/shared/src/*/schema.ts` — tipos de payload por tool verificados [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- npm registry — versão atual `@prisma/client` e `prisma` (7.8.0) confirmada [VERIFIED: npm registry]

### Tertiary (LOW confidence)
- Sintaxe exata de `prisma.$transaction` callback no Prisma 7.8.0 — baseada em treinamento, não consultada em Context7/docs oficiais [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — tudo já instalado, verificado no package.json
- Architecture: HIGH — todos os padrões extraídos do codebase real, não de suposições
- Pitfalls: HIGH — derivados de análise direta do codebase e dos tipos dos schemas existentes
- Transação Prisma: MEDIUM — sintaxe `$transaction` callback verificada por conhecimento de treinamento; confirmar com docs antes de implementar

**Research date:** 2026-05-29
**Valid until:** 2026-06-28 (30 dias — stack estável)

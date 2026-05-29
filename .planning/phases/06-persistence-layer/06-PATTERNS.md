# Phase 6: Persistence Layer - Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 9 (1 novo + 1 schema modificado + 7 route handlers modificados)
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `prisma/schema.prisma` | model/config | CRUD | `prisma/schema.prisma` (models `ToolRequest`, `UploadedFile`) | exact |
| `apps/web/src/server/tools/conversation-repository.ts` | repository/service | CRUD + batch | `apps/web/src/server/tools/tool-repository.ts` | exact |
| `apps/web/src/app/api/tools/formula/generate/route.ts` | route handler | request-response | ele mesmo (modificar) | exact |
| `apps/web/src/app/api/tools/formula/explain/route.ts` | route handler | request-response | ele mesmo (modificar) | exact |
| `apps/web/src/app/api/tools/sql/generate/route.ts` | route handler | request-response | ele mesmo (modificar) | exact |
| `apps/web/src/app/api/tools/regex/generate/route.ts` | route handler | request-response | ele mesmo (modificar) | exact |
| `apps/web/src/app/api/tools/regex/explain/route.ts` | route handler | request-response | ele mesmo (modificar) | exact |
| `apps/web/src/app/api/tools/scripts/generate/route.ts` | route handler | request-response | ele mesmo (modificar) | exact |
| `apps/web/src/app/api/tools/template/generate/route.ts` | route handler | request-response | ele mesmo (modificar) | exact |

---

## Pattern Assignments

### `prisma/schema.prisma` — adicionar model `ConversationExchange` + relação inversa em `User`

**Analog:** `prisma/schema.prisma` — models `ToolRequest` (linhas 72–89) e `UploadedFile` (linhas 147–163)

**Padrão de model com cascade delete** (linhas 72–89 e 147–158):
```prisma
// ToolRequest — padrão de campos de metadata (toolKind, mode, platform) + onDelete: Cascade
model ToolRequest {
  id              String   @id @default(cuid())
  userId          String
  toolKind        String
  mode            String
  platform        String
  formulaLanguage String?
  separator       String?
  status          String
  latencyMs       Int?
  providerModel   String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([toolKind, mode])
}
```

**Padrão de campo Json nativo** (linha 153 — `UploadedFile`):
```prisma
// UploadedFile — campo Json sem @db.Text; Prisma serializa automaticamente
  schema     Json
```

**Padrão de index composto** (linha 161):
```prisma
  @@index([userId, createdAt])
```

**Relação inversa no model `User`** (linhas 10–25):
```prisma
model User {
  id               String            @id @default(cuid())
  // ... campos existentes ...
  toolRequests     ToolRequest[]
  uploadedFiles    UploadedFile[]
  // ADICIONAR:
  conversationExchanges ConversationExchange[]
}
```

**Novo model a criar** — copiar estrutura de `ToolRequest` com adaptações:
```prisma
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

Diferenças em relação ao `ToolRequest`:
- Sem `updatedAt` (registro imutável — salvo uma vez, nunca editado)
- `platform` e `dialect` são `String?` (nullable — nem todos os tools têm esses metadados)
- `userPrompt String @db.Text` — texto livre, potencialmente longo
- `assistantPayload Json @db.Json` — payload estruturado, não string
- Index composto inclui `toolKind` (cap por userId + toolKind)

---

### `apps/web/src/server/tools/conversation-repository.ts` — arquivo NOVO

**Analog:** `apps/web/src/server/tools/tool-repository.ts` (linhas 1–32)

**Padrão de imports** (linhas 1 do analog):
```typescript
import { prisma } from "@/server/db/client";
```

**Padrão de assinatura da função** (linhas 5–13):
```typescript
export async function recordToolRequest(input: {
  userId: string;
  toolKind: string;
  mode: string;
  dialect?: string;
  status: GenericToolRequestStatus;
  latencyMs?: number;
  providerModel?: string;
}) {
```

**Padrão try/catch/warn silencioso** (linhas 13–32):
```typescript
  try {
    return await prisma.toolRequest.create({
      data: {
        userId: input.userId,
        toolKind: input.toolKind,
        mode: input.mode,
        platform: input.dialect ?? "",
        // ...
      }
    });
  } catch {
    console.warn("Tool request persistence skipped.");
    return null;
  }
```

**Padrão de IDOR guard** — extraído de `apps/web/src/server/file-analysis/file-repository.ts` (linhas 41–49):
```typescript
// Nunca buscar por id alone — sempre incluir userId
export async function findUploadedFileByIdAndUser(id: string, userId: string) {
  try {
    return await prisma.uploadedFile.findFirst({
      where: { id, userId }   // <-- ambos obrigatórios
    });
  } catch {
    console.warn("UploadedFile lookup failed.");
    return null;
  }
}
```

**Novo arquivo a criar** — adaptar `tool-repository.ts` com transação Prisma:
```typescript
import { prisma } from "@/server/db/client";

export async function saveConversationExchange(input: {
  userId: string;
  toolKind: string;
  mode: string;
  platform?: string;
  dialect?: string;
  userPrompt: string;
  assistantPayload: unknown;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
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

---

### `apps/web/src/app/api/tools/sql/generate/route.ts` — ponto de integração padrão

**Analog:** ele mesmo — arquivo base para replicar o padrão nos demais handlers

**Imports atuais** (linhas 1–8):
```typescript
import { NextResponse } from "next/server";
import { sqlGenerateRequestSchema } from "@tabelin/shared";
import { createSqlEventStream, resolveSqlPayload } from "@/server/ai/sql-stream";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { recordToolRequest } from "@/server/tools/tool-repository";
import { confirmToolUse, releaseToolUse, reserveToolUse } from "@/server/usage/quota-service";
```

**Adicionar import** (após os imports existentes):
```typescript
import { saveConversationExchange } from "@/server/tools/conversation-repository";
```

**Bloco try atual — padrão de integração** (linhas 28–46):
```typescript
  try {
    const payload = await resolveSqlPayload({ request: parsed.data });
    await confirmToolUse(quotaCheck.reservationKey);
    await recordToolRequest({
      userId: user.id,
      toolKind: "sql",
      mode: "generate",
      dialect: parsed.data.dialect,
      status: "success",
      latencyMs: Math.round(performance.now() - startedAt),
      providerModel: payload.metadata.providerModel
    });
    return new Response(createSqlEventStream(payload, quotaCheck.lastFreeUse), {
      headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" }
    });
  } catch {
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ error: "Nao consegui validar a resposta." }, { status: 502 });
  }
```

**Bloco try após modificação** — inserir `saveConversationExchange()` logo após `recordToolRequest()`:
```typescript
  try {
    const payload = await resolveSqlPayload({ request: parsed.data });
    await confirmToolUse(quotaCheck.reservationKey);
    await recordToolRequest({
      userId: user.id,
      toolKind: "sql",
      mode: "generate",
      dialect: parsed.data.dialect,
      status: "success",
      latencyMs: Math.round(performance.now() - startedAt),
      providerModel: payload.metadata.providerModel
    });
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
  } catch {
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ error: "Nao consegui validar a resposta." }, { status: 502 });
  }
```

---

### `apps/web/src/app/api/tools/formula/generate/route.ts` — variação Formula

**Analog:** `apps/web/src/app/api/tools/sql/generate/route.ts` — mesmo padrão de integração

**Imports atuais** (linhas 1–8):
```typescript
import { NextResponse } from "next/server";
import { formulaGenerateRequestSchema } from "@tabelin/shared";
import { createFormulaEventStream, resolveFormulaPayload } from "@/server/ai/formula-stream";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { recordFormulaToolRequest } from "@/server/tools/formula-repository";
import { reserveToolUse, confirmToolUse, releaseToolUse } from "@/server/usage/quota-service";
```

**Adicionar import:**
```typescript
import { saveConversationExchange } from "@/server/tools/conversation-repository";
```

**Bloco try atual** (linhas 38–57):
```typescript
  try {
    const payload = await resolveFormulaPayload({ mode: "generate", request: parsed.data });
    await confirmToolUse(quotaCheck.reservationKey);
    await recordFormulaToolRequest({
      userId: user.id,
      metadata: payload.metadata,
      status: "success",
      latencyMs: Math.round(performance.now() - startedAt)
    });
    return new Response(createFormulaEventStream(payload, quotaCheck.lastFreeUse), {
      headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" }
    });
  } catch {
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ error: "Nao consegui validar a resposta." }, { status: 502 });
  }
```

**Inserir após `recordFormulaToolRequest()`:**
```typescript
    // NOVO — Phase 6
    await saveConversationExchange({
      userId: user.id,
      toolKind: "formula",
      mode: "generate",
      platform: parsed.data.platform,
      dialect: parsed.data.formulaLanguage,
      userPrompt: parsed.data.prompt,
      assistantPayload: payload
    });
```

---

### `apps/web/src/app/api/tools/formula/explain/route.ts` — variação explain

**Atenção:** campo `userPrompt` é `parsed.data.formula` (não `prompt`) — ver Pitfall 5 no RESEARCH.md.

**Inserir após `recordFormulaToolRequest()`:**
```typescript
    // NOVO — Phase 6
    await saveConversationExchange({
      userId: user.id,
      toolKind: "formula",
      mode: "explain",
      platform: parsed.data.platform,
      dialect: parsed.data.formulaLanguage,
      userPrompt: parsed.data.formula,   // <-- campo correto para explain
      assistantPayload: payload
    });
```

---

### `apps/web/src/app/api/tools/regex/generate/route.ts`

**Inserir após `recordToolRequest()`:**
```typescript
    // NOVO — Phase 6
    await saveConversationExchange({
      userId: user.id,
      toolKind: "regex",
      mode: "generate",
      userPrompt: parsed.data.prompt,
      assistantPayload: payload
    });
```

---

### `apps/web/src/app/api/tools/regex/explain/route.ts`

**Atenção:** campo `userPrompt` é `parsed.data.pattern` (não `prompt`) para Regex explain.

**Inserir após `recordToolRequest()`:**
```typescript
    // NOVO — Phase 6
    await saveConversationExchange({
      userId: user.id,
      toolKind: "regex",
      mode: "explain",
      userPrompt: parsed.data.pattern,   // <-- campo correto para explain
      assistantPayload: payload
    });
```

---

### `apps/web/src/app/api/tools/scripts/generate/route.ts`

**Nota:** `toolKind` é `"script"` (sem 's') — consistente com `recordToolRequest()` na linha 31.

**Inserir após `recordToolRequest()`:**
```typescript
    // NOVO — Phase 6
    await saveConversationExchange({
      userId: user.id,
      toolKind: "script",
      mode: "generate",
      dialect: parsed.data.scriptType,
      userPrompt: parsed.data.prompt,
      assistantPayload: payload
    });
```

---

### `apps/web/src/app/api/tools/template/generate/route.ts`

**Inserir após `recordToolRequest()`:**
```typescript
    // NOVO — Phase 6
    await saveConversationExchange({
      userId: user.id,
      toolKind: "template",
      mode: "generate",
      userPrompt: parsed.data.prompt,
      assistantPayload: payload
    });
```

---

## Shared Patterns

### Autenticação (guard de sessão)
**Fonte:** todos os route handlers — padrão uniforme
**Aplicar a:** não há novos endpoints nesta fase (D-08); os handlers existentes já têm o guard
```typescript
// Padrão extraído de apps/web/src/app/api/tools/sql/generate/route.ts linhas 10–13
const user = getSessionFromCookieHeader(request.headers.get("cookie"));
if (!user) {
  return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
}
```

### Try/Catch/Warn Silencioso (repository)
**Fonte:** `apps/web/src/server/tools/tool-repository.ts` linhas 13–32
**Aplicar a:** `conversation-repository.ts` (todas as funções)
```typescript
} catch {
  console.warn("Tool request persistence skipped.");
  return null;
}
```
Regra: nunca re-throw em repositories de persistência auxiliar. Falha de histórico não interrompe a resposta ao usuário.

### IDOR Guard
**Fonte:** `apps/web/src/server/file-analysis/file-repository.ts` linhas 41–49
**Aplicar a:** `conversation-repository.ts` — qualquer função que busque por `id` deve incluir `userId` no `where`
```typescript
// Padrão: nunca buscar apenas por id
where: { id, userId }   // ambos obrigatórios
```
Nota: Phase 6 não implementa endpoints GET (Phase 7), mas o repository deve já seguir o padrão para uso futuro.

### Cascade Delete declarativo
**Fonte:** `prisma/schema.prisma` — todos os models existentes (ex: linhas 36, 55, 85, 104)
**Aplicar a:** `prisma/schema.prisma` — model `ConversationExchange`
```prisma
user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
```
Padrão: DDL constraint gerenciada pelo banco. Zero código de aplicação.

### PrismaClient singleton
**Fonte:** `apps/web/src/server/db/client.ts` linhas 1–16
**Aplicar a:** `conversation-repository.ts`
```typescript
import { prisma } from "@/server/db/client";
```
Sempre importar `prisma` deste singleton — nunca instanciar `new PrismaClient()` diretamente.

### Ponto de integração no route handler
**Fonte:** `apps/web/src/app/api/tools/sql/generate/route.ts` linhas 28–46
**Aplicar a:** todos os 7 route handlers modificados
Regra: `saveConversationExchange()` é chamado APÓS `confirmToolUse()` e `recordToolRequest()`, ANTES do `return new Response(...)`. Nunca chamar antes de `confirmToolUse()` — exchange só deve ser persistido se a geração foi entregue com sucesso.

---

## Mapeamento de campos por handler

| Handler | toolKind | mode | platform | dialect | userPrompt |
|---------|----------|------|----------|---------|------------|
| `formula/generate/route.ts` | `"formula"` | `"generate"` | `parsed.data.platform` | `parsed.data.formulaLanguage` | `parsed.data.prompt` |
| `formula/explain/route.ts` | `"formula"` | `"explain"` | `parsed.data.platform` | `parsed.data.formulaLanguage` | `parsed.data.formula` |
| `sql/generate/route.ts` | `"sql"` | `"generate"` | `null` (omitir) | `parsed.data.dialect` | `parsed.data.prompt` |
| `regex/generate/route.ts` | `"regex"` | `"generate"` | `null` (omitir) | `null` (omitir) | `parsed.data.prompt` |
| `regex/explain/route.ts` | `"regex"` | `"explain"` | `null` (omitir) | `null` (omitir) | `parsed.data.pattern` |
| `scripts/generate/route.ts` | `"script"` | `"generate"` | `null` (omitir) | `parsed.data.scriptType` | `parsed.data.prompt` |
| `template/generate/route.ts` | `"template"` | `"generate"` | `null` (omitir) | `null` (omitir) | `parsed.data.prompt` |

---

## No Analog Found

Nenhum arquivo sem analog. Todos os padrões necessários já existem no codebase.

---

## Metadata

**Analog search scope:** `prisma/`, `apps/web/src/server/tools/`, `apps/web/src/server/file-analysis/`, `apps/web/src/server/db/`, `apps/web/src/app/api/tools/`
**Files scanned:** 10
**Pattern extraction date:** 2026-05-29

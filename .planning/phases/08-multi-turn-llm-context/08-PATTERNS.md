# Phase 8: Multi-turn LLM Context - Mapa de Padrões

**Mapeado:** 2026-05-30
**Arquivos analisados:** 9 (4 stream modules + 4 route handlers + 1 helper compartilhado novo)
**Analogs encontrados:** 9 / 9

## Resumo da fase

Injetar o histórico persistido (`ConversationExchange`) como mensagens `role:user`/`role:assistant` entre o `system` e o `user` atual nos 4 tools que chamam o LLM (SQL, Regex, Scripts, Template). O padrão de referência completo **já existe** em `file-chat-stream.ts` (`buildFileChatMessages`) e o route handler de file-analysis (`getRecentMessages → buildFileChatStream(history)`). Esta fase espelha essas duas formas nos 4 tools de texto.

A mudança por tool é mínima e localizada:
1. **Route handler:** após auth/quota, antes de `resolve*Payload`, ler histórico via `findConversationExchanges(userId, toolKind)`, truncar, passar `history` para `resolve*Payload`.
2. **Stream module:** `resolve*Payload` recebe `history` opcional, serializa cada exchange (D-05) e injeta `[system, ...history, user]` (era `[system, user]`).
3. **Helper novo:** serialização de exchanges → mensagens + truncagem híbrida (N=10 + guarda de tokens chars/4).

## Classificação de Arquivos

| Arquivo (criado/modificado) | Role | Data Flow | Analog mais próximo | Qualidade do match |
|---|---|---|---|---|
| `apps/web/src/server/ai/context-messages.ts` (NOVO — helper D-05/D-07/D-08) | utility | transform | `file-chat-stream.ts` `buildFileChatMessages` (linhas 41-70) | role-match (transform de history→messages) |
| `apps/web/src/server/ai/sql-stream.ts` (MODIFICADO) | service | request-response | `file-chat-stream.ts` `buildFileChatStream` (linhas 119-176) | exact (mesmo padrão de montagem) |
| `apps/web/src/server/ai/regex-stream.ts` (MODIFICADO — só `generate`) | service | request-response | `sql-stream.ts` `resolveSqlPayload` (linhas 14-64) | exact |
| `apps/web/src/server/ai/scripts-stream.ts` (MODIFICADO) | service | request-response | `sql-stream.ts` `resolveSqlPayload` (linhas 14-64) | exact |
| `apps/web/src/server/ai/template-stream.ts` (MODIFICADO) | service | request-response | `sql-stream.ts` `resolveSqlPayload` (linhas 14-64) | exact |
| `apps/web/src/app/api/tools/sql/generate/route.ts` (MODIFICADO) | route | request-response | `file-analysis/chat/route.ts` (linhas 41-61) | exact (leitura+passagem de history) |
| `apps/web/src/app/api/tools/regex/generate/route.ts` (MODIFICADO) | route | request-response | `file-analysis/chat/route.ts` (linhas 41-61) | exact |
| `apps/web/src/app/api/tools/scripts/generate/route.ts` (MODIFICADO) | route | request-response | `file-analysis/chat/route.ts` (linhas 41-61) | exact |
| `apps/web/src/app/api/tools/template/generate/route.ts` (MODIFICADO) | route | request-response | `file-analysis/chat/route.ts` (linhas 41-61) | exact |

## Atribuição de Padrões

### `apps/web/src/server/ai/context-messages.ts` (NOVO — utility, transform)

**Analog:** `apps/web/src/server/ai/file-chat-stream.ts` — `buildFileChatMessages` (linhas 41-70). Este helper centraliza D-05 (serialização por tool), D-06 (ordem cronológica), D-07 (truncagem N=10) e D-08 (guarda de tokens chars/4). Vive como módulo compartilhado em `server/ai/` para os 4 streams importarem.

**Padrão de montagem do array a espelhar** (`file-chat-stream.ts` linhas 62-69) — esta é a forma canônica `[system, ...history, user]`:
```typescript
return [
  { role: "system", content: systemPrompt },
  ...history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content
  })),
  { role: "user", content: userMessage }
];
```

**Shape de entrada (registro do repositório)** — `findConversationExchanges` retorna rows de `ConversationExchange` (`prisma/schema.prisma` linhas 193-206):
```
userPrompt: String       → vira mensagem role:"user"   (D-04, direto)
assistantPayload: Json    → vira mensagem role:"assistant" via serializador por tool (D-05)
mode: String              → filtrar para apenas "generate" (D-03)
createdAt: DateTime       → já ordenado asc (orderBy no repository) → ordem cronológica (D-06)
```

**Serializador por tool (D-05)** — extrair APENAS artefato principal + `explanation` curta, NUNCA `metadata`/`warnings`/JSON cru. Shapes confirmados nos schemas de `@tabelin/shared`:

| Tool | `assistantPayload` artefato principal | + explicação | Fonte do schema |
|---|---|---|---|
| SQL | `query` (string) | `explanation` | `packages/shared/src/sql/schema.ts:34-35` |
| Regex (generate) | `pattern` (string) | `explanation` | `packages/shared/src/regex/schema.ts:17-18` |
| Scripts | `code` (string) | `explanation` | `packages/shared/src/scripts/schema.ts:30-31` |
| Template | `output` (string Markdown) | `explanation` | `packages/shared/src/template/schema.ts:13-14` |

A serialização deve soar como texto natural do assistente (artefato + explicação curta), NÃO como JSON — para o modelo dar follow-up coerente sem imitar o formato JSON na resposta (D-05, `<specifics>`).

**Truncagem híbrida (D-07/D-08)** — sem analog direto no codebase; padrão de janela deslizante mais próximo é `getRecentMessages(uploadedFile.id, 10)` em `file-analysis/chat/route.ts` linha 43. Aplicar:
1. Pegar no máximo as últimas **N=10 trocas** (≈20 mensagens) do array já ordenado asc.
2. Estimar tokens por **heurística ~4 chars/token** (sem dependência de tokenizer; deferido em `<deferred>`).
3. Se exceder o orçamento seguro (calibrar contra `gpt-5-mini`, margem conservadora), cortar trocas **mais antigas** até caber.

**Fallback (D-09/D-10):** se `history` vazio → array é só `system`+`user`, idêntico ao single-turn atual. Erro de leitura já é absorvido no repository (retorna `[]` + `console.warn`, ver Shared Patterns abaixo).

---

### `apps/web/src/server/ai/sql-stream.ts` (MODIFICADO — service, request-response)

**Analog:** este próprio módulo + `file-chat-stream.ts` para a forma do array.

**Ponto de injeção exato** (`sql-stream.ts` linhas 32-42) — o array `messages` atual:
```typescript
const completion = await client.chat.completions.create({
  model: getOpenAIModel(),
  messages: [
    {
      role: "system",
      content: `Voce e um especialista em SQL. Gere uma consulta ${request.dialect.toUpperCase()} ...`
    },
    { role: "user", content: request.prompt }
  ],
  response_format: { type: "json_object" }
});
```

**Mudança:** assinatura passa a aceitar `history` opcional; o array vira `[system, ...historyMessages, user]` usando o helper de `context-messages.ts`:
```typescript
export async function resolveSqlPayload(input: {
  request: SqlGenerateRequest;
  history?: ConversationExchange[]; // NOVO — opcional, espelha buildFileChatStream
}): Promise<SqlGenerateResponse> {
  // ...
  const historyMessages = buildToolContextMessages("sql", input.history ?? []);
  // messages: [{ role: "system", ... }, ...historyMessages, { role: "user", content: request.prompt }]
```

> **Nota:** o snippet acima é **ilustrativo** — mostra apenas o conceito de "injetar histórico via helper". A assinatura **autoritativa** de `buildToolContextMessages` (e a propriedade da truncagem via `truncateHistory`) é a definida em `08-01-PLAN.md` e consumida em `08-02-PLAN.md`, NÃO esta forma de 2 args. Os planos são autoritativos; em caso de divergência, seguir os planos.

**Branches a preservar (padrão estabelecido):**
- Fixture fallback sem `OPENAI_API_KEY` (linhas 19-27) — manter inalterado; contexto só afeta o caminho real do LLM.
- `response_format: { type: "json_object" }` (linha 41) — manter.
- Validação Zod `sqlGenerateResponseSchema.parse(...)` (linhas 50-63) — manter.

---

### `apps/web/src/server/ai/regex-stream.ts` (MODIFICADO — service, request-response)

**Analog:** `sql-stream.ts` `resolveSqlPayload`.

**ATENÇÃO D-03:** `resolveRegexPayload` tem dois modos (`generate` linhas 37-59, `explain` linhas 62-83). **Apenas o branch `generate` recebe `history`.** O branch `explain` (linhas 62-83) permanece exatamente como está — ação isolada, sem thread.

**Ponto de injeção** (linhas 38-48), o array `messages` do `generate`:
```typescript
const completion = await client.chat.completions.create({
  model: getOpenAIModel(),
  messages: [
    { role: "system", content: 'Voce e um especialista em expressoes regulares. ...' },
    { role: "user", content: input.request.prompt }
  ],
  response_format: { type: "json_object" }
});
```
Injetar `...historyMessages` entre system e user no branch `generate` apenas. Serializador extrai `pattern` + `explanation` (D-05).

---

### `apps/web/src/server/ai/scripts-stream.ts` (MODIFICADO — service, request-response)

**Analog:** `sql-stream.ts` `resolveSqlPayload`.

**Ponto de injeção** (linhas 40-53). Idêntico ao SQL: array `[system, user]` com `response_format: json_object`. Injetar `...historyMessages` antes do user. Serializador extrai `code` + `explanation` (D-05).

Preservar: fixture fallback (linhas 20-28), `scriptTypeLabels` (linhas 34-38), classificador destrutivo (linhas 59-60).

---

### `apps/web/src/server/ai/template-stream.ts` (MODIFICADO — service, request-response)

**Analog:** `sql-stream.ts` `resolveSqlPayload`.

**Ponto de injeção** (linhas 28-38). Mesmo padrão. Injetar `...historyMessages` antes do user. Serializador extrai `output` (Markdown) + `explanation` (D-05).

Preservar: fixture fallback (linhas 18-23), `response_format: json_object`.

---

### `apps/web/src/app/api/tools/{sql,regex,scripts,template}/generate/route.ts` (MODIFICADOS — route, request-response)

**Analog primário:** `apps/web/src/app/api/tools/file-analysis/chat/route.ts` (linhas 41-51) — mostra exatamente onde ler o histórico e passá-lo ao stream.

**Padrão de referência** (`file-analysis/chat/route.ts` linhas 41-50):
```typescript
try {
  // D-08: janela deslizante de 10 mensagens
  const history = await getRecentMessages(uploadedFile.id, 10);

  const stream = buildFileChatStream(
    uploadedFile.schema as import("@tabelin/shared").FileSchema,
    history,
    parsed.data.message,
    quotaCheck.lastFreeUse
  );
```

**Aplicação aos 4 routes** — a estrutura atual (ex. `sql/generate/route.ts` linhas 29-49) é auth → quota → `resolve*Payload` → confirm → record → save. Inserir a leitura do histórico **dentro do `try`, antes de `resolve*Payload`**:
```typescript
try {
  // NOVO — Phase 8: ler histórico (skip-on-error já embutido no repository)
  const history = await findConversationExchanges(user.id, "sql"); // toolKind por route
  const payload = await resolveSqlPayload({ request: parsed.data, history });
  await confirmToolUse(quotaCheck.reservationKey);
  // ... record + save inalterados
```

**Pontos por route (toolKind exato — confirmado pelos `saveConversationExchange` existentes):**
| Route | `toolKind` na leitura | Observação |
|---|---|---|
| `sql/generate/route.ts` (linha 30) | `"sql"` | direto |
| `regex/generate/route.ts` (linha 30) | `"regex"` | `resolveRegexPayload({ mode: "generate", request, history })` — só generate |
| `scripts/generate/route.ts` (linha 30) | `"script"` | NOTE: toolKind salvo é `"script"` (singular), não `"scripts"` — ver `route.ts:35,44` |
| `template/generate/route.ts` (linha 38) | `"template"` | tem Pro gate antes (linhas 19-23) — ler histórico DEPOIS, dentro do try |

**Crítico:** o `toolKind` da leitura DEVE bater com o `toolKind` do `saveConversationExchange` existente para o isolamento (D-11/MULTI-03) funcionar. Para scripts é `"script"` (singular).

**Preservar inalterado:** auth (linhas 12-15), parse Zod (linhas 18-22), quota reserve/confirm/release, `recordToolRequest`, `saveConversationExchange` (que continua salvando APÓS o stream — D-06, sem duplicação do turno atual).

## Shared Patterns

### Skip-on-error na leitura do histórico (D-09)
**Source:** `apps/web/src/server/tools/conversation-repository.ts` `findConversationExchanges` (linhas 62-72)
**Apply to:** todos os 4 route handlers
```typescript
export async function findConversationExchanges(userId: string, toolKind: string) {
  try {
    return await prisma.conversationExchange.findMany({
      where: { userId, toolKind },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    console.warn("ConversationExchange read skipped.", err);
    return [];
  }
}
```
O try/catch + `return []` já está pronto: erro de leitura → array vazio → LLM chamado só com `system`+`user`. **Nenhum tratamento de erro adicional é necessário no route** para o histórico; o fluxo do usuário nunca quebra. Já filtra por `userId+toolKind` → isolamento MULTI-03 (D-11) de graça.

### Montagem do array de mensagens `[system, ...history, user]` (D-06)
**Source:** `apps/web/src/server/ai/file-chat-stream.ts` `buildFileChatMessages` (linhas 62-69)
**Apply to:** o helper `context-messages.ts` e, via ele, os 4 streams
(excerpt na seção do helper acima). Ordem: system → history asc → user atual por último.

### Fixture fallback preservado (sem `OPENAI_API_KEY`)
**Source:** `apps/web/src/server/ai/openai-client.ts` (linhas 5-17) + branch em cada stream
**Apply to:** os 4 streams
```typescript
export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-5-mini";
}
```
Cada `resolve*Payload` tem um branch `if (!process.env.OPENAI_API_KEY)` determinístico (ex. `sql-stream.ts:19-27`). O contexto multi-turn afeta **apenas** o caminho real do LLM; o branch fixture permanece intocado para dev/test continuarem determinísticos.

### Serialização concisa do assistente (D-05) — shapes confirmados
**Source:** schemas em `packages/shared/src/{sql,regex,scripts,template}/schema.ts`
**Apply to:** serializador por tool em `context-messages.ts`
```
sql/schema.ts:34-35       → { kind:"sql",      query,   explanation }  → "query" + explanation
regex/schema.ts:17-18     → { kind:"regex_generate", pattern, explanation } → "pattern" + explanation
scripts/schema.ts:30-31   → { kind:"script",   code,    explanation }  → "code" + explanation
template/schema.ts:13-14  → { kind:"template", output,  explanation }  → "output" + explanation
```
Descartar `metadata`, `warnings`, `assumptions` e o envelope JSON. Render como prosa natural.

## Sem Analog Encontrado

| Arquivo/aspecto | Role | Data Flow | Motivo |
|---|---|---|---|
| Heurística de truncagem por tokens (~4 chars/token, D-08) | utility | transform | Não existe contagem de tokens no codebase hoje. Padrão de janela deslizante mais próximo é o `count`-numérico de `getRecentMessages(id, 10)` (`file-analysis/chat/route.ts:43`); o orçamento de tokens é novo — planner/researcher calibram o limite seguro contra `gpt-5-mini` com margem conservadora. Tokenizer real é deferido. |

## Metadata

**Escopo da busca de analogs:** `apps/web/src/server/ai/`, `apps/web/src/server/tools/`, `apps/web/src/app/api/tools/`, `packages/shared/src/`, `prisma/schema.prisma`
**Arquivos lidos:** 14
**Data da extração:** 2026-05-30
</content>

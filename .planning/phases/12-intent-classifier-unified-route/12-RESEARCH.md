# Phase 12: Intent Classifier & Unified Route — Research

**Researched:** 2026-06-08
**Domain:** OpenAI Structured Outputs classifier + unified NDJSON route + multi-turn toolKind dispatch
**Confidence:** HIGH (baseado em inspeção direta da codebase + tipos verificados no SDK instalado)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Seletor de contexto persistente no header com defaults (Excel, pt-BR `;`, PostgreSQL). A IA também infere plataforma/dialeto do prompt; header é override explícito.
- **D-02:** Contexto de plataforma/dialeto persiste entre turns relacionados na sessão (não reseta a cada mensagem).
- **D-03:** Override de intent re-roda a geração imediatamente com o resolver correto reusando o mesmo prompt — não apenas re-rotula.
- **D-04:** Reusar paperclip/attach universal do v1.2 no input unificado; presença de arquivo influencia a classificação.
- **D-05:** Se a IA detectar intent dependente de arquivo (OCR ou file-analysis) sem arquivo, o assistente pede para anexar — não gera vazio.
- **D-06:** "Melhor palpite + override visível" — sempre gera com intent mais provável, sem round-trip extra. Classificação embutida na chamada única de Structured Outputs (campo intent PRIMEIRO no schema), preservando SLA de 2,5s.
- **D-07:** Intent `tabela` é classificado mas entregue a um stub/handoff. Phase 12 NÃO renderiza grid.

### Claude's Discretion

- Forma exata do pill (posição durante streaming vs. acima da resposta), dropdown de override e seletor de header — seguir tema claro do workspace.
- Descoberta/sidebar: páginas por-tool permanecem acessíveis; forma exata a critério do planner.
- Esquema concreto do Zod de classificação (enum de intents, campo de confiança) e mapeamento intent → toolKind — seguir desenho de ARCHITECTURE.md.

### Deferred Ideas (OUT OF SCOPE para Phase 12)

- Loop de clarificação (Phase 13)
- Geração e renderização da tabela interativa (Phase 14)
- Export CSV/XLSX e migração final da navegação (Phase 15)
- Chips de sugestão de "próximo passo" e histórico unificado com filtro por tipo (v2.x)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UNI-01 | Usuário digita qualquer pedido em um único input e a IA detecta o intent sem escolher tool antes | Classifier Zod schema + `classifyIntent()` em `intent-classifier.ts` — `response_format: { type: "json_object" }` existente + upgrade para `zodResponseFormat` |
| UNI-02 | Usuário vê pill com tipo detectado e pode corrigir com um clique (override de intent re-executa) | IntentPill component + `onOverride(intent)` callback → re-submete ao hook com `overrideIntent` no body |
| UNI-03 | Outputs heterogêneos (código, tabela-stub, texto) renderizam inline no mesmo thread de conversa | RenderDispatcher em `UnifiedChatTool`: switch `payload.kind` → `FormulaOutputPanel` / `SqlOutputPanel` / `TableStub` |
| UNI-04 | Follow-ups preservam contexto da capacidade resolvida sem regressão das 7 capacidades | `saveConversationExchange(userId, resolvedToolKind, ...)` — toolKind resolvido (não "unified") garante continuidade via `findConversationExchanges` existente |
| UNI-05 | Plataforma/dialeto persiste entre turns relacionados na sessão unificada | `SessionContextSelector` no header + `lastContext` em `useState` / `useRef` no `useUnifiedChatStream`; injeta como campos `platform`/`dialect` no body da request |
| UNI-06 | Classificação embutida em chamada única (Structured Outputs, campo intent primeiro) — início de streaming dentro de 2,5s | `zodResponseFormat` de `openai/helpers/zod` + `client.chat.completions.parse()` com schema Zod; intent field primeiro no objeto Zod |
| UNI-07 | Páginas/atalhos por-tool permanecem acessíveis; chat unificado é default mas não força remoção | Manter todos os `/api/tools/*` e páginas de tool intactos; remover `ToolNav` apenas do `/workspace` root |
</phase_requirements>

---

## Summary

Phase 12 é uma camada de despacho sobre os resolvers existentes — não reescreve lógica de geração. O núcleo é: (1) um único call OpenAI Structured Outputs que retorna `{ intent, confidence }` antes de qualquer geração; (2) a rota `/api/chat/unified` que recebe o prompt, classifica, chama o `resolve*Payload` já existente para text-tools ou retorna um stub para `tabela`; (3) um hook client-side `useUnifiedChatStream` que consome o NDJSON, exibe o intent pill e permite override de um clique (re-submete).

**Descoberta crítica sobre o SDK instalado:** O projeto usa `openai@6.39.0` com `response_format: { type: "json_object" }` em todos os resolvers existentes (`formula-stream.ts`, `sql-stream.ts` etc.). O SDK instalado já inclui `zodResponseFormat` em `openai/helpers/zod` — confirmado via `apps/web/node_modules/openai/helpers/zod.d.ts`. Porém, `zodResponseFormat` requer `client.chat.completions.parse()`, não `.create()`. O classifier pode usar `parse()` exclusivamente; os resolvers existentes permanecem inalterados com `.create()`.

**Recomendação primária:** Implementar `intent-classifier.ts` com `zodResponseFormat` + `client.chat.completions.parse()`. Os resolvers existentes são chamados sem modificação. O unified route é o único novo módulo de AI server.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Classificação de intent | API / Backend (`intent-classifier.ts`) | — | LLM call autenticado; não expor ao cliente |
| Despacho para resolver | API / Backend (`/api/chat/unified`) | — | Orquestra auth, pro-gate, quota, histórico |
| Intent pill + override | Browser / Client (`UnifiedChatTool`) | — | Estado de UI efêmero; override re-faz POST |
| Header platform/dialect selector | Browser / Client (`SessionContextSelector`) | — | Estado de sessão efêmero, persiste em useState |
| Contexto multi-turn | API / Backend (`findConversationExchanges`) | — | toolKind resolvido salvo no banco |
| Paperclip attach / extractContent | API / Backend (`dispatcher.ts`) | — | Já implementado; unified route chama igual |
| Quota reserve/confirm/release | API / Backend (`quota-service.ts`) | — | Reserva uma vez por exchange, no unified route |
| Render dispatcher (CodeBlock/Text/stub) | Browser / Client (`RenderDispatcher`) | — | Switch no kind do payload recebido |
| Tab-stub de tabela | Browser / Client (`TableIntentStub`) | — | Mensagem-ponte; sem grid Phase 12 |
| "Nova conversa" para unified | API / Backend + Browser | — | DELETE /api/conversations/{kind} para cada toolKind |

---

## Standard Stack

### Core (já em produção — nenhuma instalação necessária)

| Library | Version instalada | Purpose | Why Standard |
|---------|------------------|---------|--------------|
| `openai` | 6.39.0 | LLM client; `zodResponseFormat` + `.parse()` para classifier | SDK oficial; `zodResponseFormat` já na lib instalada em `openai/helpers/zod` [VERIFIED: arquivo .d.ts direto no node_modules] |
| `zod` | 4.4.3 | Schema do classifier + validação de eventos NDJSON | Já em produção em todos os resolvers; `zodResponseFormat` aceita zod v4 (confirmado em `zod.d.ts`: `z4.ZodType`) [VERIFIED: node_modules/openai/helpers/zod.d.ts] |
| `next` | 16.2.6 | Route handler + App Router | Framework base do projeto |
| `react` | 19.2.6 | Client components + hooks | Base do projeto |

### Supporting (sem instalação nova)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Resolvers existentes | in-repo | `resolveFormulaPayload`, `resolveSqlPayload`, `resolveRegexPayload`, `resolveScriptsPayload`, `resolveTemplatePayload` | Dispatcher chama o resolver correspondente ao intent classificado |
| `buildToolContextMessages` | in-repo | Injeta histórico multi-turn no prompt | Unified route chama com `resolvedToolKind` após classificação |
| `extractContent` | in-repo | Extração universal de arquivo (dispatcher.ts) | Unified route chama identicamente às rotas existentes quando há arquivo |
| `reserveToolUse` / `confirmToolUse` / `releaseToolUse` | in-repo | Quota | Uma reserva por exchange no unified route |

### Nenhum pacote novo necessário para Phase 12

Phase 12 (text-tools only + table-stub) não requer `react-datasheet-grid` nem `@formulajs/formulajs` — esses são Phase 14. A única mudança de dependência é usar `zodResponseFormat` de `openai/helpers/zod`, que já está no SDK instalado.

**Installation:** Nenhuma.

---

## Package Legitimacy Audit

> Phase 12 não instala nenhum pacote externo novo. Todos os módulos usados já estão em produção (openai 6.39.0, zod 4.4.3, next 16.2.6). Auditoria não aplicável.

**Packages removed due to slopcheck:** none
**Packages flagged as suspicious:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Usuário digita prompt no UnifiedChatTool
          │
          ▼
[Browser] useUnifiedChatStream.submit(text, file?, overrideIntent?, context)
          │  POST /api/chat/unified  (multipart se file, JSON se não)
          ▼
[Server] /api/chat/unified/route.ts
  1. getSessionFromCookieHeader  → 401 se ausente
  2. parse body (multipart | JSON)
  3. pro-gate SE hasFile → 403 se free
  4. reserveToolUse(userId, "unified", "generate")  → 429 se quota excedida
  5. extractContent(buffer, name) SE hasFile  → ExtractionResult
  6. classifyIntent(prompt, sessionHistory, hasFile, overrideIntent?)
     └─ intent-classifier.ts: zodResponseFormat + client.chat.completions.parse()
     └─ Retorna: { intent, confidence }
  7. resolvedToolKind = intentToToolKind(intent)
     ├─ "formula" | "sql" | "regex" | "script" | "template" →
     │    loadHistory(userId, resolvedToolKind)
     │    → resolve*Payload(request, history, attachmentContext)
     │    → confirmToolUse
     │    → saveConversationExchange(userId, resolvedToolKind, ...)
     │    → create*EventStream(payload)
     ├─ "file_analysis" | "ocr" (sem arquivo) →
     │    stream { type: "intent_detected", intent, needsFile: true }
     │    → releaseToolUse (sem confirmação — não gerou)
     └─ "tabela" →
          stream { type: "intent_detected", intent: "tabela" }
          stream { type: "complete", payload: { kind: "table_stub", message: "..." } }
          → confirmToolUse
          → saveConversationExchange(userId, "unified_table", "generate", stub)
          ↑ stub é a "bridge message" que Phase 13/14 preencherão
          │
          ▼
[Server] NDJSON stream com headers:
  content-type: application/x-ndjson; charset=utf-8
  cache-control: no-store
          │
          ▼
[Browser] useUnifiedChatStream lê NDJSON linha a linha
  ├─ type: "intent_detected" → exibe IntentPill com intent + badge "detectado"
  ├─ type: "metadata"       → atualiza estado de metadata
  ├─ type: "delta"          → append ao draft (streaming text)
  ├─ type: "quota_warning"  → exibe aviso de quota
  ├─ type: "complete"       → RenderDispatcher(payload.kind) → OutputPanel correto
  ├─ type: "needsFile"      → exibe mensagem "Anexe um arquivo para continuar"
  └─ type: "error"          → exibe erro
```

### Recommended Project Structure

```
apps/web/src/
├─ app/api/chat/unified/
│   └─ route.ts                          # NOVO: unified route handler
├─ server/ai/
│   └─ intent-classifier.ts              # NOVO: zodResponseFormat classifier
├─ features/unified-chat/
│   ├─ unified-chat-tool.tsx             # NOVO: substitui FormulaTool em /workspace
│   ├─ hooks/
│   │   └─ use-unified-chat-stream.ts    # NOVO: hook NDJSON + intent state
│   └─ components/
│       ├─ intent-pill.tsx               # NOVO: pill + dropdown de override
│       ├─ session-context-selector.tsx  # NOVO: seletor platform/dialect no header
│       ├─ render-dispatcher.tsx         # NOVO: switch payload.kind → painel correto
│       └─ table-intent-stub.tsx         # NOVO: mensagem-ponte para Phase 13/14
packages/shared/src/unified-chat/
│   └─ schema.ts                         # NOVO: IntentClassification, unified events
```

**Arquivos modificados:**

```
apps/web/src/app/(workspace)/workspace/page.tsx         # FormulaTool → UnifiedChatTool
apps/web/src/components/app/topbar.tsx                  # useWorkspaceToolKind: /workspace → "unified"
apps/web/src/app/api/conversations/[tool]/route.ts      # VALID_TOOL_KINDS: add "unified_table"
apps/web/src/server/ai/context-messages.ts              # serializeAssistant: add "table_stub" case
packages/shared/src/index.ts                            # export ./unified-chat/schema
```

### Pattern 1: Classifier com zodResponseFormat + `.parse()`

**O que é:** Uma única chamada `client.chat.completions.parse()` com `zodResponseFormat` retorna o objeto classificado e parseado diretamente. Sem `JSON.parse()` manual.

**Quando usar:** Sempre que o output do LLM deve ser validado por schema Zod antes de ser consumido.

**Implementação concreta para `intent-classifier.ts`:**

```typescript
// apps/web/src/server/ai/intent-classifier.ts
// Source: apps/web/node_modules/openai/helpers/zod.d.ts (verificado)
import "server-only";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { createOpenAIClient, getOpenAIModel } from "./openai-client";

// Intent PRIMEIRO no schema — permite dispatch antecipado (D-06 / UNI-06)
export const intentClassificationSchema = z.object({
  intent: z.enum([
    "formula", "sql", "regex", "script", "template",
    "file_analysis", "ocr", "tabela", "unknown"
  ]),
  confidence: z.enum(["high", "low"])
});

export type IntentClassification = z.infer<typeof intentClassificationSchema>;

// Fixture para modo sem OPENAI_API_KEY (padrão do projeto)
function fixtureClassify(prompt: string, hasFile: boolean): IntentClassification {
  const lower = prompt.toLowerCase();
  if (hasFile) return { intent: "file_analysis", confidence: "high" };
  if (/\b(select|from|where|join|group by|insert|update|delete)\b/i.test(lower))
    return { intent: "sql", confidence: "high" };
  if (/\b(regex|expressao regular|padrão de texto)\b/i.test(lower))
    return { intent: "regex", confidence: "high" };
  if (/\b(vba|apps script|macro|automacao|script)\b/i.test(lower))
    return { intent: "script", confidence: "high" };
  if (/\b(tabela|planilha|grid|linhas e colunas|colunas.*linhas)\b/i.test(lower))
    return { intent: "tabela", confidence: "high" };
  // default: formula
  return { intent: "formula", confidence: "high" };
}

export async function classifyIntent(
  userPrompt: string,
  hasFile: boolean,
  sessionHistory: string,
  overrideIntent?: string
): Promise<IntentClassification> {
  // Override explícito do usuário (D-03 / pill de override)
  if (overrideIntent) {
    return intentClassificationSchema.parse({ intent: overrideIntent, confidence: "high" });
  }

  // Fixture mode
  if (!process.env.OPENAI_API_KEY) {
    return fixtureClassify(userPrompt, hasFile);
  }

  const client = createOpenAIClient();
  const systemPrompt = `Você é um classificador de intenção para o Tabelin.IA.
Classifique o pedido do usuário em um dos intents:
- "formula": fórmulas de planilha (Excel, Google Sheets)
- "sql": queries SQL, banco de dados
- "regex": expressões regulares
- "script": VBA, Apps Script, automações
- "template": modelos, templates de texto
- "file_analysis": análise de arquivo/planilha (requer arquivo)
- "ocr": extração de texto de imagem/PDF (requer arquivo)
- "tabela": gerar tabela interativa com dados
- "unknown": pedido ambíguo

Arquivo presente: ${hasFile ? "sim" : "não"}
${sessionHistory ? `Contexto anterior: ${sessionHistory}` : ""}

Responda com o intent mais provável e confidence "high" se claro, "low" se ambíguo.`;

  const completion = await client.chat.completions.parse({
    model: getOpenAIModel(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: zodResponseFormat(intentClassificationSchema, "intent_classification")
  });

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) throw new Error("Classifier returned no parsed output");
  return parsed;
}
```

**Nota crítica:** `zodResponseFormat` está em `"openai/helpers/zod"` (não `"openai"`). Verificado em `node_modules/openai/helpers/zod.d.ts`. [VERIFIED: inspeção direta do arquivo .d.ts]

### Pattern 2: Mapeamento intent → toolKind e dispatch

O `intent` classificado mapeia para o `toolKind` que é salvo no banco e passado para `findConversationExchanges`:

```typescript
// Tabela de mapeamento — a fonte canônica
const INTENT_TO_TOOL_KIND: Record<string, string> = {
  formula:       "formula",
  sql:           "sql",
  regex:         "regex",
  script:        "script",
  template:      "template",
  file_analysis: "file_analysis",  // ephemeral — sem histórico
  ocr:           "ocr",            // ephemeral — sem histórico
  tabela:        "unified_table",  // Phase 13/14 preenchem
  unknown:       "formula"         // fallback: formula (intent mais comum)
};

// Dispatch no route handler
const resolvedToolKind = INTENT_TO_TOOL_KIND[classification.intent] ?? "formula";
```

**IMPORTANTE — file_analysis e ocr:** Os resolvers `file-analysis` e `ocr` são ephemeral (sem histórico no banco). O unified route trata esses intents como: se arquivo presente → chama resolver; se sem arquivo → retorna evento `needsFile: true` sem debitar quota (D-05). Verificado: `findConversationExchanges` não é chamado para esses toolKinds no codebase atual.

### Pattern 3: NDJSON event schema para o unified route

O unified route precisa de um event schema próprio que englobe todos os outputs possíveis. Baseado no padrão existente (`formulaStreamEventSchema`, `sqlStreamEventSchema` etc.):

```typescript
// packages/shared/src/unified-chat/schema.ts
import { z } from "zod";
import { formulaCompletePayloadSchema } from "../formula/schema";
import { sqlGenerateResponseSchema } from "../sql/schema";
// ... demais imports

export const unifiedStreamEventSchema = z.discriminatedUnion("type", [
  // Evento novo: enviado logo após classificar — antes de gerar
  z.object({ type: z.literal("intent_detected"), intent: z.string(), confidence: z.string() }),
  // Evento novo: file-dependent intent sem arquivo (D-05)
  z.object({ type: z.literal("needs_file"), intent: z.string() }),
  // Eventos existentes (reusados dos tools)
  z.object({ type: z.literal("metadata"), metadata: z.unknown() }),
  z.object({ type: z.literal("attachment_grounded"), charCount: z.number().int(), wasTruncated: z.boolean(), extractedText: z.string() }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("warning"), warning: z.string() }),
  z.object({ type: z.literal("quota_warning"), lastFreeUse: z.boolean() }),
  z.object({ type: z.literal("complete"), payload: z.unknown() }),  // discriminated pela fase
  z.object({ type: z.literal("error"), message: z.string() })
]);

export type UnifiedStreamEvent = z.infer<typeof unifiedStreamEventSchema>;

// Table stub payload (para Phase 13/14 — D-07)
export const tableStubPayloadSchema = z.object({
  kind: z.literal("table_stub"),
  originalPrompt: z.string(),
  message: z.string()   // mensagem-ponte exibida ao usuário
});
export type TableStubPayload = z.infer<typeof tableStubPayloadSchema>;
```

### Pattern 4: `useWorkspaceToolKind()` — mudança de comportamento

Atualmente em `topbar.tsx`:
```typescript
if (/\/workspace\/?$/.test(pathname)) return "formula";  // LINHA 23 atual
```

Após Phase 12:
```typescript
if (/\/workspace\/?$/.test(pathname)) return "unified";  // retorna "unified"
```

O botão "Nova conversa" chama `DELETE /api/conversations/${toolKind}`. Quando `toolKind === "unified"`, a rota `[tool]/route.ts` precisa aceitar `"unified"` e deletar todos os toolKinds conhecidos (formula, sql, regex, script, template, unified_table). Ou: criar uma nova rota `DELETE /api/conversations/unified` que faz a iteração.

**Risco:** `VALID_TOOL_KINDS` em `app/api/conversations/[tool]/route.ts` está hardcoded como:
```typescript
const VALID_TOOL_KINDS = ["formula", "sql", "regex", "script", "template"] as const;
```
Precisa adicionar `"unified_table"` e tratar `"unified"` como delete-all. [VERIFIED: arquivo lido diretamente]

### Pattern 5: `serializeAssistant()` — novo case para table_stub

Em `context-messages.ts`, o `switch(p.kind)` precisa de um case `"table_stub"`:

```typescript
case "table_stub": {
  const msg = typeof p.message === "string" ? p.message.trim() : "";
  const prompt = typeof p.originalPrompt === "string" ? p.originalPrompt.trim() : "";
  if (!msg) return null;
  return `[Resposta anterior - tabela solicitada]\n${prompt}\n\n${msg}`;
}
```

Sem esse case, o exchange `unified_table/generate` seria pulado pelo `default: return null`, zerando o contexto em follow-ups de tabela.

### Anti-Patterns to Avoid

- **Dois calls LLM sequenciais:** Classify → Generate como requests separados. Causa +1-3s de latência. Usar um único call (D-06/UNI-06).
- **toolKind "unified" para todos os exchanges:** Contamina contexto — `buildToolContextMessages("unified", ...)` retornaria zero histórico (a função filtra por toolKind exato). Usar toolKind resolvido.
- **`zodResponseFormat` importado de `"openai"` em vez de `"openai/helpers/zod"`:** O import principal não re-exporta `zodResponseFormat`. Verificado no `.d.ts`.
- **Chamar `findConversationExchanges` antes de classificar:** A classificação deve acontecer ANTES de carregar o histórico, pois o toolKind do histórico a carregar depende do intent classificado.
- **`confirmToolUse` antes de salvar o exchange:** O padrão atual dos resolvers (verificado em `formula/generate/route.ts`) é: `resolvePayload → confirmToolUse → recordRequest → saveConversationExchange`. Unified route deve manter essa ordem.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured output parsing | `JSON.parse(completion.choices[0].message.content)` | `client.chat.completions.parse()` + `zodResponseFormat` | `.parse()` retorna `.parsed` já validado; sem try/catch manual de JSON |
| Multi-turn history injection | Lógica própria de serialização | `buildToolContextMessages(resolvedToolKind, history, systemPrompt, userPrompt, attachmentCtx)` | Já implementado com truncagem, token budget, GENERATE_MODE filter, attachment injection |
| Extração de arquivo | Lógica própria de parse | `extractContent(buffer, file.name)` do `dispatcher.ts` | Já cobre CSV, XLSX, PNG, JPEG, PDF, TXT com magic bytes detection e guards de segurança |
| Quota reserve/confirm/release | Contador próprio | `reserveToolUse` / `confirmToolUse` / `releaseToolUse` | Implementação com transação Serializable, retry, window sliding já em produção |
| Auth check | Cookie parse manual | `getSessionFromCookieHeader(request.headers.get("cookie"))` | Já integrado com better-auth |

---

## Common Pitfalls

### Pitfall 1: `zodResponseFormat` importado do path errado

**O que vai errado:** `import { zodResponseFormat } from "openai"` → `undefined`. O SDK não re-exporta do barrel principal.
**Por que acontece:** Tree-shaking ou simplesmente o barrel `openai/index.d.ts` não inclui `zodResponseFormat`.
**Como evitar:** `import { zodResponseFormat } from "openai/helpers/zod"`. Confirmado via `node_modules/openai/helpers/zod.d.ts`. [VERIFIED]
**Sinal de alerta:** TypeScript emite `Module '"openai"' has no exported member 'zodResponseFormat'` durante typecheck.

### Pitfall 2: useWorkspaceToolKind retornando "formula" em /workspace

**O que vai errado:** O topbar exibe "Apagar histórico deste tool?" mas deleta só o histórico de fórmulas quando o usuário está no chat unificado.
**Por que acontece:** `if (/\/workspace\/?$/.test(pathname)) return "formula"` — linha 23 de `topbar.tsx`. A regex captura tanto `/workspace` (antigo = fórmula) quanto `/workspace` (novo = chat unificado).
**Como evitar:** Mudar o return para `"unified"` e implementar DELETE handler que itera todos os toolKinds. [VERIFIED: linha exata lida]
**Sinal de alerta:** "Nova conversa" no chat unificado apaga só fórmulas mas SQL/regex/tabela permanecem.

### Pitfall 3: `findConversationExchanges` filtra só `mode: GENERATE_MODE`

**O que vai errado:** Exchanges salvos com `mode: "clarification"` (Phase 13) não aparecem ao carregar histórico de `unified_table`. Mas Phase 12 não salva clarificações — é importante apenas saber que o filtro existe para não salvar exchanges Phase 12 com mode errado.
**Por que acontece:** `conversation-repository.ts` linha 100: `where: { userId, toolKind, mode: GENERATE_MODE }`. [VERIFIED: código lido]
**Como evitar:** Phase 12 salva todos os exchanges com `mode: "generate"` — sem exceção. O mode `"clarification"` é exclusivo de Phase 13.

### Pitfall 4: Pro-gate deve ocorrer ANTES de `reserveToolUse`

**O que vai errado:** Quota é debitada para usuário free que tenta usar file-analysis, retorna 403 depois.
**Por que acontece:** Ordem errada no route handler.
**Como evitar:** Replicar exatamente a ordem do `formula/generate/route.ts`: (1) parse body, (2) pro-gate se hasFile, (3) `reserveToolUse`. [VERIFIED: linhas 49-62 de formula/generate/route.ts]

### Pitfall 5: Schema `gpt-5-mini` pode não suportar `zodResponseFormat`

**O que vai errado:** Alguns modelos OpenAI não suportam Structured Outputs (`json_schema` strict). O modelo atual configurado é `gpt-5-mini` via `process.env.OPENAI_MODEL || "gpt-5-mini"`.
**Por que acontece:** Structured Outputs requer modelos que suportam a funcionalidade (gpt-4o, gpt-4o-mini, gpt-4-turbo e seus snapshots).
**Como evitar:** Testar `zodResponseFormat` com o modelo configurado no ambiente. Se o modelo não suportar, fazer fallback para `response_format: { type: "json_object" }` + `JSON.parse()` manual com validação Zod explícita. O classifier pode usar essa estratégia sem perda funcional. [ASSUMED — verificar no ambiente de produção]

### Pitfall 6: `file_analysis` e `ocr` não têm histórico no banco

**O que vai errado:** Chamar `findConversationExchanges(userId, "file_analysis")` depois de classificar intent como `file_analysis` retorna `[]` — ephemeral por design.
**Por que acontece:** File analysis e OCR são sempre ephemeral no v1.2. Não há `saveConversationExchange` nessas rotas.
**Como evitar:** Não tentar carregar histórico para `file_analysis` nem `ocr`. O unified route chama os resolvers desses tools diretamente sem history injection. [VERIFIED: confirmado pela ausência de saveConversationExchange em file-analysis]

### Pitfall 7: Intent pill exibido antes do `intent_detected` chegar (streaming)

**O que vai errado:** O classifier chama antes de stream começar. O pill não aparece instantaneamente.
**Por que acontece:** O classify acontece no servidor antes do stream NDJSON começar. O cliente não sabe o intent durante o tempo de classificação.
**Como evitar:** Emitir `{ type: "intent_detected", intent, confidence }` como PRIMEIRO evento NDJSON, antes de qualquer `metadata` ou `delta`. O cliente exibe o pill ao receber esse evento, antes do streaming da resposta. Isso requer que o route handler já tenha classificado antes de começar a escrever para o stream (o que é o caso — o stream só começa após o classify retornar).

---

## Code Examples

### Classificador completo (production path)

```typescript
// Source: verificado via node_modules/openai/helpers/zod.d.ts + formula-stream.ts (padrão)
import { zodResponseFormat } from "openai/helpers/zod";

const completion = await client.chat.completions.parse({
  model: getOpenAIModel(),
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ],
  response_format: zodResponseFormat(intentClassificationSchema, "intent_classification")
});

const result = completion.choices[0]?.message?.parsed;
// result é IntentClassification — já validado pelo Zod, sem JSON.parse manual
```

### Unified route — estrutura do handler

```typescript
// apps/web/src/app/api/chat/unified/route.ts
// Baseado em: formula/generate/route.ts (verificado diretamente)
export async function POST(request: Request) {
  // 1. Auth
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });

  // 2. Parse body (multipart | JSON)
  const contentType = request.headers.get("content-type") ?? "";
  let prompt: string, file: File | null = null;
  let platform = "excel", dialect = "pt-BR", sqlDialect = "postgresql";
  let overrideIntent: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const fd = await request.formData();
    prompt = String(fd.get("prompt") ?? "");
    platform = String(fd.get("platform") ?? "excel");
    dialect = String(fd.get("dialect") ?? "pt-BR");
    sqlDialect = String(fd.get("sqlDialect") ?? "postgresql");
    overrideIntent = fd.get("overrideIntent") ? String(fd.get("overrideIntent")) : undefined;
    const rawFile = fd.get("file");
    file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;
  } else {
    const body = await request.json().catch(() => ({}));
    prompt = String(body.prompt ?? "");
    platform = String(body.platform ?? "excel");
    dialect = String(body.dialect ?? "pt-BR");
    sqlDialect = String(body.sqlDialect ?? "postgresql");
    overrideIntent = body.overrideIntent;
  }

  if (!prompt.trim()) {
    return NextResponse.json({ error: "Prompt obrigatório." }, { status: 400 });
  }

  // 3. Pro-gate condicional (mesma lógica que formula/generate/route.ts)
  const hasFile = contentType.includes("multipart/form-data") && file !== null;
  if (hasFile) {
    const entitlement = await getUserEntitlement(user.id);
    if (!(entitlement.plan === "pro" && entitlement.status === "active")) {
      return NextResponse.json({ code: "pro_required", feature: "attachment", cta: "pro_checkout" }, { status: 403 });
    }
  }

  // 4. Quota reserve
  const quotaCheck = await reserveToolUse(user.id, "unified", "generate");
  if (!quotaCheck.allowed) {
    return NextResponse.json({ code: "quota_exceeded", meterKind: quotaCheck.meterKind, cta: "pro_checkout" }, { status: 429 });
  }

  try {
    // 5. Extração de arquivo
    let attachmentContext: string | undefined;
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        await releaseToolUse(quotaCheck.reservationKey);
        return NextResponse.json({ code: "FILE_TOO_LARGE", message: "Arquivo excede 5 MB." }, { status: 413 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await extractContent(buffer, file.name);
      if (!result.ok) {
        await releaseToolUse(quotaCheck.reservationKey);
        return NextResponse.json({ code: result.code, message: result.message }, { status: 422 });
      }
      attachmentContext = result.text;
    }

    // 6. Classificar intent
    const classification = await classifyIntent(prompt, hasFile, /* sessionHistory */ "", overrideIntent);
    const resolvedToolKind = INTENT_TO_TOOL_KIND[classification.intent] ?? "formula";

    // 7. Dispatch
    return new Response(
      createUnifiedEventStream(/* ... */),
      { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } }
    );
  } catch (err) {
    console.error("unified route failed", { err });
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ error: "Nao consegui processar o pedido." }, { status: 502 });
  }
}
```

### Hook client-side — estrutura base

```typescript
// apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts
// Baseado em: use-formula-stream.ts (verificado diretamente)
"use client";
import { unifiedStreamEventSchema } from "@tabelin/shared";
import { useCallback, useState } from "react";

export function useUnifiedChatStream() {
  const [intent, setIntent] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "streaming" | "complete" | "error">("idle");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<unknown>(null);
  // ...demais estados (warnings, quotaBlocked, lastFreeUse, etc.) — espelhar use-formula-stream.ts

  const submit = useCallback(async (input: {
    prompt: string;
    file?: File;
    overrideIntent?: string;
    platform?: string;
    dialect?: string;
    sqlDialect?: string;
  }) => {
    setIntent(null);
    setStatus("loading");
    // ... build FormData ou JSON (igual ao padrão use-formula-stream.ts)

    // Consumir NDJSON linha a linha
    // event.type === "intent_detected" → setIntent(event.intent), setConfidence(event.confidence)
    // event.type === "complete"        → setResult(event.payload), setStatus("complete")
    // ...
  }, []);

  return { intent, confidence, status, draft, result, submit /* ... */ };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `response_format: { type: "json_object" }` + `JSON.parse` manual | `zodResponseFormat` + `client.chat.completions.parse()` | openai SDK 4.50+ | Output validado por Zod automaticamente; sem try/catch de JSON |
| Tabs de tool explícitas para cada ferramenta | Chat unificado com classificação automática | Phase 12 | UX sem fricção; intents classificados automaticamente |

**Existente no projeto (NÃO mudar):**
- Todos os resolvers usam `{ type: "json_object" }` + `JSON.parse` — NÃO converter; o classifier é o único que usa `zodResponseFormat`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | O modelo configurado (`gpt-5-mini` via `OPENAI_MODEL` env) suporta Structured Outputs / `json_schema` strict | Pattern 1 (classifier) | Se não suportar, `zodResponseFormat` falha; fallback: usar `{ type: "json_object" }` + Zod.parse manual |
| A2 | `client.chat.completions.parse()` existe e funciona no SDK instalado 6.39.0 | Pattern 1 | `.parse()` é documentado na lib; confirmado na .d.ts; baixo risco |
| A3 | `file_analysis` e `ocr` são ephemeral (sem saveConversationExchange nas rotas existentes) | Pitfall 6 | Se houver histórico, o unified route precisaria carregar; verificado indiretamente por ausência nos arquivos lidos |

**Se tabela A1 estiver vazia:** Todas as demais claims foram verificadas ou citadas diretamente.

---

## Open Questions

1. **Modelo suporta Structured Outputs?**
   - O que sabemos: `getOpenAIModel()` retorna `process.env.OPENAI_MODEL || "gpt-5-mini"`. Structured Outputs requer gpt-4o, gpt-4o-mini ou equivalente.
   - O que é incerto: qual modelo está configurado em produção.
   - Recomendação: o planner deve incluir um task de "smoke test: `zodResponseFormat` com o modelo de produção" como Wave 0 / verificação prévia. Fallback documentado (json_object + Zod.parse manual) deve estar no plano.

2. **Session history para o classifier**
   - O que sabemos: o classifier recebe `sessionHistory` como string. Para D-02 (contexto persiste entre turns), o route handler precisaria serializar os últimos N exchanges do toolKind resolvido — mas antes da classificação, o toolKind ainda não é conhecido.
   - O que é incerto: se o histórico multi-toolKind (últimas N exchanges de qualquer toolKind do usuário) deve ser injetado no classificador.
   - Recomendação: Para Phase 12, injetar apenas o `lastIntent` da sessão (armazenado em estado do client como `sessionContext.lastIntent`) no body da request. O classifier recebe isso como `sessionHistory`. Histórico completo multi-toolKind é overkill para classificação.

3. **`DELETE /api/conversations/unified` — rota nova ou extensão da existente?**
   - O que sabemos: a rota `[tool]/route.ts` valida contra `VALID_TOOL_KINDS` hardcoded.
   - Recomendação: Adicionar `"unified_table"` ao `VALID_TOOL_KINDS` existente e criar uma rota separada `DELETE /api/conversations/unified` que itera e deleta todos os toolKinds conhecidos do usuário. Mais simples e sem risco de regressão na rota existente.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `openai/helpers/zod` (zodResponseFormat) | intent-classifier.ts | Sim | 6.39.0 | Fallback: `{ type: "json_object" }` + Zod.parse |
| `OPENAI_API_KEY` env | classifier + resolvers | Assumida em prod | — | Fixture mode automático (padrão do projeto) |
| PostgreSQL | ConversationExchange | Sim | 15+ (Prisma 7.8) | — |
| vitest | testes da fase | Sim | in package.json | — |

**Missing dependencies with no fallback:** nenhuma.

---

## Validation Architecture

> `workflow.nyquist_validation: true` — seção obrigatória.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (in `apps/web/package.json`) |
| Config file | `apps/web/vitest.config.ts` (confirmado) |
| Quick run command | `pnpm --filter web test` |
| Full suite command | `pnpm --filter web test` |
| Test directory | `apps/web/tests/` |
| Environment | jsdom (vitest.config.ts) |

**Padrão dos testes existentes (verificado diretamente):**
- API routes: `formula-api.test.ts` — instancia o route handler diretamente, mocka quota-service via `vi.mock`
- UI components: `formula-ui.test.tsx`, `topbar.test.tsx` — `@testing-library/react`, mocka `next/navigation`
- Server modules: `multi-turn-context.test.ts`, `context-messages.test.ts` — funções puras, sem mock de rede

### Phase Requirements → Test Map

| Req ID | Comportamento | Tipo de Teste | Arquivo de Teste | Existe? |
|--------|--------------|---------------|-----------------|---------|
| UNI-01 | Prompt "quero uma fórmula SOMASE" → intent classificado como "formula" | Unit | `tests/intent-classifier.test.ts` | Wave 0 |
| UNI-01 | Prompt "SELECT * FROM vendas" → intent "sql" | Unit | `tests/intent-classifier.test.ts` | Wave 0 |
| UNI-01 | 20 prompts pt-BR → acurácia ≥ 85% | Unit (batch) | `tests/intent-classifier.test.ts` | Wave 0 |
| UNI-02 | Override "sql" re-submete com intent forçado | Integration | `tests/unified-route.test.ts` | Wave 0 |
| UNI-02 | IntentPill exibe intent detectado | UI | `tests/unified-chat-tool.test.tsx` | Wave 0 |
| UNI-03 | Payload `kind: "formula"` → FormulaOutputPanel renderizado | UI | `tests/unified-chat-tool.test.tsx` | Wave 0 |
| UNI-03 | Payload `kind: "sql"` → SqlOutputPanel renderizado | UI | `tests/unified-chat-tool.test.tsx` | Wave 0 |
| UNI-03 | Payload `kind: "table_stub"` → TableIntentStub renderizado | UI | `tests/unified-chat-tool.test.tsx` | Wave 0 |
| UNI-04 | Follow-up após fórmula usa histórico `toolKind="formula"` | Integration | `tests/unified-route.test.ts` | Wave 0 |
| UNI-04 | Follow-up após SQL usa histórico `toolKind="sql"` | Integration | `tests/unified-route.test.ts` | Wave 0 |
| UNI-05 | `platform: "sheets"` no body chega ao resolveFormulaPayload | Integration | `tests/unified-route.test.ts` | Wave 0 |
| UNI-06 | `intent_detected` é o primeiro evento NDJSON recebido | Integration | `tests/unified-route.test.ts` | Wave 0 |
| UNI-06 | Unified route: 401 sem auth, 429 quota exceeded, 403 pro gate | Integration | `tests/unified-route.test.ts` | Wave 0 |
| UNI-07 | `DELETE /api/conversations/formula` ainda funciona | Regression | `tests/conversations-route.test.ts` | Wave 0 |
| UNI-07 | Topbar "Nova conversa" em /workspace chama DELETE unified | UI | `tests/topbar.test.tsx` (extend) | Modificar existente |

**Teste especial — 20 prompts pt-BR para acurácia do classifier (STATE.md blocker):**

```typescript
// tests/intent-classifier.test.ts — suite dedicada de acurácia
// Roda em fixture mode (sem OPENAI_API_KEY) para o CI básico
// Roda com key real no pré-release manual
const ACCURACY_PROMPTS: [string, string][] = [
  ["quero uma fórmula SOMASE para somar por categoria", "formula"],
  ["PROCV para buscar valor na tabela de preços", "formula"],
  ["SELECT total_vendas FROM pedidos WHERE mes = 3", "sql"],
  ["JOIN entre clientes e pedidos pelo ID", "sql"],
  ["expressão regular para validar CPF", "regex"],
  ["regex para extrair e-mails do texto", "regex"],
  ["macro VBA para formatar células verdes", "script"],
  ["script Apps Script para enviar email automático", "script"],
  ["template de relatório semanal em markdown", "template"],
  ["modelo de proposta comercial", "template"],
  ["analisa essa planilha e me diz os totais", "file_analysis"],   // com arquivo
  ["extrai o texto da imagem do contrato", "ocr"],                 // com arquivo
  ["cria uma tabela com produtos e preços", "tabela"],
  ["preciso de uma planilha de controle de gastos", "tabela"],
  ["fórmula SE para verificar se é maior que zero", "formula"],
  ["query para agregar vendas por região no PostgreSQL", "sql"],
  ["CONT.SE para contar células não vazias", "formula"],
  ["UPDATE status WHERE cliente = 'inativo'", "sql"],
  ["script para deletar linhas duplicadas no Sheets", "script"],
  ["planilha com colunas de data, valor e categoria", "tabela"],
];
// Critério: ≥ 17/20 (85%) no fixture mode
// Critério de prod: ≥ 19/20 (95%) com OPENAI_API_KEY
```

### Sampling Rate

- **Por task commit:** `pnpm --filter web test -- tests/intent-classifier.test.ts tests/unified-route.test.ts`
- **Por wave merge:** `pnpm --filter web test`
- **Phase gate:** Suite completa verde antes de `/gsd:verify-work`

### Wave 0 Gaps (arquivos a criar antes da implementação)

- [ ] `apps/web/tests/intent-classifier.test.ts` — cobre UNI-01, batch de 20 prompts
- [ ] `apps/web/tests/unified-route.test.ts` — cobre UNI-02, UNI-04, UNI-05, UNI-06 (auth, quota, dispatch, toolKind persistence)
- [ ] `apps/web/tests/unified-chat-tool.test.tsx` — cobre UNI-02, UNI-03 (render dispatcher, intent pill)
- [ ] `apps/web/tests/conversations-route.test.ts` — cobre UNI-07 (VALID_TOOL_KINDS backward compat)

---

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1`

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Sim | `getSessionFromCookieHeader` — padrão existente |
| V3 Session Management | Sim | Cookie de sessão do better-auth — sem mudança |
| V4 Access Control | Sim | Pro-gate para file-dependent intents (D-04/D-05) |
| V5 Input Validation | Sim | Zod schema no route + `prompt.trim().length` check |
| V6 Cryptography | Não | Sem novo crypto nesta fase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection via campo `overrideIntent` | Tampering | Validar `overrideIntent` contra o enum `intentClassificationSchema.shape.intent.options` antes de usar |
| Prompt injection via `sessionHistory` injetado no classifier | Tampering | Delimitar com `[CONTEXTO ANTERIOR]...[/CONTEXTO ANTERIOR]` no system prompt do classifier |
| Payload oversized no unified route (DoS) | DoS | `prompt.length` limitado ao mesmo `MAX_EXTRACTED_CHARS` / limite razoável antes de chamar o classifier |
| toolKind arbitrário injetado pelo cliente | Spoofing | `overrideIntent` validado contra enum; `resolvedToolKind` sempre vem do mapeamento server-side |
| Intent forçado para "ocr"/"file_analysis" sem arquivo | Elevation | D-05: se intent file-dep sem arquivo → responder `needs_file`, não chamar resolver |

---

## Sources

### Primary (HIGH confidence)

- Codebase direta — `apps/web/src/app/api/tools/formula/generate/route.ts` — padrão de route handler completo verificado
- Codebase direta — `apps/web/src/server/ai/context-messages.ts` — `buildToolContextMessages`, `GENERATE_MODE`, `serializeAssistant`, `truncateHistory`, `MAX_EXTRACTED_CHARS`
- Codebase direta — `apps/web/src/server/tools/conversation-repository.ts` — `saveConversationExchange`, `findConversationExchanges`, `GENERATE_MODE` filter
- Codebase direta — `apps/web/src/server/usage/quota-service.ts` — assinaturas exatas de `reserveToolUse`, `confirmToolUse`, `releaseToolUse`
- Codebase direta — `apps/web/src/components/app/topbar.tsx` — `useWorkspaceToolKind()` regex exata; linha problemática identificada
- Codebase direta — `apps/web/src/app/(workspace)/workspace/page.tsx` — entry point atual com `FormulaTool`
- Codebase direta — `apps/web/src/app/api/conversations/[tool]/route.ts` — `VALID_TOOL_KINDS` hardcoded
- Codebase direta — `apps/web/src/server/extraction/dispatcher.ts` — assinatura `extractContent(buffer, declaredName)`
- Codebase direta — `apps/web/src/server/ai/formula-stream.ts` — padrão `resolveFormulaPayload` e `createFormulaEventStream`
- Codebase direta — `apps/web/src/server/ai/sql-stream.ts` — `resolveSqlPayload`
- Codebase direta — `apps/web/node_modules/openai/helpers/zod.d.ts` — `zodResponseFormat(zodObject, name)` confirmado; import de `"openai/helpers/zod"` confirmado; zod v4 suportado
- `.planning/research/ARCHITECTURE.md` — HIGH confidence, inspeção direta da codebase
- `.planning/research/SUMMARY.md` — HIGH confidence, decisões técnicas fixadas
- `.planning/research/PITFALLS.md` — HIGH confidence

### Secondary (MEDIUM confidence)

- `apps/web/tests/formula-api.test.ts` — padrão de teste de route handler (vi.mock, readEvents)
- `apps/web/tests/topbar.test.tsx` — padrão de teste de componente com next/navigation mock

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — openai SDK instalado inspecionado diretamente; zodResponseFormat confirmado em .d.ts
- Architecture: HIGH — todos os arquivos de integração lidos diretamente, contratos verificados
- Pitfalls: HIGH — identificados via inspeção direta de código (linha exata de topbar.tsx, VALID_TOOL_KINDS exato)
- Validation: HIGH — padrão de testes existente lido e replicado

**Research date:** 2026-06-08
**Valid until:** 2026-07-08 (stable — apenas muda se SDK ou estrutura de rota mudar)

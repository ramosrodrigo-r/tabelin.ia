# Phase 3: Multi-Tool Generation Suite — Research

**Researched:** 2026-05-25
**Domain:** Next.js App Router, NDJSON streaming, syntax highlighting, Zod schema contracts, Prisma schema evolution
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Cada ferramenta nova tem rota própria: `/workspace/scripts`, `/workspace/sql`, `/workspace/regex`, `/workspace/templates`. Sidebar ativa o link correto por rota.
- **D-02:** Estado não é preservado entre ferramentas. Cada ferramenta começa limpa.
- **D-03:** VBA, Google Apps Script e Airtable Scripts ficam numa única ferramenta "Scripts" com seletor de tipo de script.
- **D-04:** Scripts é apenas geração — sem modo "explicar".
- **D-05:** SQL é apenas geração com seletor de dialeto (PostgreSQL, MySQL, SQL Server, Oracle, BigQuery). Sem modo "explicar SQL".
- **D-06:** Regex tem dois modos: gerar (REGX-01) e explicar (REGX-02) — modelo dualista igual à Formula.
- **D-07:** Aviso de segurança aparece como banner inline no painel de output, acima do código gerado. O botão de copiar permanece disponível.
- **D-08:** SQL destrutivo: `DROP`, `DELETE`, `TRUNCATE`, `UPDATE` sem `WHERE`.
- **D-09:** Scripts destrutivos: operações de delete de arquivo/linha/planilha — VBA `DeleteFile`/`Kill`/`Rows.Delete`, Apps Script `DriveApp.remove*`/`deleteSheet`, Airtable `deleteRecord`.
- **D-10:** Classificação de destrutividade por análise do output gerado (pattern matching ou resposta AI estruturada) — determinística e consistente.
- **D-11:** Output usa syntax highlighting leve (Shiki, Prism.js, ou equivalente compatível com Next.js App Router).
- **D-12:** Layout de dois painéis (input/output) e copy button proeminente — mesmo padrão da Formula.
- **D-13:** Template Pro: ferramenta separada na sidebar, visível para todos, CTA de upgrade para Free.
- **D-14:** Output do Pro template: planilha estruturada copy-ready — Markdown formatado ou CSV.
- **D-15:** Pro template apenas pt-BR. Sem seletor de idioma.
- **D-16:** Input do Pro template: descrição em português do tipo de planilha desejada.

### Claude's Discretion

- Estrutura exata de componentes por ferramenta (espelhar o padrão Formula ou extrair base compartilhado).
- Se extrair abstração compartilhada ou duplicar o padrão Formula por ferramenta.
- Biblioteca de syntax highlighting exata.
- Mecanismo de classificação de destrutividade.
- Nomes exatos de rotas e slugs.
- Copy em português para labels, placeholders e mensagens de erro.

### Deferred Ideas (OUT OF SCOPE)

- Modo "Explicar" para Scripts e SQL.
- Pro template com suporte a idioma inglês.
- Pro template com output visual (HTML table).
- Line numbering nos blocos de código.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CODE-01 | User can generate VBA scripts for Excel automation from a Portuguese prompt | Replica do padrão Formula generate; novo toolKind "script", scriptType "vba" |
| CODE-02 | User can generate Google Apps Script for Sheets automation from a Portuguese prompt | Mesmo route handler com scriptType "apps_script" |
| CODE-03 | User can generate Airtable Scripts from a Portuguese prompt | Mesmo route handler com scriptType "airtable_script" |
| SQL-01 | User can generate SQL queries from text prompts | Novo toolKind "sql"; padrão route handler |
| SQL-02 | User can select SQL dialect: PostgreSQL, MySQL, SQL Server, Oracle, BigQuery | Seletor `<select>` no input panel; dialeto incluído no request schema e metadata |
| REGX-01 | User can generate regex patterns from Portuguese prompts | Novo toolKind "regex", mode "generate" |
| REGX-02 | User can paste an existing regex and receive a Portuguese explanation | Mode "explain" — igual ao explain da Formula |
| SAFE-01 | Generated scripts and SQL include warnings or guardrails for destructive operations | Pattern matching pós-geração no output + `.note-block.warning` banner existente no CSS |
| PRO-01 | Pro user can access advanced table template generation | Entitlement check na page; novo toolKind "template"; CTA de upgrade para Free users |
</phase_requirements>

---

## Summary

A Fase 3 é fundamentalmente uma **operação de replicação e extensão** do padrão estabelecido pela Formula tool. Toda a infraestrutura já existe: o route handler com quota reservation/confirm/release, o hook de streaming NDJSON, os componentes InputPanel/OutputPanel, os shared Zod schemas, o ToolRequest model no Prisma, e a sidebar com os slots desativados. O trabalho é ativar esses slots, criar contratos Zod análogos para cada nova ferramenta, e compor componentes seguindo o mesmo template.

Há dois problemas técnicos não triviais que exigem atenção: (1) o modelo `ToolRequest` no Prisma tem os campos `formulaLanguage` e `separator` como `String` não-nullable — esses campos não têm equivalente em scripts/SQL/regex/templates, então é necessário torná-los opcionais no schema antes de criar repositórios para os novos tools; e (2) a seleção de biblioteca de syntax highlighting requer cuidado porque o output acontece em **streaming num Client Component** — a abordagem de Server Component do Shiki (`codeToHtml` assíncrono) não se aplica diretamente durante o streaming. A solução recomendada é `react-shiki` (wrapper do Shiki com hook `useShikiHighlighter`), que tem suporte nativo a throttling para streaming e funciona inteiramente no client.

O mecanismo de safety warning (SAFE-01) é implementável como pure regex/pattern matching no código gerado — não requer round-trip ao AI. A checagem acontece quando o payload `complete` chega, antes de renderizar. O banner existente `.note-block.warning` no CSS já tem o visual correto; basta adicionar o ícone `AlertTriangle` e o texto adequado.

**Recomendação principal:** Replicar o padrão Formula tool por ferramenta (não abstrair em base compartilhado), pois cada ferramenta tem seletores e metadata distintos que tornam abstrações genéricas frágeis. O custo de duplicação é baixo (cada ferramenta é ~150-200 linhas); o benefício de legibilidade independente é alto.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Seletor de tipo de script / dialeto SQL | Browser/Client | — | Estado de UI puro, sem efeito servidor |
| Syntax highlighting do código gerado | Browser/Client | — | Streaming requer client-side update; Shiki server-side não é viável durante deltas |
| Submissão e streaming de output | Browser/Client → API | — | Client envia POST, lê NDJSON stream |
| Validação de request (Zod) | API/Backend | — | Evita processar requests malformados antes de reservar quota |
| Quota reservation/confirm/release | API/Backend | Database | Lógica transacional já existente no quota-service |
| AI prompt construction | API/Backend (server-only) | — | Segredo de modelo e instruções ficam no servidor |
| Safety classification (pattern matching) | Browser/Client | — | Acontece sobre o texto do payload `complete` já recebido — sem round-trip |
| Pro entitlement check para Templates | API/Backend (SSR page) | — | Server Component verifica entitlement antes de renderizar a page |
| ToolRequest persistence | API/Backend | Database | Registra após confirmação de quota |
| Sidebar activation | Browser/Client (nav) | — | Mudança de config estática em `navItems` |

---

## Standard Stack

### Core (já presente no projeto — sem instalação nova obrigatória)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 15.x (existente) | Routing, RSC pages, API routes | Já é o framework do projeto [VERIFIED: apps/web/package.json] |
| Zod | 3.x (existente) | Schema validation e TypeScript types | Padrão de contrato do projeto [VERIFIED: packages/shared/src/formula/schema.ts] |
| OpenAI SDK | 4.x (existente) | AI generation server-side | Já em uso no projeto [VERIFIED: apps/web/package.json] |
| Prisma | 7.8.0 (existente) | ORM, ToolRequest persistence | Já em uso [VERIFIED: package.json] |
| lucide-react | existente | Ícones (AlertTriangle, LayoutTemplate) | Já em uso no projeto [VERIFIED: sidebar.tsx] |
| Tailwind CSS | existente | Utility tokens + CSS custom properties | Padrão do projeto [VERIFIED: globals.css] |

### Nova Dependência: Syntax Highlighting

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-shiki | 0.10.1 | Syntax highlighting com suporte nativo a streaming em Client Components | Hook `useShikiHighlighter` aceita `delay` para throttling — ideal para output ao vivo [VERIFIED: npm registry, Context7 /avgvstvs96/react-shiki] |
| shiki | 4.1.0 (peer dep) | Engine de highlighting baseado em TextMate grammars | Base do react-shiki; versão atual verificada [VERIFIED: npm registry] |

**Por que react-shiki em vez do Shiki direto:**
- O padrão canônico do Shiki para Next.js usa `codeToHtml` em Server Components (async, render único). Durante streaming NDJSON, o código chega em deltas num Client Component — não há Server Component disponível para re-renderizar assincronamente a cada delta.
- `react-shiki` expõe `useShikiHighlighter(code, language, theme, { delay })` — atualiza highlighted output com throttle, evitando re-highlight excessivo durante streaming. [CITED: Context7 /avgvstvs96/react-shiki]
- Alternativa: Prism.js (16.1.1 disponível no npm). Prism é síncrono e funciona bem em client, mas requer importar a linguagem correta e não tem suporte a temas GitHub Light equivalente ao workspace. Shiki oferece tokens mais precisos. [ASSUMED — comparação baseada em conhecimento de treinamento; ambos são funcionalmente adequados]

**Instalação:**
```bash
pnpm --filter web add react-shiki shiki
```

**Verificação de versão antes de instalar:**
```bash
npm view react-shiki version   # 0.10.1
npm view shiki version         # 4.1.0
```

---

## Architecture Patterns

### System Architecture Diagram

```
[Browser: Client Component]
  ScriptsTool / SqlTool / RegexTool / TemplatesTool
      |
      | POST /api/tools/{kind}/generate (ou /explain para Regex)
      |
[API Route Handler]
  1. getSessionFromCookieHeader → auth
  2. Zod parse (toolKindRequestSchema)
  3. reserveToolUse(userId, toolKind, mode)
  4. resolveToolPayload({ mode, request })      ← server/ai/
  5. confirmToolUse(reservationKey)
  6. recordToolRequest(...)                    ← server/tools/
  7. createToolEventStream(payload, lastFreeUse)
      |
      | Response: content-type: application/x-ndjson
      |
[Browser: Client Component hook]
  useXxxStream()
  - status: idle → loading → streaming → complete
  - delta events → draft string
  - complete event → payload (includes code, metadata, isDestructive)
  - quota_warning event → lastFreeUse
      |
      v
[Output Panel]
  - useShikiHighlighter(code, lang, theme, { delay: 150 })
  - Safety warning banner if payload.isDestructive === true
  - Copy button (raw code, no fences)
```

### Recommended Project Structure

```
packages/shared/src/
├── formula/             # existente — não modificar
├── scripts/             # NOVO
│   ├── schema.ts        # ScriptType enum, request/response/stream schemas + tipos
│   └── fixtures.ts      # Fixtures de teste
├── sql/                 # NOVO
│   ├── schema.ts        # SqlDialect enum, request/response/stream schemas + tipos
│   └── fixtures.ts
├── regex/               # NOVO
│   ├── schema.ts        # request/response/stream schemas para generate + explain
│   └── fixtures.ts
├── template/            # NOVO
│   ├── schema.ts        # request/response/stream schemas
│   └── fixtures.ts
└── index.ts             # exportar tudo

apps/web/src/
├── app/
│   ├── api/tools/
│   │   ├── formula/     # existente
│   │   ├── scripts/generate/route.ts   # NOVO
│   │   ├── sql/generate/route.ts       # NOVO
│   │   ├── regex/generate/route.ts     # NOVO
│   │   ├── regex/explain/route.ts      # NOVO
│   │   └── template/generate/route.ts  # NOVO
│   └── (workspace)/workspace/
│       ├── page.tsx             # existente (Formula)
│       ├── scripts/page.tsx     # NOVO
│       ├── sql/page.tsx         # NOVO
│       ├── regex/page.tsx       # NOVO
│       └── templates/page.tsx   # NOVO
├── features/
│   ├── formula/         # existente — não modificar
│   ├── scripts/         # NOVO — mesma estrutura da formula
│   │   ├── scripts-tool.tsx
│   │   ├── components/
│   │   │   ├── scripts-input-panel.tsx
│   │   │   └── scripts-output-panel.tsx
│   │   └── hooks/use-scripts-stream.ts
│   ├── sql/             # NOVO
│   │   ├── sql-tool.tsx
│   │   ├── components/
│   │   │   ├── sql-input-panel.tsx
│   │   │   └── sql-output-panel.tsx
│   │   └── hooks/use-sql-stream.ts
│   ├── regex/           # NOVO
│   │   ├── regex-tool.tsx
│   │   ├── components/
│   │   │   ├── regex-input-panel.tsx
│   │   │   └── regex-output-panel.tsx
│   │   └── hooks/use-regex-stream.ts
│   └── template/        # NOVO
│       ├── template-tool.tsx
│       ├── components/
│       │   ├── template-input-panel.tsx
│       │   └── template-output-panel.tsx
│       └── hooks/use-template-stream.ts
└── server/
    ├── ai/
    │   ├── scripts-stream.ts    # NOVO
    │   ├── sql-stream.ts        # NOVO
    │   ├── regex-stream.ts      # NOVO
    │   └── template-stream.ts   # NOVO
    └── tools/
        ├── formula-repository.ts  # existente
        └── tool-repository.ts     # NOVO — genérico para script/sql/regex/template
```

### Pattern 1: Shared Zod Contract por ferramenta (packages/shared)

**O que é:** Cada ferramenta nova tem seu próprio arquivo `schema.ts` em `packages/shared/src/{tool}/` com os mesmos tipos de export que `formula/schema.ts`.

**Quando usar:** Sempre — garante type-safety end-to-end entre API route e Client Component.

```typescript
// Source: padrão baseado em packages/shared/src/formula/schema.ts
// packages/shared/src/scripts/schema.ts

import { z } from "zod";

export const SCRIPT_TYPES = [
  { id: "vba", label: "VBA", highlightLang: "vba" },
  { id: "apps_script", label: "Apps Script", highlightLang: "javascript" },
  { id: "airtable_script", label: "Airtable Script", highlightLang: "javascript" }
] as const;

export const SCRIPT_TYPE_IDS = SCRIPT_TYPES.map((s) => s.id) as [
  "vba", "apps_script", "airtable_script"
];
export type ScriptType = (typeof SCRIPT_TYPE_IDS)[number];
export const scriptTypeSchema = z.enum(SCRIPT_TYPE_IDS);

export const scriptGenerateRequestSchema = z.object({
  scriptType: scriptTypeSchema,
  prompt: z.string().trim().min(3, "Descreva a automação antes de gerar.")
});

export const scriptMetadataSchema = z.object({
  mode: z.literal("generate"),
  scriptType: scriptTypeSchema,
  isDestructive: z.boolean().default(false),
  providerModel: z.string().optional()
});

export const scriptGenerateResponseSchema = z.object({
  kind: z.literal("script"),
  code: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  assumptions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  isDestructive: z.boolean().default(false),
  metadata: scriptMetadataSchema
});

export const scriptStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("metadata"), metadata: scriptMetadataSchema }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("warning"), warning: z.string() }),
  z.object({ type: z.literal("quota_warning"), lastFreeUse: z.boolean() }),
  z.object({ type: z.literal("complete"), payload: scriptGenerateResponseSchema }),
  z.object({ type: z.literal("error"), message: z.string() })
]);

export type ScriptGenerateRequest = z.infer<typeof scriptGenerateRequestSchema>;
export type ScriptMetadata = z.infer<typeof scriptMetadataSchema>;
export type ScriptGenerateResponse = z.infer<typeof scriptGenerateResponseSchema>;
export type ScriptStreamEvent = z.infer<typeof scriptStreamEventSchema>;
```

### Pattern 2: Route Handler (API)

**O que é:** Cópia direta do `formula/generate/route.ts` com tool-specific imports.

**Estrutura invariante:** auth → parse → reserveToolUse → resolvePayload → confirmToolUse → recordToolRequest → stream.

```typescript
// Source: baseado em apps/web/src/app/api/tools/formula/generate/route.ts
// apps/web/src/app/api/tools/scripts/generate/route.ts

import { NextResponse } from "next/server";
import { scriptGenerateRequestSchema } from "@tabelin/shared";
import { createScriptEventStream, resolveScriptPayload } from "@/server/ai/scripts-stream";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { recordToolRequest } from "@/server/tools/tool-repository";
import { reserveToolUse, confirmToolUse, releaseToolUse } from "@/server/usage/quota-service";

export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });

  const startedAt = performance.now();
  const body = await request.json().catch(() => null);
  const parsed = scriptGenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido inválido.", issues: parsed.error.issues }, { status: 400 });
  }

  const quotaCheck = await reserveToolUse(user.id, "script", "generate");
  if (!quotaCheck.allowed) {
    return NextResponse.json({ code: "quota_exceeded", meterKind: quotaCheck.meterKind, cta: "pro_checkout" }, { status: 429 });
  }

  try {
    const payload = await resolveScriptPayload({ request: parsed.data });
    await confirmToolUse(quotaCheck.reservationKey);
    await recordToolRequest({
      userId: user.id,
      toolKind: "script",
      mode: "generate",
      dialect: parsed.data.scriptType,
      status: "success",
      latencyMs: Math.round(performance.now() - startedAt),
      providerModel: payload.metadata.providerModel
    });
    return new Response(createScriptEventStream(payload, quotaCheck.lastFreeUse), {
      headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" }
    });
  } catch {
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ error: "Não consegui validar a resposta." }, { status: 502 });
  }
}
```

### Pattern 3: Safety Classification (pattern matching)

**O que é:** Classificação de destrutividade por regex sobre o código gerado — sem round-trip ao AI.

**Quando usar:** Após receber o `complete` payload; classifica no servidor antes de enviar o event stream.

```typescript
// Source: pattern derivado de D-08, D-09 do CONTEXT.md

// SQL destructive patterns
const SQL_DESTRUCTIVE_PATTERNS = [
  /\bDROP\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\b(?![\s\S]*?\bWHERE\b)/i,       // DELETE sem WHERE
  /\bUPDATE\b(?![\s\S]*?\bWHERE\b)/i          // UPDATE sem WHERE
];

// Script destructive patterns (VBA + Apps Script + Airtable)
const SCRIPT_DESTRUCTIVE_PATTERNS = [
  /\bDeleteFile\b/i, /\bKill\b/i, /\.Rows\.Delete\b/i,
  /DriveApp\.remove/i, /\.deleteSheet\b/i,
  /\.deleteRecord\b/i, /\.deleteRecords\b/i
];

export function classifyDestructive(code: string, toolKind: "sql" | "script"): boolean {
  const patterns = toolKind === "sql" ? SQL_DESTRUCTIVE_PATTERNS : SCRIPT_DESTRUCTIVE_PATTERNS;
  return patterns.some((pattern) => pattern.test(code));
}
```

**Nota sobre DELETE/UPDATE sem WHERE:** A regex `DELETE(?![\s\S]*?WHERE)` pode ter falsos negativos em casos como `DELETE FROM x WHERE y` com quebras de linha. Alternativa mais robusta: incluir `isDestructive` como campo na resposta estruturada do AI, e fazer fallback para pattern matching se o campo não vier preenchido. [ASSUMED — a regex acima cobre casos lineares; edge cases com multiline requerem validação manual]

### Pattern 4: Syntax Highlighting com react-shiki (streaming)

**O que é:** Hook `useShikiHighlighter` do `react-shiki` aplicado ao output durante e após streaming.

**Quando usar:** Dentro do OutputPanel de cada ferramenta, no lugar de `<pre>{draft}</pre>` durante streaming.

```tsx
// Source: Context7 /avgvstvs96/react-shiki
"use client";
import { useShikiHighlighter } from "react-shiki";

function CodeOutput({ code, language }: { code: string; language: string }) {
  const highlighted = useShikiHighlighter(code, language, "github-light", {
    delay: 150  // throttle durante streaming — evita re-highlight em cada delta
  });

  // highlighted é null antes do primeiro render
  if (!highlighted) {
    return <pre className="output-box">{code}</pre>;
  }

  return <div className="code-output">{highlighted}</div>;
}
```

**Linguagens por ferramenta:**
| Tool | scriptType / dialect | Shiki lang |
|------|---------------------|------------|
| Scripts | vba | `vba` |
| Scripts | apps_script | `javascript` |
| Scripts | airtable_script | `javascript` |
| SQL | todos os dialetos | `sql` |
| Regex | generate | `regex` (ou plain se não suportado) |
| Templates | — | `markdown` ou `csv` |

**Tema:** `github-light` — compatível com a paleta de cores quiet do workspace (fundo `#FBFCFD`). [CITED: UI-SPEC.md — "GitHub Light theme or equivalent"]

### Pattern 5: Pro entitlement gate para Templates

**O que é:** Server Component lê entitlement; Client Component recebe `isPro: boolean` como prop.

```tsx
// Source: baseado em apps/web/src/app/(workspace)/workspace/page.tsx
// apps/web/src/app/(workspace)/workspace/templates/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { getUserEntitlement } from "@/server/billing/entitlements";
import { TemplateTool } from "@/features/template/template-tool";
// ...
const entitlement = await getUserEntitlement(user.id);
const isPro = entitlement.plan === "pro" && entitlement.status === "active";
// passa isPro ao TemplateTool — Free user vê CTA de upgrade em vez de gerar
```

### Pattern 6: Generic Tool Repository

**O que é:** Repositório genérico para os novos toolKinds — evita duplicar o `try/catch` de persistência.

**Por que necessário:** O modelo `ToolRequest` tem `formulaLanguage String` e `separator String` como campos não-nullable. Scripts, SQL, regex e templates não têm esses conceitos. A abordagem é: fazer uma migração de schema para tornar esses campos opcionais (`String?`) e usar um `dialect` genérico no lugar de `platform` para os novos tools.

```typescript
// server/tools/tool-repository.ts — NOVO
export async function recordToolRequest(input: {
  userId: string;
  toolKind: string;
  mode: string;
  dialect?: string;   // scriptType, sqlDialect, etc.
  status: "success" | "failure";
  latencyMs?: number;
  providerModel?: string;
}) {
  try {
    return await prisma.toolRequest.create({
      data: {
        userId: input.userId,
        toolKind: input.toolKind,
        mode: input.mode,
        platform: input.dialect ?? "",
        formulaLanguage: "",   // vazio para não-formula tools (após tornar nullable)
        separator: "",          // idem
        status: input.status,
        latencyMs: input.latencyMs,
        providerModel: input.providerModel
      }
    });
  } catch {
    console.warn("Tool request persistence skipped.");
    return null;
  }
}
```

**Alternativa limpa (recomendada):** tornar `formulaLanguage` e `separator` opcionais no `prisma/schema.prisma` (`String?`), depois usar `prisma db push`. Isso evita guardar strings vazias.

### Anti-Patterns a Evitar

- **Importar `shiki` diretamente no Client Component com o bundle full:** O bundle full do Shiki inclui todas as linguagens (~7MB). Usar `react-shiki` com fine-grained import por linguagem mantém o bundle pequeno. [CITED: Context7 /shikijs/shiki "Best Performance Practices"]
- **Rodar `codeToHtml` do Shiki dentro de um hook em Client Component sem throttle:** Re-highlight a cada delta de streaming causa jank visível. Usar o `delay` do `useShikiHighlighter`. [CITED: Context7 /avgvstvs96/react-shiki]
- **Classificar destrutividade no cliente após renderização:** A classificação deve acontecer no servidor antes de enviar o stream, e o campo `isDestructive` deve ser incluído no event `complete`. Isso evita flash de conteúdo sem banner.
- **Passar `formulaLanguage`/`separator` como strings vazias sem tornar os campos nullable:** Guardar `""` é um antipadrão — tornará buscas por `formulaLanguage` não-confiáveis. Tornar nullable é a abordagem correta.
- **Usar modal para safety warning:** O CONTEXT.md (D-07) e o UI-SPEC confirmam que o warning é inline, não modal. Modal interromperia o fluxo cópia-e-usa.
- **Criar componentes base compartilhados prematuramente:** Cada ferramenta tem seletores e metadata distintos. Uma abstração genérica `BaseTool<TConfig>` cria acoplamento frágil e dificulta divergências futuras.

---

## Don't Hand-Roll

| Problema | Não construir | Usar em vez | Por quê |
|----------|--------------|-------------|---------|
| Syntax highlighting de código | Parser e tokenizer manual | `react-shiki` + `shiki` | Suporte a VBA, JS, SQL, regex; temas; acessibilidade (não só cor); TextMate grammars testados |
| Quota enforcement | Contagem manual | `quota-service` existente (`reserveToolUse`) | Já tem isolamento serializable, retry, lastFreeUse signal |
| Streaming NDJSON | ReadableStream manual | `createToolEventStream` — replicar padrão da formula | Já testado; inclui encoding, events tipados, close correto |
| Validação de request | `typeof body === "object"` manual | `zod.safeParse` | Type coercion, error messages localizáveis, discriminated unions |
| Entitlement check | Query Prisma inline na page | `getUserEntitlement` existente | Já lida com `recentlyRevoked`, ciclos de billing, status canceled |

**Insight chave:** toda a plumbing (auth, quota, streaming, persistence) já existe e funciona. A fase é 80% de contrato Zod + composição de componentes. O único código verdadeiramente novo é: prompts de AI para cada ferramenta, a função `classifyDestructive`, e o hook `useShikiHighlighter` wrapper.

---

## Common Pitfalls

### Pitfall 1: ToolRequest schema — campos não-nullable
**O que dá errado:** `prisma.toolRequest.create` para um tool novo lança erro de constraint NOT NULL se `formulaLanguage` e `separator` continuarem obrigatórios.
**Por que acontece:** O modelo foi desenhado para Formula com campos formula-específicos obrigatórios.
**Como evitar:** Tornar `formulaLanguage String?` e `separator String?` no `schema.prisma` e executar `prisma db push` antes de criar repositórios para os novos tools.
**Sinais de alerta:** Erro 500 em qualquer tool novo que tente persistir via ToolRequest.

### Pitfall 2: Sidebar — active state por rota
**O que dá errado:** Todos os items ficam com `data-active="true"` ou nenhum fica ativo nas novas rotas.
**Por que acontece:** O `navItems` atual usa `active: true` como flag estático — não é derivado da rota atual.
**Como evitar:** Usar `usePathname()` do Next.js no Client Component da Sidebar para comparar `href` com pathname atual. Isso requer transformar `Sidebar` em `"use client"` ou criar um subcomponente `NavItem` client.
**Sinais de alerta:** Todos os links de ferramenta aparecem ativos simultaneamente.

### Pitfall 3: Shiki VBA language support
**O que dá errado:** `useShikiHighlighter(code, "vba", "github-light")` não faz nada ou lança erro porque o Shiki bundled não inclui VBA.
**Por que acontece:** Shiki inclui as linguagens mais comuns por padrão; VBA pode não estar no bundle padrão.
**Como evitar:** Verificar se `"vba"` está na lista de `BundledLanguage` do Shiki; se não estiver, usar `"vb"` ou fallback para `<pre>` simples sem highlighting. [ASSUMED — necessita verificação: `npm view shiki` + consultar lista de linguagens suportadas]
**Sinais de alerta:** Output VBA renderiza sem cores ou com erro de console.

### Pitfall 4: DELETE/UPDATE sem WHERE — regex multi-linha
**O que dá errado:** `DELETE\n  FROM tabela` não é detectado pela regex `/DELETE(?![\s\S]*?WHERE)/i` porque `[\s\S]*?` é lazy e pode não cobrir a instrução completa.
**Por que acontece:** Regex é lazy por padrão; em queries multi-linha, pode haver múltiplos `DELETE` na mesma string.
**Como evitar:** Incluir `isDestructive` como campo na resposta estruturada do AI — mais confiável que regex. Usar pattern matching como fallback secundário.
**Sinais de alerta:** Query `DELETE FROM tabela` sem WHERE não exibe o banner de segurança.

### Pitfall 5: react-shiki null no primeiro render
**O que dá errado:** O Output Panel pisca brevemente em branco antes do highlight aparecer.
**Por que acontece:** `useShikiHighlighter` retorna `null` antes do primeiro highlight completar (o Shiki carrega async).
**Como evitar:** Renderizar `<pre>{code}</pre>` enquanto `highlighted === null`. Assim o texto sempre aparece imediatamente, e o highlight substitui quando pronto.
**Sinais de alerta:** Flash branco visível no output panel ao completar a geração.

### Pitfall 6: Templates — Free user bypassa o gate pelo endpoint direto
**O que dá errado:** Usuário Free chama `POST /api/tools/template/generate` diretamente e gera um template sem entitlement.
**Por que acontece:** O gate no Server Component page é client-visible; o endpoint pode não ter a verificação.
**Como evitar:** O route handler de templates DEVE verificar `entitlement.plan === "pro"` antes de reservar quota — retornar 403 com `code: "pro_required"`. O Client Component trata esse 403 mostrando o CTA de upgrade.
**Sinais de alerta:** Templates sendo gerados por usuários Free sem erro.

---

## Code Examples

### Exemplo 1: SQL Dialect Constants (shared)

```typescript
// Source: padrão de FORMULA_PLATFORMS em packages/shared/src/formula/platforms.ts
export const SQL_DIALECTS = [
  { id: "postgresql", label: "PostgreSQL" },
  { id: "mysql",      label: "MySQL" },
  { id: "sqlserver",  label: "SQL Server" },
  { id: "oracle",     label: "Oracle" },
  { id: "bigquery",   label: "BigQuery" }
] as const;

export const SQL_DIALECT_IDS = SQL_DIALECTS.map((d) => d.id) as [
  "postgresql", "mysql", "sqlserver", "oracle", "bigquery"
];
export type SqlDialect = (typeof SQL_DIALECT_IDS)[number];
```

### Exemplo 2: Safety Warning Banner

```tsx
// Source: UI-SPEC.md Safety Warning Contract + globals.css .note-block.warning
import { AlertTriangle } from "lucide-react";

function SafetyWarning({ message }: { message: string }) {
  return (
    <div className="note-block warning" role="alert">
      <h3>
        <AlertTriangle aria-hidden size={16} />
        {" "}Atenção — Operação destrutiva
      </h3>
      <p>{message}</p>
    </div>
  );
}
```

### Exemplo 3: Sidebar com active state dinâmico

```tsx
// Source: apps/web/src/components/app/sidebar.tsx (extensão necessária)
"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
// ...
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar" aria-label="Ferramentas">
      {/* ... */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          if (item.disabled) { /* ... */ }
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              className="nav-item"
              data-active={isActive}
              href={item.href}
              key={item.label}
            >
              {/* ... */}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### Exemplo 4: Prisma schema change (ToolRequest)

```prisma
// Source: prisma/schema.prisma — mudança necessária
model ToolRequest {
  id              String   @id @default(cuid())
  userId          String
  toolKind        String
  mode            String
  platform        String
  formulaLanguage String?  // era String — torna opcional para novos tools
  separator       String?  // era String — idem
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

### Exemplo 5: Regex Tool — modo dualista (mesma estrutura da Formula)

```typescript
// Source: baseado em use-formula-stream.ts — padrão exato a replicar
export type RegexMode = "generate" | "explain";

export function useRegexStream() {
  // estado idêntico ao useFormulaStream
  // endpoint: mode === "generate" → "/api/tools/regex/generate"
  //           mode === "explain"  → "/api/tools/regex/explain"
  // event schema: regexStreamEventSchema (análogo ao formulaStreamEventSchema)
}
```

---

## State of the Art

| Abordagem antiga | Abordagem atual | Quando mudou | Impacto |
|------------------|-----------------|--------------|---------|
| Shiki via `codeToHtml` em Server Component | Shiki via `react-shiki` `useShikiHighlighter` em Client Component com delay | Shiki v4 + Next.js 15 App Router | Funciona com streaming; não exige RSC async a cada delta |
| Prisma Migrate para schema changes | `prisma db push` (este projeto usa schema sem migrations) | Configuração do projeto | Schema change é aplicado via `pnpm prisma db push` sem migration file |

**Obsoleto / não usar:**
- `react-syntax-highlighter`: mais pesado, menos preciso, e o ecossistema migrou para Shiki. [ASSUMED]
- Highlighter CSS-only (highlight.js via CDN): não integra com bundler, sem type safety.

---

## Assumptions Log

| # | Claim | Section | Risco se Errado |
|---|-------|---------|-----------------|
| A1 | VBA pode não estar no bundle padrão do Shiki — requer verificação da lista de BundledLanguage | Standard Stack / Pitfall 3 | Output VBA sem highlighting; workaround: usar "vb" ou fallback para `<pre>` |
| A2 | react-shiki versão 0.10.1 é a atual estável — verificado via npm view mas API pode ter mudado desde | Standard Stack | Import paths ou API do hook podem diferir; verificar docs antes de usar |
| A3 | A regex de DELETE sem WHERE pode ter falsos negativos em queries multi-linha | Pattern 3 | Queries destrutivas sem WHERE não exibem o banner; mitigação: usar campo `isDestructive` na resposta AI como campo primário |
| A4 | `prisma db push` é o mecanismo de schema change deste projeto (sem migrations) | Pitfall 1 / Code Example 4 | Se o projeto migrar para Prisma Migrate, a mudança precisará de arquivo de migração |
| A5 | `react-syntax-highlighter` é obsoleto em favor de Shiki | State of the Art | Alternativa viável se react-shiki apresentar problemas; testar ambos se necessário |

---

## Open Questions (RESOLVED)

1. **VBA language support no Shiki** — RESOLVED: Plan 03-03 Task 1 inclui verificação explícita via `node -e "const { bundledLanguages } = require('shiki'); console.log('vba' in bundledLanguages)"` no Passo 0. A constante `SCRIPT_HIGHLIGHT_LANG` no shared schema mapeia `vba → 'vba'` com fallback para `'plaintext'` se ausente no bundle.

2. **Prisma db push vs migrate** — RESOLVED: Confirmado que o projeto usa `prisma db push` (sem pasta `prisma/migrations`). Plan 03-01 Task 1 inclui `[BLOCKING]` task com `npx prisma db push` para tornar `formulaLanguage` e `separator` anuláveis (`String?`). Mudança não-destrutiva, sem risco para dados existentes.

---

## Environment Availability

| Dependência | Requerida por | Disponível | Versão | Fallback |
|-------------|--------------|-----------|--------|---------|
| Node.js | Build e runtime | ✓ | (inferido do projeto ativo) | — |
| PostgreSQL | Prisma / ToolRequest | ✓ | Banco local ativo (prisma migrate status retornou) | — |
| OpenAI API | AI generation | variável | Requer OPENAI_API_KEY no env | Fixtures determinísticas (padrão da formula) |
| react-shiki | Syntax highlighting | ✗ (não instalado) | 0.10.1 disponível no npm | `<pre>` simples sem highlighting |
| shiki | Peer dep de react-shiki | ✗ (não instalado) | 4.1.0 disponível no npm | — |

**Dependências faltantes sem fallback:**
- Nenhuma bloqueadora — o projeto usa fixtures determinísticas quando OPENAI_API_KEY não está presente.

**Dependências faltantes com fallback:**
- `react-shiki` / `shiki`: não bloqueiam funcionalidade core; OutputPanel pode usar `<pre>` simples até a lib ser instalada. O Wave 0 dos planos deve incluir a instalação.

---

## Security Domain

`security_enforcement: true` no config.json. `security_asvs_level: 1`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | sim | `getSessionFromCookieHeader` — padrão existente; todos os novos route handlers herdam |
| V3 Session Management | sim | better-auth session existente — sem mudança |
| V4 Access Control | sim — Templates | Verificação `entitlement.plan === "pro"` no route handler de templates (403 se Free) |
| V5 Input Validation | sim | `zod.safeParse` em todos os route handlers — mesmo padrão da Formula |
| V6 Cryptography | não | Nenhum dado sensível gerado; código gerado é texto plain |

### Known Threat Patterns para este Stack

| Padrão | STRIDE | Mitigação Padrão |
|--------|--------|-----------------|
| Prompt injection via input do usuário | Tampering | Prompt construído no servidor; input do usuário é passado como dado, não como instrução direta de sistema |
| Bypass do Pro gate para Templates | Elevation of Privilege | Verificação de entitlement no route handler (não apenas no client) — retornar 403 antes de qualquer quota reservation |
| Quota bypass via requests paralelas | Tampering | `reserveToolUse` com `isolationLevel: "Serializable"` — já cobre race conditions |
| XSS via código gerado renderizado como HTML | Tampering | Não usar `dangerouslySetInnerHTML` com o código gerado diretamente — react-shiki retorna ReactElement seguro; se usar `codeToHtml`, sanitizar o HTML |
| Exposição de prompts do sistema via response | Information Disclosure | Prompts ficam em `server/ai/` com `import "server-only"` — não vazam para o cliente |

**Nota sobre XSS com Shiki:** `react-shiki` com `outputFormat: "react"` (padrão) retorna um ReactElement — sem risco de XSS. Se optar por `outputFormat: "html"` com `dangerouslySetInnerHTML`, o HTML vem do Shiki internamente (não do input do usuário), mas é boa prática evitar quando não necessário.

---

## Sources

### Primary (HIGH confidence)
- Codebase verificado — `apps/web/src/features/formula/`, `apps/web/src/app/api/tools/formula/`, `packages/shared/src/formula/`, `prisma/schema.prisma`, `apps/web/src/styles/globals.css`
- Context7 `/avgvstvs96/react-shiki` — `useShikiHighlighter` hook API, streaming delay option
- Context7 `/shikijs/shiki` — Next.js integration, fine-grained bundles, Server vs Client Component patterns
- `.planning/phases/03-multi-tool-generation-suite/03-CONTEXT.md` — decisões travadas
- `.planning/phases/03-multi-tool-generation-suite/03-UI-SPEC.md` — contrato visual aprovado

### Secondary (MEDIUM confidence)
- npm registry — versões verificadas: `react-shiki@0.10.1`, `shiki@4.1.0`, `prismjs@1.30.0`

### Tertiary (LOW confidence)
- Suporte a linguagem VBA no Shiki bundle — baseado em conhecimento de treinamento; verificar na instalação

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — verificado no codebase + npm registry + Context7
- Architecture: HIGH — baseado diretamente no código existente (formula tool é o template)
- Syntax Highlighting: MEDIUM-HIGH — API verificada via Context7; VBA support é ASSUMED
- Safety Classification: MEDIUM — regex patterns baseados nas decisões D-08/D-09; edge cases multi-linha são ASSUMED
- Pitfalls: HIGH — derivados de análise direta do código e schema existentes

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (stack estável; react-shiki e shiki têm releases frequentes — verificar versões antes de instalar)

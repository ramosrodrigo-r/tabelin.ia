# Phase 3: Multi-Tool Generation Suite — Mapa de Padrões

**Mapeado:** 2026-05-25
**Arquivos analisados:** 28 (novos/modificados)
**Análogos encontrados:** 27 / 28

---

## Classificação de Arquivos

| Arquivo novo/modificado | Papel | Fluxo de dados | Análogo mais próximo | Qualidade do match |
|-------------------------|-------|----------------|----------------------|--------------------|
| `packages/shared/src/scripts/schema.ts` | contrato/schema | request-response | `packages/shared/src/formula/schema.ts` | exato |
| `packages/shared/src/scripts/fixtures.ts` | fixture/teste | — | `packages/shared/src/formula/fixtures.ts` | exato |
| `packages/shared/src/sql/schema.ts` | contrato/schema | request-response | `packages/shared/src/formula/schema.ts` | exato |
| `packages/shared/src/sql/fixtures.ts` | fixture/teste | — | `packages/shared/src/formula/fixtures.ts` | exato |
| `packages/shared/src/regex/schema.ts` | contrato/schema | request-response | `packages/shared/src/formula/schema.ts` | exato |
| `packages/shared/src/regex/fixtures.ts` | fixture/teste | — | `packages/shared/src/formula/fixtures.ts` | exato |
| `packages/shared/src/template/schema.ts` | contrato/schema | request-response | `packages/shared/src/formula/schema.ts` | exato |
| `packages/shared/src/template/fixtures.ts` | fixture/teste | — | `packages/shared/src/formula/fixtures.ts` | exato |
| `packages/shared/src/index.ts` (modificar) | barrel export | — | `packages/shared/src/index.ts` | exato |
| `apps/web/src/app/api/tools/scripts/generate/route.ts` | route handler | request-response | `apps/web/src/app/api/tools/formula/generate/route.ts` | exato |
| `apps/web/src/app/api/tools/sql/generate/route.ts` | route handler | request-response | `apps/web/src/app/api/tools/formula/generate/route.ts` | exato |
| `apps/web/src/app/api/tools/regex/generate/route.ts` | route handler | request-response | `apps/web/src/app/api/tools/formula/generate/route.ts` | exato |
| `apps/web/src/app/api/tools/regex/explain/route.ts` | route handler | request-response | `apps/web/src/app/api/tools/formula/explain/route.ts` | exato |
| `apps/web/src/app/api/tools/template/generate/route.ts` | route handler | request-response + entitlement | `apps/web/src/app/api/tools/formula/generate/route.ts` | role-match (+Pro gate) |
| `apps/web/src/app/(workspace)/workspace/scripts/page.tsx` | page (RSC) | request-response | `apps/web/src/app/(workspace)/workspace/page.tsx` | exato |
| `apps/web/src/app/(workspace)/workspace/sql/page.tsx` | page (RSC) | request-response | `apps/web/src/app/(workspace)/workspace/page.tsx` | exato |
| `apps/web/src/app/(workspace)/workspace/regex/page.tsx` | page (RSC) | request-response | `apps/web/src/app/(workspace)/workspace/page.tsx` | exato |
| `apps/web/src/app/(workspace)/workspace/templates/page.tsx` | page (RSC) | request-response + entitlement | `apps/web/src/app/(workspace)/workspace/page.tsx` | role-match (+Pro gate) |
| `apps/web/src/features/scripts/scripts-tool.tsx` | componente (estado) | streaming | `apps/web/src/features/formula/formula-tool.tsx` | exato |
| `apps/web/src/features/scripts/components/scripts-input-panel.tsx` | componente (UI) | request-response | `apps/web/src/features/formula/components/formula-input-panel.tsx` | exato |
| `apps/web/src/features/scripts/components/scripts-output-panel.tsx` | componente (UI) | streaming | `apps/web/src/features/formula/components/formula-output-panel.tsx` | exato |
| `apps/web/src/features/scripts/hooks/use-scripts-stream.ts` | hook | streaming NDJSON | `apps/web/src/features/formula/hooks/use-formula-stream.ts` | exato |
| `apps/web/src/features/sql/sql-tool.tsx` | componente (estado) | streaming | `apps/web/src/features/formula/formula-tool.tsx` | exato |
| `apps/web/src/features/sql/components/sql-input-panel.tsx` | componente (UI) | request-response | `apps/web/src/features/formula/components/formula-input-panel.tsx` | exato |
| `apps/web/src/features/sql/components/sql-output-panel.tsx` | componente (UI) | streaming | `apps/web/src/features/formula/components/formula-output-panel.tsx` | exato |
| `apps/web/src/features/sql/hooks/use-sql-stream.ts` | hook | streaming NDJSON | `apps/web/src/features/formula/hooks/use-formula-stream.ts` | exato |
| `apps/web/src/features/regex/regex-tool.tsx` | componente (estado) | streaming | `apps/web/src/features/formula/formula-tool.tsx` | exato |
| `apps/web/src/features/regex/components/regex-input-panel.tsx` | componente (UI) | request-response | `apps/web/src/features/formula/components/formula-input-panel.tsx` | exato |
| `apps/web/src/features/regex/components/regex-output-panel.tsx` | componente (UI) | streaming | `apps/web/src/features/formula/components/formula-output-panel.tsx` | exato |
| `apps/web/src/features/regex/hooks/use-regex-stream.ts` | hook | streaming NDJSON | `apps/web/src/features/formula/hooks/use-formula-stream.ts` | exato |
| `apps/web/src/features/template/template-tool.tsx` | componente (estado) | streaming + Pro gate | `apps/web/src/features/formula/formula-tool.tsx` | role-match |
| `apps/web/src/features/template/components/template-input-panel.tsx` | componente (UI) | request-response + Pro gate | `apps/web/src/features/formula/components/formula-input-panel.tsx` | role-match |
| `apps/web/src/features/template/components/template-output-panel.tsx` | componente (UI) | streaming | `apps/web/src/features/formula/components/formula-output-panel.tsx` | exato |
| `apps/web/src/features/template/hooks/use-template-stream.ts` | hook | streaming NDJSON | `apps/web/src/features/formula/hooks/use-formula-stream.ts` | exato |
| `apps/web/src/server/ai/scripts-stream.ts` | serviço (server-only) | request-response | `apps/web/src/server/ai/formula-stream.ts` | exato |
| `apps/web/src/server/ai/sql-stream.ts` | serviço (server-only) | request-response | `apps/web/src/server/ai/formula-stream.ts` | exato |
| `apps/web/src/server/ai/regex-stream.ts` | serviço (server-only) | request-response | `apps/web/src/server/ai/formula-stream.ts` | exato |
| `apps/web/src/server/ai/template-stream.ts` | serviço (server-only) | request-response | `apps/web/src/server/ai/formula-stream.ts` | exato |
| `apps/web/src/server/tools/tool-repository.ts` | repositório (server-only) | CRUD | `apps/web/src/server/tools/formula-repository.ts` | role-match |
| `apps/web/src/components/app/sidebar.tsx` (modificar) | componente (nav) | event-driven | si mesmo | self-patch |
| `prisma/schema.prisma` (modificar) | schema de banco | — | si mesmo | self-patch |
| `apps/web/src/server/ai/destructive-classifier.ts` | utilitário (server) | transform | — | sem análogo |

---

## Atribuições de Padrão

### `packages/shared/src/scripts/schema.ts` (contrato, request-response)

**Análogo:** `packages/shared/src/formula/schema.ts`

**Padrão de imports** (linhas 1-3):
```typescript
import { z } from "zod";
```

**Padrão de constantes de plataforma** (linhas 1-34 de `platforms.ts`):
```typescript
export const FORMULA_PLATFORMS = [
  { id: "excel", label: "Microsoft Excel", promptName: "Microsoft Excel", supportsPortugueseFunctions: true },
  // ...
] as const;

export const FORMULA_PLATFORM_IDS = FORMULA_PLATFORMS.map((platform) => platform.id) as [
  "excel", "google_sheets", "airtable", "libreoffice_calc"
];
export type FormulaPlatform = (typeof FORMULA_PLATFORM_IDS)[number];
```
Copiar o padrão `as const` + `map().map() as [...]` para SCRIPT_TYPES, SQL_DIALECTS.

**Padrão core do schema** (linhas 6-80 de `schema.ts`):
```typescript
export const formulaPlatformSchema = z.enum(FORMULA_PLATFORM_IDS);

export const formulaGenerateRequestSchema = formulaRequestBaseSchema
  .extend({ prompt: z.string().trim().min(3, "Descreva a tarefa da planilha antes de gerar.") })
  .superRefine(...);

export const formulaMetadataSchema = z.object({
  mode: formulaModeSchema,
  platform: formulaPlatformSchema,
  // ...
  providerModel: z.string().optional()
});

export const formulaStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("metadata"), metadata: formulaMetadataSchema }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("warning"), warning: z.string() }),
  z.object({ type: z.literal("quota_warning"), lastFreeUse: z.boolean() }),
  z.object({ type: z.literal("complete"), payload: formulaCompletePayloadSchema }),
  z.object({ type: z.literal("error"), message: z.string() })
]);

export type FormulaGenerateRequest = z.infer<typeof formulaGenerateRequestSchema>;
// ...todos os exports de type no final
```

**Diferença chave para Scripts:** adicionar `isDestructive: z.boolean().default(false)` em `scriptMetadataSchema` e em `scriptGenerateResponseSchema`. Não há `superRefine` (sem validação de separator).

**Diferença chave para SQL:** `sqlDialect` no lugar de `platform`; `isDestructive` em metadata e response.

**Diferença chave para Regex:** dois schemas de request (`regexGenerateRequestSchema` com `prompt`, `regexExplainRequestSchema` com `pattern`); dois schemas de response (`regexGenerateResponseSchema` com `pattern` + `explanation`, `regexExplainResponseSchema` com `pattern` + `steps[]`); `discriminatedUnion("kind", [...])` no payload (igual ao formula).

**Diferença chave para Template:** sem `isDestructive`; `output: z.string()` no response (Markdown/CSV); sem seletor de tipo.

---

### `packages/shared/src/scripts/fixtures.ts` (fixture, —)

**Análogo:** `packages/shared/src/formula/fixtures.ts`

**Padrão core** (linhas 1-60 de `fixtures.ts`):
```typescript
import type { FormulaGenerateResponse } from "./schema";

export const FORMULA_FIXTURES: FormulaGenerateResponse[] = [
  {
    kind: "formula",
    formula: '=SE(A2>0;"Ativo";"Revisar")',
    explanation: "Verifica se A2 e maior que zero e retorna um status operacional.",
    assumptions: ["A coluna A contem valores numericos."],
    warnings: [],
    metadata: {
      mode: "generate",
      platform: "excel",
      formulaLanguage: "pt-BR",
      separator: ";",
      providerModel: "fixture"
    }
  },
  // ...
];
```
Cada nova ferramenta deve ter um array de 2-3 fixtures cobrindo casos pt-BR típicos.

---

### `packages/shared/src/index.ts` (barrel, —)

**Análogo:** si mesmo (linhas 1-4):
```typescript
export * from "./formula/fixtures";
export * from "./formula/platforms";
export * from "./formula/schema";
export * from "./billing/schema";
```
Adicionar linhas análogas para cada nova ferramenta. Padrão: `export * from "./{tool}/schema"` e `export * from "./{tool}/fixtures"`.

---

### `apps/web/src/app/api/tools/scripts/generate/route.ts` (route handler, request-response)

**Análogo:** `apps/web/src/app/api/tools/formula/generate/route.ts`

**Padrão de imports** (linhas 1-8):
```typescript
import { NextResponse } from "next/server";
import { formulaGenerateRequestSchema } from "@tabelin/shared";
import { createFormulaEventStream, resolveFormulaPayload } from "@/server/ai/formula-stream";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { recordFormulaToolRequest } from "@/server/tools/formula-repository";
import { reserveToolUse, confirmToolUse, releaseToolUse } from "@/server/usage/quota-service";
```

**Padrão de auth** (linhas 10-15):
```typescript
export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }
```

**Padrão de parse + quota + stream** (linhas 16-57):
```typescript
  const startedAt = performance.now();
  const body = await request.json().catch(() => null);
  const parsed = formulaGenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido de formula invalido.", issues: parsed.error.issues }, { status: 400 });
  }

  const quotaCheck = await reserveToolUse(user.id, "formula", "generate");
  if (!quotaCheck.allowed) {
    return NextResponse.json({ code: "quota_exceeded", meterKind: quotaCheck.meterKind, cta: "pro_checkout" }, { status: 429 });
  }

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

**Diferença para scripts/sql/regex:** trocar imports do schema/stream/repository; passar `toolKind` correto para `reserveToolUse` e `recordToolRequest`; usar `tool-repository` genérico no lugar de `formula-repository`.

---

### `apps/web/src/app/api/tools/template/generate/route.ts` (route handler, request-response + entitlement)

**Análogo:** `apps/web/src/app/api/tools/formula/generate/route.ts`

**Padrão de Pro gate adicional** — inserir ANTES de `reserveToolUse`:
```typescript
// Verificar entitlement Pro antes de reservar quota
import { getUserEntitlement } from "@/server/billing/entitlements";

const entitlement = await getUserEntitlement(user.id);
const isPro = entitlement.plan === "pro" && entitlement.status === "active";
if (!isPro) {
  return NextResponse.json({ code: "pro_required", cta: "pro_checkout" }, { status: 403 });
}
```
O restante do fluxo é idêntico ao padrão formula. Adicionar esta verificação entre o bloco de auth (401) e o `reserveToolUse`.

---

### `apps/web/src/app/(workspace)/workspace/scripts/page.tsx` (page RSC, request-response)

**Análogo:** `apps/web/src/app/(workspace)/workspace/page.tsx` (linhas 1-37):
```typescript
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { FormulaTool } from "@/features/formula/formula-tool";
import { getCurrentUser } from "@/server/auth/session";
import { getUserEntitlement } from "@/server/billing/entitlements";
import { getSupportLinks } from "@/server/support/support-config";

export default async function WorkspacePage() {
  const user = await getCurrentUser();
  if (!user) { redirect("/sign-in"); }

  const entitlement = await getUserEntitlement(user.id);
  const supportLinks = getSupportLinks();

  return (
    <div className="workspace-layout">
      <Sidebar />
      <div className="workspace-main">
        <Topbar user={user} entitlement={entitlement} supportLinks={supportLinks} />
        <main className="workspace-content">
          <section className="workspace-heading">
            <div>
              <h1>Workspace de formulas</h1>
              <p>Descreva a tarefa em portugues e receba uma formula pronta para copiar.</p>
            </div>
          </section>
          <FormulaTool entitlement={entitlement} />
        </main>
      </div>
    </div>
  );
}
```
Substituir `FormulaTool` pelo tool correto; alterar `h1` e `p` conforme copywriting contract do UI-SPEC.

**Copias pt-BR por page:**
- Scripts: `h1="Scripts"`, `p="Gere VBA, Google Apps Script e Airtable Scripts a partir de descricoes em portugues."`
- SQL: `h1="SQL"`, `p="Gere consultas SQL a partir de descricoes em portugues para o dialeto escolhido."`
- Regex: `h1="Regex"`, `p="Gere e explique expressoes regulares para validacao e limpeza de dados."`
- Templates: `h1="Templates"`, `p="Gere templates de planilha estruturados com cabecalhos, colunas e formulas de referencia."`

---

### `apps/web/src/features/scripts/scripts-tool.tsx` (componente estado, streaming)

**Análogo:** `apps/web/src/features/formula/formula-tool.tsx` (linhas 1-80)

**Padrão de imports** (linhas 1-8):
```typescript
"use client";
import type { FormulaLanguage, FormulaPlatform, UserEntitlement } from "@tabelin/shared";
import { useState } from "react";
import { FormulaInputPanel } from "./components/formula-input-panel";
import { FormulaOutputPanel } from "./components/formula-output-panel";
import { type FormulaMode, useFormulaStream } from "./hooks/use-formula-stream";
```

**Padrão de estado** (linhas 10-18):
```typescript
export function FormulaTool({ entitlement }: { entitlement: UserEntitlement }) {
  const [mode, setMode] = useState<FormulaMode>("generate");
  const [platform, setPlatform] = useState<FormulaPlatform>("excel");
  // ...
  const stream = useFormulaStream();
  const pending = stream.status === "loading" || stream.status === "streaming";
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";
```

**Padrão de submit** (linhas 21-38):
```typescript
  async function submit() {
    if (!text.trim()) {
      setValidationError("...");
      return;
    }
    setValidationError("");
    await stream.submit({ mode, platform, formulaLanguage, text });
  }
```

**Padrão de render** (linhas 41-79):
```typescript
  return (
    <>
      {showRevokedNotice ? ( /* revoked notice */ ) : null}
      <section className="tool-grid" aria-label="...">
        <XxxInputPanel ... />
        <XxxOutputPanel ... />
      </section>
    </>
  );
```

**Diferenças por ferramenta:**
- Scripts: estado `scriptType` (VBA/apps_script/airtable_script), sem `mode`/`formulaLanguage`
- SQL: estado `dialect`, sem `mode`/`formulaLanguage`
- Regex: estado `mode` (generate/explain), sem platform/language
- Templates: estado `isPro` visível, sem `mode`/platform/language

---

### `apps/web/src/features/scripts/hooks/use-scripts-stream.ts` (hook, streaming NDJSON)

**Análogo:** `apps/web/src/features/formula/hooks/use-formula-stream.ts` (linhas 1-149)

**Padrão de imports e tipos** (linhas 1-13):
```typescript
"use client";
import {
  type FormulaCompletePayload,
  type FormulaMetadata,
  formulaStreamEventSchema
} from "@tabelin/shared";
import { useCallback, useState } from "react";

export type FormulaMode = "generate" | "explain";
export type FormulaStreamStatus = "idle" | "loading" | "streaming" | "complete" | "error";
```

**Padrão de estado inicial** (linhas 22-30):
```typescript
  const [status, setStatus] = useState<FormulaStreamStatus>("idle");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<FormulaCompletePayload | null>(null);
  const [metadata, setMetadata] = useState<FormulaMetadata | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [lastFreeUse, setLastFreeUse] = useState(false);
```

**Padrão do loop de streaming NDJSON** (linhas 83-135):
```typescript
    setStatus("streaming");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = formulaStreamEventSchema.parse(JSON.parse(line));
        if (event.type === "metadata") { setMetadata(event.metadata); }
        if (event.type === "warning") { setWarnings((current) => [...current, event.warning]); }
        if (event.type === "quota_warning") { setLastFreeUse(event.lastFreeUse); }
        if (event.type === "delta") { setDraft((current) => `${current}${event.text}`); }
        if (event.type === "complete") { setResult(event.payload); setMetadata(event.payload.metadata); setWarnings(event.payload.warnings); setStatus("complete"); }
        if (event.type === "error") { setError(event.message); setStatus("error"); }
      }
    }
```

**Padrão de tratamento 429** (linhas 62-69):
```typescript
    if (!response.ok) {
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code === "quota_exceeded") {
          setStatus("idle");
          setQuotaBlocked(true);
          setError("");
          return;
        }
      }
      setStatus("error");
      setError("Nao consegui validar a resposta. Ajuste o pedido e tente novamente.");
      return;
    }
```

**Diferença por ferramenta:** mudar `xxxStreamEventSchema`, tipos de payload/metadata, e o body do fetch (campos do request).

---

### `apps/web/src/features/scripts/components/scripts-input-panel.tsx` (componente UI, request-response)

**Análogo:** `apps/web/src/features/formula/components/formula-input-panel.tsx` (linhas 1-159)

**Padrão de seletor como segmented control** (linhas 82-97):
```typescript
        <fieldset className="segmented-field">
          <legend>Idioma da formula</legend>
          <div className="segmented-control">
            {FORMULA_LANGUAGES.map((item) => (
              <button
                aria-pressed={formulaLanguage === item.id}
                className="segment-button"
                key={item.id}
                onClick={() => onLanguageChange(item.id)}
                type="button"
              >
                {item.label} <span>{item.separator}</span>
              </button>
            ))}
          </div>
        </fieldset>
```
Para Scripts: usar este padrão com `SCRIPT_TYPES` (VBA, Apps Script, Airtable Script). `<legend>Tipo de script</legend>`.

**Padrão de seletor como `<select>`** (linhas 67-80):
```typescript
        <div className="field">
          <label htmlFor="formula-platform">Plataforma</label>
          <select
            id="formula-platform"
            value={platform}
            onChange={(event) => onPlatformChange(event.target.value as FormulaPlatform)}
          >
            {FORMULA_PLATFORMS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </div>
```
Para SQL: usar este padrão com `SQL_DIALECTS`. `<label>Dialeto</label>`.

**Padrão de textarea** (linhas 99-113):
```typescript
        <div className="field">
          <label htmlFor="formula-text">{mode === "generate" ? "Pedido" : "Formula"}</label>
          <textarea
            id="formula-text"
            minLength={2}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder={mode === "generate" ? "Quero somar a coluna B..." : '=SOMASE(C:C;"Pago";B:B)'}
            rows={8}
            value={text}
          />
        </div>
```

**Padrão de quota/error/submit** (linhas 115-156):
```typescript
        {validationError ? <div className="form-error">{validationError}</div> : null}
        {!isPro && lastFreeUse && !quotaBlocked ? (
          <div className="quota-warning">Este e seu ultimo uso gratuito. Assine Pro para acesso ilimitado.</div>
        ) : null}
        {!isPro && quotaBlocked ? (
          <div className="quota-blocked">
            <p>Voce atingiu o limite...</p>
            <button className="primary-button" type="button" onClick={async () => { /* checkout */ }}>Assinar Pro</button>
          </div>
        ) : (
          <button className="primary-button" disabled={pending || quotaBlocked} onClick={onSubmit} type="button">
            <Wand2 aria-hidden size={16} />
            {pending ? "Gerando..." : "Gerar formula"}
          </button>
        )}
```

**Padrão Pro gate para Templates (input panel):**
Substituir o bloco `quotaBlocked` pelo bloco de entitlement pro: se `!isPro`, mostrar `.quota-blocked` com heading "Recurso exclusivo Pro", body text e CTA "Assinar Pro". Quando `isPro`, mostrar normalmente.

---

### `apps/web/src/features/scripts/components/scripts-output-panel.tsx` (componente UI, streaming)

**Análogo:** `apps/web/src/features/formula/components/formula-output-panel.tsx` (linhas 1-110)

**Padrão de output-header + CopyButton** (linhas 40-47):
```typescript
      <div className="output-header">
        <div>
          <h2>Resultado</h2>
          <p aria-live="polite">{status === "streaming" ? "Recebendo resposta..." : "Pronto para revisar e copiar."}</p>
        </div>
        <CopyButton disabled={status !== "complete"} value={completeText} />
      </div>
```

**Padrão de metadata chip** (linhas 49-54):
```typescript
      {metadata ? (
        <div className="metadata-row" aria-label="Metadados">
          <span>{metadata.platform}</span>
          <span>{metadata.formulaLanguage}</span>
          <span>Separador {metadata.separator}</span>
        </div>
      ) : null}
```
Para Scripts: exibir só `metadata.scriptType`. Para SQL: exibir `metadata.dialect`.

**Padrão do output-box com data-status** (linhas 57-85):
```typescript
      <div className="output-box" data-status={status}>
        {status === "idle" ? <span>O resultado aparece aqui assim que a resposta comecar.</span> : null}
        {status === "loading" ? <span>Preparando resposta...</span> : null}
        {status === "streaming" ? <pre>{draft}</pre> : null}
        {status === "complete" && result?.kind === "formula" ? (
          <>
            <pre>{result.formula}</pre>
            <p>{result.explanation}</p>
          </>
        ) : null}
        {status === "error" ? (
          <div className="error-block">
            <p>{error}</p>
            <button className="ghost-button" onClick={onRetry} type="button">Tentar novamente</button>
          </div>
        ) : null}
      </div>
```

**Padrão de safety warning** — inserir ANTES de `.output-box`, DEPOIS de `.metadata-row`:
```typescript
      {result?.isDestructive ? (
        <div className="note-block warning" role="alert">
          <h3>
            <AlertTriangle aria-hidden size={16} />
            {" "}Atencao — Operacao destrutiva
          </h3>
          <p>{/* mensagem específica por tipo de operação */}</p>
        </div>
      ) : null}
```
Importar `AlertTriangle` de `lucide-react`.

**Padrão do note-block de assumptions** (linhas 87-96):
```typescript
      {result?.assumptions.length ? (
        <div className="note-block">
          <h3>Premissas</h3>
          <ul>
            {result.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </div>
      ) : null}
```

**Padrão de syntax highlighting** — substituir `<pre>{draft}</pre>` e `<pre>{result.code}</pre>` por:
```typescript
import { useShikiHighlighter } from "react-shiki";

// dentro do componente:
const highlighted = useShikiHighlighter(
  status === "streaming" ? draft : (result?.code ?? ""),
  language,  // "vba" | "javascript" | "sql" | "regex" | "markdown"
  "github-light",
  { delay: 150 }
);

// no JSX:
{highlighted ? <div className="code-output">{highlighted}</div> : <pre className="output-box">{code}</pre>}
```

---

### `apps/web/src/server/ai/scripts-stream.ts` (serviço server-only, request-response)

**Análogo:** `apps/web/src/server/ai/formula-stream.ts` (linhas 1-99)

**Padrão de imports** (linhas 1-9):
```typescript
import {
  type FormulaCompletePayload,
  type FormulaExplainRequest,
  type FormulaGenerateRequest,
  type FormulaMetadata,
  type FormulaStreamEvent,
  formulaCompletePayloadSchema,
  getSeparatorForLanguage
} from "@tabelin/shared";
import { getOpenAIModel } from "./openai-client";
```

**Padrão de resolvePayload** (linhas 27-69):
```typescript
export async function resolveFormulaPayload(input: FormulaModeInput): Promise<FormulaCompletePayload> {
  const metadata = metadataFor(input);

  // sem OPENAI_API_KEY: retornar fixture determinística
  // com OPENAI_API_KEY: construir prompt + chamar API

  return formulaCompletePayloadSchema.parse({ kind: "formula", formula, explanation, assumptions, warnings: [], metadata });
}
```

**Padrão de createEventStream** (linhas 79-99):
```typescript
export function createFormulaEventStream(payload: FormulaCompletePayload, lastFreeUse?: boolean) {
  const encoder = new TextEncoder();
  const events: FormulaStreamEvent[] = [
    { type: "metadata", metadata: payload.metadata },
    ...payload.warnings.map((warning): FormulaStreamEvent => ({ type: "warning", warning })),
    ...(lastFreeUse ? [{ type: "quota_warning" as const, lastFreeUse: true }] : []),
    ...splitForStreaming(payload).map((text): FormulaStreamEvent => ({ type: "delta", text })),
    { type: "complete", payload }
  ];

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      controller.close();
    }
  });
}
```
Copiar este padrão exatamente; ajustar apenas os tipos e o campo `isDestructive` na montagem do payload.

---

### `apps/web/src/server/tools/tool-repository.ts` (repositório server-only, CRUD)

**Análogo:** `apps/web/src/server/tools/formula-repository.ts` (linhas 1-32)

**Padrão de imports + função** (linhas 1-31):
```typescript
import type { FormulaMetadata } from "@tabelin/shared";
import { prisma } from "@/server/db/client";

export type ToolRequestStatus = "success" | "failure";

export async function recordFormulaToolRequest(input: {
  userId: string;
  metadata: FormulaMetadata;
  status: ToolRequestStatus;
  latencyMs?: number;
}) {
  try {
    return await prisma.toolRequest.create({
      data: {
        userId: input.userId,
        toolKind: "formula",
        mode: input.metadata.mode,
        platform: input.metadata.platform,
        formulaLanguage: input.metadata.formulaLanguage,
        separator: input.metadata.separator,
        status: input.status,
        latencyMs: input.latencyMs,
        providerModel: input.metadata.providerModel
      }
    });
  } catch {
    console.warn("Formula metadata persistence skipped.");
    return null;
  }
}
```

**Diferença para tool-repository genérico:** aceitar `input.toolKind`, `input.mode`, `input.dialect` (string opcional). Os campos `formulaLanguage` e `separator` devem ser `null` (após serem tornados `String?` no Prisma schema). Manter o `try/catch` com `console.warn`.

---

### `apps/web/src/components/app/sidebar.tsx` (modificação — nav, event-driven)

**Análogo:** si mesmo (linhas 1-52)

**Mudança 1 — Adicionar `"use client"` e `usePathname`** (nova linha 1, novo import):
```typescript
"use client";
import { usePathname } from "next/navigation";
```
Remover `import Link from "next/link"` do servidor (já está no arquivo — manter).

**Mudança 2 — `navItems`: ativar Scripts, SQL, Regex; adicionar Templates** (linhas 9-16):
```typescript
const navItems: NavItem[] = [
  { label: "Formula",   icon: FileSpreadsheet, href: "/workspace",          active: true },
  { label: "Scripts",   icon: Braces,          href: "/workspace/scripts",  active: true },
  { label: "SQL",       icon: ScrollText,      href: "/workspace/sql",      active: true },
  { label: "Regex",     icon: Regex,           href: "/workspace/regex",    active: true },
  { label: "Templates", icon: LayoutTemplate,  href: "/workspace/templates",active: true },
  { label: "File Analysis", icon: FileText, disabled: true },
  { label: "OCR",           icon: Image,    disabled: true }
];
```
Importar `LayoutTemplate` de `lucide-react`.

**Mudança 3 — active state dinâmico** (substituir linhas 44):
```typescript
// dentro do map, antes do return do Link:
const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
// ...
<Link className="nav-item" data-active={isActive} href={item.href} key={item.label}>
```
Remover `data-active={item.active}` (estático). Usar `data-active={isActive}` (dinâmico via `usePathname()`).

---

### `prisma/schema.prisma` (modificação — schema, —)

**Análogo:** si mesmo (linhas 71-88)

**Estado atual** (linhas 76-78):
```prisma
  formulaLanguage String
  separator       String
```

**Mudança necessária:**
```prisma
  formulaLanguage String?   // era String — torna opcional para novos tools
  separator       String?   // era String — idem
```
Executar `pnpm prisma db push` após a mudança. Sem migration file (projeto usa `db push`).

---

## Padrões Compartilhados

### Autenticação
**Fonte:** `apps/web/src/app/api/tools/formula/generate/route.ts` linhas 10-15
**Aplicar a:** todos os route handlers novos (scripts, sql, regex, template)
```typescript
const user = getSessionFromCookieHeader(request.headers.get("cookie"));
if (!user) {
  return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
}
```

### Quota Reservation / Confirm / Release
**Fonte:** `apps/web/src/app/api/tools/formula/generate/route.ts` linhas 25-56
**Aplicar a:** todos os route handlers novos
```typescript
const quotaCheck = await reserveToolUse(user.id, "toolKind", "mode");
if (!quotaCheck.allowed) {
  return NextResponse.json({ code: "quota_exceeded", meterKind: quotaCheck.meterKind, cta: "pro_checkout" }, { status: 429 });
}
// ...no try/catch:
await confirmToolUse(quotaCheck.reservationKey);
// ...no catch:
await releaseToolUse(quotaCheck.reservationKey);
```

### Tratamento de Erro (route handler)
**Fonte:** `apps/web/src/app/api/tools/formula/generate/route.ts` linhas 54-57
**Aplicar a:** todos os route handlers novos
```typescript
  } catch {
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ error: "Nao consegui validar a resposta." }, { status: 502 });
  }
```

### Tratamento de Quota Bloqueada (hook)
**Fonte:** `apps/web/src/features/formula/hooks/use-formula-stream.ts` linhas 61-75
**Aplicar a:** todos os hooks `use-xxx-stream.ts`
```typescript
if (response.status === 429) {
  const errorData = await response.json().catch(() => ({}));
  if (errorData.code === "quota_exceeded") {
    setStatus("idle");
    setQuotaBlocked(true);
    setError("");
    return;
  }
}
```

### Checkout CTA (input panel)
**Fonte:** `apps/web/src/features/formula/components/formula-input-panel.tsx` linhas 129-148
**Aplicar a:** todos os input panels (scripts, sql, regex)
```typescript
<button
  className="primary-button"
  type="button"
  onClick={async () => {
    setCheckoutError(null);
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cycle: "monthly" })
    });
    if (response.ok) {
      const data = await response.json();
      window.location.href = data.checkoutUrl;
    } else {
      setCheckoutError("Não foi possível iniciar o checkout. Tente novamente.");
    }
  }}
>
  Assinar Pro
</button>
```

### RSC Page — Redirect + Auth + Entitlement
**Fonte:** `apps/web/src/app/(workspace)/workspace/page.tsx` linhas 1-37
**Aplicar a:** todas as pages novas (scripts, sql, regex, templates)
```typescript
export default async function WorkspacePage() {
  const user = await getCurrentUser();
  if (!user) { redirect("/sign-in"); }
  const entitlement = await getUserEntitlement(user.id);
  const supportLinks = getSupportLinks();
  return ( /* workspace-layout com Sidebar + Topbar + main */ );
}
```

### Safety Warning Banner
**Fonte:** `apps/web/src/features/formula/components/formula-output-panel.tsx` linhas 98-107 (`.note-block.warning` existente) + UI-SPEC.md Safety Warning Contract
**Aplicar a:** `scripts-output-panel.tsx`, `sql-output-panel.tsx`
```typescript
import { AlertTriangle } from "lucide-react";

{result?.isDestructive ? (
  <div className="note-block warning" role="alert">
    <h3>
      <AlertTriangle aria-hidden size={16} />
      {" "}Atencao — Operacao destrutiva
    </h3>
    <p>{getDestructiveMessage(result)}</p>
  </div>
) : null}
```
Posicionamento: entre `.metadata-row` e `.output-box`, dentro de `.output-panel`.

### Persistence (genérico)
**Fonte:** `apps/web/src/server/tools/formula-repository.ts` linhas 14-29
**Aplicar a:** `tool-repository.ts` (genérico)
```typescript
try {
  return await prisma.toolRequest.create({ data: { ... } });
} catch {
  console.warn("Tool request persistence skipped.");
  return null;
}
```

---

## Sem Análogo Encontrado

| Arquivo | Papel | Fluxo | Motivo |
|---------|-------|-------|--------|
| `apps/web/src/server/ai/destructive-classifier.ts` | utilitário | transform | Nenhuma função de classificação de destrutividade existe no projeto. Padrão derivado de D-08/D-09 do CONTEXT.md e patterns do RESEARCH.md (Pattern 3). |

**Padrão para destructive-classifier.ts** (derivado do RESEARCH.md Pattern 3):
```typescript
const SQL_DESTRUCTIVE_PATTERNS = [
  /\bDROP\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\b(?![\s\S]*?\bWHERE\b)/i,
  /\bUPDATE\b(?![\s\S]*?\bWHERE\b)/i
];
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
Chamar esta função dentro do `resolveScriptPayload` / `resolveSqlPayload` após gerar o código — ANTES de montar o event stream.

---

## Metadados

**Escopo de busca de análogos:** `apps/web/src/`, `packages/shared/src/`, `prisma/`
**Arquivos verificados:** 18 arquivos lidos diretamente
**Data de extração de padrões:** 2026-05-25

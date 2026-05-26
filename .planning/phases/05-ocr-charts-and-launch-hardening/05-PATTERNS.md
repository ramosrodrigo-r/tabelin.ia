# Phase 5: OCR, Charts, and Launch Hardening — Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 14 arquivos novos/modificados
**Analogs found:** 14 / 14

---

## File Classification

| Arquivo Novo/Modificado | Role | Data Flow | Analog Mais Próximo | Qualidade |
|-------------------------|------|-----------|---------------------|-----------|
| `apps/web/src/app/(workspace)/workspace/ocr/page.tsx` | page (RSC) | request-response | `apps/web/src/app/(workspace)/workspace/file-analysis/page.tsx` | exact |
| `apps/web/src/app/api/tools/ocr/process/route.ts` | route handler | request-response | `apps/web/src/app/api/tools/file-analysis/chat/route.ts` | exact |
| `apps/web/src/server/ai/ocr-processor.ts` | service | request-response | `apps/web/src/server/ai/file-chat-stream.ts` | role-match |
| `apps/web/src/features/ocr/ocr-tool.tsx` | component (coordenador) | request-response | `apps/web/src/features/file-analysis/file-analysis-tool.tsx` | exact |
| `apps/web/src/features/ocr/hooks/use-image-upload.ts` | hook | request-response | `apps/web/src/features/file-analysis/hooks/use-file-upload.ts` | exact |
| `apps/web/src/features/ocr/components/image-upload-panel.tsx` | component | file-I/O | `apps/web/src/features/file-analysis/components/file-upload-panel.tsx` | exact |
| `apps/web/src/features/ocr/components/ocr-result-panel.tsx` | component | transform | `apps/web/src/features/file-analysis/components/chat-message.tsx` | role-match |
| `apps/web/src/features/file-analysis/components/chart-message.tsx` | component | transform | `apps/web/src/features/file-analysis/components/chat-message.tsx` | role-match |
| `apps/web/src/features/file-analysis/hooks/use-file-chat.ts` (modificar) | hook | streaming | `apps/web/src/features/file-analysis/hooks/use-file-chat.ts` | self (extend) |
| `apps/web/src/features/file-analysis/components/chat-panel.tsx` (modificar) | component | event-driven | `apps/web/src/features/file-analysis/components/chat-panel.tsx` | self (extend) |
| `apps/web/src/features/file-analysis/components/chat-message.tsx` (modificar) | component | transform | `apps/web/src/features/file-analysis/components/chat-message.tsx` | self (extend) |
| `apps/web/src/components/app/sidebar.tsx` (modificar) | component | — | `apps/web/src/components/app/sidebar.tsx` | self (extend) |
| `packages/shared/src/ocr/schema.ts` | schema/utility | transform | `packages/shared/src/file-analysis/schema.ts` | exact |
| `packages/shared/src/ocr/fixtures.ts` | utility | — | `packages/shared/src/file-analysis/fixtures.ts` | exact |
| `apps/web/tests/e2e/smoke.spec.ts` | test (E2E) | request-response | `apps/web/tests/e2e/formula.spec.ts` + `billing.spec.ts` | exact |

---

## Pattern Assignments

### `apps/web/src/app/(workspace)/workspace/ocr/page.tsx` (page RSC, request-response)

**Analog:** `apps/web/src/app/(workspace)/workspace/file-analysis/page.tsx`

**Imports pattern** (linhas 1-9):
```typescript
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { OcrTool } from "@/features/ocr/ocr-tool";
import { getCurrentUser } from "@/server/auth/session";
import { getUserEntitlement } from "@/server/billing/entitlements";
import { getSupportLinks } from "@/server/support/support-config";
```

**Auth pattern** (linhas 11-15):
```typescript
const user = await getCurrentUser();
if (!user) {
  redirect("/sign-in");
}
```

**Core pattern** (linhas 16-36 do analog):
```typescript
// RSC: busca dados server-side, passa entitlement para Client Component
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
            <h1>OCR de Tabelas</h1>
            <p>Envie uma imagem com tabela (PNG, JPEG) e ela sera convertida para planilha copiavel.</p>
          </div>
        </section>
        <OcrTool entitlement={entitlement} />
      </main>
    </div>
  </div>
);
```

---

### `apps/web/src/app/api/tools/ocr/process/route.ts` (route handler, request-response)

**Analog:** `apps/web/src/app/api/tools/file-analysis/chat/route.ts`

**Imports pattern** (linhas 1-13 do analog):
```typescript
import { NextResponse } from "next/server";

import { ocrRequestSchema } from "@tabelin/shared";

import { processImageOcr } from "@/server/ai/ocr-processor";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { confirmToolUse, releaseToolUse, reserveToolUse } from "@/server/usage/quota-service";
```

**Auth pattern** (linhas 15-19 do analog):
```typescript
export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }
```

**Validation pattern** (linhas 21-25 do analog):
```typescript
  const body = await request.json().catch(() => null);
  const parsed = ocrRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido invalido.", issues: parsed.error.issues }, { status: 400 });
  }
```

**Quota pattern** (linhas 33-39 do analog):
```typescript
  const quotaCheck = await reserveToolUse(user.id, "ocr", "process");
  if (!quotaCheck.allowed) {
    return NextResponse.json(
      { code: "quota_exceeded", meterKind: quotaCheck.meterKind, cta: "pro_checkout" },
      { status: 429 }
    );
  }
```

**Core pattern — OCR é one-shot (JSON, sem streaming)**:
```typescript
  try {
    const result = await processImageOcr(parsed.data.imageBase64, parsed.data.mimeType);
    await confirmToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ rows: result.rows, headers: result.headers });
  } catch {
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ error: "Nao foi possivel processar a imagem." }, { status: 502 });
  }
```

**Diferenca vs analog:** Não usa streaming (`buildFileChatStream`). Não faz `findUploadedFileByIdAndUser` (OCR one-shot, sem persistência). Retorna `NextResponse.json` em vez de `new Response(stream)`.

---

### `apps/web/src/server/ai/ocr-processor.ts` (service, request-response)

**Analog:** `apps/web/src/server/ai/file-chat-stream.ts`

**Imports e server-only pattern** (linhas 1-5 do analog):
```typescript
import "server-only";

import { createOpenAIClient, getOpenAIModel } from "./openai-client";
```

**Fixture fallback pattern** (linhas 114-117 do analog):
```typescript
// Se OPENAI_API_KEY ausente, retorna fixture determinístico
if (!process.env.OPENAI_API_KEY) {
  return {
    headers: ["Nome", "Valor", "Status"],
    rows: [["Alice", "100", "Ativo"], ["Bob", "200", "Inativo"]]
  };
}
```

**OpenAI client pattern** (linhas 125-128 do analog):
```typescript
const openai = createOpenAIClient();
const model = getOpenAIModel();
// NOTA: D-02 especifica gpt-4o-mini obrigatoriamente para vision.
// Se OPENAI_MODEL apontar para modelo sem visão, usar "gpt-4o-mini" hardcoded aqui.
```

**Vision call pattern — NÃO existe no codebase, usar padrão do RESEARCH.md**:
```typescript
// Diferença crítica vs file-chat-stream: content é array com image_url
const response = await openai.chat.completions.create({
  model,
  messages: [
    { role: "system", content: OCR_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${imageBase64}` }
        },
        { type: "text", text: "Extraia a tabela desta imagem." }
      ]
    }
  ],
  response_format: { type: "json_object" }  // Requer "JSON" explícito no system prompt
});
```

**Error handling pattern** (linhas 154-158 do analog):
```typescript
// O analog usa try/catch com controller.enqueue de error event.
// No ocr-processor, sem stream: lançar o erro para o route handler capturar com releaseToolUse.
} catch (err) {
  throw err; // route handler chama releaseToolUse no catch
}
```

---

### `apps/web/src/features/ocr/ocr-tool.tsx` (component coordenador, request-response)

**Analog:** `apps/web/src/features/file-analysis/file-analysis-tool.tsx`

**Imports pattern** (linhas 1-9 do analog):
```typescript
"use client";

import type { UserEntitlement } from "@tabelin/shared";
import { useState } from "react";

import { useImageUpload } from "./hooks/use-image-upload";
import { ImageUploadPanel } from "./components/image-upload-panel";
import { OcrResultPanel } from "./components/ocr-result-panel";
```

**State machine pattern** (linhas 11-20 do analog):
```typescript
// OCR é mais simples: sem sheet_selection, sem chat
// UiState: "idle" | "processing" | "complete" | "error"
type UiState = "idle" | "processing" | "complete" | "error";

type Props = {
  entitlement: UserEntitlement;
};

export function OcrTool({ entitlement: _entitlement }: Props) {
  const [uiState, setUiState] = useState<UiState>("idle");
  const uploadHook = useImageUpload();
```

**Conditional render pattern** (linhas 68-94 do analog):
```typescript
return (
  <>
    {uiState === "idle" || uiState === "error" ? (
      <ImageUploadPanel
        error={uploadHook.error}
        onUpload={handleUpload}
        processing={uploadHook.status === "processing"}
      />
    ) : null}

    {uiState === "complete" && uploadHook.result ? (
      <OcrResultPanel
        headers={uploadHook.result.headers}
        rows={uploadHook.result.rows}
        onNewImage={handleNewImage}
      />
    ) : null}
  </>
);
```

---

### `apps/web/src/features/ocr/hooks/use-image-upload.ts` (hook, request-response)

**Analog:** `apps/web/src/features/file-analysis/hooks/use-file-upload.ts`

**Imports e "use client" pattern** (linhas 1-3 do analog):
```typescript
"use client";

import { useCallback, useState } from "react";
```

**Status type pattern** (linhas 6-10 do analog):
```typescript
// OCR simplificado: sem "sheet_selection" e sem "complete" com schema
export type ImageUploadStatus = "idle" | "processing" | "complete" | "error";
```

**Tamanho validation pattern** (linhas 25-30 do analog):
```typescript
// Reutilizar exatamente: limite 5 MB antes de converter para base64
if (file.size > 5 * 1024 * 1024) {
  setStatus("error");
  setError("Imagem excede o limite de 5 MB. Reduza o tamanho e tente novamente.");
  return;
}
```

**MIME type normalization** (padrão novo — não existe no analog):
```typescript
// Normalizar image/jpg → image/jpeg (MIME inválido — OpenAI retorna 400 com image/jpg)
const mimeType = file.type === "image/jpg" ? "image/jpeg" : file.type;
if (!["image/png", "image/jpeg"].includes(mimeType)) {
  setStatus("error");
  setError("Formato invalido. Use arquivos .png ou .jpg/.jpeg.");
  return;
}
```

**Base64 conversion pattern** (padrão novo via FileReader nativo):
```typescript
// Converter para base64 via FileReader antes de enviar como JSON
const imageBase64: string = await new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result as string;
    // Remove prefixo "data:image/...;base64," — enviar apenas o base64 puro
    resolve(result.split(",")[1] ?? "");
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});
```

**Fetch JSON pattern** (baseado em linhas 36-58 do analog, mas JSON em vez de FormData):
```typescript
// OCR envia JSON (não FormData), pois base64 é string
const response = await fetch("/api/tools/ocr/process", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ imageBase64, mimeType })
});
```

**Error handling pattern** (linhas 44-58 do analog):
```typescript
if (!response.ok) {
  if (response.status === 413) {
    setStatus("error");
    setError("Imagem excede o limite de 5 MB.");
    return;
  }
  if (response.status === 429) {
    const errData = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (errData.code === "quota_exceeded") {
      setStatus("error");
      setError("Limite de usos gratuitos atingido. Assine Pro para acesso ilimitado.");
      return;
    }
  }
  // ... padrão genérico do analog
}
```

**Reset pattern** (linhas 91-99 do analog):
```typescript
const reset = useCallback(() => {
  setStatus("idle");
  setResult(null);
  setError("");
}, []);
```

---

### `apps/web/src/features/ocr/components/image-upload-panel.tsx` (component, file-I/O)

**Analog:** `apps/web/src/features/file-analysis/components/file-upload-panel.tsx`

**Drop zone pattern** (linhas 136-176 do analog):
```typescript
// Copiar exatamente o padrão de drag-and-drop com:
// - onDrop, onDragOver, onDragLeave handlers
// - role="button" com tabIndex para acessibilidade
// - estilos dragOver com var(--border) e var(--primary) tints
```

**File input pattern** (linhas 178-184 do analog):
```typescript
// Diferença: accept=".png,.jpg,.jpeg" em vez de ".csv,.xlsx"
<input
  accept=".png,.jpg,.jpeg"
  onChange={handleInputChange}
  ref={inputRef}
  style={{ display: "none" }}
  type="file"
/>
```

**Selected file chip pattern** (linhas 187-233 do analog — copiar diretamente).

**Error display pattern** (linhas 234-238 do analog):
```typescript
{displayError ? (
  <div className="form-error" style={{ marginTop: "8px" }}>
    {displayError}
  </div>
) : null}
```

**Submit button pattern** (linhas 240-248 do analog):
```typescript
<button
  className="primary-button"
  disabled={!selectedFile || processing}
  onClick={submitUpload}
  style={{ marginTop: "12px", width: "100%" }}
  type="button"
>
  {processing ? "Processando..." : "Extrair tabela"}
</button>
```

**Welcome message** (não existe no analog — adicionar antes do drop zone):
```typescript
// D-03 + SPECIFICS: mensagem de boas-vindas antes do drop zone
<p style={{ margin: "0 0 16px", fontSize: "14px", color: "var(--muted)" }}>
  Envie uma imagem com tabela (PNG, JPEG) e ela sera convertida para planilha copiavel.
</p>
```

---

### `apps/web/src/features/ocr/components/ocr-result-panel.tsx` (component, transform)

**Analog:** `apps/web/src/features/file-analysis/components/chat-message.tsx` (estrutura de bubble de assistant)

**Wrapper pattern** (linhas 57-77 do analog):
```typescript
// Reutilizar o estilo de bubble do assistant como container do resultado
<div role="article" aria-label="Tabela extraida">
  <p style={{ margin: "0 0 4px", fontSize: "12px", color: "var(--muted)" }}>
    Tabelin.IA
  </p>
  <div
    style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "6px",
      padding: "12px 16px"
    }}
  >
    {/* tabela HTML + botões de cópia */}
  </div>
</div>
```

**CopyButton pattern** (linhas 103-107 do analog):
```typescript
// Reutilizar CopyButton exatamente — apenas mudar value para TSV ou CSV
import { CopyButton } from "../../file-analysis/components/copy-button";

// TSV: rows.map(r => r.join('\t')).join('\n')
// CSV: rows.map(r => r.join(',')).join('\n')
// Incluir headers na primeira linha
```

**Tabela HTML preview** (padrão novo — não existe no analog):
```typescript
<div style={{ overflowX: "auto", marginBottom: "12px" }}>
  <table style={{ borderCollapse: "collapse", fontSize: "13px", width: "100%" }}>
    <thead>
      <tr>
        {headers.map((h, i) => (
          <th key={i} style={{ border: "1px solid var(--border)", padding: "4px 8px", background: "#f8fafc" }}>
            {h}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, ri) => (
        <tr key={ri}>
          {row.map((cell, ci) => (
            <td key={ci} style={{ border: "1px solid var(--border)", padding: "4px 8px" }}>
              {cell}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

### `apps/web/src/features/file-analysis/components/chart-message.tsx` (component, transform — NOVO)

**Analog:** `apps/web/src/features/file-analysis/components/chat-message.tsx`

**"use client" e imports pattern** (linhas 1-5 do analog):
```typescript
"use client";

import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { CopyButton } from "./copy-button";
```

**Assistant bubble wrapper pattern** (linhas 57-77 do analog):
```typescript
// Envolver o gráfico no mesmo bubble style de mensagem assistant
<div role="article" aria-label="Grafico sugerido">
  <p style={{ margin: "0 0 4px", fontSize: "12px", color: "var(--muted)" }}>
    Tabelin.IA
  </p>
  <div style={{
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    padding: "12px 16px",
    maxWidth: "90%"
  }}>
    {/* Recharts ResponsiveContainer + botões */}
  </div>
</div>
```

**ResponsiveContainer pattern — pitfall crítico**:
```typescript
// OBRIGATÓRIO: height={220} fixo para evitar height=0 em hidratação Next.js
// NÃO usar height="100%" — gráfico fica invisível até resize da janela
<ResponsiveContainer width="100%" height={220}>
  {/* BarChart | LineChart | PieChart */}
</ResponsiveContainer>
```

**Toggle buttons pattern** (espelha quick-action-row do chat-panel.tsx linhas 171-210):
```typescript
// Mesmos estilos dos quick-action buttons do ChatPanel
<div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
  {(["bar", "line", "pie"] as const).map((type) => (
    <button
      key={type}
      onClick={() => setActiveType(type)}
      type="button"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "6px",
        background: activeType === type ? "var(--primary)" : "#fff",
        color: activeType === type ? "#fff" : "var(--text)",
        padding: "4px 16px",
        fontSize: "12px",
        fontWeight: 650,
        cursor: "pointer"
      }}
    >
      {type === "bar" ? "Barras" : type === "line" ? "Linhas" : "Pizza"}
    </button>
  ))}
  <div style={{ marginLeft: "auto" }}>
    <CopyButton value={csvData} />
  </div>
</div>
```

---

### `apps/web/src/features/file-analysis/hooks/use-file-chat.ts` (modificar — extend)

**Arquivo base:** `apps/web/src/features/file-analysis/hooks/use-file-chat.ts`

**LocalChatMessage type extension** (linha 8-11 do arquivo):
```typescript
// ANTES:
export type LocalChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// DEPOIS: union discriminada
export type LocalChatMessage =
  | { role: "user" | "assistant"; type: "text"; content: string }
  | { role: "assistant"; type: "chart"; chartData: ChartData };
```

**CHART_PROMPT** (após linha 17, antes de useFileChat):
```typescript
const CHART_PROMPT =
  "Analise os dados e sugira o tipo de grafico mais adequado (bar, line ou pie). " +
  "Retorne APENAS um JSON com: { \"chartType\": \"bar\"|\"line\"|\"pie\", \"title\": string, " +
  "\"xKey\": string, \"yKey\": string, \"rows\": [{...}] }. Sem markdown, sem texto extra.";
```

**sendQuickAction signature** (linha 96-102 do arquivo):
```typescript
// ANTES:
const sendQuickAction = useCallback(
  (uploadedFileId: string, promptType: "pivot" | "report") => {

// DEPOIS: adicionar "chart"
const sendQuickAction = useCallback(
  (uploadedFileId: string, promptType: "pivot" | "report" | "chart") => {
    const prompt =
      promptType === "pivot" ? PIVOT_PROMPT
      : promptType === "report" ? REPORT_PROMPT
      : CHART_PROMPT;
    void submit(uploadedFileId, prompt);
  },
  [submit]
);
```

**complete event handler** (linha 83-87 do arquivo — adicionar parse de chart):
```typescript
// ANTES:
if (event.type === "complete") {
  setMessages((prev) => [...prev, { role: "assistant", content: event.content }]);

// DEPOIS: tentar parsear como ChartData
if (event.type === "complete") {
  try {
    const parsed = JSON.parse(event.content) as Record<string, unknown>;
    if (parsed.chartType && parsed.xKey && parsed.yKey && Array.isArray(parsed.rows)) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        type: "chart",
        chartData: parsed as ChartData
      }]);
    } else {
      setMessages((prev) => [...prev, { role: "assistant", type: "text", content: event.content }]);
    }
  } catch {
    setMessages((prev) => [...prev, { role: "assistant", type: "text", content: event.content }]);
  }
```

---

### `apps/web/src/features/file-analysis/components/chat-panel.tsx` (modificar — extend)

**Arquivo base:** `apps/web/src/features/file-analysis/components/chat-panel.tsx`

**Botão "Sugerir Gráfico"** (após linha 209, dentro do quick-action-row):
```typescript
// Copiar exatamente o estilo do botão "Relatorio Executivo" (linhas 191-210)
// e adicionar após ele:
<button
  aria-label="Sugerir grafico"
  disabled={streaming || chat.quotaBlocked}
  onClick={() => chat.sendQuickAction(uploadedFileId, "chart")}
  style={{
    border: "1px solid var(--border)",
    borderRadius: "6px",
    background: "#fff",
    padding: "4px 16px",
    fontSize: "12px",
    fontWeight: 650,
    color: "var(--text)",
    cursor: streaming || chat.quotaBlocked ? "not-allowed" : "pointer",
    opacity: streaming || chat.quotaBlocked ? 0.5 : 1
  }}
  type="button"
>
  Sugerir Grafico
</button>
```

**ChatMessage render** (linhas 80-87 do arquivo — adicionar branch chart):
```typescript
// ANTES:
{chat.messages.map((msg, idx) => (
  <ChatMessage
    content={msg.content}
    isStreaming={false}
    key={idx}
    role={msg.role}
  />
))}

// DEPOIS: branch por tipo
{chat.messages.map((msg, idx) =>
  msg.type === "chart" ? (
    <ChartMessage data={msg.chartData} key={idx} />
  ) : (
    <ChatMessage
      content={msg.content}
      isStreaming={false}
      key={idx}
      role={msg.role}
    />
  )
)}
```

---

### `apps/web/src/features/file-analysis/components/chat-message.tsx` (modificar — minor)

**Arquivo base:** `apps/web/src/features/file-analysis/components/chat-message.tsx`

**Props type** (linha 3-8 do arquivo):
```typescript
// Adicionar type opcional para retrocompatibilidade
type Props = {
  role: "user" | "assistant" | "system";
  content: string;
  isStreaming?: boolean;
  // type: "text" implícito — sem mudança na renderização
};
```

Nenhuma mudança funcional necessária — o `chat-message.tsx` renderiza apenas mensagens de texto. O branch de chart é feito no `chat-panel.tsx`.

---

### `apps/web/src/components/app/sidebar.tsx` (modificar — 1 linha)

**Arquivo base:** `apps/web/src/components/app/sidebar.tsx`

**Mudança exata** (linha 27 do arquivo):
```typescript
// ANTES:
{ label: "OCR", icon: Image, disabled: true }

// DEPOIS:
{ label: "OCR", icon: Image, href: "/workspace/ocr" }
```

O tipo `NavItem` (linhas 17-19) já suporta ambas as formas — sem mudança necessária.

---

### `packages/shared/src/ocr/schema.ts` (novo schema Zod)

**Analog:** `packages/shared/src/file-analysis/schema.ts`

**Import pattern** (linha 1 do analog):
```typescript
import { z } from "zod";
```

**Schema pattern** (linhas 3-45 do analog):
```typescript
export const ocrRequestSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(["image/png", "image/jpeg"])
});

export const ocrResponseSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string()))
});

// chartDataSchema: validar JSON do AI antes de renderizar (segurança)
export const chartDataSchema = z.object({
  chartType: z.enum(["bar", "line", "pie"]),
  title: z.string(),
  xKey: z.string(),
  yKey: z.string(),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number()])))
});

export type OcrRequest = z.infer<typeof ocrRequestSchema>;
export type OcrResponse = z.infer<typeof ocrResponseSchema>;
export type ChartData = z.infer<typeof chartDataSchema>;
```

---

### `packages/shared/src/ocr/fixtures.ts` (novo)

**Analog:** `packages/shared/src/file-analysis/fixtures.ts`

**Import e export pattern** (linhas 1-3 do analog):
```typescript
import type { OcrResponse } from "./schema";

export const OCR_FIXTURE_RESPONSE: OcrResponse = {
  headers: ["Nome", "Valor", "Status"],
  rows: [["Alice", "100", "Ativo"], ["Bob", "200", "Inativo"]]
};
```

---

### `packages/shared/src/index.ts` (modificar — 3 linhas)

**Arquivo base:** `packages/shared/src/index.ts`

**Adição** (após linha 16):
```typescript
// Fase 5: OCR e Charts
export * from "./ocr/schema";
export * from "./ocr/fixtures";
```

---

### `apps/web/tests/e2e/smoke.spec.ts` (test E2E, request-response)

**Analog:** `apps/web/tests/e2e/formula.spec.ts` + `apps/web/tests/e2e/billing.spec.ts`

**Imports pattern** (linha 1 do analog):
```typescript
import { expect, test } from "@playwright/test";
```

**Mock body pattern** (linhas 3-22 do formula.spec.ts):
```typescript
// OCR mock: JSON direto (não NDJSON — OCR é one-shot)
const ocrMockResponse = {
  headers: ["Nome", "Valor", "Status"],
  rows: [["Alice", "100", "Ativo"], ["Bob", "200", "Inativo"]]
};

// Chart mock: NDJSON exatamente como o streaming existente
const chartMockBody = [
  { type: "delta", text: '{"chartType":"bar","title":"Valores por Nome","xKey":"Nome","yKey":"Valor","rows":[{"Nome":"Alice","Valor":100},{"Nome":"Bob","Valor":200}]}' },
  { type: "complete", content: '{"chartType":"bar","title":"Valores por Nome","xKey":"Nome","yKey":"Valor","rows":[{"Nome":"Alice","Valor":100},{"Nome":"Bob","Valor":200}]}' }
]
  .map((e) => JSON.stringify(e))
  .join("\n");
```

**page.route pattern** (linhas 47-53 do formula.spec.ts):
```typescript
// OCR: JSON response (status 200, contentType: "application/json")
await page.route("**/api/tools/ocr/process", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(ocrMockResponse)
  });
});

// Chart: NDJSON stream (mesmo padrão do formula mock)
await page.route("**/api/tools/file-analysis/chat", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/x-ndjson",
    body: `${chartMockBody}\n`
  });
});
```

**Sign-up pattern** (linhas 62-68 do formula.spec.ts):
```typescript
await page.goto("/sign-up");
await page.getByLabel("Nome").fill("Ana");
await page.getByLabel("Email").fill(`ana-${Date.now()}@empresa.com`);
await page.getByLabel("Senha").fill("senha-segura");
await page.getByRole("button", { name: "Criar conta" }).click();
await expect(page).toHaveURL(/workspace/);
```

**Clipboard permission pattern** (linha 46 do formula.spec.ts):
```typescript
// Obrigatório para testar CopyButton
await context.grantPermissions(["clipboard-read", "clipboard-write"]);
```

**setInputFiles para OCR** (padrão Playwright — não existe nos specs atuais):
```typescript
// Upload de imagem fixture via setInputFiles
await page.setInputFiles('input[type="file"]', "tests/fixtures/tabela-teste.png");
```

---

## Shared Patterns

### Autenticação em Route Handlers
**Fonte:** `apps/web/src/app/api/tools/file-analysis/chat/route.ts` linhas 15-19
**Aplicar a:** `apps/web/src/app/api/tools/ocr/process/route.ts`
```typescript
const user = getSessionFromCookieHeader(request.headers.get("cookie"));
if (!user) {
  return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
}
```

### Quota Reserve/Confirm/Release
**Fonte:** `apps/web/src/app/api/tools/file-analysis/chat/route.ts` linhas 33-70
**Aplicar a:** `apps/web/src/app/api/tools/ocr/process/route.ts`
```typescript
const quotaCheck = await reserveToolUse(user.id, "ocr", "process");
if (!quotaCheck.allowed) { return 429; }
try {
  // ... processamento
  await confirmToolUse(quotaCheck.reservationKey);
  return NextResponse.json(result);
} catch {
  await releaseToolUse(quotaCheck.reservationKey);
  return NextResponse.json({ error: "..." }, { status: 502 });
}
```

### "use client" em todos os hooks e componentes de feature
**Fonte:** `apps/web/src/features/file-analysis/hooks/use-file-upload.ts` linha 1
**Aplicar a:** todos os novos componentes e hooks em `features/ocr/`
```typescript
"use client";
```

### CopyButton reutilizável
**Fonte:** `apps/web/src/features/file-analysis/components/copy-button.tsx`
**Aplicar a:** `ocr-result-panel.tsx` (botões TSV e CSV) e `chart-message.tsx` (dados CSV)

Copiar com path alias relativo ou importar de `../../file-analysis/components/copy-button`. Não duplicar.

### server-only em módulos server
**Fonte:** `apps/web/src/server/ai/file-chat-stream.ts` linha 1
**Aplicar a:** `apps/web/src/server/ai/ocr-processor.ts`
```typescript
import "server-only";
```

### Fixture fallback (OPENAI_API_KEY ausente)
**Fonte:** `apps/web/src/server/ai/file-chat-stream.ts` linhas 114-117
**Aplicar a:** `apps/web/src/server/ai/ocr-processor.ts`
```typescript
if (!process.env.OPENAI_API_KEY) {
  return { headers: ["..."], rows: [[...]] }; // dados fixture
}
```

### Tailwind functional classes (sem CSS modules)
**Fonte:** todos os componentes existentes (ex: `chat-panel.tsx`, `file-upload-panel.tsx`)
**Aplicar a:** todos os novos componentes
- Classes: `tool-panel`, `primary-button`, `ghost-button`, `form-error`, `copy-button`
- Estilos inline usam `var(--border)`, `var(--muted)`, `var(--primary)`, `var(--text)`, `var(--surface)`

---

## No Analog Found

Todos os arquivos da Fase 5 têm analogs próximos no codebase. Nenhum arquivo requer padrão sem precedente.

Os únicos elementos sem analog direto são:
- OpenAI Vision `content: [{ type: "image_url" }]` — usar padrão do RESEARCH.md (Padrão 2), já que o projeto ainda não tem chamadas de vision.
- `FileReader.readAsDataURL()` para base64 no client — API nativa do browser, sem precedente no codebase mas documentada no RESEARCH.md.
- `tests/fixtures/tabela-teste.png` — criar imagem PNG mínima (1x1 px válido) para uso em `page.setInputFiles()` nos testes Playwright.

---

## Metadata

**Diretórios pesquisados:**
- `apps/web/src/features/` — todos os 5 feature existentes
- `apps/web/src/app/api/tools/` — todos os 8 route handlers
- `apps/web/src/app/(workspace)/workspace/` — todas as 6 pages
- `apps/web/src/server/ai/` — openai-client, file-chat-stream
- `apps/web/src/server/usage/` — quota-service
- `apps/web/src/components/app/` — sidebar
- `packages/shared/src/` — todos os schemas e fixtures
- `apps/web/tests/e2e/` — formula.spec.ts, billing.spec.ts

**Arquivos lidos:** 19 arquivos do codebase
**Data de extração:** 2026-05-26

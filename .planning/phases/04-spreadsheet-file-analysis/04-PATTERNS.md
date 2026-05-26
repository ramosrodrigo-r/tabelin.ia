# Phase 4: Spreadsheet File Analysis — Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 22 files (new/modified)
**Analogs found:** 20 / 22

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/web/src/app/(workspace)/workspace/file-analysis/page.tsx` | route/page | request-response | `apps/web/src/app/(workspace)/workspace/scripts/page.tsx` | exact |
| `apps/web/src/app/api/tools/file-analysis/upload/route.ts` | controller | file-I/O | `apps/web/src/app/api/tools/scripts/generate/route.ts` | role-match |
| `apps/web/src/app/api/tools/file-analysis/chat/route.ts` | controller | streaming | `apps/web/src/app/api/tools/scripts/generate/route.ts` | exact |
| `apps/web/src/app/api/tools/file-analysis/cleanup/route.ts` | controller | request-response | `apps/web/src/app/api/tools/scripts/generate/route.ts` | role-match |
| `apps/web/src/features/file-analysis/file-analysis-tool.tsx` | component | event-driven | `apps/web/src/features/formula/formula-tool.tsx` | exact |
| `apps/web/src/features/file-analysis/components/file-upload-panel.tsx` | component | file-I/O | `apps/web/src/features/formula/components/formula-input-panel.tsx` | role-match |
| `apps/web/src/features/file-analysis/components/sheet-selector.tsx` | component | event-driven | `apps/web/src/features/formula/components/formula-input-panel.tsx` (segmented-control) | role-match |
| `apps/web/src/features/file-analysis/components/schema-preview.tsx` | component | request-response | `apps/web/src/features/formula/components/formula-output-panel.tsx` | role-match |
| `apps/web/src/features/file-analysis/components/chat-panel.tsx` | component | streaming | `apps/web/src/features/formula/components/formula-output-panel.tsx` | role-match |
| `apps/web/src/features/file-analysis/components/chat-message.tsx` | component | request-response | `apps/web/src/features/formula/components/formula-output-panel.tsx` | role-match |
| `apps/web/src/features/file-analysis/components/copy-button.tsx` | component | event-driven | `apps/web/src/features/formula/components/copy-button.tsx` | exact (re-use) |
| `apps/web/src/features/file-analysis/hooks/use-file-upload.ts` | hook | file-I/O | `apps/web/src/features/scripts/hooks/use-scripts-stream.ts` | role-match |
| `apps/web/src/features/file-analysis/hooks/use-file-chat.ts` | hook | streaming | `apps/web/src/features/scripts/hooks/use-scripts-stream.ts` | exact |
| `apps/web/src/server/file-analysis/file-parser.ts` | service | transform | `apps/web/src/server/ai/formula-stream.ts` (resolveFormulaPayload) | role-match |
| `apps/web/src/server/file-analysis/file-repository.ts` | service | CRUD | `apps/web/src/server/tools/tool-repository.ts` | exact |
| `apps/web/src/server/file-analysis/cleanup-job.ts` | service | batch | none — new pattern | none |
| `apps/web/src/server/ai/file-chat-stream.ts` | service | streaming | `apps/web/src/server/ai/formula-stream.ts` | exact |
| `apps/web/src/instrumentation.ts` | config | event-driven | none — new file | none |
| `packages/shared/src/file-analysis/schema.ts` | utility | transform | `packages/shared/src/scripts/schema.ts` | exact |
| `packages/shared/src/file-analysis/fixtures.ts` | utility | transform | `packages/shared/src/scripts/fixtures.ts` | exact |
| `prisma/schema.prisma` | model | CRUD | itself (existing `User`, `ToolRequest` models) | exact (extend) |
| `apps/web/src/components/app/sidebar.tsx` | component | event-driven | itself | exact (modify) |

---

## Pattern Assignments

### `apps/web/src/app/(workspace)/workspace/file-analysis/page.tsx` (route/page, request-response)

**Analog:** `apps/web/src/app/(workspace)/workspace/scripts/page.tsx`

**Imports pattern** (lines 1–9):
```typescript
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { ScriptsTool } from "@/features/scripts/scripts-tool";
import { getCurrentUser } from "@/server/auth/session";
import { getUserEntitlement } from "@/server/billing/entitlements";
import { getSupportLinks } from "@/server/support/support-config";
```

**Core RSC page pattern** (lines 10–37):
```typescript
export default async function ScriptsPage() {
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
              <h1>Scripts</h1>
              <p>Gere VBA, Google Apps Script e Airtable Scripts...</p>
            </div>
          </section>
          <ScriptsTool entitlement={entitlement} />
        </main>
      </div>
    </div>
  );
}
```

**Adaptation:** Replace `ScriptsTool` with `FileAnalysisTool`. Use heading `"Analise de planilhas"` / `"Carregue um arquivo .csv ou .xlsx e converse com seus dados."`. No `"use client"` — this is a React Server Component.

---

### `apps/web/src/app/api/tools/file-analysis/upload/route.ts` (controller, file-I/O)

**Analog:** `apps/web/src/app/api/tools/scripts/generate/route.ts`

**Auth + early-exit pattern** (lines 1–15 of scripts route):
```typescript
import { NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "@/server/auth/session";

export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }
  // ...
}
```

**File validation pattern (new — from RESEARCH.md Pattern 1):**
```typescript
const formData = await request.formData();
const file = formData.get("file") as File | null;
const sheetName = formData.get("sheetName") as string | null;

if (!file) return NextResponse.json({ error: "Arquivo obrigatorio." }, { status: 400 });
if (file.size > 5 * 1024 * 1024) {
  return NextResponse.json({ error: "Arquivo excede o limite de 5 MB." }, { status: 413 });
}
const isCSV = file.name.endsWith(".csv") || file.type === "text/csv";
const isXLSX = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
if (!isCSV && !isXLSX) {
  return NextResponse.json({ error: "Formato invalido. Use .csv ou .xlsx." }, { status: 415 });
}
const buffer = await file.arrayBuffer();
// PRIV-02: buffer raw descartado apos parse — nunca persistido
```

**Error handling pattern** (lines 42–46 of scripts route):
```typescript
  try {
    // parse + persist schema
    return NextResponse.json({ type: "upload_complete", uploadedFileId, schema });
  } catch {
    return NextResponse.json({ error: "Nao consegui processar o arquivo." }, { status: 422 });
  }
```

**No quota reservation** for upload — quota applies only to the chat turn (AI usage).

---

### `apps/web/src/app/api/tools/file-analysis/chat/route.ts` (controller, streaming)

**Analog:** `apps/web/src/app/api/tools/scripts/generate/route.ts` (full file, lines 1–47)

**Full route pattern** (scripts route adapted):
```typescript
import { NextResponse } from "next/server";
import { chatRequestSchema } from "@tabelin/shared";
import { buildFileChatStream } from "@/server/ai/file-chat-stream";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { reserveToolUse, confirmToolUse, releaseToolUse } from "@/server/usage/quota-service";

export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  const startedAt = performance.now();
  const body = await request.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido invalido.", issues: parsed.error.issues }, { status: 400 });
  }

  // T-04-01-01: IDOR — always include userId in Prisma query
  const uploadedFile = await findUploadedFileByIdAndUser(parsed.data.uploadedFileId, user.id);
  if (!uploadedFile) {
    return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });
  }

  const quotaCheck = await reserveToolUse(user.id, "file-chat", "chat");
  if (!quotaCheck.allowed) {
    return NextResponse.json(
      { code: "quota_exceeded", meterKind: quotaCheck.meterKind, cta: "pro_checkout" },
      { status: 429 }
    );
  }

  try {
    const stream = await buildFileChatStream(uploadedFile, parsed.data.message, quotaCheck.lastFreeUse);
    await confirmToolUse(quotaCheck.reservationKey);
    // also: updateLastChatAt + appendChatMessages via file-repository
    return new Response(stream, {
      headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" }
    });
  } catch {
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ error: "Nao consegui processar a mensagem." }, { status: 502 });
  }
}
```

**Key deltas from scripts route:** uses `request.json()` (not formData); adds IDOR guard before quota; `toolKind: "file-chat"`; streams NDJSON same as other tools.

---

### `apps/web/src/features/file-analysis/file-analysis-tool.tsx` (component, event-driven)

**Analog:** `apps/web/src/features/formula/formula-tool.tsx` (full file, lines 1–80)

**"use client" + state orchestration pattern** (lines 1–19):
```typescript
"use client";

import type { UserEntitlement } from "@tabelin/shared";
import { useState } from "react";

import { FormulaInputPanel } from "./components/formula-input-panel";
import { FormulaOutputPanel } from "./components/formula-output-panel";
import { useFormulaStream } from "./hooks/use-formula-stream";

export function FormulaTool({ entitlement }: { entitlement: UserEntitlement }) {
  const [mode, setMode] = useState<FormulaMode>("generate");
  const stream = useFormulaStream();
  const pending = stream.status === "loading" || stream.status === "streaming";
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";
```

**Conditional UI + section wrapper pattern** (lines 41–79):
```typescript
  return (
    <>
      {showRevokedNotice ? (
        <div className="revoked-notice">
          <p>Seu plano Pro foi cancelado...</p>
          <button className="ghost-button" type="button" onClick={() => setShowRevokedNotice(false)}>Entendi</button>
        </div>
      ) : null}
      <section className="tool-grid" aria-label="Formula workspace">
        <FormulaInputPanel ... />
        <FormulaOutputPanel ... />
      </section>
    </>
  );
```

**Adaptation:** `uiState` replaces `mode` — drives which sub-component is visible: `"idle"` → `FileUploadPanel`; `"sheet_selection"` → `SheetSelector`; `"ready"` → `ChatPanel` (with `SchemaPreview` as first message). Props pass `upload` and `chat` hook results down to children.

---

### `apps/web/src/features/file-analysis/components/file-upload-panel.tsx` (component, file-I/O)

**Analog:** `apps/web/src/features/formula/components/formula-input-panel.tsx`

**Field + label pattern** (lines 99–116):
```typescript
<div className="field">
  <label htmlFor="formula-text">{mode === "generate" ? "Pedido" : "Formula"}</label>
  <textarea id="formula-text" ... />
</div>
{validationError ? <div className="form-error">{validationError}</div> : null}
```

**Submit button + pending guard** (lines 150–155):
```typescript
<button className="primary-button" disabled={pending || quotaBlocked} onClick={onSubmit} type="button">
  <Wand2 aria-hidden size={16} />
  {pending ? "Gerando..." : mode === "generate" ? "Gerar formula" : "Explicar formula"}
</button>
```

**Adaptation:** Replace `<textarea>` with `<input type="file" accept=".csv,.xlsx">`. Add drag-and-drop zone (`onDragOver` / `onDrop`). `pending` = `upload.status === "uploading"`. Button label: `pending ? "Enviando..." : "Analisar arquivo"`. Validation error shown for size > 5MB or wrong MIME type before even sending to server.

---

### `apps/web/src/features/file-analysis/components/sheet-selector.tsx` (component, event-driven)

**Analog:** `apps/web/src/features/formula/components/formula-input-panel.tsx` — segmented control (lines 82–97)

**Segmented control pattern** (lines 82–97):
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

**Adaptation:** `sheetNames.map(...)` instead of `FORMULA_LANGUAGES`. `aria-pressed={selectedSheet === name}`. On click: call `onSheetSelect(name)` which triggers re-upload with `sheetName` param. Show inline below upload result — not a modal.

---

### `apps/web/src/features/file-analysis/components/copy-button.tsx` (component, event-driven)

**Analog:** `apps/web/src/features/formula/components/copy-button.tsx` (full file, lines 1–41)

**Exact pattern to copy:**
```typescript
"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

export function CopyButton({ value, disabled }: { value: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    if (disabled || !value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }

  return (
    <button
      aria-label={copied ? "Copiado" : "Copiar resultado"}
      className="copy-button"
      disabled={disabled || !value}
      onClick={copy}
      type="button"
    >
      {copied ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} />}
      <span>{copied ? "Copiado" : "Copiar"}</span>
    </button>
  );
}
```

**Note:** This component can be re-exported from the formula feature directory or copied verbatim. Identical behavior required.

---

### `apps/web/src/features/file-analysis/hooks/use-file-upload.ts` (hook, file-I/O)

**Analog:** `apps/web/src/features/scripts/hooks/use-scripts-stream.ts`

**Hook state initialization + useCallback pattern** (lines 18–42):
```typescript
"use client";

import { useCallback, useState } from "react";

export function useScriptsStream() {
  const [status, setStatus] = useState<ScriptStreamStatus>("idle");
  const [result, setResult] = useState<ScriptGenerateResponse | null>(null);
  const [error, setError] = useState("");

  const submit = useCallback(async (input: SubmitScriptInput) => {
    setStatus("loading");
    setResult(null);
    setError("");
    // ...
  }, []);

  return { status, result, error, submit };
}
```

**HTTP error + quota handling** (lines 43–55):
```typescript
    if (!response.ok) {
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code === "quota_exceeded") {
          setStatus("idle");
          setQuotaBlocked(true);
          return;
        }
      }
      setStatus("error");
      setError("Nao consegui validar a resposta. Ajuste o pedido e tente novamente.");
      return;
    }
```

**Adaptation for use-file-upload.ts:**
- Status type: `"idle" | "uploading" | "complete" | "error"`
- Fetch: `new FormData()` with `formData.append("file", file)` — **do not set `Content-Type` header manually**
- If response returns `{ type: "sheet_selection", sheetNames }`: set status to `"sheet_selection"` (special state, not error)
- If response returns `{ type: "upload_complete", uploadedFileId, schema }`: set status `"complete"`

---

### `apps/web/src/features/file-analysis/hooks/use-file-chat.ts` (hook, streaming)

**Analog:** `apps/web/src/features/scripts/hooks/use-scripts-stream.ts` (full file, lines 1–90)

**NDJSON streaming loop — exact pattern to replicate** (lines 64–87):
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
        const event = scriptStreamEventSchema.parse(JSON.parse(line));
        if (event.type === "metadata") { setMetadata(event.metadata); }
        if (event.type === "delta") { setDraft((current) => `${current}${event.text}`); }
        if (event.type === "quota_warning") { setLastFreeUse(event.lastFreeUse); }
        if (event.type === "complete") {
          setResult(event.payload);
          setStatus("complete");
        }
        if (event.type === "error") { setError(event.message); setStatus("error"); }
      }
    }
```

**Adaptation:**
- Replace `scriptStreamEventSchema` with `chatStreamEventSchema`
- Request body: `JSON.stringify({ uploadedFileId, message })` with header `"content-type": "application/json"`
- Instead of replacing result on each turn, **append** the completed assistant message to a `messages` array state
- `draft` is accumulated per-turn and cleared on next `submit` call

---

### `apps/web/src/server/file-analysis/file-repository.ts` (service, CRUD)

**Analog:** `apps/web/src/server/tools/tool-repository.ts` (full file, lines 1–32)

**Repository structure pattern** (lines 1–32):
```typescript
import { prisma } from "@/server/db/client";

export type GenericToolRequestStatus = "success" | "failure";

export async function recordToolRequest(input: {
  userId: string;
  toolKind: string;
  // ...
}) {
  try {
    return await prisma.toolRequest.create({ data: { ... } });
  } catch {
    console.warn("Tool request persistence skipped.");
    return null;
  }
}
```

**Prisma singleton import pattern** (line 1 of tool-repository.ts):
```typescript
import { prisma } from "@/server/db/client";
```

**db/client globalThis singleton pattern** (full client.ts):
```typescript
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
// ...
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") { globalForPrisma.prisma = prisma; }
```

**Adaptation — add `import "server-only"` at top. Key functions:**
- `findUploadedFileByIdAndUser(id, userId)` — T-04-01-01: always `where: { id, userId }`
- `createUploadedFile(data)` — creates `UploadedFile` row
- `updateLastChatAt(id, userId)` — called on every chat turn
- `getRecentMessages(uploadedFileId, limit = 10)` — order by `createdAt desc`, take 10 (D-08 sliding window)
- `appendChatMessages(uploadedFileId, messages)` — `createMany` for user + assistant pair

---

### `apps/web/src/server/ai/file-chat-stream.ts` (service, streaming)

**Analog:** `apps/web/src/server/ai/formula-stream.ts` (full file, lines 1–99)

**`import "server-only"` + OpenAI client pattern** (lines 1–12):
```typescript
import {
  type FormulaCompletePayload,
  type FormulaStreamEvent,
  formulaCompletePayloadSchema,
} from "@tabelin/shared";
import { getOpenAIModel } from "./openai-client";
```

**`createOpenAIClient()` call pattern** (openai-client.ts lines 9–17):
```typescript
export function createOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for real provider calls.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
```

**ReadableStream NDJSON encoder pattern** (lines 79–99):
```typescript
export function createFormulaEventStream(payload: FormulaCompletePayload, lastFreeUse?: boolean) {
  const encoder = new TextEncoder();
  const events: FormulaStreamEvent[] = [
    { type: "metadata", metadata: payload.metadata },
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

**Adaptation:**
- Add `import "server-only"` at top
- `buildChatMessages(schema, history, userMessage)` constructs OpenAI `messages[]` array with schema in system prompt (see RESEARCH.md Pattern 3)
- Real OpenAI streaming: `openai.chat.completions.create({ stream: true, ... })` — use async iterator to yield `delta` events
- If `OPENAI_API_KEY` is absent, return fixture stream (same deterministic fallback pattern as `resolveFormulaPayload`)

---

### `packages/shared/src/file-analysis/schema.ts` (utility, transform)

**Analog:** `packages/shared/src/scripts/schema.ts` (full file, lines 1–51)

**Zod schema + type export pattern** (lines 1–51):
```typescript
import { z } from "zod";

export const scriptGenerateRequestSchema = z.object({
  scriptType: scriptTypeSchema,
  prompt: z.string().trim().min(3, "Descreva a automacao antes de gerar.")
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
```

**Adaptation — schemas to define (from RESEARCH.md Code Examples):**
```typescript
export const fileSchemaColumnSchema = z.object({
  name: z.string(),
  type: z.enum(["numero", "data", "booleano", "texto"]),
  sampleValues: z.array(z.unknown())
});

export const fileSchemaSchema = z.object({
  columns: z.array(fileSchemaColumnSchema),
  sampleRows: z.array(z.record(z.unknown())),
  rowCount: z.number(),
  sheetName: z.string().optional(),
  fileName: z.string()
});

export const uploadResponseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("sheet_selection"), sheetNames: z.array(z.string()) }),
  z.object({ type: z.literal("upload_complete"), uploadedFileId: z.string(), schema: fileSchemaSchema })
]);

export const chatRequestSchema = z.object({
  uploadedFileId: z.string().cuid(),
  message: z.string().trim().min(1)
});

export const chatStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("quota_warning"), lastFreeUse: z.boolean() }),
  z.object({ type: z.literal("complete"), content: z.string() }),
  z.object({ type: z.literal("error"), message: z.string() })
]);
```

---

### `packages/shared/src/file-analysis/fixtures.ts` (utility, transform)

**Analog:** `packages/shared/src/scripts/fixtures.ts` (full file, lines 1–31)

**Typed fixture array pattern** (lines 1–31):
```typescript
import type { ScriptGenerateResponse } from "./schema";

export const SCRIPT_FIXTURES: ScriptGenerateResponse[] = [
  {
    kind: "script",
    code: 'Sub CopiarDados()...',
    explanation: "Copia o intervalo A:D...",
    assumptions: ["As abas Vendas e Relatorio existem na pasta de trabalho."],
    warnings: [],
    isDestructive: false,
    metadata: { mode: "generate", scriptType: "vba", isDestructive: false, providerModel: "fixture" }
  },
  // ...
];
```

**Adaptation:** Export `FILE_ANALYSIS_FIXTURES` typed as `UploadResponse[]` with deterministic sample schema (2–3 column CSV examples). Used when `OPENAI_API_KEY` is absent.

---

### `prisma/schema.prisma` (model, CRUD — extend existing)

**Analog:** Existing `ToolRequest`, `User`, `BillingCheckout` models in `prisma/schema.prisma`

**Model with userId relation + cascade pattern** (lines 71–88 — ToolRequest):
```prisma
model ToolRequest {
  id              String   @id @default(cuid())
  userId          String
  toolKind        String
  // ...
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([toolKind, mode])
}
```

**Index pattern** — double index: one for user scoped queries, one for time-based cleanup queries.

**New models to add (from RESEARCH.md Pattern 5):**
```prisma
model UploadedFile {
  id           String        @id @default(cuid())
  userId       String
  fileName     String
  fileSize     Int
  mimeType     String
  schema       Json
  rowCount     Int
  lastChatAt   DateTime?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages     ChatMessage[]

  @@index([userId, createdAt])
  @@index([lastChatAt])
}

model ChatMessage {
  id             String       @id @default(cuid())
  uploadedFileId String
  role           String
  content        String       @db.Text
  createdAt      DateTime     @default(now())
  uploadedFile   UploadedFile @relation(fields: [uploadedFileId], references: [id], onDelete: Cascade)

  @@index([uploadedFileId, createdAt])
}
```

Also add `uploadedFiles UploadedFile[]` to the `User` model (lines 10–24 in schema.prisma).

---

### `apps/web/src/components/app/sidebar.tsx` (component — modify existing)

**File to modify:** `apps/web/src/components/app/sidebar.tsx` (full file, lines 1–78)

**The disabled item to activate** (lines 26–27):
```typescript
{ label: "File Analysis", icon: FileText, disabled: true },
```

**Active link pattern to follow** (lines 21–25):
```typescript
{ label: "Formula", icon: FileSpreadsheet, href: "/workspace" },
{ label: "Scripts", icon: Braces, href: "/workspace/scripts" },
```

**Change to make:** Replace `{ label: "File Analysis", icon: FileText, disabled: true }` with `{ label: "File Analysis", icon: FileText, href: "/workspace/file-analysis" }`. No other changes to the file.

---

## Shared Patterns

### Authentication
**Source:** `apps/web/src/app/api/tools/scripts/generate/route.ts` (lines 10–14)
**Apply to:** Both `upload/route.ts` and `chat/route.ts`
```typescript
const user = getSessionFromCookieHeader(request.headers.get("cookie"));
if (!user) {
  return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
}
```

### Quota Reserve/Confirm/Release
**Source:** `apps/web/src/app/api/tools/scripts/generate/route.ts` (lines 22–46) + `apps/web/src/server/usage/quota-service.ts`
**Apply to:** `chat/route.ts` only (upload does not consume quota)
```typescript
const quotaCheck = await reserveToolUse(user.id, "file-chat", "chat");
if (!quotaCheck.allowed) {
  return NextResponse.json({ code: "quota_exceeded", meterKind: quotaCheck.meterKind, cta: "pro_checkout" }, { status: 429 });
}
// ... in try block:
await confirmToolUse(quotaCheck.reservationKey);
// ... in catch block:
await releaseToolUse(quotaCheck.reservationKey);
```

### NDJSON Response Headers
**Source:** `apps/web/src/app/api/tools/scripts/generate/route.ts` (lines 40–43)
**Apply to:** `chat/route.ts`
```typescript
return new Response(stream, {
  headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" }
});
```

### Prisma Singleton
**Source:** `apps/web/src/server/db/client.ts` (full file)
**Apply to:** `file-repository.ts`, `cleanup-job.ts`
```typescript
import { prisma } from "@/server/db/client";
```

### Server-Only Guard
**Source:** `apps/web/src/server/ai/openai-client.ts` (line 1)
**Apply to:** `file-parser.ts`, `file-repository.ts`, `file-chat-stream.ts`, `cleanup-job.ts`
```typescript
import "server-only";
```

### IDOR Guard Pattern (new — required by T-04-01-01)
**Source:** Security threat T-04-01-01 from RESEARCH.md
**Apply to:** `chat/route.ts`, all Prisma queries in `file-repository.ts`
```typescript
// Never query by id alone — always scope to authenticated userId
prisma.uploadedFile.findFirst({ where: { id, userId } })
```

### Error Response Format
**Source:** `apps/web/src/app/api/tools/scripts/generate/route.ts` (lines 44–46)
**Apply to:** All new route handlers
```typescript
return NextResponse.json({ error: "Nao consegui processar a mensagem." }, { status: 502 });
```

### CopyButton Re-use
**Source:** `apps/web/src/features/formula/components/copy-button.tsx`
**Apply to:** `chat-message.tsx` (per-message copy), `chat-panel.tsx` (copy last assistant message)
```typescript
import { CopyButton } from "@/features/formula/components/copy-button";
// or copy verbatim to features/file-analysis/components/copy-button.tsx
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `apps/web/src/server/file-analysis/cleanup-job.ts` | service | batch | No existing cron/background job in codebase. Use RESEARCH.md Pattern 4 (`node-cron` + `globalThis` guard). |
| `apps/web/src/instrumentation.ts` | config | event-driven | No `instrumentation.ts` exists in the project. Use RESEARCH.md Pattern 4 (Next.js `register()` hook). |

**For cleanup-job.ts — use RESEARCH.md Pattern 4 directly:**
```typescript
import "server-only";
import cron from "node-cron";
import { prisma } from "@/server/db/client";

export function startCleanupJob() {
  const g = globalThis as typeof globalThis & { _cleanupJobStarted?: boolean };
  if (g._cleanupJobStarted) return;  // Pitfall 4: prevent duplicate jobs on hot reload
  g._cleanupJobStarted = true;
  cron.schedule("*/15 * * * *", async () => {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.uploadedFile.deleteMany({
      where: { OR: [{ lastChatAt: { lt: cutoff } }, { lastChatAt: null, createdAt: { lt: cutoff } }] }
    });
  });
}
```

**For instrumentation.ts — use RESEARCH.md Pattern 4 directly:**
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCleanupJob } = await import("./server/file-analysis/cleanup-job");
    startCleanupJob();
  }
}
```

---

## Metadata

**Analog search scope:** `apps/web/src/`, `packages/shared/src/`, `prisma/`
**Files scanned:** 18 source files read
**Pattern extraction date:** 2026-05-26

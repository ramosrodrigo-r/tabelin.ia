# Phase 12: Intent Classifier & Unified Route — Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 14 (9 new, 5 modified)
**Analogs found:** 14 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/web/src/app/api/chat/unified/route.ts` | route-handler | request-response | `apps/web/src/app/api/tools/formula/generate/route.ts` | exact |
| `apps/web/src/server/ai/intent-classifier.ts` | service (AI) | request-response | `apps/web/src/server/ai/destructive-classifier.ts` + `formula-stream.ts` | role-match |
| `packages/shared/src/unified-chat/schema.ts` | schema/model | transform | `packages/shared/src/formula/schema.ts` | exact |
| `packages/shared/src/index.ts` (modify) | config | — | itself | exact |
| `apps/web/src/features/unified-chat/unified-chat-tool.tsx` | component (tool root) | request-response | `apps/web/src/features/formula/formula-tool.tsx` | exact |
| `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts` | hook | streaming | `apps/web/src/features/formula/hooks/use-formula-stream.ts` | exact |
| `apps/web/src/features/unified-chat/components/intent-pill.tsx` | component (UI) | event-driven | `apps/web/src/components/app/tool-nav.tsx` (`.tool-pill` pattern) | role-match |
| `apps/web/src/features/unified-chat/components/session-context-selector.tsx` | component (UI) | event-driven | `apps/web/src/features/formula/components/formula-input-panel.tsx` (mode/lang tabs pattern) | role-match |
| `apps/web/src/features/unified-chat/components/render-dispatcher.tsx` | component (UI) | transform | `apps/web/src/features/formula/components/formula-output-panel.tsx` | role-match |
| `apps/web/src/features/unified-chat/components/table-intent-stub.tsx` | component (UI) | — | `apps/web/src/features/formula/components/formula-output-panel.tsx` (error-block sub-pattern) | partial |
| `apps/web/src/app/(workspace)/workspace/page.tsx` (modify) | route (page) | — | itself | exact |
| `apps/web/src/components/app/topbar.tsx` (modify) | component | event-driven | itself | exact |
| `apps/web/src/app/api/conversations/[tool]/route.ts` (modify) | route-handler | CRUD | itself | exact |
| `apps/web/src/server/ai/context-messages.ts` (modify) | service (AI) | transform | itself | exact |

---

## Pattern Assignments

### `apps/web/src/app/api/chat/unified/route.ts` (route-handler, request-response)

**Analog:** `apps/web/src/app/api/tools/formula/generate/route.ts`

**Imports pattern** (lines 1-13):
```typescript
import { NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { getUserEntitlement } from "@/server/billing/entitlements";
import { extractContent } from "@/server/extraction/dispatcher";
import { findConversationExchanges, saveConversationExchange } from "@/server/tools/conversation-repository";
import { reserveToolUse, confirmToolUse, releaseToolUse } from "@/server/usage/quota-service";
// NEW: unified-specific imports
import { classifyIntent } from "@/server/ai/intent-classifier";
import { resolveFormulaPayload, createFormulaEventStream } from "@/server/ai/formula-stream";
// ... other resolve* imports
```

**Auth pattern** (lines 14-19):
```typescript
export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }
```

**Multipart/JSON body parse pattern** (lines 21-39):
```typescript
const contentType = request.headers.get("content-type") ?? "";
let body: unknown;
let file: File | null = null;

if (contentType.includes("multipart/form-data")) {
  const formData = await request.formData();
  body = {
    prompt: formData.get("prompt"),
    platform: formData.get("platform"),
    formulaLanguage: formData.get("formulaLanguage")
  };
  const rawFile = formData.get("file");
  file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;
} else {
  body = await request.json().catch(() => null);
}
```

**Pro-gate before quota** (lines 48-59 — MUST be in this order):
```typescript
const hasFile = contentType.includes("multipart/form-data") && file !== null;
if (hasFile) {
  const entitlement = await getUserEntitlement(user.id);
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";
  if (!isPro) {
    return NextResponse.json(
      { code: "pro_required", feature: "attachment", cta: "pro_checkout" },
      { status: 403 }
    );
  }
}
```

**Quota reserve** (lines 61-72):
```typescript
const quotaCheck = await reserveToolUse(user.id, "formula", "generate");
if (!quotaCheck.allowed) {
  return NextResponse.json(
    { code: "quota_exceeded", meterKind: quotaCheck.meterKind, cta: "pro_checkout" },
    { status: 429 }
  );
}
```

**File extraction in try block** (lines 74-89):
```typescript
try {
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
```

**Confirm → record → save order** (lines 100-116 — MUST preserve this order):
```typescript
await confirmToolUse(quotaCheck.reservationKey);
await recordFormulaToolRequest({ userId: user.id, metadata: payload.metadata, status: "success", latencyMs: ... });
await saveConversationExchange({
  userId: user.id,
  toolKind: "formula",       // <-- unified route uses resolvedToolKind here
  mode: "generate",
  platform: parsed.data.platform,
  dialect: parsed.data.formulaLanguage,
  userPrompt: parsed.data.prompt,
  assistantPayload: payload,
  attachmentContext
});
```

**NDJSON stream response** (lines 129-134):
```typescript
return new Response(createFormulaEventStream(payload, quotaCheck.lastFreeUse, attachmentMeta), {
  headers: {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-store"
  }
});
```

**Error catch** (lines 135-139):
```typescript
} catch (err) {
  console.error("tool generate failed", { toolKind: "formula", err });
  await releaseToolUse(quotaCheck.reservationKey);
  return NextResponse.json({ error: "Nao consegui validar a resposta." }, { status: 502 });
}
```

**Unified-specific additions** (not in analog — new for Phase 12):
- Parse `overrideIntent` from body/formData
- Call `classifyIntent(prompt, hasFile, lastIntent, overrideIntent)` AFTER file extraction but BEFORE `findConversationExchanges`
- Emit `{ type: "intent_detected", intent, confidence }` as the FIRST NDJSON event before any `metadata` or `delta`
- For `file_analysis`/`ocr` without file: stream `needs_file` event, call `releaseToolUse`, return — do NOT confirm quota
- For `tabela`: stream stub events, confirmToolUse, save with `toolKind: "unified_table"`
- `INTENT_TO_TOOL_KIND` map (server-side, canonical): `{ formula:"formula", sql:"sql", regex:"regex", script:"script", template:"template", file_analysis:"file_analysis", ocr:"ocr", tabela:"unified_table", unknown:"formula" }`

---

### `apps/web/src/server/ai/intent-classifier.ts` (service, request-response)

**Analog:** `apps/web/src/server/ai/openai-client.ts` + `destructive-classifier.ts` + `formula-stream.ts` (fixture mode pattern)

**Imports + server-only guard** (lines 1-4 of analog `openai-client.ts`):
```typescript
import "server-only";
import OpenAI from "openai";

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-5-mini";
}

export function createOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for real provider calls.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
```

**Fixture mode pattern** (lines 50-76 of `formula-stream.ts`):
```typescript
if (!process.env.OPENAI_API_KEY) {
  // Return deterministic fixture — no OpenAI call
  const prompt = input.request.prompt.toLowerCase();
  const formula = input.request.formulaLanguage === "pt-BR" ? ... : ...;
  return formulaCompletePayloadSchema.parse({ kind: "formula", formula, ... });
}
```

**Real provider call pattern** (lines 80-98 of `formula-stream.ts`):
```typescript
const { default: OpenAI } = await import("openai");
const client = new OpenAI();
const completion = await client.chat.completions.create({
  model: getOpenAIModel(),
  messages: buildToolContextMessages(...),
  response_format: { type: "json_object" }
});
const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
```

**Classifier-specific pattern** — use `zodResponseFormat` + `.parse()` instead of `.create()`:
```typescript
// Import from sub-path, NOT from "openai" barrel:
import { zodResponseFormat } from "openai/helpers/zod";

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
```

**Override short-circuit** (new pattern — no analog, trivial):
```typescript
if (overrideIntent) {
  return intentClassificationSchema.parse({ intent: overrideIntent, confidence: "high" });
}
```

---

### `packages/shared/src/unified-chat/schema.ts` (schema/model, transform)

**Analog:** `packages/shared/src/formula/schema.ts`

**Schema structure pattern** (lines 1-82 of `formula/schema.ts`):
```typescript
import { z } from "zod";

// 1. Request schema with .safeParse validation
export const formulaGenerateRequestSchema = formulaRequestBaseSchema
  .extend({ prompt: z.string().trim().min(3, "...") });

// 2. Response / payload schema
export const formulaCompletePayloadSchema = z.discriminatedUnion("kind", [...]);

// 3. Event stream schema — discriminatedUnion on "type"
export const formulaStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("metadata"), metadata: formulaMetadataSchema }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("complete"), payload: formulaCompletePayloadSchema }),
  z.object({ type: z.literal("error"), message: z.string() })
]);

// 4. Inferred types
export type FormulaStreamEvent = z.infer<typeof formulaStreamEventSchema>;
```

**New events for unified schema** (extend the formula pattern with two new event types):
```typescript
// intent_detected — emitted FIRST, before metadata/delta
z.object({ type: z.literal("intent_detected"), intent: z.string(), confidence: z.string() }),
// needs_file — emitted when file-dependent intent has no file (D-05)
z.object({ type: z.literal("needs_file"), intent: z.string() }),
```

**Table stub payload schema** (new — no analog):
```typescript
export const tableStubPayloadSchema = z.object({
  kind: z.literal("table_stub"),
  originalPrompt: z.string(),
  message: z.string()
});
```

---

### `packages/shared/src/index.ts` (modify — add export)

**Analog:** itself (lines 1-20)

**Pattern:** Every new schema subdir gets a barrel export line added with a comment:
```typescript
// Fase 12: unified chat
export * from "./unified-chat/schema";
```

---

### `apps/web/src/features/unified-chat/unified-chat-tool.tsx` (component, request-response)

**Analog:** `apps/web/src/features/formula/formula-tool.tsx`

**Client component + imports pattern** (lines 1-17):
```typescript
"use client";
import type { UserEntitlement } from "@tabelin/shared";
import { useCallback, useState } from "react";
import { useRegisterNewConversation } from "@/components/app/workspace-conversation-context";
import { validateFile } from "@/components/app/attachment-button";
// ... feature-specific imports
```

**Props + initial exchanges seed** (lines 39-66):
```typescript
export function FormulaTool({
  entitlement,
  initialExchanges = [],
}: {
  entitlement: UserEntitlement;
  initialExchanges?: PersistedExchange[];
}) {
  const lastEx = initialExchanges[initialExchanges.length - 1];
  // ... restore selectors from last exchange
  const [exchanges, setExchanges] = useState<FormulaExchange[]>(() =>
    initialExchanges.map((ex) => ({
      id: ex.id,
      userText: ex.userPrompt,
      status: "complete" as const,
      result: (ex.assistantPayload as FormulaCompletePayload) ?? null,
      // ...
    }))
  );
```

**New conversation callback + context registration** (lines 94-100):
```typescript
const handleNewConversation = useCallback(() => {
  setExchanges([]);
  setSubmittedText("");
}, []);
useRegisterNewConversation(handleNewConversation);
```

**Exchange accumulation pattern** (lines 116-129):
```typescript
if (submittedText && (stream.status === "complete" || stream.status === "error")) {
  setExchanges((prev) => [
    ...prev,
    {
      id: crypto.randomUUID(),
      userText: submittedText,
      status: stream.status as "complete" | "error",
      result: stream.result,
      // ...
    },
  ]);
}
```

**Chat-thread render** (lines 166-198):
```typescript
{(exchanges.length > 0 || (submittedText && stream.status !== "idle")) ? (
  <div className="chat-thread">
    {exchanges.map((ex) => (
      <div key={ex.id} className="chat-exchange">
        <div className="user-bubble">{ex.userText}</div>
        <FormulaOutputPanel status={ex.status} ... />
      </div>
    ))}
    {submittedText && stream.status !== "idle" ? (
      <div className="chat-exchange">
        <div className="user-bubble">{submittedText}</div>
        <FormulaOutputPanel status={stream.status} ... />
      </div>
    ) : null}
  </div>
) : null}
```

**Unified-specific additions** (not in analog):
- Each `chat-exchange` begins with `<IntentPill intent={ex.intent} onOverride={...} />`
- `<RenderDispatcher payload={ex.result} />` replaces the single `<FormulaOutputPanel>`
- `<SessionContextSelector>` placed in topbar actions (passed as prop or via context)
- `stream.intent` / `stream.confidence` states displayed in live exchange
- `submit()` accepts `overrideIntent?` param and re-passes to hook
- Empty state heading: "O que você quer resolver hoje?"

---

### `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts` (hook, streaming)

**Analog:** `apps/web/src/features/formula/hooks/use-formula-stream.ts` (full file, lines 1-215)

**State declarations pattern** (lines 24-38):
```typescript
const [status, setStatus] = useState<FormulaStreamStatus>("idle");
const [draft, setDraft] = useState("");
const [result, setResult] = useState<FormulaCompletePayload | null>(null);
const [metadata, setMetadata] = useState<FormulaMetadata | null>(null);
const [warnings, setWarnings] = useState<string[]>([]);
const [error, setError] = useState("");
const [quotaBlocked, setQuotaBlocked] = useState(false);
const [lastFreeUse, setLastFreeUse] = useState(false);
const [attachmentStatus, setAttachmentStatus] = useState<"uploading" | "extracting" | null>(null);
```

**Body construction pattern — FormData vs JSON** (lines 57-75):
```typescript
if (hasAttachment && input.file) {
  setAttachmentStatus("uploading");
  const fd = new FormData();
  fd.append("prompt", input.text);
  fd.append("platform", input.platform);
  // ... other fields
  fd.append("file", input.file);
  body = fd;
  // NÃO setar Content-Type — browser define boundary automaticamente
} else {
  body = JSON.stringify({ platform: ..., prompt: ... });
  headers = { "content-type": "application/json" };
}
```

**HTTP error handling pattern** (lines 79-115):
```typescript
if (!response.ok) {
  if (response.status === 403) { ... setError("Recurso exclusivo Pro..."); return; }
  if (response.status === 429) { ... setQuotaBlocked(true); return; }
  if (response.status === 422 || response.status === 413) { ... setError(errorData.message || "..."); return; }
  setStatus("error");
  setError("Nao consegui validar a resposta...");
  return;
}
```

**NDJSON reader loop** (lines 129-198):
```typescript
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
    let event;
    try {
      event = formulaStreamEventSchema.parse(JSON.parse(line));
    } catch {
      setStatus("error");
      setError("Resposta corrompida. Tente novamente.");
      return;
    }
    // dispatch on event.type...
    if (event.type === "complete") { setResult(event.payload); setStatus("complete"); }
    if (event.type === "error") { setError(event.message); setStatus("error"); }
  }
}
```

**Unified-specific additions** (new states + new event handlers):
```typescript
// Additional state
const [intent, setIntent] = useState<string | null>(null);
const [confidence, setConfidence] = useState<string | null>(null);
const [needsFile, setNeedsFile] = useState(false);

// New event handlers in NDJSON loop
if (event.type === "intent_detected") {
  setIntent(event.intent);
  setConfidence(event.confidence);
}
if (event.type === "needs_file") {
  setNeedsFile(true);
  setStatus("complete"); // or a dedicated "needs_file" terminal state
}
// use unifiedStreamEventSchema.parse() instead of formulaStreamEventSchema.parse()
```

---

### `apps/web/src/features/unified-chat/components/intent-pill.tsx` (component, event-driven)

**Analog:** `apps/web/src/components/app/tool-nav.tsx` (`.tool-pill` CSS class pattern)

**CSS class pattern** (lines 36-49 of `tool-nav.tsx`):
```typescript
<Link
  key={href}
  href={href}
  className="tool-pill"
  data-active={isActive}
  aria-current={isActive ? "page" : undefined}
>
  <Icon size={13} aria-hidden />
  {label}
</Link>
```

**Popover/dropdown pattern** — from `topbar.tsx` `.account-menu-container` (lines 107-146):
```typescript
<div className="account-menu-container" ref={containerRef}>
  <button
    ref={triggerRef}
    className="ghost-button"   // or "tool-pill" for pill appearance
    type="button"
    onClick={() => setShowMenu(!showMenu)}
    aria-expanded={showMenu}
    aria-haspopup="listbox"
  >
    <Icon size={13} aria-hidden />
    {label}
    <ChevronDown size={12} aria-hidden />
  </button>
  {showMenu ? (
    <div className="account-menu" role="listbox" aria-label="Mudar o tipo de resposta">
      {/* menu items */}
    </div>
  ) : null}
</div>
```

**Escape + outside-click close pattern** (lines 67-94 of `topbar.tsx`):
```typescript
useEffect(() => {
  if (!showMenu) return;
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") { setShowMenu(false); triggerRef.current?.focus(); }
  }
  function handleMouseDown(e: MouseEvent) {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setShowMenu(false);
    }
  }
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("mousedown", handleMouseDown);
  return () => {
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("mousedown", handleMouseDown);
  };
}, [showMenu]);
```

**Intent label map** (UI-SPEC.md — no analog, new):
```typescript
const INTENT_LABELS: Record<string, { label: string; Icon: LucideIcon }> = {
  formula:       { label: "Fórmula",  Icon: FileSpreadsheet },
  sql:           { label: "SQL",      Icon: ScrollText },
  regex:         { label: "Regex",    Icon: Regex },
  script:        { label: "Script",   Icon: Braces },
  file_analysis: { label: "Análise",  Icon: FileText },
  ocr:           { label: "OCR",      Icon: Image },
  tabela:        { label: "Tabela",   Icon: LayoutTemplate },
};
```

---

### `apps/web/src/features/unified-chat/components/session-context-selector.tsx` (component, event-driven)

**Analog:** `apps/web/src/features/formula/components/formula-input-panel.tsx` (mode/language/platform segmented controls)

The formula input panel uses `ChatInput` with `options` slot for its inline selectors. The `SessionContextSelector` is a topbar-level variant — same tokens, same 28px-tall `.chat-mode-tab` / `.chat-compact-select` CSS classes.

**Props contract** (new — no direct analog):
```typescript
export function SessionContextSelector({
  platform, onPlatformChange,      // "excel" | "sheets"
  dialect, onDialectChange,        // "pt-BR" | "en"
  sqlDialect, onSqlDialectChange,  // "postgresql" | "mysql" | "sqlserver"
  separator, onSeparatorChange,    // ";" | ","
}: SessionContextSelectorProps)
```

**CSS classes to reuse** (from `globals.css` — confirmed by UI-SPEC.md):
- `.chat-mode-tabs` + `.chat-mode-tab` + `aria-selected` for segmented toggles
- `.chat-compact-select` for dropdown selects
- Both must be 28px tall minimum, 12px text

---

### `apps/web/src/features/unified-chat/components/render-dispatcher.tsx` (component, transform)

**Analog:** `apps/web/src/features/formula/components/formula-output-panel.tsx`

**assistant-card wrapper** (lines 37-38):
```typescript
<div className="assistant-card" aria-label="Resposta">
  {/* all output content goes inside here */}
```

**output-box with data-status** (lines 53-79):
```typescript
<div className="output-box" data-status={status}>
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

**Dispatch logic** (new — wraps existing output panels):
```typescript
switch (payload?.kind) {
  case "formula":
  case "explanation":
    return <FormulaOutputPanel ... />;
  case "sql":
    return <SqlOutputPanel ... />;
  case "regex_generate":
    return <RegexOutputPanel ... />;
  case "script":
    return <ScriptsOutputPanel ... />;
  case "template":
    return <TemplateOutputPanel ... />;
  case "table_stub":
    return <TableIntentStub originalPrompt={payload.originalPrompt} message={payload.message} />;
  default:
    // streaming state (no payload yet) — show draft
    return <div className="output-box" data-status="streaming"><pre>{draft}</pre></div>;
}
```

---

### `apps/web/src/features/unified-chat/components/table-intent-stub.tsx` (component, no data flow)

**Analog:** error-block sub-pattern in `formula-output-panel.tsx` (lines 72-79) + `.placeholder-box` CSS class (UI-SPEC.md)

**Pattern** — render inside `.assistant-card` using `.placeholder-box` (not `.output-box`):
```typescript
// UI-SPEC.md: table_stub → .placeholder-box (dashed --border, #fbfcfd bg, --muted text)
// to distinguish from a real answer card
<div className="assistant-card" aria-label="Resposta">
  <div className="placeholder-box">
    <p style={{ fontWeight: 650, marginBottom: 4 }}>Tabela a caminho.</p>
    <p>Entendi que você quer uma tabela. A geração da tabela interativa chega em breve —
       por enquanto registrei seu pedido neste histórico.</p>
  </div>
</div>
```

---

### `apps/web/src/app/(workspace)/workspace/page.tsx` (modify)

**Analog:** itself (lines 1-12)

**Before:**
```typescript
import { FormulaTool } from "@/features/formula/formula-tool";
// ...
const initialExchanges = await findConversationExchanges(user!.id, "formula");
return <FormulaTool entitlement={entitlement} initialExchanges={initialExchanges} />;
```

**After Phase 12:**
```typescript
import { UnifiedChatTool } from "@/features/unified-chat/unified-chat-tool";
// ...
// Load exchanges for all text toolKinds to seed thread (or load lazily in component)
// Simplest: no initial exchanges for unified (load per-toolKind after classification)
return <UnifiedChatTool entitlement={entitlement} />;
```

---

### `apps/web/src/components/app/topbar.tsx` (modify)

**Analog:** itself

**Before** (line 23):
```typescript
if (/\/workspace\/?$/.test(pathname)) return "formula";
```

**After Phase 12** (line 23):
```typescript
if (/\/workspace\/?$/.test(pathname)) return "unified";
```

**Confirmation copy change** (line 125):
```typescript
// Before:
"Apagar o histórico deste tool? Esta ação não pode ser desfeita."
// After (UI-SPEC.md):
"Apagar todo o histórico do chat unificado? Esta ação não pode ser desfeita."
```

**`handleDeleteHistory`** will call `DELETE /api/conversations/unified` when `toolKind === "unified"`. The `fetch` call on line 61 already uses `toolKind` dynamically — no structural change needed beyond the `useWorkspaceToolKind()` return value.

---

### `apps/web/src/app/api/conversations/[tool]/route.ts` (modify)

**Analog:** itself (lines 1-36)

**Before** (line 6):
```typescript
const VALID_TOOL_KINDS = ["formula", "sql", "regex", "script", "template"] as const;
```

**After Phase 12** (line 6):
```typescript
const VALID_TOOL_KINDS = ["formula", "sql", "regex", "script", "template", "unified_table"] as const;
```

**New unified delete route** — create `apps/web/src/app/api/conversations/unified/route.ts` as a sibling (or handle in `[tool]` with special case). The RESEARCH.md recommends a dedicated sibling route that iterates all toolKinds:
```typescript
// apps/web/src/app/api/conversations/unified/route.ts
// Copies auth pattern from [tool]/route.ts exactly; adds loop over ALL_TOOL_KINDS
const ALL_TOOL_KINDS = ["formula", "sql", "regex", "script", "template", "unified_table"] as const;

export async function DELETE(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  try {
    await Promise.all(ALL_TOOL_KINDS.map(kind => deleteConversationExchanges(user.id, kind)));
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
```

---

### `apps/web/src/server/ai/context-messages.ts` (modify — add `table_stub` case)

**Analog:** itself (lines 80-120)

**Before** (lines 116-119):
```typescript
    default:
      // Kind desconhecido — pular sem throw (D-09 / T-08-03)
      return null;
```

**After Phase 12** — add case before `default`:
```typescript
    case "table_stub": {
      const msg = typeof p.message === "string" ? p.message.trim() : "";
      const prompt = typeof p.originalPrompt === "string" ? p.originalPrompt.trim() : "";
      if (!msg) return null;
      return `[Resposta anterior - tabela solicitada]\n${prompt}\n\n${msg}`;
    }
```

---

## Shared Patterns

### Authentication
**Source:** `apps/web/src/app/api/tools/formula/generate/route.ts` lines 15-19
**Apply to:** `route.ts` (unified), `conversations/unified/route.ts`
```typescript
const user = getSessionFromCookieHeader(request.headers.get("cookie"));
if (!user) {
  return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
}
```

### Quota reserve/confirm/release order
**Source:** `apps/web/src/app/api/tools/formula/generate/route.ts` lines 48-116
**Apply to:** `route.ts` (unified)
**Order is strict:** (1) pro-gate if hasFile, (2) reserveToolUse, (3) try { ... extractContent ... resolvePayload ... confirmToolUse ... saveConversationExchange }, (4) catch { releaseToolUse }

### NDJSON stream response headers
**Source:** `apps/web/src/app/api/tools/formula/generate/route.ts` lines 129-134
**Apply to:** `route.ts` (unified)
```typescript
{ "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" }
```

### Event stream construction
**Source:** `apps/web/src/server/ai/formula-stream.ts` lines 118-143
**Apply to:** unified event stream factory in `route.ts` or a new `unified-stream.ts`
```typescript
return new ReadableStream<Uint8Array>({
  async start(controller) {
    for (const event of events) {
      controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    controller.close();
  }
});
```
New: emit `{ type: "intent_detected", intent, confidence }` as `events[0]` before any metadata.

### Fixture mode guard
**Source:** `apps/web/src/server/ai/formula-stream.ts` lines 50-76
**Apply to:** `intent-classifier.ts`, `route.ts` (unified)
```typescript
if (!process.env.OPENAI_API_KEY) {
  // return deterministic fixture — no OpenAI call
}
```

### `discriminatedUnion("type", [...])` for event schemas
**Source:** `packages/shared/src/formula/schema.ts` lines 65-73
**Apply to:** `packages/shared/src/unified-chat/schema.ts`

### NDJSON parse loop with Zod validation
**Source:** `apps/web/src/features/formula/hooks/use-formula-stream.ts` lines 129-198
**Apply to:** `use-unified-chat-stream.ts`
Replace `formulaStreamEventSchema` with `unifiedStreamEventSchema`.

### `.tool-pill` CSS class pattern
**Source:** `apps/web/src/components/app/tool-nav.tsx` lines 36-49
**Apply to:** `intent-pill.tsx` (resting and active states)
- Resting: `className="tool-pill"` (no `data-active`)
- Active/overridden: `data-active="true"` on the same element

### `.account-menu` popover pattern
**Source:** `apps/web/src/components/app/topbar.tsx` lines 107-146, 67-94
**Apply to:** `intent-pill.tsx` (override dropdown), `session-context-selector.tsx` if any dropdowns needed

### `.assistant-card` output card wrapper
**Source:** `apps/web/src/features/formula/components/formula-output-panel.tsx` line 37
**Apply to:** `render-dispatcher.tsx`, `table-intent-stub.tsx`
All assistant output must sit inside `<div className="assistant-card">`.

### `.output-box` with `data-status`
**Source:** `apps/web/src/features/formula/components/formula-output-panel.tsx` lines 53-79
**Apply to:** `render-dispatcher.tsx` streaming state

### `useRegisterNewConversation` + `useCallback`
**Source:** `apps/web/src/features/formula/formula-tool.tsx` lines 94-100
**Apply to:** `unified-chat-tool.tsx`

---

## Test Patterns

### API route test
**Source:** `apps/web/tests/formula-api.test.ts`

**Setup pattern** (lines 1-44):
```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, createSessionUser } from "@/server/auth/session";
import { POST as generatePost } from "@/app/api/tools/formula/generate/route";

const quotaMocks = vi.hoisted(() => ({
  reserveToolUse: vi.fn(),
  confirmToolUse: vi.fn(),
  releaseToolUse: vi.fn()
}));
vi.mock("@/server/usage/quota-service", () => quotaMocks);

async function readEvents(response: Response) {
  const text = await response.text();
  return text.trim().split("\n").filter(Boolean)
    .map((line) => JSON.parse(line) as { type: string; payload?: unknown });
}

function authedRequest(path: string, body: unknown) {
  const token = createSessionToken(createSessionUser("ana@empresa.com", "Ana"));
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `tabelin_session=${token}` },
    body: JSON.stringify(body)
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  quotaMocks.reserveToolUse.mockResolvedValue({ allowed: true, reservationKey: "res_123" });
  quotaMocks.confirmToolUse.mockResolvedValue({ confirmed: true });
  quotaMocks.releaseToolUse.mockResolvedValue({ released: true });
});
```

**NDJSON event assertion pattern** (lines 63-81):
```typescript
const events = await readEvents(response);
expect(response.status).toBe(200);
expect(events[0]).toMatchObject({ type: "metadata" });
expect(events.at(-1)).toMatchObject({ type: "complete", payload: { kind: "formula" } });
```
For unified route: `expect(events[0]).toMatchObject({ type: "intent_detected" })` (FIRST event).

### UI component test
**Source:** `apps/web/tests/topbar.test.tsx`

**Pattern** (lines 1-16):
```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/workspace",
}));
```

---

## No Analog Found

No files in Phase 12 are entirely without analog — all have at least a partial match. Files with partial match only:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `table-intent-stub.tsx` | component | — | Stub/placeholder concept exists in CSS (`.placeholder-box`) but no component analog in the feature tree |
| `session-context-selector.tsx` | component | event-driven | Segmented controls exist in `formula-input-panel.tsx` but not as a standalone topbar-level component |

---

## Metadata

**Analog search scope:** `apps/web/src/`, `packages/shared/src/`, `apps/web/tests/`
**Files scanned:** 27 source files + 3 test files
**Pattern extraction date:** 2026-06-08

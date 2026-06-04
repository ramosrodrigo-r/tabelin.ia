# Phase 11: Attachment UI & Pro Gating — Pattern Map

**Mapeado:** 2026-06-04
**Arquivos analisados:** 22 (novos/modificados)
**Analogs encontrados:** 22 / 22

---

## File Classification

| Arquivo novo/modificado | Role | Data Flow | Analog mais próximo | Qualidade |
|-------------------------|------|-----------|---------------------|-----------|
| `apps/web/src/components/app/attachment-button.tsx` | component | request-response | `apps/web/src/features/formula/components/copy-button.tsx` | role-match |
| `apps/web/src/components/app/attachment-chip.tsx` | component | request-response | `apps/web/src/styles/globals.css` (`.metadata-row span`, `.pro-badge`) | partial |
| `apps/web/src/components/app/attachment-panel.tsx` | component | request-response | `apps/web/src/features/formula/components/formula-output-panel.tsx` (`.note-block`) | role-match |
| `apps/web/src/components/app/privacy-notice.tsx` | component | request-response | `apps/web/src/features/formula/components/formula-output-panel.tsx` (`.note-block.warning`) | partial |
| `apps/web/src/features/formula/formula-tool.tsx` *(modificar)* | component | CRUD | si mesmo (canonical) | exact |
| `apps/web/src/features/formula/components/formula-input-panel.tsx` *(modificar)* | component | request-response | si mesmo (canonical) | exact |
| `apps/web/src/features/formula/components/formula-output-panel.tsx` *(modificar)* | component | request-response | si mesmo (canonical) | exact |
| `apps/web/src/features/formula/hooks/use-formula-stream.ts` *(modificar)* | hook | streaming | si mesmo (canonical) | exact |
| `apps/web/src/features/sql/sql-tool.tsx` *(modificar)* | component | CRUD | `apps/web/src/features/formula/formula-tool.tsx` | exact |
| `apps/web/src/features/sql/components/sql-input-panel.tsx` *(modificar)* | component | request-response | `apps/web/src/features/formula/components/formula-input-panel.tsx` | exact |
| `apps/web/src/features/sql/components/sql-output-panel.tsx` *(modificar)* | component | request-response | `apps/web/src/features/formula/components/formula-output-panel.tsx` | exact |
| `apps/web/src/features/sql/hooks/use-sql-stream.ts` *(modificar)* | hook | streaming | `apps/web/src/features/formula/hooks/use-formula-stream.ts` | exact |
| `apps/web/src/features/regex/regex-tool.tsx` *(modificar)* | component | CRUD | `apps/web/src/features/formula/formula-tool.tsx` | exact |
| `apps/web/src/features/regex/components/regex-input-panel.tsx` *(modificar)* | component | request-response | `apps/web/src/features/formula/components/formula-input-panel.tsx` | exact |
| `apps/web/src/features/regex/components/regex-output-panel.tsx` *(modificar)* | component | request-response | `apps/web/src/features/formula/components/formula-output-panel.tsx` | exact |
| `apps/web/src/features/regex/hooks/use-regex-stream.ts` *(modificar)* | hook | streaming | `apps/web/src/features/formula/hooks/use-formula-stream.ts` | exact |
| `apps/web/src/features/scripts/scripts-tool.tsx` *(modificar)* | component | CRUD | `apps/web/src/features/formula/formula-tool.tsx` | exact |
| `apps/web/src/features/template/template-tool.tsx` *(modificar)* | component | CRUD | `apps/web/src/features/formula/formula-tool.tsx` | exact |
| `apps/web/src/features/template/components/template-input-panel.tsx` *(modificar)* | component | request-response | `apps/web/src/features/template/components/template-input-panel.tsx` (canonical proBlocked) | exact |
| `apps/web/src/server/ai/formula-stream.ts` *(modificar)* | service | streaming | si mesmo (canonical backend) | exact |
| `packages/shared/src/formula/schema.ts` *(modificar)* | model | transform | si mesmo (canonical schema) | exact |
| `apps/web/tests/formula-ui.test.tsx` *(corrigir + estender)* | test | request-response | si mesmo (canonical test) | exact |

---

## Tool Canônico: Formula

Os 5 tools (Formula, SQL, Regex, Scripts, Template) seguem estrutura idêntica. **Formula é o canônico.** Para os outros 4, o planner replica as mesmas alterações, substituindo o prefixo `formula`/`Formula` pelo prefixo do tool correspondente. As exceções específicas de cada tool estão documentadas na seção "Variações por tool".

---

## Pattern Assignments

### `apps/web/src/features/formula/formula-tool.tsx` — CANONICAL ORCHESTRATOR

**Analog:** si mesmo (linha base para os 5 tools)

**State atual** (linhas 47–66):
```typescript
const [mode, setMode] = useState<FormulaMode>(...);
const [platform, setPlatform] = useState<FormulaPlatform>(...);
const [formulaLanguage, setFormulaLanguage] = useState<FormulaLanguage>(...);
const [text, setText] = useState("");
const [validationError, setValidationError] = useState("");
const [exchanges, setExchanges] = useState<FormulaExchange[]>(...);
const [submittedText, setSubmittedText] = useState("");
const stream = useFormulaStream();
const pending = stream.status === "loading" || stream.status === "streaming";
const isPro = entitlement.plan === "pro" && entitlement.status === "active";
```

**Novos states a adicionar** (após linha 66, antes do `handleNewConversation`):
```typescript
const [pendingFile, setPendingFile] = useState<File | null>(null);
const [fileError, setFileError] = useState<string | null>(null);
const [dragOver, setDragOver] = useState(false);
```

**Função `submit` atual** (linhas 78–112) — padrão de snapshot + reset + stream:
```typescript
async function submit() {
  // 1. validações (retornam cedo com setValidationError)
  // 2. arquiva exchange anterior em setExchanges
  const snapshot = text;
  setText("");
  setSubmittedText(snapshot);
  setValidationError("");
  await stream.submit({ mode, platform, formulaLanguage, text: snapshot });
}
```

**Alteração em `submit`** — adicionar `fileSnapshot` e `setPendingFile(null)` antes do `await`:
```typescript
const fileSnapshot = pendingFile;
setPendingFile(null);          // limpar chip ANTES de enviar
setFileError(null);
await stream.submit({ mode, platform, formulaLanguage, text: snapshot, file: fileSnapshot ?? undefined });
```

**JSX `.tool-chat`** (linha 115) — acrescentar handlers DnD:
```tsx
<div
  className="tool-chat"
  aria-label="Formula workspace"
  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
  onDragLeave={() => setDragOver(false)}
  onDrop={(e) => {
    e.preventDefault();
    setDragOver(false);
    if (!isPro) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }}
  data-drag-over={dragOver}
>
```

**Passar `pendingFile`/handlers para `FormulaInputPanel`** (linha 159–174) — novos props:
```tsx
<FormulaInputPanel
  {/* props existentes... */}
  isPro={isPro}
  pendingFile={pendingFile}
  fileError={fileError}
  onFileSelect={handleFileSelect}
  onFileRemove={() => { setPendingFile(null); setFileError(null); }}
/>
```

**Passar `attachmentMeta` para `FormulaOutputPanel`** — novo prop em cada `<FormulaOutputPanel ...>`:
```tsx
<FormulaOutputPanel
  {/* props existentes... */}
  attachmentMeta={ex.attachmentMeta ?? null}    // exchanges arquivados
/>
// e para o exchange corrente:
attachmentMeta={stream.attachmentMeta}
```

**Tipo `FormulaExchange`** — estender com campo opcional (linha 17–25):
```typescript
type FormulaExchange = {
  id: string;
  userText: string;
  status: "complete" | "error";
  result: FormulaCompletePayload | null;
  metadata: FormulaMetadata | null;
  warnings: string[];
  error: string;
  attachmentMeta?: { charCount: number; wasTruncated: boolean; extractedText: string } | null; // NOVO
};
```

---

### `apps/web/src/features/formula/hooks/use-formula-stream.ts` — CANONICAL HOOK

**Analog:** si mesmo

**Tipo `SubmitFormulaInput` atual** (linhas 15–20):
```typescript
export type SubmitFormulaInput = {
  mode: FormulaMode;
  platform: FormulaPlatform;
  formulaLanguage: FormulaLanguage;
  text: string;
};
```
Adicionar `file?: File` ao tipo.

**State do hook** (linhas 23–30) — adicionar estado de anexo:
```typescript
const [attachmentStatus, setAttachmentStatus] = useState<"uploading" | "extracting" | null>(null);
const [attachmentMeta, setAttachmentMeta] = useState<{
  charCount: number;
  wasTruncated: boolean;
  extractedText: string;
} | null>(null);
```

**Reset no início de `submit`** (linhas 33–40) — acrescentar resets:
```typescript
setAttachmentStatus(null);
setAttachmentMeta(null);
```

**Bloco de fetch atual** (linhas 42–59) — substituir por lógica condicional FormData/JSON:
```typescript
const endpoint = input.mode === "generate" ? "/api/tools/formula/generate" : "/api/tools/formula/explain";

let body: BodyInit;
let headers: HeadersInit = {};

if (input.file) {
  setAttachmentStatus("uploading");
  const fd = new FormData();
  fd.append("prompt", input.text);
  fd.append("platform", input.platform);
  fd.append("formulaLanguage", input.formulaLanguage);
  fd.append("file", input.file);
  body = fd;
  // NÃO setar Content-Type — browser define boundary automaticamente
} else {
  body = JSON.stringify(
    input.mode === "generate"
      ? { platform: input.platform, formulaLanguage: input.formulaLanguage, prompt: input.text }
      : { platform: input.platform, formulaLanguage: input.formulaLanguage, formula: input.text }
  );
  headers = { "content-type": "application/json" };
}

const response = await fetch(endpoint, { method: "POST", headers, body });
```

**Tratamento de 403 `pro_required` para attachment** — inserir ANTES do bloco 429 atual (linha 61):
```typescript
if (response.status === 403) {
  const errorData = await response.json().catch(() => ({}));
  if (errorData.code === "pro_required" && errorData.feature === "attachment") {
    setStatus("error");
    setAttachmentStatus(null);
    // pendingFile já foi limpo no tool antes do submit — não há re-submit silencioso
    setError("Recurso exclusivo Pro. Assine o plano Pro para enviar documentos.");
    return;
  }
}
```

**Transição "extracting"** — logo após `response.ok` e `response.body` verificados, antes de `setStatus("streaming")`:
```typescript
if (input.file && response.ok) {
  setAttachmentStatus("extracting");
  // "extracting" dura até o primeiro delta ou evento attachment_grounded
}
```

**Captura do evento `attachment_grounded`** — no loop NDJSON (após linha 105), antes do evento `metadata`:
```typescript
if (event.type === "attachment_grounded") {
  setAttachmentMeta({
    charCount: event.charCount,
    wasTruncated: event.wasTruncated,
    extractedText: event.extractedText,
  });
  setAttachmentStatus(null); // encerra estágio "extracting"
}

if (event.type === "delta") {
  setAttachmentStatus(null); // garante reset mesmo se attachment_grounded não vier
  setDraft((current) => `${current}${event.text}`);
}
```

**Return do hook** — acrescentar `attachmentStatus` e `attachmentMeta`:
```typescript
return {
  status, draft, result, metadata, warnings, error,
  quotaBlocked, lastFreeUse,
  attachmentStatus, attachmentMeta,  // NOVO
  submit
};
```

---

### `apps/web/src/features/formula/components/formula-input-panel.tsx` — CANONICAL INPUT PANEL

**Analog:** si mesmo

**Props interface atual** (linhas 11–41) — acrescentar:
```typescript
pendingFile: File | null;         // NOVO
fileError: string | null;         // NOVO
onFileSelect: (f: File) => void;  // NOVO
onFileRemove: () => void;         // NOVO
```

**Slot `leftAction` no ChatInput** (linha 104) — atualmente não passado; adicionar:
```tsx
<ChatInput
  {/* props existentes... */}
  leftAction={
    <AttachmentButton
      isPro={isPro}
      disabled={pending || quotaBlocked}
      onFileSelect={onFileSelect}
    />
  }
/>
```

**Chip + aviso de privacidade** — adicionar após o `<ChatInput>` e antes do `{validationError}`:
```tsx
{pendingFile ? (
  <>
    <AttachmentChip file={pendingFile} onRemove={onFileRemove} />
    <PrivacyNotice />
  </>
) : null}

{fileError ? <div className="form-error mt-2">{fileError}</div> : null}
```

**Imports novos**:
```typescript
import { AttachmentButton } from "@/components/app/attachment-button";
import { AttachmentChip } from "@/components/app/attachment-chip";
import { PrivacyNotice } from "@/components/app/privacy-notice";
```

---

### `apps/web/src/features/formula/components/formula-output-panel.tsx` — CANONICAL OUTPUT PANEL

**Analog:** si mesmo

**Props interface atual** (linhas 14–29) — acrescentar:
```typescript
attachmentMeta?: {
  charCount: number;
  wasTruncated: boolean;
  extractedText: string;
} | null;
```

**GroundingBadge + AttachmentPanel** — adicionar logo após o `{result?.assumptions...}` block (linha 79):
```tsx
{attachmentMeta ? (
  <div className="metadata-row">
    <span aria-label="Gerado com base em documento anexado">Grounded por documento</span>
  </div>
) : null}

{attachmentMeta ? (
  <AttachmentPanel
    extractedText={attachmentMeta.extractedText}
    wasTruncated={attachmentMeta.wasTruncated}
  />
) : null}
```

**Import novo**:
```typescript
import { AttachmentPanel } from "@/components/app/attachment-panel";
```

---

### `apps/web/src/components/app/attachment-button.tsx` — NOVO COMPONENTE

**Analog:** `apps/web/src/features/formula/components/copy-button.tsx` (mesmo padrão: lucide-react + `useRef`, `disabled` prop, `aria-label`)

**Padrão de imports** (copy-button.tsx linhas 1–3):
```typescript
"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
```
Para `attachment-button.tsx`:
```typescript
"use client";

import { Paperclip } from "lucide-react";
import { useRef } from "react";
```

**Padrão do componente com validação** — derivado de `copy-button.tsx` + pesquisa:
```typescript
const SUPPORTED_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "application/pdf",
  "text/plain",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validateFile(file: File): string | null {
  const isExtFallback = file.name.endsWith(".csv") || file.name.endsWith(".xlsx");
  if (!SUPPORTED_TYPES.includes(file.type) && !isExtFallback) {
    return "Tipo não suportado. Use CSV, XLSX, PNG, JPEG, PDF ou TXT.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Arquivo muito grande. O limite é 5 MB.";
  }
  return null;
}

export function AttachmentButton({
  isPro,
  onFileSelect,
  disabled,
}: {
  isPro: boolean;
  onFileSelect: (f: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isPro) {
    return (
      <button
        type="button"
        className="attachment-btn"
        disabled
        title="Recurso exclusivo Pro"
        aria-label="Anexar arquivo (exclusivo Pro)"
      >
        <Paperclip size={16} aria-hidden />
      </button>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.png,.jpeg,.jpg,.pdf,.txt"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.target.value = ""; // reset para re-selecionar mesmo arquivo (Pitfall 5)
        }}
      />
      <button
        type="button"
        className="attachment-btn"
        disabled={disabled}
        aria-label="Anexar arquivo"
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip size={16} aria-hidden />
      </button>
    </>
  );
}
```

**Nota:** `validateFile` é exportada separadamente para ser usada também no `*Tool.tsx` (handler DnD e `handleFileSelect`).

---

### `apps/web/src/components/app/attachment-chip.tsx` — NOVO COMPONENTE

**Analog:** `.metadata-row span` do `globals.css` (linhas 697–703) + padrão de botão de `copy-button.tsx`

**Tokens CSS a reutilizar** (`globals.css` linhas 690–703):
```css
.metadata-row {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;
}
.metadata-row span {
  border: 1px solid var(--border); border-radius: 999px;
  background: #f8fafc; color: var(--muted);
  font-size: 12px; font-weight: 650; padding: 4px 8px;
}
```

**Componente**:
```typescript
"use client";

import { FileText, X } from "lucide-react";

export function AttachmentChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const sizeLabel =
    file.size > 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

  return (
    <div
      className="attachment-chip"
      role="status"
      aria-label={`Arquivo anexado: ${file.name}, ${sizeLabel}`}
    >
      <FileText size={14} aria-hidden />
      <span className="attachment-chip-name">{file.name}</span>
      <span className="attachment-chip-size">{sizeLabel}</span>
      <button
        type="button"
        aria-label="Remover arquivo"
        className="attachment-chip-remove"
        onClick={onRemove}
      >
        <X size={12} aria-hidden />
      </button>
    </div>
  );
}
```

**Classes CSS novas a adicionar em `globals.css`** — modeladas em `.metadata-row span` + `.copy-button`:
```css
.attachment-chip {
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid var(--border); border-radius: 999px;
  background: #f8fafc; color: var(--muted);
  font-size: 12px; padding: 4px 8px;
  margin-top: 8px;
}
.attachment-chip-name { font-weight: 650; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.attachment-chip-size { color: var(--muted); }
.attachment-chip-remove { background: none; border: none; cursor: pointer; color: var(--muted); padding: 0; display: flex; align-items: center; }
.attachment-btn { background: none; border: none; cursor: pointer; color: var(--muted); padding: 4px; display: flex; align-items: center; border-radius: 6px; }
.attachment-btn:disabled { opacity: 0.4; cursor: not-allowed; }
```

---

### `apps/web/src/components/app/attachment-panel.tsx` — NOVO COMPONENTE

**Analog:** `.note-block` e `.note-block.warning` em `formula-output-panel.tsx` (linhas 79–99) + `globals.css` linhas 740–765

**Padrão `.note-block`** (`formula-output-panel.tsx` linhas 79–99):
```tsx
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

**Componente** (usa `<details>/<summary>` nativo — sem dependência):
```typescript
"use client";

import { FileText } from "lucide-react";
import { useState } from "react";

export function AttachmentPanel({
  extractedText,
  wasTruncated,
}: {
  extractedText: string;
  wasTruncated: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <details
      className="attachment-panel note-block"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="attachment-panel-summary">
        <FileText size={14} aria-hidden />
        Texto extraído do documento
        {wasTruncated ? (
          <span className="attachment-truncated-badge">extração parcial</span>
        ) : null}
      </summary>
      <pre
        className="attachment-panel-content"
        style={{ maxHeight: "200px", overflowY: "auto" }}
      >
        {extractedText}
      </pre>
    </details>
  );
}
```

**Classes CSS novas a adicionar em `globals.css`**:
```css
.attachment-panel summary { cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); }
.attachment-panel-content { margin-top: 8px; font-size: 12px; white-space: pre-wrap; word-break: break-word; }
.attachment-truncated-badge { border: 1px solid var(--warning); border-radius: 999px; background: rgb(181 71 8 / 8%); color: var(--warning); font-size: 11px; padding: 2px 6px; margin-left: 8px; }
```

---

### `apps/web/src/components/app/privacy-notice.tsx` — NOVO COMPONENTE

**Analog:** `.revoked-notice` em `formula-tool.tsx` (linhas 116–123) + `.note-block.warning` em `formula-output-panel.tsx`

**Padrão `.revoked-notice`** (`formula-tool.tsx` linhas 116–123):
```tsx
<div className="revoked-notice">
  <p>Seu plano Pro foi cancelado. Voce retornou ao plano gratuito com 4 usos a cada 12 horas.</p>
  <button className="ghost-button" type="button" onClick={() => setShowRevokedNotice(false)}>
    Entendi
  </button>
</div>
```

**Componente** (sem estado — copy LGPD de RESEARCH.md):
```typescript
"use client";

export function PrivacyNotice() {
  return (
    <p className="privacy-notice" aria-live="polite">
      O conteúdo do documento ficará salvo no histórico desta conversa.{" "}
      Para removê-lo, use <strong>Nova conversa</strong> no topo da página.
    </p>
  );
}
```

**Classe CSS nova**:
```css
.privacy-notice { margin: 4px 0 0; font-size: 12px; color: var(--muted); line-height: 1.5; }
```

---

### `apps/web/src/server/ai/formula-stream.ts` — CANONICAL BACKEND EMITTER

**Analog:** si mesmo

**Assinatura atual de `createFormulaEventStream`** (linha 118):
```typescript
export function createFormulaEventStream(payload: FormulaCompletePayload, lastFreeUse?: boolean)
```

**Nova assinatura** — adicionar `attachmentMeta` como terceiro parâmetro opcional:
```typescript
export function createFormulaEventStream(
  payload: FormulaCompletePayload,
  lastFreeUse?: boolean,
  attachmentMeta?: { charCount: number; wasTruncated: boolean; extractedText: string }
)
```

**Array de eventos atual** (linhas 120–126):
```typescript
const events: FormulaStreamEvent[] = [
  { type: "metadata", metadata: payload.metadata },
  ...payload.warnings.map((warning): FormulaStreamEvent => ({ type: "warning", warning })),
  ...(lastFreeUse ? [{ type: "quota_warning" as const, lastFreeUse: true }] : []),
  ...splitForStreaming(payload).map((text): FormulaStreamEvent => ({ type: "delta", text })),
  { type: "complete", payload }
];
```

**Array de eventos novo** — adicionar `attachment_grounded` como primeiro evento quando presente:
```typescript
const events: FormulaStreamEvent[] = [
  ...(attachmentMeta
    ? [{ type: "attachment_grounded" as const, ...attachmentMeta }]
    : []),
  { type: "metadata", metadata: payload.metadata },
  ...payload.warnings.map((warning): FormulaStreamEvent => ({ type: "warning", warning })),
  ...(lastFreeUse ? [{ type: "quota_warning" as const, lastFreeUse: true }] : []),
  ...splitForStreaming(payload).map((text): FormulaStreamEvent => ({ type: "delta", text })),
  { type: "complete", payload }
];
```

**Call site no route** (`route.ts` linha 114) — passar `attachmentMeta`:
```typescript
// No route, após obter attachmentContext:
const attachmentMeta = attachmentContext
  ? {
      charCount: attachmentContext.length,
      wasTruncated: attachmentContext.length > MAX_EXTRACTED_CHARS,
      extractedText: attachmentContext.slice(0, MAX_EXTRACTED_CHARS),
    }
  : undefined;

return new Response(createFormulaEventStream(payload, quotaCheck.lastFreeUse, attachmentMeta), {
  headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
});
```

**Onde importar `MAX_EXTRACTED_CHARS`**: já disponível em `@/server/ai/context-messages.ts` — importar ou re-usar valor `8_000` como constante local no route.

---

### `packages/shared/src/formula/schema.ts` — CANONICAL SHARED SCHEMA

**Analog:** si mesmo

**`formulaStreamEventSchema` atual** (linhas 65–72):
```typescript
export const formulaStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("metadata"), metadata: formulaMetadataSchema }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("warning"), warning: z.string() }),
  z.object({ type: z.literal("quota_warning"), lastFreeUse: z.boolean() }),
  z.object({ type: z.literal("complete"), payload: formulaCompletePayloadSchema }),
  z.object({ type: z.literal("error"), message: z.string() })
]);
```

**Adicionar novo variant** — inserir como segundo elemento (antes de `delta`, para refletir ordem de emissão):
```typescript
z.object({
  type: z.literal("attachment_grounded"),
  charCount: z.number().int().nonnegative(),
  wasTruncated: z.boolean(),
  extractedText: z.string(),
}),
```

**Export de tipo derivado** — acrescentar no final do arquivo:
```typescript
export type AttachmentGroundedEvent = Extract<FormulaStreamEvent, { type: "attachment_grounded" }>;
```

---

### `apps/web/src/features/template/components/template-input-panel.tsx` — PRO-GATE ANALOG (PRO-01)

**Este é o analog para o padrão `proBlocked` / upgrade CTA.**

**Padrão `proBlocked` completo** (linhas 29–81):
```typescript
const [checkoutError, setCheckoutError] = useState<string | null>(null);
const showProGate = !isPro || proBlocked;
```

```tsx
{showProGate ? (
  <div className="quota-blocked mt-2">
    <p><strong>Recurso exclusivo Pro</strong></p>
    <p>Templates avancados de planilha estao disponiveis no plano Pro. Assine para desbloquear acesso ilimitado.</p>
    {checkoutError ? <p className="form-error">{checkoutError}</p> : null}
    <button
      aria-label="Assinar o plano Pro"
      className="primary-button"
      type="button"
      onClick={async () => {
        setCheckoutError(null);
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cycle: "monthly" }),
        });
        if (response.ok) {
          const data = await response.json();
          window.location.href = data.checkoutUrl;
        } else {
          setCheckoutError("Nao foi possivel iniciar o checkout. Tente novamente.");
        }
      }}
    >
      Assinar Pro
    </button>
  </div>
) : null}
```

**Aplicação em PRO-01:** O `AttachmentButton` não exibe o CTA inline — apenas desabilita o botão e mostra tooltip. Se o usuário free clicar no botão desabilitado (impossível com `disabled=true`), nenhuma ação ocorre. A CTA ativa é o botão "Assinar Pro" já existente no painel de `quotaBlocked`, ou pode ser um link separado. O planner deve decidir se o `AttachmentButton` para free inclui um `onClick` que faz scroll/focus para o bloco `.quota-blocked` existente na mesma página.

---

### `apps/web/tests/formula-ui.test.tsx` — CANONICAL TEST (+ CORREÇÃO PRÉ-EXISTENTE)

**Analog:** si mesmo

**Helpers existentes reutilizáveis** (linhas 1–25):
```typescript
function streamResponse(lines: unknown[]) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
        }
        controller.close();
      }
    }),
    { status: 200 }
  );
}
const freeEntitlement: UserEntitlement = { plan: "free", status: "active" };
const proEntitlement: UserEntitlement = { plan: "pro", status: "active", cycle: "monthly", currentPeriodEnd: new Date("2027-01-01") };
```

**Falha pré-existente a corrigir** (linha 83):
```typescript
// FALHA: "Copiar resultado" não existe antes do submit (CopyButton usa aria-label dinâmico)
expect(screen.getByRole("button", { name: "Copiar resultado" })).toBeDisabled();
```
Causa: o `CopyButton` tem `disabled={status !== "complete"}` mas o botão existe no DOM antes do submit (renderizado pelo `FormulaOutputPanel` somente APÓS `submittedText` ser setado). O botão NÃO existe na árvore inicial — ele só é renderizado quando `stream.status !== "idle"` (linha 142 de `formula-tool.tsx`). 

**Correção** — o teste deve fazer o submit primeiro e depois verificar o botão habilitado; ou verificar que o botão NÃO existe antes do submit:
```typescript
// Antes do submit: botão não existe (FormulaOutputPanel não renderizado)
expect(screen.queryByRole("button", { name: "Copiar resultado" })).not.toBeInTheDocument();

await user.type(screen.getByLabelText("Pedido"), "Quero somar...");
await user.click(screen.getByRole("button", { name: "Gerar formula" }));

await waitFor(() =>
  expect(screen.getByRole("button", { name: "Copiar resultado" })).toBeEnabled()
);
```

**Padrão de teste para arquivo — novo teste a adicionar** (copiar estrutura de `beforeEach` + `vi.spyOn` existentes):
```typescript
it("shows attachment chip when pro user selects file", async () => {
  const user = userEvent.setup();
  render(<FormulaTool entitlement={proEntitlement} />);

  const file = new File(["col1,col2\n1,2"], "dados.csv", { type: "text/csv" });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, file);

  expect(screen.getByRole("status", { name: /Arquivo anexado/ })).toBeInTheDocument();
  expect(screen.getByText("dados.csv")).toBeInTheDocument();
});
```

---

## Variações por Tool

Os 4 outros tools seguem o padrão canônico de Formula com as seguintes diferenças:

### SQL (`sql-tool.tsx`, `use-sql-stream.ts`, `sql-input-panel.tsx`, `sql-output-panel.tsx`)
- `SubmitSqlInput` não tem `mode`/`platform`/`formulaLanguage` — tem apenas `dialect` e `text`
- No `FormData`, usar `fd.append("prompt", input.text)` e `fd.append("dialect", input.dialect)`
- Endpoint: `/api/tools/sql/generate` (único endpoint, sem /explain)
- Analog exato: `sql-tool.tsx` já existe com mesma estrutura de `formula-tool.tsx` (confirmado linhas 1–148)

### Regex
- `SubmitRegexInput` — verificar campos em `use-regex-stream.ts` (mesma estrutura geral)
- Endpoint: `/api/tools/regex/generate`

### Scripts
- `SubmitScriptsInput` — verificar campos em `use-scripts-stream.ts`
- Endpoint: `/api/tools/scripts/generate`

### Template
- Diferença crítica: Template é Pro-only integralmente (não só o attachment)
- O `useTemplateStream` já trata `proBlocked` (linhas 25, 36, 45–51 de `use-template-stream.ts`)
- A assinatura de `SubmitTemplateInput` tem apenas `text` — adicionar `file?: File`
- No FormData, usar `fd.append("prompt", input.text)` e `fd.append("file", input.file)`
- O `template-input-panel.tsx` já tem o bloco `showProGate` completo (linhas 30–80) — o `AttachmentButton` é renderizado apenas quando `!showProGate` (usuário Pro sem proBlocked)

---

## Shared Patterns

### Padrão FormData condicional (sem Content-Type manual)
**Fonte:** pesquisa RESEARCH.md Pattern 1 + confirmação no `route.ts` (linhas 25–35)
**Aplicar em:** todos os 5 hooks de stream (`use-formula-stream.ts`, `use-sql-stream.ts`, `use-regex-stream.ts`, `use-scripts-stream.ts`, `use-template-stream.ts`)
```typescript
// CORRETO: sem header Content-Type para FormData
const fd = new FormData();
fd.append("file", input.file);
const response = await fetch(endpoint, { method: "POST", body: fd });

// ERRADO: não fazer
headers: { "content-type": "multipart/form-data" }  // quebra o boundary
```

### Padrão isPro (prop drilling)
**Fonte:** `formula-tool.tsx` linha 68, `topbar.tsx` linha 45
**Aplicar em:** todos os 5 `*Tool.tsx` e `*InputPanel.tsx`
```typescript
const isPro = entitlement.plan === "pro" && entitlement.status === "active";
// Passado como prop para InputPanel, que passa para AttachmentButton
```

### Padrão de reset de estado no início do submit
**Fonte:** `use-formula-stream.ts` linhas 33–40
**Aplicar em:** todos os 5 hooks — os novos estados `attachmentStatus` e `attachmentMeta` devem ser resetados junto com os existentes no início de cada `submit`.

### Padrão de leitura NDJSON (buffer + split)
**Fonte:** `use-formula-stream.ts` linhas 85–135
**Aplicar em:** todos os 5 hooks — não alterar o loop; apenas adicionar tratamento do evento `attachment_grounded` antes do `delta`.
```typescript
buffer += decoder.decode(value, { stream: true });
const lines = buffer.split("\n");
buffer = lines.pop() ?? "";
for (const line of lines) {
  if (!line.trim()) continue;
  const event = formulaStreamEventSchema.parse(JSON.parse(line));
  // ... tratamento por type
}
```

### Padrão de CTA de checkout
**Fonte:** `formula-input-panel.tsx` linhas 136–156 e `template-input-panel.tsx` linhas 63–79
**Aplicar em:** `attachment-button.tsx` (para free que tenta usar paperclip — porém o botão é `disabled`, então o CTA pode ser apenas tooltip). Se o product decidir que clicar no botão desabilitado deve mostrar upgrade modal, usar o padrão de `fetch("/api/billing/checkout", ...)` abaixo:
```typescript
const response = await fetch("/api/billing/checkout", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ cycle: "monthly" }),
});
if (response.ok) {
  const data = await response.json();
  window.location.href = data.checkoutUrl;
}
```

### Padrão de fixture mode (backend)
**Fonte:** `formula-stream.ts` linhas 51–76 (`if (!process.env.OPENAI_API_KEY)`)
**Aplicar em:** todos os 5 stream emitters — o parâmetro `attachmentMeta` é **opcional**; o bloco fixture existente ignora o parâmetro sem mudança de comportamento. Garantir que a nova assinatura não quebre o fixture mode.

### Padrão de schema Zod com discriminatedUnion
**Fonte:** `packages/shared/src/formula/schema.ts` linhas 65–72
**Aplicar em:** todos os 5 schemas em `packages/shared/src/` — adicionar o mesmo variant `attachment_grounded` em cada `*StreamEventSchema`.

---

## No Analog Found

Todos os arquivos têm analogs no codebase. Nenhum padrão sem precedente.

| Arquivo | Observação |
|---------|------------|
| `attachment-button.tsx` | Sem analog exato de `<input type="file">` hidden + botão — padrão derivado de `copy-button.tsx` + pesquisa |
| `attachment-chip.tsx` | Sem chip de anexo existente — tokens CSS de `.metadata-row span` são a referência visual |
| `attachment-panel.tsx` | Sem painel collapsível existente — `<details>/<summary>` HTML nativo; estilo de `.note-block` |
| `privacy-notice.tsx` | Sem aviso de privacidade existente — estilo derivado de `.revoked-notice` |

---

## Metadata

**Escopo de busca de analogs:** `apps/web/src/features/`, `apps/web/src/components/app/`, `apps/web/src/server/ai/`, `packages/shared/src/`, `apps/web/tests/`, `apps/web/src/styles/globals.css`
**Arquivos lidos:** 18
**Data de mapeamento:** 2026-06-04

---
phase: 05-ocr-charts-and-launch-hardening
reviewed: 2026-05-26T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - apps/web/package.json
  - apps/web/src/app/api/tools/ocr/process/route.ts
  - apps/web/src/app/(workspace)/workspace/ocr/page.tsx
  - apps/web/src/components/app/sidebar.tsx
  - apps/web/src/features/file-analysis/components/chart-message.tsx
  - apps/web/src/features/file-analysis/components/chat-panel.tsx
  - apps/web/src/features/file-analysis/components/copy-button.tsx
  - apps/web/src/features/file-analysis/hooks/use-file-chat.ts
  - apps/web/src/features/ocr/components/image-upload-panel.tsx
  - apps/web/src/features/ocr/components/ocr-result-panel.tsx
  - apps/web/src/features/ocr/hooks/use-image-upload.ts
  - apps/web/src/features/ocr/ocr-tool.tsx
  - apps/web/src/server/ai/ocr-processor.ts
  - apps/web/tests/e2e/smoke.spec.ts
  - packages/shared/src/file-analysis/schema.ts
  - packages/shared/src/index.ts
  - packages/shared/src/ocr/fixtures.ts
  - packages/shared/src/ocr/schema.ts
findings:
  critical: 5
  warning: 6
  info: 3
  total: 14
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-05-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

This phase adds the OCR image-to-table feature, chart rendering in the file-analysis chat, and associated hardening. The core OCR pipeline (route -> quota -> processor -> response) is structurally sound. The main problems cluster around: (1) unhandled promise rejections that leave the UI permanently stuck, (2) a dev-mode fallback in a production code path that silently returns fake data when the API key is absent, (3) the streaming parser in `use-file-chat` throwing uncaught exceptions that discard all error state, (4) an unsafe type cast of AI-returned chart data, and (5) a CSV generator that does not escape field content. Several accessibility and test-reliability issues round out the findings.

---

## Critical Issues

### CR-01: `use-image-upload` — no outer try/catch; network errors leave UI permanently stuck in "processing"

**File:** `apps/web/src/features/ocr/hooks/use-image-upload.ts:42-85`
**Issue:** The `upload` callback is an `async` function that contains two unawaited rejection sources with no wrapping `try/catch`:
1. The `FileReader` promise (line 42) rejects if the OS denies file access.
2. The `fetch()` call (line 54) throws if the network is offline or DNS fails.

When either of those throws, the async callback exits without calling `setStatus("error")` or `setError(...)`. The component stays in `processing` state with no way for the user to retry. The `void (async () => { await imageUploadHook.upload(file); ... })()` wrapper in `ocr-tool.tsx` also has no catch, so the rejection is silently swallowed.

**Fix:**
```ts
const upload = useCallback(async (file: File) => {
  setError("");
  setQuotaBlocked(false);
  // ... early validation ...

  setSelectedFile(file);
  setStatus("processing");

  try {
    const imageBase64 = await new Promise<string>((resolve, reject) => { /* ... */ });
    const response = await fetch("/api/tools/ocr/process", { /* ... */ });
    // ... existing response handling ...
    const data = await response.json() as OcrResponse;
    setResult(data);
    setStatus("complete");
  } catch {
    setStatus("error");
    setError("Erro de rede. Verifique sua conexao e tente novamente.");
  }
}, []);
```

---

### CR-02: `use-file-chat` — `chatStreamEventSchema.parse()` throws uncaught, UI stuck in "streaming" forever

**File:** `apps/web/src/features/file-analysis/hooks/use-file-chat.ts:78`
**Issue:** Inside the `while (true)` read loop, line 78 calls `chatStreamEventSchema.parse(JSON.parse(line))`. This uses Zod's `.parse()` (throws on validation failure) rather than `.safeParse()`. If the server sends a malformed line, a `ZodError` or `SyntaxError` propagates out of the loop with no `try/catch` to intercept it. Because `submit` is called via `void submit(...)`, the rejection is discarded. The UI remains in `"streaming"` state with `chat.draft` frozen and the input locked, giving the user no feedback and no recovery path.

The same `while` loop also does not call `reader.cancel()` on exit, leaking the stream reader.

**Fix:**
```ts
setStatus("streaming");
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

try {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let rawObj: unknown;
      try { rawObj = JSON.parse(line); } catch { continue; }
      const parsed = chatStreamEventSchema.safeParse(rawObj);
      if (!parsed.success) continue;
      const event = parsed.data;
      // ... handle events ...
    }
  }
} catch {
  setStatus("error");
  setError("Nao foi possivel gerar a resposta. Tente novamente.");
} finally {
  reader.cancel().catch(() => undefined);
}
```

---

### CR-03: `ocr-processor.ts` — absent `OPENAI_API_KEY` silently returns fixture data in production

**File:** `apps/web/src/server/ai/ocr-processor.ts:38-46`
**Issue:** When `process.env.OPENAI_API_KEY` is undefined, `processImageOcr` returns a hardcoded fixture (the Alice/Bob table) instead of failing with an error. In a misconfigured production deployment (missing secret), users receive fake data and the API route returns HTTP 200 with fabricated rows. The failure is completely invisible to both the user and any monitoring system.

This contradicts `createOpenAIClient()` in `openai-client.ts`, which correctly throws when the key is absent.

**Fix:** Delegate to `createOpenAIClient()` directly, which already enforces the key requirement:
```ts
export async function processImageOcr(
  imageBase64: string,
  mimeType: "image/png" | "image/jpeg"
): Promise<{ headers: string[]; rows: string[][] }> {
  const openai = createOpenAIClient(); // throws if OPENAI_API_KEY is missing
  const model = getOpenAIModel();
  // ... rest of function unchanged ...
}
```
If a local-dev fixture is needed, gate it explicitly on `process.env.NODE_ENV === "development"`.

---

### CR-04: `use-file-chat` — AI chart response cast with `as ChartData` bypasses runtime validation

**File:** `apps/web/src/features/file-analysis/hooks/use-file-chat.ts:88-100`
**Issue:** When the AI returns JSON that looks like chart data, the code checks only that three field names exist (`parsedObj.chartType`, `parsedObj.xKey`, `parsedObj.yKey`) and then casts with `parsedObj as ChartData` (line 100). No schema validation is applied to field types or `rows` contents. If the AI returns `rows: null`, `chartType: "donut"`, or `rows: [1, 2, 3]` (numbers instead of objects), `ChartMessage` will receive invalid props and throw a runtime error during render, crashing the entire chat panel for the user.

**Fix:** Use the existing `chartDataSchema.safeParse()`:
```ts
import { chartDataSchema } from "@tabelin/shared";

// inside the complete event handler:
const chartValidation = chartDataSchema.safeParse(parsedObj);
if (chartValidation.success) {
  setMessages((prev) => [
    ...prev,
    { role: "assistant", type: "chart", chartData: chartValidation.data }
  ]);
} else {
  setMessages((prev) => [
    ...prev,
    { role: "assistant", type: "text", content: event.content }
  ]);
}
```

---

### CR-05: `ocr-result-panel.tsx` — `toCsv` does not escape field content; commas and newlines corrupt output

**File:** `apps/web/src/features/ocr/components/ocr-result-panel.tsx:16-18`
**Issue:** `toCsv` joins cells with a bare comma (`r.join(",")`) without RFC 4180 escaping. If any OCR-extracted cell contains a comma (common in addresses, monetary values, or names), the generated CSV is structurally broken: a cell like `"Smith, John"` becomes two fields when pasted into Excel or Google Sheets. Cells with embedded newlines produce extra rows. This is a data-correctness defect because OCR output from financial and address tables commonly contains commas.

**Fix:**
```ts
function escapeCsvField(field: string): string {
  if (field.includes('"') || field.includes(',') || field.includes('\n')) {
    return `"${field.replaceAll('"', '""')}"`;
  }
  return field;
}

function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows]
    .map((r) => r.map(escapeCsvField).join(","))
    .join("\n");
}
```

---

## Warnings

### WR-01: `copy-button.tsx` — `navigator.clipboard.writeText` unhandled rejection

**File:** `apps/web/src/features/file-analysis/components/copy-button.tsx:24`
**Issue:** The `copy()` function awaits `navigator.clipboard.writeText(value)` with no `try/catch`. On non-HTTPS origins, in Safari's strict clipboard policy, or when the user denies the permission, this throws a `DOMException`. The `onClick` handler calls `copy()` directly without `void`, so the rejection propagates as an unhandled promise rejection. The `copied` state never becomes `true`, and the user receives no feedback.

**Fix:**
```ts
async function copy() {
  if (disabled || !value) return;
  try {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  } catch {
    // Clipboard unavailable — silently ignore or show brief error state
  }
}
```

---

### WR-02: `ocr-tool.tsx` — stale closure: post-`await` reads of `imageUploadHook.result` are always the pre-upload snapshot

**File:** `apps/web/src/features/ocr/ocr-tool.tsx:26-30`
**Issue:** Inside `handleUpload`, after `await imageUploadHook.upload(file)`, the code reads `imageUploadHook.result` and `imageUploadHook.status` from the closure (lines 26-29). These are the values captured at render time before the upload ran. React state updates are applied in a new render cycle; the closure will always see `null` / `"idle"`. The `if (imageUploadHook.result)` branch at line 26 is therefore always false, making the entire post-await block dead code.

The component is saved only by the fallback derived-state logic at lines 36-43, but this creates confusing dual code paths. If the fallback were ever removed, the component would silently stop working.

**Fix:** Remove the dead post-await check entirely. The render-time checks at lines 36-43 are the correct place for this logic. Document why the IIFE only needs to call `upload()`:
```ts
function handleUpload(file: File) {
  setUiState("processing");
  void imageUploadHook.upload(file);
  // State transitions handled by render-time derived state checks below
}
```

---

### WR-03: `use-image-upload.ts` — double `response.json()` body consumption on non-quota 429

**File:** `apps/web/src/features/ocr/hooks/use-image-upload.ts:62-82`
**Issue:** On a 429 response where `errorData.code !== "quota_exceeded"`, the body has already been consumed by `response.json()` at line 62. Execution falls through to line 75, which calls `response.json()` a second time. The second call always fails (body already consumed), is caught by `.catch(() => ({}))`, and the server's actual error message is silently discarded. The user sees the generic fallback message instead.

**Fix:** Parse the body once and reuse the result:
```ts
if (!response.ok) {
  const errData = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (response.status === 429 && errData.code === "quota_exceeded") {
    setQuotaBlocked(true);
    setStatus("error");
    setError("");
    return;
  }
  if (response.status === 413) {
    setStatus("error");
    setError("Imagem excede o limite de 5 MB. Envie uma imagem menor.");
    return;
  }
  setStatus("error");
  setError(
    typeof errData.error === "string"
      ? errData.error
      : "Nao foi possivel processar a imagem."
  );
  return;
}
```

---

### WR-04: `chat-panel.tsx` — side effect with `requestAnimationFrame` executed directly in render body

**File:** `apps/web/src/features/file-analysis/components/chat-panel.tsx:40-48`
**Issue:** The auto-scroll logic mutates `prevMessageCount.current` and schedules a `requestAnimationFrame` directly in the component's render body (not inside a `useEffect`). React 18 Strict Mode double-invokes renders in development, causing the frame to fire twice. In concurrent mode, renders may be interrupted and replayed; direct DOM side effects in the render body violate React's model and produce unpredictable behavior.

**Fix:**
```ts
const prevMessageCountRef = useRef(chat.messages.length);
useEffect(() => {
  if (chat.messages.length !== prevMessageCountRef.current) {
    prevMessageCountRef.current = chat.messages.length;
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }
}, [chat.messages.length]);
```

---

### WR-05: `ocr-result-panel.tsx` — `role="img"` on interactive container violates ARIA specification

**File:** `apps/web/src/features/ocr/components/ocr-result-panel.tsx:29-32`
**Issue:** The outermost `<div>` of `OcrResultPanel` has `role="img"` (line 31), yet it contains interactive children: a `<button>` ("Nova imagem"), a scrollable `<table>`, and two `CopyButton` instances. The `img` role requires presentational, non-interactive content. Screen readers honouring the role treat the entire panel as a single image and skip all interactive children; the heading, table data, and copy buttons become inaccessible to keyboard and screen reader users.

**Fix:** Remove `role="img"` from the outer container. Use `role="region"` with `aria-label` if a labelled landmark is desired:
```tsx
<div
  className="tool-panel"
  role="region"
  aria-label="Resultado da extracao de tabela por OCR"
>
```

---

### WR-06: `smoke.spec.ts:498` — privacy test swallows assertion failures, always passes

**File:** `apps/web/tests/e2e/smoke.spec.ts:498-500`
**Issue:** The privacy verification assertion appends `.catch(() => { /* File data not visible */ })` to `expect(...).not.toBeVisible()`. If the assertion fails because the element IS visible (a real privacy regression), Playwright throws an `AssertionError` that the `.catch()` intercepts, and the test reports as passed. The privacy test provides zero regression protection in its current form.

**Fix:** Remove the `.catch()` and let Playwright's assertion fail the test:
```ts
await expect(page.getByText("Alice")).not.toBeVisible({ timeout: 5_000 });
```

---

## Info

### IN-01: `openai-client.ts` — default model name `"gpt-5-mini"` should be verified against OpenAI's published model list

**File:** `apps/web/src/server/ai/openai-client.ts:6`
**Issue:** The fallback model ID is `"gpt-5-mini"`. As of the review date, this identifier has not been confirmed as a valid OpenAI API model ID (known variants include `"gpt-5"` and `"gpt-4o-mini"`). If the ID is wrong, every deployment without an explicit `OPENAI_MODEL` environment variable will receive a 404 from OpenAI on every call. Verify against the current OpenAI model list and update to a confirmed ID.

---

### IN-02: `file-analysis/schema.ts` — `chart_data` stream event type defined but never emitted

**File:** `packages/shared/src/file-analysis/schema.ts:39-47`
**Issue:** `chatStreamEventSchema` includes a `chart_data` discriminated union variant. Searching all server-side AI stream modules confirms this event type is never emitted; the client hook does not handle it either. This dead schema variant creates a false expectation and risks confusion during future development.

**Fix:** Remove the `chart_data` variant until it is actively implemented, or add a comment marking it as reserved/planned.

---

### IN-03: `ocr-tool.tsx` — `_entitlement` prop accepted but not wired to any access gate

**File:** `apps/web/src/features/ocr/ocr-tool.tsx:16`
**Issue:** `OcrTool` accepts `entitlement: UserEntitlement` (renamed `_entitlement` to suppress the lint warning) but never uses it. If the intent is to enforce entitlement checks in the UI layer before quota is consumed, this prop must be wired up. If enforcement is intentionally delegated entirely to the API quota system, the prop and the `Props` type should be removed to avoid misleading future readers.

---

_Reviewed: 2026-05-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

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
  critical: 6
  warning: 4
  info: 2
  total: 12
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-05-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Revisão cobre a implementação de OCR (imagem → planilha), o componente de gráfico `ChartMessage`, o hook de streaming `useFileChat` e os smoke tests E2E da fase 5. O código geral segue padrões consistentes com fases anteriores, mas apresenta seis blockers: dois bugs de estado React com gravidade funcional alta, uma rejeição de Promise sem tratamento que congela a UI, um smoke test cujo helper `signOut` nunca de fato encerra a sessão, um fallback silencioso de mock data quando a chave da OpenAI está ausente, e a dependência `xlsx@0.18.5` afetada por prototype pollution (CVE-2023-30533) usada sobre arquivos não-confiáveis.

---

## Critical Issues

### CR-01: Tela em branco durante processamento OCR — `uiState === "processing"` oculta ambos os painéis

**File:** `apps/web/src/features/ocr/ocr-tool.tsx:22-68`

**Issue:** `handleUpload` define `setUiState("processing")` imediatamente. A condição de renderização exige `uiState === "idle" || uiState === "error"` para mostrar o `ImageUploadPanel` e `uiState === "complete"` para mostrar o `OcrResultPanel`. Enquanto `uiState === "processing"`, **nenhum painel é renderizado** e o usuário vê uma área completamente vazia, sem nenhum indicador de carregamento, pelo tempo inteiro do processamento OCR (que pode durar vários segundos).

**Fix:**
```tsx
// Incluir "processing" na condição do ImageUploadPanel
{uiState === "idle" || uiState === "error" || uiState === "processing" ? (
  <ImageUploadPanel
    error={imageUploadHook.error}
    onUpload={handleUpload}
    processing={imageUploadHook.status === "processing"}
    quotaBlocked={imageUploadHook.quotaBlocked}
  />
) : null}
```
Assim, quando `processing={true}`, o painel já exibe o texto "Processando..." e o botão desabilitado corretamente (lógica já existente no `ImageUploadPanel`).

---

### CR-02: Stale closure em `handleUpload` — estado do hook não atualizado após `await`

**File:** `apps/web/src/features/ocr/ocr-tool.tsx:26-32`

**Issue:** `handleUpload` é uma função comum (não `useCallback`) que captura `imageUploadHook` do snapshot de render. Após `await imageUploadHook.upload(file)`, a variável `imageUploadHook` ainda aponta para o snapshot anterior; `imageUploadHook.result` e `imageUploadHook.status` retornarão os valores pré-upload (`null` e `"idle"` respectivamente). A lógica nas linhas 26-31 **nunca** transitará para `"complete"` via esse caminho — depende exclusivamente do fallback de render-time nas linhas 36-43, que por sua vez chama `setState` durante o render (anti-pattern React).

**Fix:** Remover o IIFE interno e confiar exclusivamente na reatividade via render (linhas 36-43), ou reescrever com `useEffect` reagindo a `imageUploadHook.status`:

```tsx
// Substituir handleUpload por:
function handleUpload(file: File) {
  void imageUploadHook.upload(file);
}

// Adicionar useEffect:
useEffect(() => {
  if (imageUploadHook.status === "complete" && imageUploadHook.result) {
    setResult(imageUploadHook.result);
    setUiState("complete");
  } else if (imageUploadHook.status === "error") {
    setUiState("error");
  } else if (imageUploadHook.status === "processing") {
    setUiState("processing");
  }
}, [imageUploadHook.status, imageUploadHook.result]);

// Remover o bloco render-time nas linhas 36-43
```

---

### CR-03: Rejeição de Promise sem tratamento em `useImageUpload.upload` — congela UI em "processing"

**File:** `apps/web/src/features/ocr/hooks/use-image-upload.ts:15-88`

**Issue:** O callback `upload` é uma função `async` sem nenhum bloco `try/catch`. Se o `FileReader` disparar o evento `onerror` (linha 50), a Promise rejeita e o erro se propaga para fora do `useCallback`, resultando em uma **rejeição de Promise não tratada**. O estado `status` permanece `"processing"` para sempre (nunca transiciona para `"error"`), a UI congela com botão desabilitado e nenhuma mensagem de erro é exibida.

**Fix:**
```ts
const upload = useCallback(async (file: File) => {
  setError("");
  setQuotaBlocked(false);
  // ... validações existentes ...

  setSelectedFile(file);
  setStatus("processing");

  try {
    const imageBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(",")[1] ?? "");
      };
      reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
      reader.readAsDataURL(file);
    });

    // ... restante da lógica de fetch ...
  } catch {
    setStatus("error");
    setError("Nao foi possivel ler o arquivo. Tente novamente.");
  }
}, []);
```

---

### CR-04: `signOut` nos smoke tests usa GET em endpoint POST-only — sessão nunca é encerrada

**File:** `apps/web/tests/e2e/smoke.spec.ts:143-146`

**Issue:** O helper `signOut` faz `page.goto("/api/auth/sign-out")`, que dispara uma requisição **GET**. O handler de autenticação (`apps/web/src/app/api/auth/[...all]/route.ts`) trata `sign-out` exclusivamente na função `POST`; a função `GET` retorna `404`. O cookie de sessão **nunca é deletado**. Dois testes são afetados:

1. `smoke: auth flow` — o teste verifica `not.toHaveURL(/workspace/)` após o "sign-out", mas o usuário continua autenticado; a verificação passa apenas por acidente de timing ou redirecionamento.
2. `smoke: privacy cleanup` — o upload continua acessível após o falso sign-out; a asserção de privacidade é completamente inválida.

**Fix:**
```ts
async function signOut(page: import("@playwright/test").Page) {
  await page.request.post("/api/auth/sign-out");
  // Aguardar redirecionamento após logout
  await page.goto("/");
}
```

---

### CR-05: Fallback silencioso de mock data quando `OPENAI_API_KEY` está ausente em produção

**File:** `apps/web/src/server/ai/ocr-processor.ts:38-46`

**Issue:** Quando `process.env.OPENAI_API_KEY` não está definida, a função retorna dados fabricados (`["Alice", "100", "Ativo"]`), sem nenhum log, sem erro, e com status HTTP 200 para o cliente. Em produção, se a variável de ambiente for omitida por engano, **todos os usuários recebem a mesma resposta hardcoded** sem qualquer sinalização de falha. O mecanismo de quota também é consumido (`confirmToolUse` é chamado) sobre uma operação fictícia.

**Fix:** Lançar um erro explícito em vez de retornar mock data:
```ts
export async function processImageOcr(
  imageBase64: string,
  mimeType: "image/png" | "image/jpeg"
): Promise<{ headers: string[]; rows: string[][] }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY nao configurada.");
  }
  // ... restante da implementação ...
}
```
Para desenvolvimento local sem chave, usar uma variável de ambiente separada (`OPENAI_API_KEY_MOCK=true`) que ative o fallback de forma explícita.

---

### CR-06: `xlsx@0.18.5` afetado por prototype pollution (CVE-2023-30533) ao processar arquivos de usuários

**File:** `apps/web/package.json:34`

**Issue:** A biblioteca SheetJS/xlsx na versão `0.18.5` possui uma vulnerabilidade de **prototype pollution** (CVE-2023-30533) ao fazer parse de arquivos `.xlsx` maliciosos. O código em `apps/web/src/server/file-analysis/file-parser.ts` chama `XLSX.read(buffer, ...)` diretamente sobre buffers enviados por usuários não-confiáveis. Um atacante pode enviar um arquivo `.xlsx` especialmente construído para poluir o protótipo de `Object`, afetando comportamento global da aplicação Node.js.

**Fix:** Atualizar para a versão corrigida:
```json
"xlsx": "0.20.3"
```
Nota: versões `>= 0.19.3` contêm a correção. Verificar compatibilidade de API antes do upgrade.

---

## Warnings

### WR-01: `navigator.clipboard.writeText` sem tratamento de erro — rejeição não capturada

**File:** `apps/web/src/features/file-analysis/components/copy-button.tsx:19-26`

**Issue:** A função `copy` chama `await navigator.clipboard.writeText(value)` sem `try/catch`. A API Clipboard pode rejeitar a Promise em contextos não-HTTPS, quando a permissão foi negada pelo usuário, ou em certos navegadores/versões. A rejeição resultante é uma Promise não tratada e o estado `copied` nunca muda para `true`, sem feedback ao usuário.

**Fix:**
```ts
async function copy() {
  if (disabled || !value) return;
  try {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  } catch {
    // Fallback silencioso ou exibir mensagem de erro
  }
}
```

---

### WR-02: Detecção de gráfico em `useFileChat` não valida campo `title` — renderiza `undefined` como título

**File:** `apps/web/src/features/file-analysis/hooks/use-file-chat.ts:89-95`

**Issue:** A condição de detecção de gráfico verifica `chartType`, `xKey`, `yKey` e `rows`, mas **não verifica `title`**. O tipo `ChartData` exige `title: string`. Se a IA retornar um JSON sem o campo `title` (ou com `title: null`), o objeto é tratado como gráfico válido e `ChartMessage` renderiza `data.title` e a `aria-label` com `undefined`, resultando em texto "undefined" visível na UI e aria-label quebrada.

**Fix:**
```ts
if (
  parsedObj.chartType &&
  parsedObj.xKey &&
  parsedObj.yKey &&
  parsedObj.title &&           // <-- adicionar
  Array.isArray(parsedObj.rows)
) {
```

---

### WR-03: `toCsv` não aplica quoting RFC 4180 — CSV malformado e risco de injeção de fórmula

**File:** `apps/web/src/features/ocr/components/ocr-result-panel.tsx:16-18`

**Issue:** A função `toCsv` simplesmente faz `.join(",")` sem escapar células que contenham vírgulas, aspas ou quebras de linha, resultando em CSV inválido ao abrir no Excel/Sheets. Além disso, células cujo conteúdo comece com `=`, `+`, `-` ou `@` serão interpretadas como fórmulas pela planilha ao importar — risco de **CSV formula injection** se o OCR extraiu dados como `=SUM(A1:A10)` de imagens controladas por atacante.

**Fix:**
```ts
function csvEscape(cell: string): string {
  if (cell.includes(",") || cell.includes('"') || cell.includes("\n") || /^[=+\-@]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}
```

---

### WR-04: Side-effect com `requestAnimationFrame` executado durante o render em `ChatPanel`

**File:** `apps/web/src/features/file-analysis/components/chat-panel.tsx:40-48`

**Issue:** O auto-scroll chama `requestAnimationFrame(...)` diretamente no corpo da função de render (fora de qualquer `useEffect`). Mutação de ref e agendamento de efeitos durante o render violam o modelo do React; em modo Strict Mode (padrão em Next.js dev), o componente é renderizado duas vezes, causando dois `requestAnimationFrame` agendados por ciclo. Pode causar scroll duplo ou comportamento inconsistente.

**Fix:**
```tsx
// Substituir o bloco nas linhas 40-48 por:
const prevMessageCount = useRef(chat.messages.length);
useEffect(() => {
  if (chat.messages.length !== prevMessageCount.current) {
    prevMessageCount.current = chat.messages.length;
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  }
}, [chat.messages.length]);
```

---

## Info

### IN-01: `role="img"` em container interativo no `OcrResultPanel` — semântica ARIA incorreta

**File:** `apps/web/src/features/ocr/components/ocr-result-panel.tsx:30-32`

**Issue:** O elemento `<div>` raiz recebe `role="img"`, mas contém uma tabela, botões interativos e outros elementos. O papel ARIA `img` indica conteúdo puramente gráfico não-interativo; leitores de tela podem ignorar os filhos interativos. O `aria-label` associado descreve bem o conteúdo, mas o role está semanticamente errado.

**Fix:** Remover `role="img"` do container. O `aria-label` pode ser mantido como `aria-label` em um `<section>` ou simplesmente removido, deixando o heading `<h2>Tabela reconstruida</h2>` como identificador acessível natural.

---

### IN-02: Fixtures duplicadas com dados idênticos em `packages/shared/src/ocr/fixtures.ts`

**File:** `packages/shared/src/ocr/fixtures.ts:3-18`

**Issue:** O arquivo exporta `OCR_FIXTURE_RESPONSE` e `ocrResponseFixture` como dois fixtures separados, sendo que o primeiro (`OCR_FIXTURE_RESPONSE`) tem exatamente os mesmos dados usados no mock do smoke test (`ocrMockResponse` em `smoke.spec.ts:121-127`), enquanto `ocrResponseFixture` tem dados diferentes. A duplicidade gera confusão sobre qual fixture usar. `OCR_FIXTURE_RESPONSE` não é importado em nenhum teste nem código de produção revisado.

**Fix:** Consolidar em um único export `ocrResponseFixture`, ou garantir que `OCR_FIXTURE_RESPONSE` seja o único fixture de referência e remover o duplicado.

---

_Reviewed: 2026-05-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

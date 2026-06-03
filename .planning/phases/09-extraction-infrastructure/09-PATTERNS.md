# Phase 9: Extraction Infrastructure - Pattern Map

**Mapped:** 2026-06-03
**Files analyzed:** 8 novos + 1 modificação aditiva (export)
**Analogs found:** 7 / 8 (1 sem analog direto — `zip-guard.ts`)

Todos os arquivos novos vivem em `apps/web/src/server/extraction/` (D-07/D-08). Cada um começa com `import "server-only";` (convenção do projeto). Toda saída segue o Result tipado `{ ok: true, text } | { ok: false, code, message }` (D-09).

## File Classification

| Novo/Modificado | Role | Data Flow | Analog mais próximo | Qualidade |
|-----------------|------|-----------|---------------------|-----------|
| `extraction/types.ts` | types | — | `server/auth/reset-password.ts` (linhas 9-16) | role-match (Result union) |
| `extraction/dispatcher.ts` | service (orquestrador) | transform / request-response | `server/file-analysis/file-parser.ts` `parseFile` (104-146) | role-match (pure server module + switch por tipo) |
| `extraction/byte-validation.ts` | utility | transform | `upload/route.ts` validação (35-49) — **padrão a SUPERAR**, não copiar | partial (substitui ext/MIME por magic bytes) |
| `extraction/zip-guard.ts` | utility | file-I/O (guard) | — nenhum (greenfield, `fflate`) | no analog |
| `extraction/csv-xlsx-extractor.ts` | service | transform / CRUD-read | `file-parser.ts` `parseFile` (104-146) + `formatSchemaForPrompt` (17-33) | exact (wraps `parseFile`) |
| `extraction/image-extractor.ts` | service | transform (event→OpenAI) | `ai/ocr-processor.ts` `processImageOcr` (36-110) | exact (wraps `processImageOcr`) |
| `extraction/pdf-extractor.ts` | service | transform | `ai/ocr-processor.ts` (fixture+try/catch shape) | role-match (novo lib `unpdf`) |
| `extraction/txt-extractor.ts` | utility | transform | `file-parser.ts` CSV path `TextDecoder` (135) | exact (`TextDecoder`) |
| `ai/file-chat-stream.ts` (MOD) | — | — | self | export aditivo de `formatSchemaForPrompt` |

## Pattern Assignments

### `extraction/types.ts` (types)

**Analog:** `apps/web/src/server/auth/reset-password.ts` (linhas 9-16) — convenção Result discriminada já no codebase.

**Result union pattern** (reset-password.ts 9-16):
```typescript
type PasswordResetFailure = {
  ok: false;
  reason: "expired" | "invalid";
};
type PasswordResetSuccess = {
  ok: true;
};
```

**Copiar como** (estendendo com `code` + `message` pt-BR — D-09):
```typescript
export type ExtractionErrorCode =
  | "SCANNED_PDF" | "INVALID_BYTES" | "ZIP_BOMB"
  | "EMPTY_EXTRACTION" | "UNSUPPORTED_TYPE";

export type ExtractionError = { ok: false; code: ExtractionErrorCode; message: string };
export type ExtractionSuccess = { ok: true; text: string };
export type ExtractionResult = ExtractionSuccess | ExtractionError;
```
Mensagens pt-BR sugeridas em 09-RESEARCH.md linhas 223-228.

---

### `extraction/dispatcher.ts` (service, transform)

**Analog:** `apps/web/src/server/file-analysis/file-parser.ts` `parseFile` (104-146) — módulo `server-only` puro com switch por `mimeType`.

**server-only + import shape** (file-parser.ts 1-6):
```typescript
import "server-only";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import type { FileSchema } from "@tabelin/shared";
```

**Switch-por-tipo pattern** (file-parser.ts 110-145, generalizado): o `parseFile` ramifica `if (mimeType === "xlsx") {...} else {/* CSV */}`. O dispatcher amplia isso para `file-type` → `switch (detected.ext)` com fallback textual por extensão. Esqueleto completo em 09-RESEARCH.md linhas 395-428.

**Conversões de buffer** (Pitfall 6, RESEARCH 386-389): padronizar input em Node `Buffer`; `file-type`/`fflate` querem `Uint8Array`; `parseFile` quer `ArrayBuffer`; `processImageOcr` quer base64. Centralizar conversões aqui.

---

### `extraction/byte-validation.ts` (utility, transform)

**Analog (a SUPERAR, NÃO copiar):** `upload/route.ts` validação por extensão+MIME (linhas 35-49):
```typescript
const name = file.name.toLowerCase();
const isCSV = name.endsWith(".csv") || file.type === "text/csv";
const isXLSX = name.endsWith(".xlsx") || ... || file.type === "application/vnd...sheet";
if (!isCSV && !isXLSX) { /* 415 */ }
```

**Novo padrão (D-10):** magic bytes via `file-type`, ignorando extensão/MIME para binários:
```typescript
import { fileTypeFromBuffer } from "file-type";
const detected = await fileTypeFromBuffer(bytes); // undefined p/ csv/txt
```
`undefined` é correto para texto (Pitfall 3, RESEARCH 368-372) — fallback por extensão `.csv`/`.txt`. Mapear `jpg → "image/jpeg"`, `png → "image/png"` (RESEARCH 254). Pode exigir `await import("file-type")` se o bundling reclamar (Pitfall 1, RESEARCH 356-360; precedente `await import("xlsx")` em upload/route.ts:59).

---

### `extraction/zip-guard.ts` (utility, file-I/O) — SEM ANALOG

Greenfield. Não copiar de lugar nenhum; seguir Pattern 3 do RESEARCH (linhas 256-287). Pontos load-bearing: `fflate.unzipSync(bytes, { filter })` com `return false` (não descompacta), somando `info.originalSize` e contando entradas, lançando ao exceder cap → `{ ok: false, code: "ZIP_BOMB" }`. Chamado **antes** de `XLSX.read` (anti-pattern RESEARCH 325). Caps sugeridos: 50 MB / 1000 entradas (Claude's discretion, A5).

---

### `extraction/csv-xlsx-extractor.ts` (service, transform)

**Analog:** `file-parser.ts` `parseFile` (104-146) — wraps direto; e `formatSchemaForPrompt` (file-chat-stream.ts 17-33) para serialização.

**parseFile wrap** (file-parser.ts 104-132): reusar como está. Para XLSX multi-aba (D-05): ler `workbook.SheetNames` e chamar `parseFile(buffer, "xlsx", sheetName)` por aba, prefixando `## Aba: <nome>`. Cap ~200 linhas/aba (D-06) aplicado no extrator, não no `MAX_ROWS=1000` do parser.

**Serialização base — `formatSchemaForPrompt`** (file-chat-stream.ts 17-33, a EXPORTAR):
```typescript
function formatSchemaForPrompt(schema: FileSchema): string {
  const colLines = schema.columns.map((c) => {
    const examples = (c.sampleValues as unknown[]).slice(0, 3)
      .map((v) => (v instanceof Date ? v.toISOString() : String(v ?? ""))).join(", ");
    return `  - ${c.name} (${c.type}): exemplos: ${examples}`;
  }).join("\n");
  return `Arquivo: ${schema.fileName}\nAba: ${schema.sheetName ?? "N/A"}\nTotal de linhas: ${schema.rowCount}\nColunas (${schema.columns.length}):\n${colLines}`;
}
```
**Seam crítico (Pitfall 5):** esta função NÃO é exportada hoje. D-01 exige reusá-la → adicionar `export` (mudança aditiva, compatível com D-07) OU replicar. Recomendação: exportar.

**Extensão D-02 (~10 linhas completas):** `schema.sampleRows` (`Record<string,unknown>[]`, já fatiado a 10 por `extractSchema` em file-parser.ts:82) → bloco Markdown. Helper `sampleRowsToBlock` em RESEARCH 295-304.

---

### `extraction/image-extractor.ts` (service, transform)

**Analog:** `ai/ocr-processor.ts` `processImageOcr` (36-110) — wraps direto, fixture-mode preservado.

**Fixture-mode sem OPENAI_API_KEY** (ocr-processor.ts 40-43) — preservado automaticamente ao chamar `processImageOcr`:
```typescript
if (!process.env.OPENAI_API_KEY) {
  return OCR_FIXTURE_RESPONSE;
}
```

**Assinatura** (ocr-processor.ts 36-39): `processImageOcr(imageBase64: string, mimeType: "image/png"|"image/jpeg")` → `{ headers, rows }`. **Espera base64, não Buffer** (Pitfall 4, RESEARCH 374-378): `buffer.toString("base64")` antes de chamar.

**Serialização OCR → Markdown (D-03):** `{ headers, rows }` → tabela `| col | col |`. Helper `ocrToMarkdown` em RESEARCH 313-319. `headers.length === 0` → `EMPTY_EXTRACTION`.

---

### `extraction/pdf-extractor.ts` (service, transform)

**Analog:** `ai/ocr-processor.ts` (shape try/catch + Result), mas lib é nova (`unpdf`).

**Pattern (RESEARCH 432-449):**
```typescript
import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
const pdf = await getDocumentProxy(bytes);
const { text } = await extractText(pdf, { mergePages: true });
if (text.trim().length < 50) return { ok: false, code: "SCANNED_PDF", message: /*pt-BR*/ }; // D-12/EXT-06
```
Sem fallback automático para Vision (anti-pattern RESEARCH 326). `unpdf` não lança para PDF escaneado — retorna texto curto (Pitfall 2). `catch` → `EMPTY_EXTRACTION`.

---

### `extraction/txt-extractor.ts` (utility, transform)

**Analog:** `file-parser.ts` CSV path (linha 135) — mesma técnica `TextDecoder`.

**Pattern** (file-parser.ts 135):
```typescript
const text = new TextDecoder("utf-8").decode(buffer);
```
Aplicar a TXT direto (D-04). Vazio → `EMPTY_EXTRACTION`.

---

### `ai/file-chat-stream.ts` (MODIFICAÇÃO aditiva)

Adicionar `export` a `formatSchemaForPrompt` (linha 17). Mudança aditiva numa função pura — não toca rota nem repo, compatível com D-07 (A4). Alternativa: replicar lógica no extrator.

## Shared Patterns

### server-only no topo de todo módulo
**Source:** `file-parser.ts:1`, `ocr-processor.ts:1`, `file-chat-stream.ts:1`
**Apply to:** todos os 8 arquivos novos
```typescript
import "server-only";
```

### Result tipado discriminado
**Source:** `auth/reset-password.ts` (9-16)
**Apply to:** dispatcher + todos os extratores + types.ts (RESEARCH Pattern 1)
```typescript
{ ok: true, text } | { ok: false, code, message }
```

### Fixture-mode sem OPENAI_API_KEY
**Source:** `ai/ocr-processor.ts` (40-43)
**Apply to:** image-extractor (via wrap de `processImageOcr` — herdado automaticamente)
```typescript
if (!process.env.OPENAI_API_KEY) return OCR_FIXTURE_RESPONSE;
```

### PRIV-02: buffer efêmero, nunca persistido nem logado
**Source:** `file-parser.ts` (96-97), `upload/route.ts` (55, 99)
**Apply to:** todos os extratores — buffer consumido e descartado; `catch {}` sem logar conteúdo raw
```typescript
} catch {
  // nenhum log de conteudo raw
  return { ok: false, code: "EMPTY_EXTRACTION", message: /* pt-BR */ };
}
```

### Anti-injection delimiters (herdado)
**Source:** `file-chat-stream.ts` `formatSchemaForPrompt` (12-33) + OCR system prompt (ocr-processor.ts 13-34)
**Apply to:** serialização CSV/XLSX (reuso direto). Injeção no prompt final é SEC-01/Phase 10.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `extraction/zip-guard.ts` | utility | file-I/O | Nenhuma inspeção de ZIP/anti-bomb existe no codebase; greenfield com `fflate` (lib nova). Usar RESEARCH Pattern 3 (256-287). |

`byte-validation.ts` tem analog parcial (upload/route.ts 35-49) mas é um padrão a **superar**, não copiar — magic bytes substituem ext/MIME (D-10).

## Metadata

**Analog search scope:** `apps/web/src/server/file-analysis/`, `apps/web/src/server/ai/`, `apps/web/src/server/auth/`, `apps/web/src/app/api/tools/file-analysis/upload/`, `packages/shared/src/{file-analysis,ocr}/`
**Files scanned:** 6 lidos integralmente/parcialmente + 2 greps de shape
**Pattern extraction date:** 2026-06-03

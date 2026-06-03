# Phase 9: Extraction Infrastructure — Research

**Researched:** 2026-06-03
**Domain:** Extração textual multi-formato no servidor Next.js (CSV/XLSX, PNG/JPEG, PDF, TXT) com validação de bytes e detecção de PDF escaneado
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Formato do texto extraído (grounding)**
- **D-01:** Para CSV/XLSX, reusar `formatSchemaForPrompt` (em `apps/web/src/server/ai/file-chat-stream.ts`) como base da serialização — mantém consistência com o tool File Analysis e já traz delimitadores anti-injection. Zero formato novo.
- **D-02:** Além do schema (colunas+tipos+exemplos por coluna que `formatSchemaForPrompt` já produz), anexar ~10 linhas completas de amostra ao texto extraído (o serializador atual NÃO inclui linhas completas — extensão a implementar).
- **D-03:** Para OCR (PNG/JPEG), o `ocr-processor.ts` retorna `{ headers, rows }` estruturado; serializar como tabela Markdown (`| col | col |`) para o texto plano do dispatcher.
- **D-04:** PDF (`unpdf`) e TXT retornam texto naturalmente — usar o texto direto, sem reformatação tabular.

**XLSX multi-aba & amostragem**
- **D-05:** No anexo universal não há seletor de aba; extrair TODAS as abas, cada uma prefixada por um rótulo `## Aba: <nome>`.
- **D-06:** Cap de ~200 linhas por aba no fluxo de anexo (em vez de reusar o `MAX_ROWS=1000` do parser atual).

**Arquitetura de reuso**
- **D-07:** Criar um novo módulo `apps/web/src/server/extraction/` que envolve (wraps) as funções puras existentes (`file-analysis/file-parser.ts`, `ai/ocr-processor.ts`) — sem tocar nas rotas/repos dos tools dedicados.
- **D-08:** Estrutura espelhando `server/file-analysis/`: um dispatcher + um arquivo por formato (ex.: `csv-xlsx`, `image-ocr`, `pdf`, `txt`). EXT-05 = roteamento por tipo sem lógica duplicada.

**Contrato de erro & segurança de bytes (SEC-02)**
- **D-09:** O dispatcher expõe erros tipados com código (discriminated union / result type): `SCANNED_PDF`, `INVALID_BYTES`, `ZIP_BOMB`, `EMPTY_EXTRACTION`, `UNSUPPORTED_TYPE`, cada um com mensagem acionável em pt-BR.
- **D-10:** Validar magic bytes via lib `file-type` (detecção por assinatura), não apenas extensão/MIME declarado.
- **D-11:** Proteção anti-ZIP-bomb no XLSX: antes de abrir o workbook, limitar tamanho descompactado total e número de entradas do ZIP, rejeitando acima do cap.
- **D-12:** EXT-06: PDF escaneado detectado por `text.length < 50` após `unpdf` → retornar `SCANNED_PDF` (sem fallback automático para Vision).

### Claude's Discretion
- Limites numéricos exatos do cap anti-ZIP-bomb (tamanho descompactado / nº de entradas) — escolher valor seguro razoável.
- Formato exato da tabela Markdown do OCR e do bloco de ~10 linhas de amostra.
- Nomes finais dos arquivos dentro de `server/extraction/`.

### Deferred Ideas (OUT OF SCOPE)
- Fallback OCR automático para PDFs escaneados (EXT-06 sem fallback).
- Suporte a `.docx`/`.odt`, múltiplos arquivos por mensagem, redação automática de CPF/CNPJ.
- Injeção no system prompt, delimitadores anti-injection (SEC-01), persistência em `attachmentContext`, truncagem por `MAX_EXTRACTED_CHARS`, Pro-gate/cota — **Phase 10**.
- UI de anexo, feedback de dois estágios, painel de transparência, CTA Pro — **Phase 11**.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXT-01 | Extrai CSV/XLSX reaproveitando o parser de schema existente | `parseFile()` em `file-parser.ts` já produz `FileSchema`. Wrapper itera abas (D-05) e serializa via lógica de `formatSchemaForPrompt` (D-01) + linhas de amostra (D-02). Ver "Reuse Seams". |
| EXT-02 | Extrai tabelas de PNG/JPEG reaproveitando o OCR Vision existente | `processImageOcr(imageBase64, mimeType)` retorna `{ headers, rows }`. Wrapper converte Buffer→base64 e serializa em Markdown (D-03). Fixture-mode preservado automaticamente. |
| EXT-03 | Extrai texto de PDF com camada de texto via `unpdf` | `unpdf@1.6.2` `extractText(data, { mergePages: true })` → `{ totalPages, text }`. Sem deps nativas, serverless-friendly. Ver "Standard Stack". |
| EXT-04 | Lê arquivos TXT diretamente | `new TextDecoder("utf-8").decode(buffer)` — mesma técnica do caminho CSV em `file-parser.ts`. |
| EXT-05 | Dispatcher único roteia por tipo sem lógica duplicada | Discriminated-union sobre o tipo detectado por `file-type` + extensão (para TXT/CSV sem magic bytes). Ver "Architecture Patterns". |
| EXT-06 | PDF escaneado (`text.length < 50`) → erro acionável, sem fallback | Heurística D-12 sobre o `text` mesclado do `unpdf`. Código `SCANNED_PDF` com mensagem orientando o tool de OCR. |
| SEC-02 | Valida magic bytes e protege contra XLSX malicioso (ZIP bomb) | `file-type` (`fileTypeFromBuffer`) para assinatura (D-10) + inspeção do diretório central do ZIP via `fflate.unzipSync` com `filter` (D-11), antes de `XLSX.read`. |
</phase_requirements>

## Summary

Esta fase cria um módulo de servidor puro `apps/web/src/server/extraction/` que **embrulha** três capacidades já existentes (parser de schema CSV/XLSX, OCR Vision, leitura de texto) e adiciona uma quarta (`unpdf` para PDF), expondo um **dispatcher único** que devolve texto plano ou um erro tipado. Nenhuma rota, repo ou tool dedicado é tocado (D-07) — o risco de regressão fica isolado no novo módulo. Toda a entrada é um `Buffer`/`ArrayBuffer` e bytes brutos; toda a saída é `string` ou um `ExtractionError` com código enumerado (D-09).

As duas dependências novas (`unpdf`, `file-type`) são ESM-only, sem dependências nativas, e compatíveis com o runtime atual (Node v24). O `unpdf` traz um build serverless do PDF.js embutido — não requer configuração nem binários externos. O `file-type` valida assinatura de bytes, mas **retorna `undefined` para formatos textuais (CSV/TXT)**, que não têm magic bytes — esse é o ponto de atenção central da validação: para texto, a estratégia segura é confiar na extensão declarada combinada com a ausência de assinatura binária conflitante (não pode haver assinatura de PDF/PNG/XLSX num arquivo "TXT"). A proteção anti-ZIP-bomb do XLSX (D-11) é feita lendo o diretório central do ZIP com `fflate.unzipSync({ filter })` **sem descompactar nada**, somando `originalSize` e contando entradas antes de entregar o buffer ao `xlsx`.

Ponto crítico para o planner: `formatSchemaForPrompt` **NÃO é exportado** hoje (é função local em `file-chat-stream.ts`). D-01 exige reusá-lo como base — então o plano precisa decidir entre (a) exportá-lo (toque mínimo num arquivo de tool, mas D-07 diz "sem tocar nas rotas/repos" — exportar uma função pura não é tocar em rota/repo, é seam aceitável) ou (b) replicar a lógica de serialização no módulo de extração. Recomendação abaixo: **exportar e estender**.

**Primary recommendation:** Criar `server/extraction/` com dispatcher + um extrator por formato; usar `file-type` para magic bytes + `fflate` para limitar o ZIP do XLSX antes de `xlsx`; `unpdf` `extractText({mergePages:true})` para PDF com heurística `text.trim().length < 50 → SCANNED_PDF`; serialização CSV/XLSX reusando a lógica de `formatSchemaForPrompt` (exportada) acrescida de ~10 linhas completas (D-02). Retorno tipado seguindo a convenção `{ ok: true, text } | { ok: false, code, message }` já presente no codebase.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Detecção de magic bytes (`file-type`) | API / Backend | — | Validação de segurança de bytes nunca confia no cliente; roda no servidor antes de qualquer parse (SEC-02). |
| Limite anti-ZIP-bomb (`fflate`) | API / Backend | — | Inspeção do ZIP precisa preceder a descompressão em memória do `xlsx`; pura computação server-side. |
| Parse de schema CSV/XLSX | API / Backend | — | Reusa `file-parser.ts` (`server-only`). Lógica pura, sem I/O externo. |
| OCR Vision (PNG/JPEG) | API / Backend | Serviço externo (OpenAI) | `ocr-processor.ts` chama OpenAI Vision; fixture local quando sem `OPENAI_API_KEY`. |
| Extração de texto PDF (`unpdf`) | API / Backend | — | PDF.js serverless embutido; roda inteiramente no processo Node, sem binário externo. |
| Leitura de TXT | API / Backend | — | `TextDecoder` puro. |
| Roteamento por tipo (dispatcher) | API / Backend | — | EXT-05; orquestra os extratores acima. Consumido pelas rotas dos tools na Phase 10. |

## Standard Stack

### Core (dependências novas a adicionar nesta fase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `unpdf` | `1.6.2` | Extrair camada de texto de PDF a partir de `Uint8Array` | Mantido pela equipe unjs; embute build serverless do PDF.js, **zero deps nativas**, funciona em Node/edge/Cloudflare Workers. `[VERIFIED: npm registry]` versão; `[CITED: github.com/unjs/unpdf]` API. |
| `file-type` | `22.0.1` | Detecção de tipo por magic bytes (`fileTypeFromBuffer`) | Biblioteca de referência (sindresorhus) para detecção por assinatura binária. `[VERIFIED: npm registry]` versão; `[CITED: github.com/sindresorhus/file-type]` API. |
| `fflate` | `0.8.3` | Inspeção do diretório central do ZIP (anti-ZIP-bomb XLSX) sem descompactar | Unzip puro-JS extremamente leve; permite ler metadados de entradas via `filter` sem inflar dados. `[VERIFIED: npm registry]` versão; `[CITED: github.com/101arrowz/fflate]` técnica do filter. |

### Supporting (já presentes — reusar, não reinstalar)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `xlsx` | `0.18.5` | Parse de XLSX (via `parseFile`) | Já usado por `file-parser.ts`. Chamado **depois** da inspeção anti-ZIP-bomb. |
| `csv-parse` | `6.2.1` | Parse de CSV (via `parseFile`) | Já usado por `file-parser.ts`. |
| `openai` | `6.39.0` | OCR Vision (via `processImageOcr`) | Já usado por `ocr-processor.ts`. Fixture sem key. |
| `zod` | `4.4.3` | (Opcional) tipar/validar shapes | Já no projeto; usar se quiser validar formato detectado. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `unpdf` | `pdf-parse` / `pdfjs-dist` direto | `pdf-parse` é menos mantido e tem caveats de bundling no Next; `pdfjs-dist` direto exige configurar worker/build serverless manualmente — `unpdf` já resolve isso. |
| `file-type@22` | `file-type@16` (Node >=10, CJS-friendly) | v16 evita o requisito Node>=22, mas o runtime aqui é Node v24 e ambos são ESM dynamic-import friendly em rota Next — preferir v22 (atual). Ver pitfall de ESM. |
| `fflate` | `yauzl`, `adm-zip`, `jszip` | Mais pesados; `jszip` descompacta tudo (anula o objetivo anti-bomb). `fflate` com `filter` lê só o central directory. |
| `fflate` extra dep | Reusar `cfb` (já dep transitiva do `xlsx`) | `cfb` é para formato CFB (xls antigo/OLE), não ZIP/OOXML — não serve para inspecionar XLSX. `fflate` é a escolha correta. |

**Installation:**
```bash
npm install unpdf@1.6.2 file-type@22.0.1 fflate@0.8.3 --workspace apps/web
```

**Version verification (executado nesta sessão):**
- `npm view unpdf version` → `1.6.2` (latest) — ESM+CJS exports, sem deps nativas.
- `npm view file-type version` → `22.0.1` (latest) — `type: module`, `engines.node >=22`, ESM-only.
- `npm view fflate version` → `0.8.3`.
- Runtime local: `node --version` → `v24.13.1` (satisfaz Node>=22 do `file-type@22`).

## Package Legitimacy Audit

> slopcheck não estava disponível no ambiente de pesquisa. Todos os pacotes abaixo foram verificados via README/repositório oficial (fonte autoritativa) e registry. Dado que não passaram pelo slopcheck, o planner DEVE colocar um `checkpoint:human-verify` antes do `npm install` (defaultseguro), embora a procedência seja forte.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `unpdf` | npm | maduro (unjs) | alto | github.com/unjs/unpdf | n/d (indisponível) | Aprovado — fonte oficial unjs |
| `file-type` | npm | 9+ anos | ~50M+/sem | github.com/sindresorhus/file-type | n/d (indisponível) | Aprovado — fonte oficial sindresorhus |
| `fflate` | npm | maduro | alto | github.com/101arrowz/fflate | n/d (indisponível) | Aprovado — fonte oficial 101arrowz |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck indisponível → planner deve inserir um `checkpoint:human-verify` antes do install dos 3 pacotes.*

## Architecture Patterns

### System Architecture Diagram

```
                         (Buffer/ArrayBuffer + nome/extensão declarada)
                                          │
                                          ▼
                          ┌──────────────────────────────┐
                          │        dispatcher.ts          │
                          │  extractText(input): Result   │
                          └──────────────────────────────┘
                                          │
                       1) fileTypeFromBuffer(buffer)  (file-type)
                                          │
                 ┌────────────────────────┼───────────────────────────────┐
                 │                         │                               │
        assinatura binária        undefined (sem magic bytes)        assinatura
        reconhecida               → CSV ou TXT por extensão          não suportada
                 │                         │                               │
                 ▼                         ▼                               ▼
        ┌─────────────────┐      ┌──────────────────┐            { ok:false,
   pdf  │  pdf-extractor  │ csv  │  text/csv branch │              code:INVALID_BYTES
   png  │  image-extractor│ txt  │  txt-extractor   │              | UNSUPPORTED_TYPE }
   jpg  │  ...            │      │  csv via parseFile│
   xlsx │                 │      └──────────────────┘
        └─────────────────┘
                 │
   ┌─────────────┼────────────────┬─────────────────────────┐
   ▼             ▼                ▼                          ▼
 PDF           XLSX             PNG/JPEG                   CSV/TXT
 unpdf         fflate guard     Buffer→base64              TextDecoder
 extractText   (anti-bomb)      processImageOcr            / parseFile
 │             então XLSX.read  → {headers,rows}           │
 │ len<50?     parseFile        → Markdown table           │
 │ →SCANNED    por aba (D-05)   (D-03)                      │
 ▼             →schema+10 linhas                            ▼
 texto         (D-01/D-02)                              texto plano
   └───────────────┴──────────────┴─────────────────────────┘
                                 │
                                 ▼
              { ok: true, text: string }  |  { ok: false, code, message }
```

O leitor traça o caso primário (anexo CSV) entrando como Buffer → `file-type` devolve `undefined` → branch por extensão `.csv` → `parseFile(buffer,"csv")` → serialização schema+linhas → `{ ok:true, text }`.

### Recommended Project Structure (alinhado a D-07/D-08)

```
apps/web/src/server/extraction/
├── dispatcher.ts          # EXT-05: detecta tipo (file-type + extensão), roteia, devolve Result tipado
├── types.ts               # D-09: ExtractionResult, ExtractionError, ExtractionErrorCode (union)
├── byte-validation.ts     # D-10/SEC-02: fileTypeFromBuffer + mapeamento p/ tipo suportado
├── zip-guard.ts           # D-11/SEC-02: inspeção fflate do XLSX (caps tamanho/entradas)
├── csv-xlsx-extractor.ts  # EXT-01: wraps parseFile; itera abas (D-05); serializa schema+~10 linhas (D-01/D-02)
├── image-extractor.ts     # EXT-02: wraps processImageOcr; Buffer→base64; {headers,rows}→Markdown (D-03)
├── pdf-extractor.ts       # EXT-03/EXT-06: unpdf extractText; heurística text.length<50→SCANNED_PDF (D-12)
└── txt-extractor.ts       # EXT-04: TextDecoder utf-8
```

Cada arquivo começa com `import "server-only";` (padrão estabelecido). Os extratores são funções puras que recebem `Buffer`/`ArrayBuffer` e retornam `ExtractionResult` (ou `Promise<ExtractionResult>` para PDF/OCR).

### Pattern 1: Result tipado por discriminated union (D-09)
**What:** Retorno `{ ok: true, ... } | { ok: false, code, message }`. Já é a convenção do codebase (`reset-password.ts` usa `{ ok: false, reason }`; `formula-stream.ts` etc. usam `kind`).
**When to use:** Toda saída do dispatcher e de cada extrator.
**Example:**
```ts
// Source: padrão observado em apps/web/src/server/auth/reset-password.ts (linhas 9-16)
// types.ts
export type ExtractionErrorCode =
  | "SCANNED_PDF"
  | "INVALID_BYTES"
  | "ZIP_BOMB"
  | "EMPTY_EXTRACTION"
  | "UNSUPPORTED_TYPE";

export type ExtractionError = {
  ok: false;
  code: ExtractionErrorCode;
  message: string; // pt-BR, acionável (D-09)
};

export type ExtractionSuccess = {
  ok: true;
  text: string;
};

export type ExtractionResult = ExtractionSuccess | ExtractionError;
```
Mensagens pt-BR sugeridas (Claude's discretion no texto exato):
- `SCANNED_PDF`: "Este PDF parece ser escaneado (sem texto selecionável). Use o tool de OCR para extrair a tabela da imagem." (EXT-06)
- `INVALID_BYTES`: "O conteúdo do arquivo não corresponde ao formato declarado."
- `ZIP_BOMB`: "A planilha excede os limites de descompactação permitidos e foi rejeitada por segurança."
- `EMPTY_EXTRACTION`: "Não foi possível extrair conteúdo legível deste arquivo."
- `UNSUPPORTED_TYPE`: "Formato não suportado. Use CSV, XLSX, PNG, JPEG, PDF ou TXT."

### Pattern 2: Detecção de tipo com fallback textual (EXT-05 + D-10)
**What:** `file-type` resolve formatos binários; texto (CSV/TXT) cai no fallback por extensão porque NÃO tem magic bytes.
**When to use:** Primeira etapa do dispatcher.
**Example:**
```ts
// Source: github.com/sindresorhus/file-type (fileTypeFromBuffer retorna {ext,mime}|undefined)
import { fileTypeFromBuffer } from "file-type";

const detected = await fileTypeFromBuffer(buffer); // undefined p/ csv/txt
if (detected) {
  // binário: pdf | png | jpg | xlsx — usar detected.ext, IGNORAR extensão declarada
  switch (detected.ext) {
    case "pdf": /* pdf-extractor */ break;
    case "png":
    case "jpg": /* image-extractor (jpg cobre jpeg) */ break;
    case "xlsx": /* zip-guard → csv-xlsx-extractor */ break;
    default: return { ok: false, code: "UNSUPPORTED_TYPE", message: /*…*/ };
  }
} else {
  // sem magic bytes → só texto é legítimo. Decidir csv vs txt pela extensão declarada.
  // SEGURANÇA: undefined é correto p/ texto; um arquivo "txt" que na verdade for binário
  // já teria sido detectado acima — então undefined garante que não há assinatura binária.
}
```
**Nota de mapeamento:** `file-type` reporta JPEG como `ext: "jpg"` / `mime: "image/jpeg"`. O `ocr-processor.processImageOcr` exige `mimeType: "image/png" | "image/jpeg"` — mapear `jpg → "image/jpeg"`, `png → "image/png"`.

### Pattern 3: Guard anti-ZIP-bomb antes do parse (D-11)
**What:** Ler o diretório central do ZIP do XLSX e somar tamanhos descompactados + contar entradas, sem inflar dados.
**When to use:** Imediatamente antes de chamar `parseFile(..., "xlsx", ...)`.
**Example:**
```ts
// Source: github.com/101arrowz/fflate (filter retornando false não descompacta nada)
import { unzipSync } from "fflate";

const MAX_TOTAL_UNCOMPRESSED = 50 * 1024 * 1024; // 50 MB — cap razoável (Claude's discretion)
const MAX_ENTRIES = 1000;

function guardXlsxZip(bytes: Uint8Array): { ok: true } | ExtractionError {
  let total = 0;
  let count = 0;
  try {
    unzipSync(bytes, {
      filter(info) {
        count += 1;
        total += info.originalSize; // tamanho DESCOMPACTADO lido do central directory
        if (count > MAX_ENTRIES || total > MAX_TOTAL_UNCOMPRESSED) {
          throw new Error("zip-bomb-cap");
        }
        return false; // NÃO descompacta este arquivo
      }
    });
  } catch {
    return { ok: false, code: "ZIP_BOMB", message: /* pt-BR */ };
  }
  return { ok: true };
}
```
O objeto `info` do `filter` expõe `name`, `size` (comprimido) e `originalSize` (descomprimido). Retornar `false` para tudo faz o fflate ler só o índice — custo trivial.

### Pattern 4: Serialização CSV/XLSX (D-01 + D-02 + D-05)
**What:** Reusar a lógica de `formatSchemaForPrompt` (schema com delimitadores) e estendê-la com ~10 linhas completas; iterar todas as abas do XLSX com rótulo `## Aba: <nome>`.
**Seam crítico:** `formatSchemaForPrompt` **não é exportado** (função local em `file-chat-stream.ts`, linha 17). Recomendação: **exportá-la** (mudança aditiva, não toca rota nem repo — compatível com D-07) e o extrator a importa. Alternativa aceitável: replicar a lógica de ~16 linhas em `csv-xlsx-extractor.ts`. Decisão fica para o planner; exportar evita drift.
**Example (extensão D-02 — o serializador atual NÃO emite linhas completas):**
```ts
// schema.sampleRows é Record<string,unknown>[] (até 10 linhas, já capturado por extractSchema)
function sampleRowsToBlock(schema: FileSchema): string {
  const headers = schema.columns.map((c) => c.name);
  const lines = schema.sampleRows.slice(0, 10).map((row) =>
    headers.map((h) => {
      const v = row[h];
      return v instanceof Date ? v.toISOString() : String(v ?? "");
    }).join(" | ")
  );
  return ["Amostra de linhas:", `  | ${headers.join(" | ")} |`, ...lines.map((l) => `  | ${l} |`)].join("\n");
}
// Texto final por aba: formatSchemaForPrompt(schema) + "\n" + sampleRowsToBlock(schema)
```
Para XLSX multi-aba (D-05/D-06): iterar `workbook.SheetNames`, chamar `parseFile(buffer,"xlsx",sheetName)` por aba, capar a ~200 linhas (D-06 — note que `parseFile` usa `MAX_ROWS=1000`; o cap de 200 deve ser aplicado no extrator, p.ex. fatiando `schema.sampleRows`/`rowCount` ou passando um novo limite), e concatenar com prefixo `## Aba: <nome>`.

### Pattern 5: Serialização OCR → Markdown (D-03)
**What:** `{ headers, rows }` (string[]+string[][]) vira tabela Markdown.
**Example:**
```ts
function ocrToMarkdown(r: { headers: string[]; rows: string[][] }): string {
  if (r.headers.length === 0) return ""; // → EMPTY_EXTRACTION no extrator
  const head = `| ${r.headers.join(" | ")} |`;
  const sep = `| ${r.headers.map(() => "---").join(" | ")} |`;
  const body = r.rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  return [head, sep, body].join("\n");
}
```
`processImageOcr` espera **base64**, não Buffer: converter com `buffer.toString("base64")` (input do dispatcher como Node `Buffer`) ou `Buffer.from(arrayBuffer).toString("base64")`.

### Anti-Patterns to Avoid
- **Confiar só na extensão/MIME declarado:** a rota atual `file-analysis/upload/route.ts` valida só extensão+MIME (linhas 35-49). Esta fase eleva o padrão com magic bytes (D-10). Não copiar o padrão antigo.
- **Chamar `XLSX.read` antes do guard:** `xlsx` descompacta tudo em memória no parse — o `MAX_ROWS` NÃO protege contra ZIP bomb (D-11). O guard `fflate` precede o parse.
- **Fallback automático PDF→OCR:** explicitamente fora de escopo (EXT-06/D-12). Apenas retornar `SCANNED_PDF`.
- **`npx --yes` ou import dinâmico não verificado:** instalar pacotes verificados no `package.json`, não baixar on-the-fly.
- **Re-implementar parse de schema:** reusar `parseFile`; não reescrever inferência de tipo/delimitador.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecção de tipo de arquivo | Comparação manual de bytes/headers | `file-type` (`fileTypeFromBuffer`) | Cobre dezenas de assinaturas, edge cases (offsets, containers) que quebram em implementação caseira. |
| Extração de texto PDF | Parser PDF próprio / regex sobre bytes | `unpdf` (PDF.js serverless) | PDF é um formato binário complexo (streams, fontes, encodings); PDF.js é a referência. |
| Inspeção de ZIP sem descompactar | Parser do central directory à mão | `fflate.unzipSync({ filter })` | Formato ZIP tem variações (Zip64, data descriptors) — fflate já trata; o `filter` evita inflar. |
| Parse CSV/XLSX | Novo parser | `parseFile` existente | Já detecta `;`/`,`, infere tipos, lida com `cellDates`. D-07 manda reusar. |
| OCR de imagem | Pipeline próprio | `processImageOcr` existente | Vision + fixture-mode já implementados; D-07 manda reusar. |

**Key insight:** Toda a complexidade real desta fase está em formatos binários (PDF, ZIP/OOXML, assinaturas de bytes) — exatamente onde soluções caseiras acumulam CVEs e edge cases. O valor da fase é orquestração e contrato tipado, não parsing.

## Runtime State Inventory

Esta é uma fase **greenfield aditiva** (novo módulo que embrulha funções puras existentes), não um rename/refactor/migração. Não há string sendo renomeada nem estado runtime sendo migrado.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — verificado: nenhum datastore é tocado nesta fase (persistência é Phase 10). | nenhuma |
| Live service config | None — nenhuma config externa em UI/DB é alterada. | nenhuma |
| OS-registered state | None — sem tasks/cron/serviços novos (o `node-cron` existente não é tocado). | nenhuma |
| Secrets/env vars | `OPENAI_API_KEY` é **lido** (fixture-mode) mas não criado/renomeado — verificado em `ocr-processor.ts` linha 41. | nenhuma |
| Build artifacts | 3 novas deps em `apps/web/package.json` + `package-lock.json`. Requer `npm install`. | rodar install após adicionar deps |

## Common Pitfalls

### Pitfall 1: `file-type` é ESM-only e exige import dinâmico em alguns contextos
**What goes wrong:** `import { fileTypeFromBuffer } from "file-type"` pode falhar em bundling se o módulo de servidor for tratado como CJS.
**Why it happens:** `file-type@22` é `type: module` (ESM puro). O projeto está com `module: "ESNext"`/`moduleResolution: "Bundler"` (tsconfig.base) e roda em route handlers Next 16 (server). Em geral funciona com import estático, mas há casos de bundling onde `await import("file-type")` (dynamic import) é o caminho seguro — exatamente como `upload/route.ts` já faz `const XLSX = await import("xlsx")` (linha 59).
**How to avoid:** Se o build reclamar, usar `const { fileTypeFromBuffer } = await import("file-type")` dentro da função. Testar `next build` cedo.
**Warning signs:** Erro "require() of ES Module" ou "Cannot use import statement outside a module" no build/runtime.

### Pitfall 2: `unpdf` em PDF escaneado retorna string vazia/curta — não lança erro
**What goes wrong:** Esperar uma exceção para PDF sem camada de texto; na verdade `extractText` retorna texto vazio ou quase vazio.
**Why it happens:** PDF.js extrai o text layer; se não existe, o resultado é "" (ou só ruído de metadados). O README não documenta exceção para esse caso.
**How to avoid:** É exatamente o motivo da heurística D-12: `if (result.text.trim().length < 50) → SCANNED_PDF`. Aplicar sobre o `text` mesclado (`mergePages: true`). Confidence MEDIUM sobre o comportamento exato (não documentado) — validar com um PDF escaneado real no teste.
**Warning signs:** Texto extraído suspeito (vazio, só números de página).

### Pitfall 3: `file-type` retorna `undefined` para CSV/TXT — não é erro
**What goes wrong:** Tratar `undefined` como `INVALID_BYTES` e rejeitar CSV/TXT legítimos.
**Why it happens:** `file-type` "detecta formatos binários, não textuais como `.txt`, `.csv`". Texto não tem magic bytes.
**How to avoid:** `undefined` → branch textual por extensão. A garantia de segurança: se o arquivo fosse na verdade binário (PDF/PNG/XLSX disfarçado de `.txt`), `file-type` o teria detectado e o dispatcher rotearia pelo `detected.ext`. Então `undefined` + extensão `.csv/.txt` é seguro.
**Warning signs:** CSVs válidos caindo em `UNSUPPORTED_TYPE`/`INVALID_BYTES`.

### Pitfall 4: `processImageOcr` espera base64, não Buffer
**What goes wrong:** Passar Buffer cru e gerar data-URL inválido.
**Why it happens:** Assinatura é `processImageOcr(imageBase64: string, mimeType)`; internamente monta `data:${mime};base64,${imageBase64}`.
**How to avoid:** Converter `buffer.toString("base64")` antes de chamar.
**Warning signs:** OpenAI retorna erro de imagem / fixture sempre acionada por engano.

### Pitfall 5: `formatSchemaForPrompt` não exportado
**What goes wrong:** Tentar `import { formatSchemaForPrompt }` e quebrar o build (é função local).
**Why it happens:** Só `buildFileChatStream` é exportado de `file-chat-stream.ts`.
**How to avoid:** Adicionar `export` à função (mudança aditiva, não toca rota/repo) OU replicar a lógica de serialização no extrator. Recomendação: exportar.
**Warning signs:** "has no exported member 'formatSchemaForPrompt'".

### Pitfall 6: `parseFile` recebe `ArrayBuffer`, não Buffer
**What goes wrong:** Passar Node `Buffer` quando `parseFile(buffer: ArrayBuffer, ...)`.
**Why it happens:** Assinatura usa `ArrayBuffer` + `XLSX.read(buffer, { type: "array" })` / `new TextDecoder().decode(buffer)`.
**How to avoid:** Padronizar o input do dispatcher. Se receber Node `Buffer`, converter para `ArrayBuffer` (`buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)`) ou `Uint8Array` conforme o consumidor. `fflate` e `file-type` aceitam `Uint8Array`; `parseFile` quer `ArrayBuffer`; `processImageOcr` quer base64. Documentar conversões num único ponto.
**Warning signs:** `TextDecoder` produzindo lixo, `XLSX.read` falhando.

## Code Examples

### Dispatcher (esqueleto EXT-05)
```ts
// Source: composição dos padrões verificados acima + convenção Result do codebase
import "server-only";
import { fileTypeFromBuffer } from "file-type";
import type { ExtractionResult } from "./types";
import { extractPdf } from "./pdf-extractor";
import { extractImage } from "./image-extractor";
import { extractCsvXlsx } from "./csv-xlsx-extractor";
import { extractTxt } from "./txt-extractor";

export async function extractContent(
  buffer: Buffer,
  declaredName: string
): Promise<ExtractionResult> {
  const bytes = new Uint8Array(buffer);
  const detected = await fileTypeFromBuffer(bytes);

  if (detected) {
    switch (detected.ext) {
      case "pdf": return extractPdf(bytes);
      case "png": return extractImage(buffer, "image/png");
      case "jpg": return extractImage(buffer, "image/jpeg");
      case "xlsx": return extractCsvXlsx(buffer, "xlsx", declaredName); // guard interno
      default:
        return { ok: false, code: "UNSUPPORTED_TYPE", message: "Formato não suportado. Use CSV, XLSX, PNG, JPEG, PDF ou TXT." };
    }
  }

  // sem magic bytes → texto
  const ext = declaredName.toLowerCase().split(".").pop();
  if (ext === "csv") return extractCsvXlsx(buffer, "csv", declaredName);
  if (ext === "txt") return extractTxt(buffer);
  return { ok: false, code: "UNSUPPORTED_TYPE", message: "Formato não suportado. Use CSV, XLSX, PNG, JPEG, PDF ou TXT." };
}
```

### PDF extractor (EXT-03/EXT-06)
```ts
// Source: github.com/unjs/unpdf extractText API
import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import type { ExtractionResult } from "./types";

export async function extractPdf(bytes: Uint8Array): Promise<ExtractionResult> {
  try {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true }); // text: string
    if (text.trim().length < 50) {
      return { ok: false, code: "SCANNED_PDF", message: "Este PDF parece ser escaneado (sem texto selecionável). Use o tool de OCR para extrair a tabela." };
    }
    return { ok: true, text };
  } catch {
    return { ok: false, code: "EMPTY_EXTRACTION", message: "Não foi possível extrair conteúdo deste PDF." };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Validação por extensão+MIME declarado (`upload/route.ts`) | Magic bytes via `file-type` (D-10) | Esta fase | Rejeita arquivos disfarçados; padrão de segurança elevado. |
| `pdf-parse`/`pdfjs-dist` configurado à mão | `unpdf` (PDF.js serverless embutido) | unpdf maduro | Sem worker/build manual; funciona em serverless/edge. |
| Confiar em `MAX_ROWS` contra DoS de planilha | Guard anti-ZIP-bomb pré-parse (`fflate`) | Esta fase | `MAX_ROWS` não impede descompressão maliciosa; o guard sim. |

**Deprecated/outdated:**
- Padrão de validação só por extensão da rota antiga — não replicar nos novos extratores.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `unpdf.extractText` retorna string vazia/curta (não lança) para PDF escaneado, viabilizando a heurística `text.length<50` | Pitfall 2 / pdf-extractor | Baixo — se lançar, o `catch` cobre como `EMPTY_EXTRACTION`; mas o código `SCANNED_PDF` (EXT-06) pode não acionar. Validar com PDF escaneado real no teste. |
| A2 | `fflate` `info.originalSize` no callback `filter` reflete o tamanho descompactado do central directory sem inflar dados | Pattern 3 / zip-guard | Médio — se `originalSize` vier 0/indisponível, o guard não soma corretamente. Validar com XLSX real; alternativa é checar `size` (comprimido) × ratio. |
| A3 | `file-type@22` import estático funciona no bundling do route handler Next 16 (senão usar `await import`) | Pitfall 1 | Baixo — fallback dynamic import resolve; já há precedente (`await import("xlsx")`). |
| A4 | Exportar `formatSchemaForPrompt` é compatível com D-07 ("sem tocar rotas/repos") por ser mudança aditiva numa função pura | Pattern 4 | Baixo — alternativa (replicar lógica) sempre disponível. Decisão do planner/usuário. |
| A5 | Caps anti-ZIP-bomb sugeridos (50 MB descompactado total, 1000 entradas) são razoáveis para planilhas reais | Pattern 3 | Médio — explicitamente Claude's discretion; XLSX legítimos grandes podem exceder. Ajustar após teste com planilhas reais do domínio. |

## Open Questions

1. **Limite exato de linhas por aba no fluxo de anexo (D-06 diz ~200)**
   - What we know: `parseFile` usa `MAX_ROWS=1000` e `extractSchema` já fatia `sampleRows` em 10. D-02 quer ~10 linhas completas; D-06 quer ~200 linhas/aba.
   - What's unclear: D-02 (~10 linhas) vs D-06 (~200 linhas/aba) — são propósitos diferentes? Provável: ~10 linhas no bloco de amostra serializado, ~200 é o teto de varredura/segurança. O serializador emite ~10; o cap de 200 limita quanto `parseFile` processa por aba.
   - Recommendation: Tratar ~10 como o tamanho do bloco de amostra serializado (D-02) e ~200 como teto de linhas lidas por aba (anti-DoS, D-06). Confirmar no planejamento.

2. **Input canônico do dispatcher: `Buffer` vs `ArrayBuffer` vs `File`**
   - What we know: `parseFile` quer `ArrayBuffer`; `file-type`/`fflate` querem `Uint8Array`; `processImageOcr` quer base64. A integração nas rotas é Phase 10.
   - What's unclear: qual tipo a Phase 10 vai passar.
   - Recommendation: Padronizar o dispatcher em Node `Buffer` (mais geral em route handlers) e converter internamente. Centralizar conversões em um helper.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | runtime (todos os extratores; `file-type@22` exige >=22) | ✓ | v24.13.1 | — |
| npm | instalar `unpdf`/`file-type`/`fflate` | ✓ | (com Node 24) | — |
| `xlsx` | parse XLSX (já instalado) | ✓ | 0.18.5 | — |
| `csv-parse` | parse CSV (já instalado) | ✓ | 6.2.1 | — |
| `openai` SDK | OCR Vision (já instalado) | ✓ | 6.39.0 | fixture-mode sem `OPENAI_API_KEY` |
| `OPENAI_API_KEY` | OCR real | depende do ambiente | — | **Fixture** (`OCR_FIXTURE_RESPONSE`) servida automaticamente por `ocr-processor.ts` quando ausente |

**Missing dependencies with no fallback:** nenhuma — todas as novas libs são instaláveis e sem deps nativas.
**Missing dependencies with fallback:** `OPENAI_API_KEY` ausente → OCR usa fixture (comportamento esperado em dev, conforme memória do projeto).

## Project Constraints (from CLAUDE.md)

Não existe `./CLAUDE.md` no diretório de trabalho (verificado — arquivo ausente). Restrições derivam de convenções observadas no código e da memória do projeto:
- **pt-BR** em toda prosa e mensagens voltadas ao usuário (inclui erros tipados D-09). `[CITED: MEMORY.md language-preference]`
- **Fixture-mode sem `OPENAI_API_KEY`:** extratores que usam IA (OCR) servem fixture quando a chave está ausente; chave fica em `apps/web/.env.local`. `[CITED: MEMORY.md fixture-mode]`
- **`import "server-only";`** no topo de todo módulo de servidor (padrão observado em `file-parser.ts`, `ocr-processor.ts`, `file-chat-stream.ts`).
- **PRIV-02:** buffer bruto nunca persistido nem logado; consumido e descartado (padrão em `file-parser.ts` e `upload/route.ts`).

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: high`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | não (nesta fase) | Auth fica nas rotas (Phase 10); o módulo é puro. |
| V3 Session Management | não | idem. |
| V4 Access Control | não (nesta fase) | Pro-gate/quota é Phase 10. |
| V5 Input Validation | **sim** | Magic bytes via `file-type` (D-10); tipo permitido restrito ao conjunto suportado; guard de tamanho/entradas do ZIP (D-11). |
| V6 Cryptography | não | sem operações cripto. |
| V12 Files & Resources | **sim** | Anti-ZIP-bomb (D-11), limite de descompactação, sem escrita em disco, buffer efêmero (PRIV-02). |

### Known Threat Patterns for extração de arquivos no servidor

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| ZIP bomb via XLSX (descompactação massiva em memória) | Denial of Service | Inspeção do central directory com `fflate` antes do parse; cap de tamanho descompactado total + nº de entradas (D-11). |
| Content-type spoofing (arquivo binário disfarçado de `.txt`/`.csv`) | Spoofing/Tampering | `file-type` (magic bytes) sobrepõe extensão/MIME declarado (D-10); `undefined` só aceito para texto. |
| Prompt injection via conteúdo do arquivo | Tampering | Delimitadores anti-injection já presentes em `formatSchemaForPrompt` e no system prompt do OCR; injeção no prompt final é SEC-01/Phase 10. |
| PDF malformado / parser crash | Denial of Service | `unpdf` (PDF.js, hardened) + try/catch → `EMPTY_EXTRACTION`; sem execução de JS embutido no PDF. |
| Exaustão de memória por arquivo grande | Denial of Service | Limite de tamanho de entrada (herdar 5 MB das rotas existentes na Phase 10) + caps do guard ZIP. |

## Sources

### Primary (HIGH confidence)
- Codebase (lido nesta sessão): `file-parser.ts`, `ocr-processor.ts`, `file-chat-stream.ts`, `upload/route.ts`, `ocr/process/route.ts`, `reset-password.ts`, `packages/shared/src/file-analysis/schema.ts`, `packages/shared/src/ocr/{schema,fixtures}.ts`, `tsconfig.base.json`, `apps/web/package.json`, `vitest.config.ts`.
- github.com/unjs/unpdf README — API `extractText`/`getDocumentProxy`, `mergePages`, build serverless.
- github.com/sindresorhus/file-type README — `fileTypeFromBuffer`, retorno `{ext,mime}|undefined`, comportamento textual, detecção xlsx/pdf/png/jpg, ESM-only.
- npm registry — versões verificadas: `unpdf@1.6.2`, `file-type@22.0.1`, `fflate@0.8.3`; metadados de `type`/`engines`/`exports`.

### Secondary (MEDIUM confidence)
- github.com/101arrowz/fflate discussions (#177/#185) — técnica de `filter` retornando `false` para ler metadados do central directory sem descompactar.

### Tertiary (LOW confidence)
- Comportamento exato de `unpdf` para PDF escaneado (não documentado explicitamente) — marcado em Assumptions Log A1, validar em teste.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versões e APIs verificadas em registry + READMEs oficiais; runtime compatível.
- Architecture: HIGH — seams de reuso lidos diretamente no código; convenção Result já existe no projeto.
- Pitfalls: MEDIUM-HIGH — A1 (PDF escaneado) e A2 (`fflate.originalSize`) precisam de confirmação empírica em teste.

**Research date:** 2026-06-03
**Valid until:** 2026-07-03 (estável; libs de baixa volatilidade. Revalidar versões se passar de 30 dias.)

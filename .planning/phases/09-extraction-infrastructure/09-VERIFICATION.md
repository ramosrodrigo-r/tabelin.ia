---
phase: 09-extraction-infrastructure
verified: 2026-06-03T17:55:00Z
status: passed
score: 5/5 success criteria verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "CR-01: zip-guard.ts agora usa ratio check (info.originalSize / info.size > MAX_RATIO=100) e per-entry cap (MAX_ENTRY_UNCOMPRESSED=25MB) via info.size (comprimido, não attacker-controlled)"
    - "CR-02: extractContent tem MAX_INPUT_BYTES=25MB guard como primeira instrução, antes de new Uint8Array(buffer) e new ArrayBuffer(buffer.length)"
    - "FILE_TOO_LARGE adicionado ao ExtractionErrorCode (6 membros)"
    - "5 novos testes cobrem ratio bomb, per-entry bomb, regressão de XLSX legítimo com dados repetitivos, FILE_TOO_LARGE e limite exato"
  gaps_remaining: []
  regressions: []
---

# Phase 09: Extraction Infrastructure — Relatório de Re-verificação

**Phase Goal:** O sistema consegue extrair conteúdo textual de qualquer formato suportado (CSV/XLSX, PNG/JPEG, PDF, TXT) e retornar texto plano via dispatcher único, com validação de segurança de bytes e detecção de PDF sem camada de texto.
**Verificado:** 2026-06-03T17:55:00Z
**Status:** passed
**Re-verificação:** Sim — após fechamento dos gaps CR-01 e CR-02 pelo plano 09-05

---

## Goal Achievement

### Success Criteria do ROADMAP (não-negociáveis)

| # | Critério | Status | Evidência |
|---|----------|--------|-----------|
| SC-1 | CSV/XLSX enviado ao extrator retorna schema + amostra como texto plano | ✓ VERIFIED | `csv-xlsx-extractor.ts` existe, usa `parseFile`+`formatSchemaForPrompt`, exporta `MAX_ROWS_PER_SHEET=200`; sem regressão nos 13 testes verdes |
| SC-2 | PNG/JPEG retorna linhas/colunas via OCR | ✓ VERIFIED | `image-extractor.ts` existe, wraps `processImageOcr`, serializa tabela Markdown; fixture-mode preservado; testes verdes |
| SC-3 | PDF com texto retorna via unpdf; PDF escaneado retorna erro acionável | ✓ VERIFIED | `pdf-extractor.ts` usa `getDocumentProxy`+`extractText`, heurística `text.length<50` → SCANNED_PDF; testes verdes |
| SC-4 | TXT retorna conteúdo diretamente | ✓ VERIFIED | `txt-extractor.ts` usa `TextDecoder("utf-8")`, vazio→EMPTY_EXTRACTION; testes verdes |
| SC-5 | Dispatcher roteia sem lógica duplicada; ZIP bomb e bytes inválidos rejeitados antes de processar | ✓ VERIFIED | Roteamento correto (EXT-05). Guard anti-ZIP-bomb com ratio check real em `info.size` (CR-01 fechado). MAX_INPUT_BYTES guard na linha 58 precede `new Uint8Array` na linha 67 (CR-02 fechado). 43 testes verdes. |

**Score: 5/5 success criteria verified**

---

### Fechamento dos Gaps CR-01 e CR-02 (foco da re-verificação)

#### CR-01: zip-guard.ts — ratio check e per-entry cap (FECHADO)

**Evidência no codebase (`zip-guard.ts` linhas 29-30, 71-79):**

- `MAX_RATIO = 100` exportado (linha 29) — constante declarada
- `MAX_ENTRY_UNCOMPRESSED = 25 * 1024 * 1024` exportado (linha 30) — constante declarada
- Per-entry cap: `if (info.originalSize > MAX_ENTRY_UNCOMPRESSED) throw new Error("zip-bomb-cap")` (linha 71-73)
- Ratio check: `if (info.size > 0 && info.originalSize / info.size > MAX_RATIO) throw new Error("zip-bomb-cap")` (linha 78-80)
- `info.size` (tamanho comprimido real, não controlado pelo atacante) é usado na defesa real

**Cobertura de testes verificada:**
- "ratio bomb → ZIP_BOMB (CR-01)": ZIP com 1 MB de NUL bytes (ratio ~1000x >> 100) → `ZIP_BOMB` — PASS
- "per-entry bomb → ZIP_BOMB (CR-01)": ZIP com entrada de 26 MB → `ZIP_BOMB` — PASS
- "XLSX real com dados repetitivos não é falso-positivo": 500 linhas de strings longas → `ok: true` — PASS (regressão confirmada)

**Bypass CR-01 fechado:** Mesmo que um atacante declare `originalSize=1` em todas as entradas, o deflate stream real de 1 MB de NUL bytes produz ratio `info.originalSize/info.size ≈ 1000 >> 100` — capturado e rejeitado antes de `XLSX.read`.

#### CR-02: dispatcher.ts — MAX_INPUT_BYTES guard (FECHADO)

**Evidência no codebase (`dispatcher.ts`):**

- `MAX_INPUT_BYTES = 25 * 1024 * 1024` exportado na linha 21
- Guard na linha 58: `if (buffer.length > MAX_INPUT_BYTES) return { ok: false, code: "FILE_TOO_LARGE", ... }`
- `new Uint8Array(buffer)` na linha 67 — **APÓS** o guard (ordering correto confirmado)
- `new ArrayBuffer(buffer.length)` na linha 71 — **APÓS** o guard (ordering correto confirmado)

**Cobertura de testes verificada:**
- "buffer > MAX_INPUT_BYTES → FILE_TOO_LARGE antes de qualquer alocação": Buffer.allocUnsafe(MAX_INPUT_BYTES + 1) → `FILE_TOO_LARGE` — PASS
- "buffer === MAX_INPUT_BYTES (exatamente no limite) → guard NÃO rejeita (strict-greater)": XLSX real pequeno → `ok: true` — PASS

---

### Observable Truths (das must_haves dos PLANs)

| # | Truth | Plan | Status | Evidência |
|---|-------|------|--------|-----------|
| T-01 | ExtractionResult discriminated union exportável | 09-01 | ✓ VERIFIED | `types.ts` linha 28: `export type ExtractionResult = ExtractionSuccess \| ExtractionError`; agora 6 códigos (FILE_TOO_LARGE adicionado) |
| T-02 | unpdf, file-type, fflate instalados e importáveis | 09-01 | ✓ VERIFIED | `package.json`: unpdf@1.6.2, file-type@22.0.1, fflate@0.8.3; smoke test 3/3 verde |
| T-03 | CSV/XLSX retorna schema + ~10 linhas de amostra (EXT-01) | 09-02 | ✓ VERIFIED | `csv-xlsx-extractor.ts`: `sampleRowsToBlock` + `serializeSheet`; sem regressão |
| T-04 | XLSX multi-aba concatena com rótulo `## Aba: <nome>` (D-05) | 09-02 | ✓ VERIFIED | `csv-xlsx-extractor.ts` linha 91: `blocks.push(\`## Aba: ${sheetName}\n...\`)` |
| T-05 | Imagem PNG/JPEG retorna tabela Markdown via OCR, fixture-mode preservado (EXT-02) | 09-02 | ✓ VERIFIED | `image-extractor.ts` wraps `processImageOcr` (fixture herdado); `ocrToMarkdown` serializa `\| --- \|` |
| T-06 | TXT retorna conteúdo direto via TextDecoder (EXT-04) | 09-02 | ✓ VERIFIED | `txt-extractor.ts` linha 11: `new TextDecoder("utf-8").decode(buffer)` |
| T-07 | Magic bytes via file-type detectam tipo real, ignorando extensão/MIME (D-10/SEC-02) | 09-03 | ✓ VERIFIED | `byte-validation.ts`: `fileTypeFromBuffer` via dynamic import; 6 testes PNG/JPEG/PDF/XLSX/texto/GIF verdes |
| T-08 | XLSX que excede caps é rejeitado ANTES do parse com ZIP_BOMB (D-11/SEC-02) | 09-03 | ✓ VERIFIED | `zip-guard.ts` com ratio check (info.size) + per-entry cap + total cap; testes de ratio bomb e per-entry bomb passando; ordenação correta no dispatcher |
| T-09 | PDF com texto retorna via unpdf (EXT-03) | 09-03 | ✓ VERIFIED | `pdf-extractor.ts` usa `getDocumentProxy`+`extractText`; teste A1 com PDF real passa |
| T-10 | PDF escaneado (text < 50) retorna SCANNED_PDF, sem fallback (EXT-06/D-12) | 09-03 | ✓ VERIFIED | `pdf-extractor.ts` linha 32: `if (text.trim().length < SCANNED_TEXT_THRESHOLD)` → `SCANNED_PDF` |
| T-11 | Dispatcher roteia cada tipo ao extrator correto sem lógica duplicada (EXT-05) | 09-04 | ✓ VERIFIED | `dispatcher.ts`: switch sobre `fileType.kind`; 10 testes de integração; todos os 6 extratores importados e invocados |
| T-12 | Magic bytes e guard anti-ZIP-bomb aplicados ANTES de qualquer parse (SEC-02) | 09-04 | ✓ VERIFIED | Ordem: `MAX_INPUT_BYTES guard (L58) → detectFileType (L75) → guardXlsxZip (L92) → extractCsvXlsx (L95)` — correta e testada |
| T-13 | Toda saída do dispatcher é ExtractionResult tipado (D-09) | 09-04 | ✓ VERIFIED | Todos os retornos de `extractContent` são `ExtractionResult`; sem `any` escapes; tsc --noEmit sem erros |
| T-14 | Tipo não suportado retorna código acionável pt-BR | 09-04 | ✓ VERIFIED | Dispatcher retorna `UNSUPPORTED_TYPE` com mensagem pt-BR para GIF e extensões desconhecidas |
| T-15 | Um input acima de MAX_INPUT_BYTES é rejeitado com FILE_TOO_LARGE antes de qualquer alocação (CR-02) | 09-05 | ✓ VERIFIED | `dispatcher.ts` linha 58: guard strict-greater antes de `new Uint8Array(buffer)` na linha 67 |
| T-16 | ZIP com ratio originalSize/size > MAX_RATIO=100 é rejeitado com ZIP_BOMB (CR-01) | 09-05 | ✓ VERIFIED | `zip-guard.ts` linha 78: `info.size > 0 && info.originalSize / info.size > MAX_RATIO`; ratio bomb test passa |
| T-17 | ZIP com entry.originalSize > MAX_ENTRY_UNCOMPRESSED=25MB é rejeitado com ZIP_BOMB (CR-01) | 09-05 | ✓ VERIFIED | `zip-guard.ts` linha 71: `info.originalSize > MAX_ENTRY_UNCOMPRESSED`; per-entry bomb test passa |

---

## Required Artifacts

| Artifact | Esperado | Status | Detalhes |
|----------|----------|--------|----------|
| `apps/web/src/server/extraction/types.ts` | Contrato ExtractionResult D-09 com FILE_TOO_LARGE | ✓ VERIFIED | 15 linhas; 6 error codes (FILE_TOO_LARGE adicionado); `import "server-only"`; tsc limpo |
| `apps/web/src/server/extraction/byte-validation.ts` | fileTypeFromBuffer + mapeamento (D-10) | ✓ VERIFIED | 57 linhas; dynamic import ESM; mapeia pdf/png/jpg/xlsx/text/unsupported |
| `apps/web/src/server/extraction/zip-guard.ts` | Guard anti-ZIP-bomb com ratio cap + per-entry cap (D-11/CR-01) | ✓ VERIFIED | 109 linhas; MAX_RATIO=100, MAX_ENTRY_UNCOMPRESSED=25MB; ratio check usa info.size (comprimido); JSDoc documenta que info.originalSize é attacker-controlled |
| `apps/web/src/server/extraction/pdf-extractor.ts` | unpdf + heurística SCANNED_PDF (D-12) | ✓ VERIFIED | 50 linhas; `SCANNED_TEXT_THRESHOLD=50`; EXT-03/EXT-06 implementados |
| `apps/web/src/server/extraction/csv-xlsx-extractor.ts` | Wrapper parseFile + MAX_ROWS_PER_SHEET=200 | ✓ VERIFIED | 111 linhas; `MAX_ROWS_PER_SHEET` exportado; `## Aba:` presente |
| `apps/web/src/server/extraction/image-extractor.ts` | Wrapper processImageOcr → Markdown (D-03) | ✓ VERIFIED | 60 linhas; `processImageOcr` + `ocrToMarkdown`; fixture-mode herdado |
| `apps/web/src/server/extraction/txt-extractor.ts` | TextDecoder UTF-8 (D-04) | ✓ VERIFIED | 22 linhas; `TextDecoder("utf-8")`; EMPTY_EXTRACTION em whitespace |
| `apps/web/src/server/extraction/dispatcher.ts` | extractContent com MAX_INPUT_BYTES guard (CR-02) + ponto único EXT-05 | ✓ VERIFIED | 129 linhas; MAX_INPUT_BYTES=25MB exportado; guard na linha 58 precede new Uint8Array na linha 67; todos os 6 extratores orquestrados; ordering correto |
| `apps/web/tests/extraction/security-extractors.test.ts` | Testes de segurança incluindo ratio bomb e per-entry bomb | ✓ VERIFIED | 43 testes totais; ratio bomb, per-entry bomb, FILE_TOO_LARGE, limite exato — todos passando |

---

## Key Links

| From | To | Via | Status | Detalhes |
|------|----|-----|--------|----------|
| Todos os extratores | `./types.ts` | `import type { ExtractionResult }` | ✓ WIRED | 6 arquivos importam de `./types`; confirmado via grep |
| `csv-xlsx-extractor.ts` | `file-chat-stream.ts` | `import { formatSchemaForPrompt }` | ✓ WIRED | `export function formatSchemaForPrompt` em file-chat-stream.ts |
| `image-extractor.ts` | `ocr-processor.ts` | `import { processImageOcr }` | ✓ WIRED | linha 3 de image-extractor.ts |
| `dispatcher.ts` | todos os 6 extratores + byte-validation + zip-guard | imports + chamadas | ✓ WIRED | 9 imports; todas as funções invocadas no switch |
| `dispatcher.ts` → `zip-guard` → `csv-xlsx-extractor` | ordem de segurança | `MAX_INPUT_BYTES guard → detectFileType → guardXlsxZip → extractCsvXlsx` | ✓ WIRED | dispatcher.ts linhas 58-95: ordering correto e testado |
| `dispatcher.ts` | `types.ts` | retorno `FILE_TOO_LARGE` | ✓ WIRED | `code: "FILE_TOO_LARGE"` na linha 61; tipo é membro de `ExtractionErrorCode` |
| `zip-guard.ts` | `fflate info.size` | ratio check `info.originalSize / info.size > MAX_RATIO` | ✓ WIRED | linha 78: usa campo comprimido real do fflate, não o attacker-controlled originalSize |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produz Dados Reais | Status |
|----------|---------------|--------|-------------------|--------|
| `csv-xlsx-extractor.ts` | `schema.sampleRows`, `schema.columns` | `parseFile(buffer, mimeType)` | Sim — parseFile lê arquivo real via SheetJS | ✓ FLOWING |
| `image-extractor.ts` | `ocrResult.headers`, `ocrResult.rows` | `processImageOcr(base64, mimeType)` | Sim (real) / fixture (sem API key) | ✓ FLOWING |
| `txt-extractor.ts` | `text` | `TextDecoder.decode(buffer)` | Sim — decodifica buffer de input diretamente | ✓ FLOWING |
| `pdf-extractor.ts` | `text` | `extractText(getDocumentProxy(bytes))` | Sim — unpdf extrai do PDF real | ✓ FLOWING |
| `dispatcher.ts` | resultado tipado | guard → `detectFileType` → extrator correto | Sim — roteamento funcional com guards antes de qualquer parse | ✓ FLOWING |

---

## Behavioral Spot-Checks

| Comportamento | Resultado | Status |
|---------------|-----------|--------|
| Suíte completa de extração (`npx vitest run tests/extraction/`) | **43/43 testes passando** em 6.25s | ✓ PASS |
| `tsc --noEmit` projeto inteiro | Sem erros (saída vazia) | ✓ PASS |
| ExtractionResult contract — 6 códigos | `FILE_TOO_LARGE` presente em `types.ts` linha 15 | ✓ PASS |
| `extractContent` export com MAX_INPUT_BYTES | `grep -c 'MAX_INPUT_BYTES' dispatcher.ts` = 3 (declaração + uso no guard + comentário) | ✓ PASS |
| Guard MAX_INPUT_BYTES precede new Uint8Array | L58 (guard) < L67 (new Uint8Array) — ordering correto | ✓ PASS |
| Ratio bomb (1 MB NUL, ratio ~1000x) → ZIP_BOMB | Teste "ratio bomb" passa — CR-01 fechado | ✓ PASS |
| Per-entry bomb (26 MB) → ZIP_BOMB | Teste "per-entry bomb" passa — CR-01 per-entry fechado | ✓ PASS |
| Buffer > 25 MB → FILE_TOO_LARGE (não aloca) | Teste "buffer > MAX_INPUT_BYTES → FILE_TOO_LARGE" passa — CR-02 fechado | ✓ PASS |
| XLSX legítimo com 500 linhas repetitivas não é falso-positivo | Teste regressão passa — ratio real < MAX_RATIO=100 confirmado | ✓ PASS |
| Buffer exatamente no limite (=== 25 MB) não é rejeitado | Teste "limite exato" passa — guard é strict-greater (>) | ✓ PASS |

---

## Requirements Coverage

| Requirement | Plans | Descrição | Status | Evidência |
|-------------|-------|-----------|--------|-----------|
| EXT-01 | 09-02 | Extrai CSV/XLSX com schema + amostra | ✓ SATISFIED | `extractCsvXlsx` + 13 testes; REQUIREMENTS.md `[x]` |
| EXT-02 | 09-02 | Extrai PNG/JPEG via OCR | ✓ SATISFIED | `extractImage` + testes fixture-mode; REQUIREMENTS.md `[x]` |
| EXT-03 | 09-03 | Extrai PDF com camada de texto via unpdf | ✓ SATISFIED | `extractPdf` + teste A1; REQUIREMENTS.md `[x]` |
| EXT-04 | 09-02 | Lê TXT via TextDecoder | ✓ SATISFIED | `extractTxt` + testes; REQUIREMENTS.md `[x]` |
| EXT-05 | 09-04 | Dispatcher único roteia ao extrator correto | ✓ SATISFIED | `extractContent` + 10 testes integração; REQUIREMENTS.md `[x]` |
| EXT-06 | 09-03 | PDF escaneado → erro acionável orientando OCR | ✓ SATISFIED | heurística `text<50→SCANNED_PDF`; sem fallback automático; REQUIREMENTS.md `[x]` |
| SEC-02 | 09-01, 09-03, 09-04, 09-05 | Valida magic bytes + protege contra ZIP bomb + limite de input | ✓ SATISFIED | Magic bytes: OK. Ratio check em info.size (não attacker-controlled): OK. Per-entry cap 25 MB: OK. MAX_INPUT_BYTES guard antes de qualquer alocação: OK. REQUIREMENTS.md `[x]` — agora justificado. |

---

## Anti-Patterns Found

| Arquivo | Linha | Padrão | Severidade | Impacto |
|---------|-------|--------|-----------|---------|
| `security-extractors.test.ts` | 210-263 | 3 testes (`ratio bomb`, `per-entry bomb`, regressão) escritos como top-level `it()` fora de qualquer `describe` block (fechamento prematuro do `describe` na linha 208) | ⚠️ WARNING | Organizacional apenas — Vitest executa `it()` no nível raiz corretamente; os 3 testes passam. Impacto zero no comportamento testado. |
| `zip-guard.ts` | 37 | `_lastOriginalSizes` — estado mutável global compartilhado entre requisições (WR-07 do REVIEW) | ⚠️ WARNING | Concorrência: dois uploads simultâneos de XLSX podem cruzar os sizes capturados. Documentado como deferred no SUMMARY-05. Não impede SEC-02 nem os goals da fase. |
| `csv-xlsx-extractor.ts` | 83-91 | Workbook lido N+1 vezes (uma para SheetNames + uma por aba via parseFile) | ⚠️ WARNING | Custo de parse amplificado para workbooks multi-aba. Fora do escopo v1. |
| `csv-xlsx-extractor.ts` | 104-110 | `catch {}` mapeia todas as exceções a `EMPTY_EXTRACTION` | ⚠️ WARNING | `INVALID_BYTES` nunca emitido por este path; falha de parse e arquivo vazio indistinguíveis. |

Nota: nenhum marcador `TBD`, `FIXME` ou `XXX` encontrado nos arquivos da fase.
Nota: nenhum dos warnings acima é blocker para os goals de SEC-02 ou para qualquer success criterion da fase.

---

## Human Verification Required

Nenhum item requer verificação humana. Todos os success criteria são verificáveis programaticamente e foram confirmados pela suíte de testes.

---

## Re-verificação: Comparação com verificação anterior

| Item | Status anterior | Status atual | Mudança |
|------|----------------|--------------|---------|
| SC-5 (SEC-02 completo) | ✗ FAILED | ✓ VERIFIED | CR-01 + CR-02 fechados pelo plano 09-05 |
| T-08 (ZIP bomb eficácia) | ✗ FAILED (parcial) | ✓ VERIFIED | ratio check em info.size + per-entry cap |
| T-12 (ordering + eficácia) | ✓/✗ misto | ✓ VERIFIED | eficácia agora real, não apenas ordering |
| T-15 (MAX_INPUT_BYTES) | ✗ FAILED | ✓ VERIFIED | guard adicionado na linha 58 do dispatcher |
| T-16 (ratio bomb) | ausente | ✓ VERIFIED | novo must-have do plano 09-05 |
| T-17 (per-entry bomb) | ausente | ✓ VERIFIED | novo must-have do plano 09-05 |
| Testes totais | 38/38 | 43/43 | +5 testes: ratio bomb, per-entry bomb, regressão XLSX repetitivo, FILE_TOO_LARGE, limite exato |

---

## Gaps Summary

Nenhum gap bloqueador. Os dois gaps CR-01 e CR-02 que impediam SEC-02 de ser declarado satisfeito foram fechados pelo plano 09-05:

- **CR-01 (FECHADO):** `zip-guard.ts` agora usa `info.size` (tamanho comprimido real no arquivo, não controlado pelo atacante) para o ratio check. Um ZIP bomb que declare `originalSize=1` mas contenha deflate stream de 1 MB de NUL bytes produz ratio ~1000x — capturado e rejeitado como `ZIP_BOMB` antes de `XLSX.read`.

- **CR-02 (FECHADO):** `extractContent` tem `MAX_INPUT_BYTES=25MB` guard como primeira instrução (linha 58), antes de `new Uint8Array(buffer)` (linha 67) e `new ArrayBuffer(buffer.length)` (linha 71). Input acima de 25 MB retorna `FILE_TOO_LARGE` sem nenhuma alocação.

Os 4 outros success criteria (EXT-01/02/03/04/06, dispatcher de roteamento) permanecem implementados e com testes verdes — nenhuma regressão introduzida.

---

_Verificado: 2026-06-03T17:55:00Z_
_Verificador: Claude (gsd-verifier)_
_Tipo: re-verificação após gap closure (plano 09-05)_

---
phase: 09-extraction-infrastructure
plan: 02
subsystem: api
tags: [extraction, csv, xlsx, ocr, image, txt, file-parser, tdd]

# Dependency graph
requires:
  - phase: 09-01
    provides: ExtractionResult contract (types.ts) + unpdf/file-type/fflate installed
provides:
  - csv-xlsx-extractor: extractCsvXlsx — wraps parseFile + formatSchemaForPrompt, multi-tab ## Aba: rótulo, MAX_ROWS_PER_SHEET=200 cap
  - image-extractor: extractImage — wraps processImageOcr, buffer→base64, ocrToMarkdown Markdown table, fixture-mode preserved
  - txt-extractor: extractTxt — TextDecoder UTF-8 decode, direct text output
  - formatSchemaForPrompt exported (additive seam in file-chat-stream.ts)
affects: [09-03, 09-04, Phase 10 dispatcher/upload]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Wrapper-extractor pattern: wrap existing parsers (parseFile, processImageOcr) into ExtractionResult boundary
    - Serialization layer for D-06 cap: effectiveRowCount = Math.min(rowCount, MAX_ROWS_PER_SHEET) applied at serializeSheet level
    - TDD RED→GREEN with test ArrayBuffer helpers (toArrayBuffer, XLSX.write type buffer)
    - extractImageFromOcrResult exported for unit tests without calling processImageOcr

key-files:
  created:
    - apps/web/src/server/extraction/csv-xlsx-extractor.ts
    - apps/web/src/server/extraction/image-extractor.ts
    - apps/web/src/server/extraction/txt-extractor.ts
    - apps/web/tests/extraction/reuse-extractors.test.ts
  modified:
    - apps/web/src/server/ai/file-chat-stream.ts (export added to formatSchemaForPrompt, line 17)

key-decisions:
  - "D-06 cap aplicado na camada de serialização (effectiveRowCount = Math.min(rowCount, MAX_ROWS_PER_SHEET)) e não no parser interno — única camada que o extrator controla"
  - "extractImageFromOcrResult exportado como helper para permitir testes unitários sem mock do processImageOcr"
  - "Testes usam toArrayBuffer() helper customizado para evitar pool compartilhado do Node.js Buffer"

patterns-established:
  - "Pattern: wrapping existente com boundary ExtractionResult tipado (ok/code/message)"
  - "Pattern: import server-only em todos os extratores"
  - "Pattern: PRIV-02 — nenhum console.log de conteúdo raw; catch retorna código tipado"

requirements-completed: [EXT-01, EXT-02, EXT-04]

# Metrics
duration: 8min
completed: 2026-06-03
---

# Phase 09 Plan 02: Reuse Extractors Summary

**3 extratores que embrulham parseFile/processImageOcr/TextDecoder com ExtractionResult tipado, multi-aba XLSX com ## Aba:, cap MAX_ROWS_PER_SHEET=200 exercitado por teste que referencia a constante**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-03T19:17:00Z
- **Completed:** 2026-06-03T19:25:12Z
- **Tasks:** 3 (1 RED commit + 1 GREEN commit via TDD)
- **Files modified:** 5

## Accomplishments
- `formatSchemaForPrompt` exportado de `file-chat-stream.ts` (mudança aditiva, zero impacto em D-07)
- `extractCsvXlsx`: parse via `parseFile`, serializa schema + ~10 linhas (`sampleRowsToBlock`), itera todas as abas XLSX com prefixo `## Aba: <nome>`, clampa `rowCount` efetivo a `MAX_ROWS_PER_SHEET=200` na camada de serialização
- `extractImage`: converte buffer→base64, chama `processImageOcr`, serializa `{ headers, rows }` como tabela Markdown; fixture-mode preservado automaticamente; vazio → `EMPTY_EXTRACTION`
- `extractTxt`: `TextDecoder("utf-8").decode`, vazio/whitespace → `EMPTY_EXTRACTION`
- 13 testes TDD passando (csv simples, amostra ≤10, XLSX 2 abas, cap D-06, empty, OCR fixture, JPEG mimeType, TXT UTF-8, TXT vazio/whitespace)

## Task Commits

1. **RED — testes falhando para os 3 extratores** - `77248dd` (test)
2. **GREEN — implementação completa** - `08f9060` (feat)

## Files Created/Modified
- `apps/web/src/server/ai/file-chat-stream.ts` — `export` adicionado a `formatSchemaForPrompt` (linha 17)
- `apps/web/src/server/extraction/csv-xlsx-extractor.ts` — extrator CSV/XLSX com `MAX_ROWS_PER_SHEET`, `sampleRowsToBlock`, `serializeSheet`
- `apps/web/src/server/extraction/image-extractor.ts` — wrap `processImageOcr`, `ocrToMarkdown`, `extractImageFromOcrResult`
- `apps/web/src/server/extraction/txt-extractor.ts` — `TextDecoder("utf-8").decode`, EMPTY_EXTRACTION em whitespace
- `apps/web/tests/extraction/reuse-extractors.test.ts` — 13 testes TDD (todos os 3 extratores + casos de borda)

## Decisions Made
- Cap D-06 implementado na **camada de serialização** (`effectiveRowCount = Math.min(schema.rowCount, MAX_ROWS_PER_SHEET)`), não no parser `file-parser.ts` que usa `MAX_ROWS=1000` internamente — o extrator não controla essa camada.
- `extractImageFromOcrResult` exportado separadamente para permitir testes unitários sem invocar `processImageOcr` (que chama OpenAI).
- Testes usam `toArrayBuffer()` helper customizado que copia byte-a-byte para evitar pool compartilhado do Node.js (`Buffer.from(...).buffer` usa o underlying ArrayBuffer pool que pode conter dados de outros buffers).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrigidos helpers de buffer nos testes**
- **Found during:** Execução GREEN (testes falhando)
- **Issue:** `Buffer.from(text).buffer` e `XLSX.write({type:"array"}).buffer` retornam o `ArrayBuffer` subjacente do pool do Node.js que pode conter dados de outros buffers alocados anteriormente — causou testes TXT recebendo conteúdo XLSX binário e vice-versa
- **Fix:** Criado `toArrayBuffer(buf)` que copia byte-a-byte para `ArrayBuffer` limpo; `makeXlsxBuffer` usa `XLSX.write({type:"buffer"})` + `toArrayBuffer`
- **Files modified:** `apps/web/tests/extraction/reuse-extractors.test.ts`
- **Verification:** 13 testes passando após a correção
- **Committed in:** `08f9060` (feat commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug nos helpers de teste)
**Impact on plan:** Correção necessária para isolar buffers entre testes. Sem scope creep.

## Issues Encountered
- O `XLSX.write({type:"array"})` retorna `ArrayBuffer` diretamente (não `Uint8Array`) nessa versão do SheetJS — tentativa de `.buffer.slice(byteOffset, ...)` falhou com "Cannot read properties of undefined (reading 'slice')". Resolvido usando `type:"buffer"` que retorna `Buffer` Node.js e convertendo via `toArrayBuffer`.

## User Setup Required
None - nenhuma configuração externa necessária.

## Next Phase Readiness
- 3 extratores de reuso prontos (`csv-xlsx`, `image`, `txt`) para serem importados pelo dispatcher (Plan 09-04)
- Plan 09-03 (security/new-lib — `pdf-extractor`, `zip-guard`, `file-type-check`) corre em paralelo (arquivos diferentes, sem conflito)
- `formatSchemaForPrompt` agora exportada e disponível para outros módulos
- `MAX_ROWS_PER_SHEET` exportada e testada — Plan 09-04 pode importar para documentação/referência

## Threat Surface Scan
Nenhuma nova superfície de segurança além do que está no `<threat_model>` do plano. Os 3 extratores:
- Não expõem endpoints de rede
- Não gravam em banco
- Reusam mitigações existentes (T-09-02-01: `formatSchemaForPrompt` com delimitadores anti-injection; T-09-02-02: sem log raw; T-09-02-03: `MAX_ROWS_PER_SHEET` ativo)

---
*Phase: 09-extraction-infrastructure*
*Completed: 2026-06-03*

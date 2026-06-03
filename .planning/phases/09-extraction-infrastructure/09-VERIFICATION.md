---
phase: 09-extraction-infrastructure
verified: 2026-06-03T16:55:00Z
status: gaps_found
score: 4/5 success criteria verified
overrides_applied: 0
gaps:
  - truth: "Upload com magic bytes inválidos ou ZIP bomb é rejeitado antes de processar (SEC-02 / SC-5)"
    status: failed
    reason: "Duas falhas de segurança concretas tornam o objetivo anti-DoS incompleto: (1) o guard zip-guard.ts confia em info.originalSize controlado pelo atacante sem cap de ratio ou por-entrada — um ZIP bomb que declare originalSize pequeno passa pelo guard e explode em XLSX.read; (2) não existe guarda de tamanho de input no dispatcher — arquivos de centenas de MB chegam a detectFileType, XLSX.read, unpdf e OCR base64 sem nenhum limite anterior."
    artifacts:
      - path: "apps/web/src/server/extraction/zip-guard.ts"
        issue: "Soma info.originalSize do central directory (attacker-controlled metadata) sem checar info.size nem ratio comprimido/descomprimido. Um ZIP crafted com originalSize=1 por entrada mas deflate stream real de gigabytes passa o guard com total declarado mínimo, e depois explode em XLSX.read. Campos info.size (comprimido) e ratio nunca são usados."
      - path: "apps/web/src/server/extraction/dispatcher.ts"
        issue: "extractContent aceita Buffer de tamanho arbitrário sem nenhum MAX_INPUT_BYTES guard. Immediately faz new Uint8Array(buffer) + new ArrayBuffer(buffer.length) — duplicando a memória — antes de qualquer verificação. Não existe error path FILE_TOO_LARGE nem o código no ExtractionErrorCode."
    missing:
      - "zip-guard.ts: adicionar MAX_RATIO (ex.: 100) e MAX_ENTRY_UNCOMPRESSED (ex.: 25 MB) usando info.size (comprimido) disponível em fflate; a ratio check é a defesa real — não o originalSize declarado"
      - "dispatcher.ts: guard MAX_INPUT_BYTES no início de extractContent antes de qualquer alocação/parse"
      - "types.ts: considerar adicionar FILE_TOO_LARGE a ExtractionErrorCode para que callers distingam o caso de arquivo-grande de tipo não suportado"
      - "Cobertura de teste: nenhum teste exercita o bypass de originalSize fraudulento (ZIP com originalSize=1 declarado mas conteúdo real grande)"
deferred: []
human_verification: []
---

# Phase 09: Extraction Infrastructure — Relatório de Verificação

**Phase Goal:** O sistema consegue extrair conteúdo textual de qualquer formato suportado (CSV/XLSX, PNG/JPEG, PDF, TXT) e retornar texto plano via dispatcher único, com validação de segurança de bytes e detecção de PDF sem camada de texto
**Verificado:** 2026-06-03T16:55:00Z
**Status:** gaps_found — 1 gap de segurança bloqueador impede declarar SEC-02 satisfeito
**Re-verificação:** Não — verificação inicial

---

## Goal Achievement

### Success Criteria do ROADMAP (não-negociáveis)

| # | Critério | Status | Evidência |
|---|----------|--------|-----------|
| SC-1 | CSV/XLSX enviado ao extrator retorna schema + amostra como texto plano | ✓ VERIFIED | `csv-xlsx-extractor.ts` existe, usa `parseFile`+`formatSchemaForPrompt`, exporta `MAX_ROWS_PER_SHEET=200`; 13 testes verdes |
| SC-2 | PNG/JPEG retorna linhas/colunas via OCR | ✓ VERIFIED | `image-extractor.ts` existe, wraps `processImageOcr`, serializa tabela Markdown; fixture-mode preservado; testes verdes |
| SC-3 | PDF com texto retorna via unpdf; PDF escaneado retorna erro acionável | ✓ VERIFIED | `pdf-extractor.ts` existe, usa `getDocumentProxy`+`extractText`, heurística `text.length<50` → SCANNED_PDF; A1 descarregada empiricamente |
| SC-4 | TXT retorna conteúdo diretamente | ✓ VERIFIED | `txt-extractor.ts` existe, usa `TextDecoder("utf-8")`, vazio→EMPTY_EXTRACTION; testes verdes |
| SC-5 | Dispatcher roteia sem lógica duplicada; ZIP bomb e bytes inválidos rejeitados antes de processar | ✗ FAILED | O roteamento por tipo existe e funciona (EXT-05 OK). O guard anti-ZIP-bomb existe e está antes do parse (D-11 OK para ameaça por contagem/tamanho honesto). Porém: (a) o guard confia em `originalSize` do central directory, que é metadado controlado pelo atacante — um ZIP crafted com originalSize pequeno declarado mas conteúdo real enorme passa o guard e explode em `XLSX.read`; (b) não existe limite de tamanho de input antes de qualquer alocação. SEC-02 superficialmente presente mas com bypass concreto demonstrável. |

**Score: 4/5 success criteria verified**

---

### Observable Truths (das must_haves dos PLANs)

| # | Truth | Plan | Status | Evidência |
|---|-------|------|--------|-----------|
| T-01 | ExtractionResult discriminated union exportável | 09-01 | ✓ VERIFIED | `types.ts` linha 27: `export type ExtractionResult = ExtractionSuccess \| ExtractionError`; 5 códigos D-09 presentes |
| T-02 | unpdf, file-type, fflate instalados e importáveis | 09-01 | ✓ VERIFIED | `package.json`: unpdf@1.6.2, file-type@22.0.1, fflate@0.8.3; smoke test 3/3 verde |
| T-03 | CSV/XLSX retorna schema + ~10 linhas de amostra (EXT-01) | 09-02 | ✓ VERIFIED | `csv-xlsx-extractor.ts`: `sampleRowsToBlock` + `serializeSheet`; testes CSV simples, XLSX 2-abas, cap D-06 |
| T-04 | XLSX multi-aba concatena com rótulo `## Aba: <nome>` (D-05) | 09-02 | ✓ VERIFIED | `csv-xlsx-extractor.ts` linha 91: `blocks.push(\`## Aba: ${sheetName}\n...\`)` |
| T-05 | Imagem PNG/JPEG retorna tabela Markdown via OCR, fixture-mode preservado (EXT-02) | 09-02 | ✓ VERIFIED | `image-extractor.ts` wraps `processImageOcr` (fixture herdado); `ocrToMarkdown` serializa `\| --- \|` |
| T-06 | TXT retorna conteúdo direto via TextDecoder (EXT-04) | 09-02 | ✓ VERIFIED | `txt-extractor.ts` linha 11: `new TextDecoder("utf-8").decode(buffer)` |
| T-07 | Magic bytes via file-type detectam tipo real, ignorando extensão/MIME (D-10/SEC-02) | 09-03 | ✓ VERIFIED | `byte-validation.ts`: `fileTypeFromBuffer` via dynamic import; 6 testes PNG/JPEG/PDF/XLSX/texto/GIF verdes |
| T-08 | XLSX que excede caps é rejeitado ANTES do parse com ZIP_BOMB (D-11/SEC-02) | 09-03 | ✗ FAILED (parcial) | `zip-guard.ts` existe e é chamado antes de `extractCsvXlsx` no dispatcher (ordering correto). Porém: confia em `info.originalSize` do central directory (attacker-controlled); sem ratio cap; sem per-entry uncompressed cap. Um ZIP com `originalSize=1` declarado por entrada mas deflate stream real de GB passa o guard e explode em `XLSX.read`. Os testes exercitam apenas ZIPs honestos criados por `zipSync` — não exercitam o bypass de metadado fraudulento. |
| T-09 | PDF com texto retorna via unpdf (EXT-03) | 09-03 | ✓ VERIFIED | `pdf-extractor.ts` usa `getDocumentProxy`+`extractText`; teste A1 com PDF real passa |
| T-10 | PDF escaneado (text < 50) retorna SCANNED_PDF, sem fallback (EXT-06/D-12) | 09-03 | ✓ VERIFIED | `pdf-extractor.ts` linha 32: `if (text.trim().length < SCANNED_TEXT_THRESHOLD)` → `SCANNED_PDF`; constante nomeada `SCANNED_TEXT_THRESHOLD=50` |
| T-11 | Dispatcher roteia cada tipo ao extrator correto sem lógica duplicada (EXT-05) | 09-04 | ✓ VERIFIED | `dispatcher.ts`: switch sobre `fileType.kind`; 10 testes de integração; todos os 6 extratores importados e invocados |
| T-12 | Magic bytes e guard anti-ZIP-bomb aplicados ANTES de qualquer parse (SEC-02) | 09-04 | ✓ VERIFIED (ordering) / ✗ FAILED (eficácia) | A ordem `detectFileType → guardXlsxZip → extractCsvXlsx` está correta no dispatcher. A eficácia do guard contra ameaças reais é o problema (ver T-08/CR-01) |
| T-13 | Toda saída do dispatcher é ExtractionResult tipado (D-09) | 09-04 | ✓ VERIFIED | Todos os retornos de `extractContent` são `ExtractionResult`; sem `any` escapes; tsc --noEmit sem erros em extraction/ |
| T-14 | Tipo não suportado retorna código acionável pt-BR | 09-04 | ✓ VERIFIED | Dispatcher retorna `UNSUPPORTED_TYPE` com mensagem pt-BR para GIF e extensões desconhecidas |
| T-15 | Não existe guarda de tamanho de input no dispatcher (CR-02) | 09-04 | ✗ FAILED | `extractContent` aceita `Buffer` arbitrário; dupla alocação `new Uint8Array(buffer)` + `new ArrayBuffer(buffer.length)` antes de qualquer check; sem `MAX_INPUT_BYTES` |

---

## Required Artifacts

| Artifact | Esperado | Status | Detalhes |
|----------|----------|--------|----------|
| `apps/web/src/server/extraction/types.ts` | Contrato ExtractionResult D-09 | ✓ VERIFIED | 28 linhas; 5 error codes; `import "server-only"`; tsc limpo |
| `apps/web/src/server/extraction/byte-validation.ts` | fileTypeFromBuffer + mapeamento (D-10) | ✓ VERIFIED | 57 linhas; dynamic import ESM; mapeia pdf/png/jpg/xlsx/text/unsupported |
| `apps/web/src/server/extraction/zip-guard.ts` | Guard anti-ZIP-bomb via fflate (D-11) | ✓ EXISTS / ✗ EFICÁCIA PARCIAL | 79 linhas; usa unzipSync+filter; implementa caps de contagem e tamanho total. Ausência de ratio cap e per-entry cap torna bypass possível com metadado fraudulento (CR-01). |
| `apps/web/src/server/extraction/pdf-extractor.ts` | unpdf + heurística SCANNED_PDF (D-12) | ✓ VERIFIED | 50 linhas; `SCANNED_TEXT_THRESHOLD=50`; EXT-03/EXT-06 implementados |
| `apps/web/src/server/extraction/csv-xlsx-extractor.ts` | Wrapper parseFile + MAX_ROWS_PER_SHEET=200 | ✓ VERIFIED | 111 linhas; `MAX_ROWS_PER_SHEET` exportado; `## Aba:` presente; `effectiveRowCount = Math.min(schema.rowCount, MAX_ROWS_PER_SHEET)` na serialização |
| `apps/web/src/server/extraction/image-extractor.ts` | Wrapper processImageOcr → Markdown (D-03) | ✓ VERIFIED | 60 linhas; `processImageOcr` + `ocrToMarkdown`; fixture-mode herdado; `buffer.toString("base64")` |
| `apps/web/src/server/extraction/txt-extractor.ts` | TextDecoder UTF-8 (D-04) | ✓ VERIFIED | 22 linhas; `TextDecoder("utf-8")`; EMPTY_EXTRACTION em whitespace |
| `apps/web/src/server/extraction/dispatcher.ts` | extractContent — ponto único EXT-05 | ✓ VERIFIED (roteamento) / ✗ FAILED (CR-02) | 105 linhas; todos os 6 extratores orquestrados; ordering correto; sem MAX_INPUT_BYTES guard |
| `apps/web/tests/extraction/zip-guard-deps.test.ts` | Smoke test de imports | ✓ VERIFIED | 3/3 testes verdes |
| `apps/web/tests/extraction/reuse-extractors.test.ts` | 13 testes TDD extratores de reuso | ✓ VERIFIED | 13/13 verdes |
| `apps/web/tests/extraction/security-extractors.test.ts` | 12 testes segurança | ✓ VERIFIED (cobertura honesta) | 12/12 verdes; nota: testes de ZIP bomb usam zipSync honesto — não exercitam bypass de originalSize fraudulento |
| `apps/web/tests/extraction/dispatcher.test.ts` | 10 testes integração end-to-end | ✓ VERIFIED | 10/10 verdes |

---

## Key Links

| From | To | Via | Status | Detalhes |
|------|----|-----|--------|----------|
| Todos os extratores | `./types.ts` | `import type { ExtractionResult }` | ✓ WIRED | 6 arquivos importam de `./types`; confirmado via grep |
| `csv-xlsx-extractor.ts` | `file-chat-stream.ts` | `import { formatSchemaForPrompt }` | ✓ WIRED | linha 7 de csv-xlsx-extractor.ts; `export function formatSchemaForPrompt` em file-chat-stream.ts:17 |
| `image-extractor.ts` | `ocr-processor.ts` | `import { processImageOcr }` | ✓ WIRED | linha 3 de image-extractor.ts |
| `dispatcher.ts` | todos os 6 extratores + byte-validation + zip-guard | imports + chamadas | ✓ WIRED | 9 imports nas linhas 3-9; todas as funções invocadas no switch |
| `dispatcher.ts` → `zip-guard` → `csv-xlsx-extractor` | ordem de segurança | `guardXlsxZip` antes de `extractCsvXlsx` | ✓ WIRED (ordering) | dispatcher.ts linhas 68-72: guard verifica `ok` antes de chamar extrator |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produz Dados Reais | Status |
|----------|---------------|--------|-------------------|--------|
| `csv-xlsx-extractor.ts` | `schema.sampleRows`, `schema.columns` | `parseFile(buffer, mimeType)` | Sim — parseFile lê o arquivo real via SheetJS | ✓ FLOWING |
| `image-extractor.ts` | `ocrResult.headers`, `ocrResult.rows` | `processImageOcr(base64, mimeType)` | Sim (real) / fixture (sem API key) — fixture-mode herdado | ✓ FLOWING |
| `txt-extractor.ts` | `text` | `TextDecoder.decode(buffer)` | Sim — decodifica buffer de input diretamente | ✓ FLOWING |
| `pdf-extractor.ts` | `text` | `extractText(getDocumentProxy(bytes))` | Sim — unpdf extrai do PDF real | ✓ FLOWING |
| `dispatcher.ts` | resultado tipado | `detectFileType` → extrator correto | Sim — roteamento funcional | ✓ FLOWING |

---

## Behavioral Spot-Checks

| Comportamento | Resultado | Status |
|---------------|-----------|--------|
| Suíte completa de extração (`npx vitest run tests/extraction/`) | **38/38 testes passando** em 5.71s | ✓ PASS |
| `tsc --noEmit` em arquivos de extração | Sem erros nos arquivos de extração | ✓ PASS |
| ExtractionResult contract — 5 códigos | `grep` confirma SCANNED_PDF, INVALID_BYTES, ZIP_BOMB, EMPTY_EXTRACTION, UNSUPPORTED_TYPE | ✓ PASS |
| `extractContent` export | `grep -c 'export async function extractContent'` = 1 | ✓ PASS |
| Todos os 6 extratores orquestrados no dispatcher | 19 ocorrências de `detectFileType\|guardXlsxZip\|extractPdf\|extractImage\|extractCsvXlsx\|extractTxt` | ✓ PASS |
| ZIP bomb com originalSize fraudulento declarado | Não testado — bypass de CR-01 não coberto | ✗ NÃO EXERCITADO |
| Input de tamanho arbitrário rejeitado no dispatcher | Nenhum MAX_INPUT_BYTES encontrado em dispatcher.ts | ✗ FAIL |

---

## Requirements Coverage

| Requirement | Plans | Descrição | Status | Evidência |
|-------------|-------|-----------|--------|-----------|
| EXT-01 | 09-02 | Extrai CSV/XLSX com schema + amostra | ✓ SATISFIED | `extractCsvXlsx` + 13 testes; REQUIREMENTS.md marcado como `[x]` |
| EXT-02 | 09-02 | Extrai PNG/JPEG via OCR | ✓ SATISFIED | `extractImage` + testes fixture-mode; REQUIREMENTS.md `[x]` |
| EXT-03 | 09-03 | Extrai PDF com camada de texto via unpdf | ✓ SATISFIED | `extractPdf` + teste A1; REQUIREMENTS.md `[x]` |
| EXT-04 | 09-02 | Lê TXT via TextDecoder | ✓ SATISFIED | `extractTxt` + testes; REQUIREMENTS.md `[x]` |
| EXT-05 | 09-04 | Dispatcher único roteia ao extrator correto | ✓ SATISFIED | `extractContent` + 10 testes integração; REQUIREMENTS.md `[x]` |
| EXT-06 | 09-03 | PDF escaneado → erro acionável orientando OCR | ✓ SATISFIED | heurística `text<50→SCANNED_PDF`; sem fallback automático; REQUIREMENTS.md `[x]` |
| SEC-02 | 09-01, 09-03, 09-04 | Valida magic bytes + protege contra ZIP bomb | ✗ PARTIALLY BLOCKED | Magic bytes: OK. Guard zip existe e está na ordem certa. Porém o guard confia em metadado controlado pelo atacante (CR-01) e não existe limite de input (CR-02) — o objetivo anti-DoS é apenas parcialmente satisfeito. REQUIREMENTS.md marcado como `[x]` prematuramente. |

---

## Anti-Patterns

| Arquivo | Linha | Padrão | Severidade | Impacto |
|---------|-------|--------|-----------|---------|
| `zip-guard.ts` | 45 | `total += info.originalSize` — soma metadado attacker-controlled sem ratio cap | 🛑 BLOCKER | Um ZIP bomb com `originalSize` forjado (ex.: 1 byte declarado) escapa do guard com total mínimo e explode em `XLSX.read` — exatamente o DoS que SEC-02 deve prevenir |
| `dispatcher.ts` | 44–49 | Dupla alocação `new Uint8Array(buffer)` + `new ArrayBuffer(buffer.length)` sem guarda de tamanho | 🛑 BLOCKER | Input de N bytes causa 2N bytes de alocação imediata; sem MAX_INPUT_BYTES antes disso |
| `zip-guard.ts` | 28 | `_lastOriginalSizes` — estado mutável global compartilhado entre requisições | ⚠️ WARNING | Concorrência: duas uploads simultâneas de XLSX podem cruzar os sizes capturados; informação pode vazar entre requests se `getLastOriginalSizes()` for chamado em produção |
| `csv-xlsx-extractor.ts` | 83–91 | Workbook lido N+1 vezes (uma para SheetNames + uma por aba via parseFile) | ⚠️ WARNING | `parseFile` chama `XLSX.read` internamente por aba; amplifica custo de parse para workbooks grandes com muitas abas |
| `csv-xlsx-extractor.ts` | 104–110 | `catch {}` mapeia todas as exceções a `EMPTY_EXTRACTION` | ⚠️ WARNING | `INVALID_BYTES` declarado em `ExtractionErrorCode` mas nunca emitido; falha de parse e arquivo vazio indistinguíveis para o caller |

Nota: nenhum marcador `TBD`, `FIXME` ou `XXX` encontrado nos arquivos da fase.

---

## Análise das Critical Findings do Code Review (CR-01 e CR-02)

### CR-01: zip-guard.ts confia em `originalSize` attacker-controlled

**Verificação contra o codebase:**

O código real em `zip-guard.ts:45` é:
```typescript
total += info.originalSize; // tamanho DESCOMPACTADO lido do central directory
```

Não existe referência a `info.size` (tamanho comprimido), sem `MAX_RATIO`, sem `MAX_ENTRY_UNCOMPRESSED`. O central directory do ZIP é parte dos dados de entrada não confiáveis — um atacante pode escrever `originalSize: 0` ou `1` para cada entrada enquanto os deflate streams reais contêm gigabytes de dados. Como o filter sempre retorna `false` (não descompacta), o guard não tem como saber o tamanho real da saída. Resultado: um ZIP bomb com `originalSize` forjado passa pelo guard e explode em `XLSX.read` — exatamente o ataque que D-11/SEC-02 deve prevenir.

**O teste de discharge A2 prova que `originalSize` é confiável para XLSX *legítimo*** — não que seja imune a manipulação em XLSX *malicioso*. São condições diferentes. A2 confirmou o comportamento normal; a fraqueza de segurança é o cenário adversarial.

**Veredito: SEC-02/D-11 superficialmente presente, bypass concreto demonstrável. BLOCKER.**

### CR-02: Sem guarda de input-size no dispatcher

**Verificação contra o codebase:**

`dispatcher.ts:44-49` — sem nenhuma verificação de `buffer.length` antes das alocações. Nenhuma constante `MAX_INPUT_BYTES` em nenhum arquivo de extração. O caminho `detectFileType` → `XLSX.read` → `unpdf` → `Buffer.toString("base64")` (OCR) é completamente desbloqueado para inputs de tamanho arbitrário.

**Veredito: ausência de limite de input é uma omissão de segurança real, não hipotética. BLOCKER.**

---

## Gaps Summary

**1 gap bloqueador** divide-se em duas falhas de segurança relacionadas que juntas impedem que SEC-02 seja declarado satisfeito:

**CR-01 (BLOCKER):** O guard anti-ZIP-bomb em `zip-guard.ts` confia em `info.originalSize` do central directory do ZIP — campo gravável pelo atacante — sem verificar a proporção entre tamanho comprimido (`info.size`) e declarado (`info.originalSize`). Um arquivo XLSX malicioso que declare `originalSize=1` por entrada passa pelo guard (total declarado: N entradas × 1 byte = tiny) e depois expande completamente em memória quando `XLSX.read` descomprime. O guard está na ordem certa (antes do parse), mas não defende contra o vetor de ataque real de um ZIP bomb.

**CR-02 (BLOCKER):** Não existe guarda de tamanho de input em `extractContent`. Um arquivo de 200 MB recebe dupla alocação imediata de ~400 MB (Uint8Array + ArrayBuffer) antes de qualquer verificação de tipo ou segurança.

Ambas as falhas são reparáveis com modificações locais e cirúrgicas nos dois arquivos afetados. Os outros 4 success criteria (EXT-01/02/03/04/06, dispatcher de roteamento) estão corretamente implementados e com testes verdes.

---

_Verificado: 2026-06-03T16:55:00Z_
_Verificador: Claude (gsd-verifier)_

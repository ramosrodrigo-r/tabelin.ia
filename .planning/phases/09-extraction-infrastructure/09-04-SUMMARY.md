---
phase: 09
plan: 04
subsystem: extraction
tags: [dispatcher, routing, magic-bytes, zip-guard, EXT-05, SEC-02]
dependency_graph:
  requires: [09-02, 09-03]
  provides: [dispatcher.ts — extractContent como ponto único de extração para Phase 10]
  affects: [Phase 10 upload routes]
tech_stack:
  added: []
  patterns:
    - Dispatcher de roteamento com switch em kind detectado por magic bytes
    - Cópia explícita de ArrayBuffer via new ArrayBuffer(n) + Uint8Array.set() para isolamento de pool
    - ZIP_BOMB construído a partir de XLSX real (descompactar + adicionar entradas extras + recompactar)
key_files:
  created:
    - apps/web/src/server/extraction/dispatcher.ts
    - apps/web/tests/extraction/dispatcher.test.ts
  modified: []
decisions:
  - "Conversão de Buffer para ArrayBuffer via cópia explícita (não buffer.buffer.slice) — o pool compartilhado do Node.js causa leitura incorreta no ambiente jsdom do vitest"
  - "ZIP_BOMB em testes criado extraindo XLSX real via fflate.unzipSync + adicionando 996 entradas extras + recompactando — garante magic bytes xlsx mantidos pelo file-type"
metrics:
  duration: ~10 min
  completed_date: "2026-06-03"
  tasks_completed: 2
  files_changed: 2
---

# Phase 09 Plan 04: Dispatcher de extração (EXT-05/SEC-02) Summary

Dispatcher único `extractContent` que orquestra todos os componentes da infraestrutura de extração das Plans 02/03. Detecta o tipo real por magic bytes, aplica o guard anti-ZIP-bomb antes do parse XLSX, e roteia ao extrator correto — entregando sempre `ExtractionResult` tipado.

## What Was Built

### `dispatcher.ts` — ponto único de extração (EXT-05)

Função `extractContent(buffer: Buffer, declaredName: string): Promise<ExtractionResult>` que:

1. Converte `Buffer` para `Uint8Array` e `ArrayBuffer` (centralização das conversões, Pitfall 6)
2. Chama `detectFileType(bytes)` para detecção por magic bytes (D-10)
3. Para binários reconhecidos:
   - `xlsx`: chama `guardXlsxZip(bytes)` PRIMEIRO; ZIP_BOMB curto-circuita sem parsear (SEC-02/D-11)
   - `png`/`jpg`: chama `extractImage(buffer, mimeType)` com mimeType mapeado
   - `pdf`: chama `extractPdf(bytes)`
4. Para `"text"` (sem magic bytes): roteia por extensão de `declaredName`
   - `.csv` → `extractCsvXlsx(arrayBuffer, "csv", declaredName)`
   - `.txt` → `extractTxt(arrayBuffer)`
   - outros → `UNSUPPORTED_TYPE`
5. Para `"unsupported"` (binário desconhecido) → `UNSUPPORTED_TYPE`

### `dispatcher.test.ts` — testes de integração end-to-end

10 testes cobrindo todos os caminhos do diagrama de arquitetura (RESEARCH 134-178):

| Teste | Caminho |
|-------|---------|
| CSV real | texto sem magic bytes + .csv |
| XLSX multi-aba | binário xlsx + `## Aba:` para cada aba |
| PNG (fixture-mode) | binário png → extractImage |
| JPEG (fixture-mode) | binário jpg → extractImage |
| TXT | texto sem magic bytes + .txt |
| SEC-02 ZIP_BOMB | xlsx malicioso excede MAX_ENTRIES → code: ZIP_BOMB |
| D-10 magic bytes > extensão | PNG com nome .txt → roteado como imagem |
| GIF → UNSUPPORTED_TYPE | binário gif → kind unsupported |
| Extensão não suportada | texto com .dat → UNSUPPORTED_TYPE |
| ZIP_BOMB curto-circuita | XLSX malicioso → ZIP_BOMB sem parsear |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Conversão incorreta de Buffer para ArrayBuffer no ambiente jsdom**
- **Encontrado durante:** Task 1 (fase GREEN)
- **Problema:** `buffer.buffer.slice(byteOffset, byteOffset + length)` retornava ArrayBuffer com conteúdo incorreto no ambiente jsdom do vitest — `XLSX.read()` lia apenas `Sheet1` em vez das abas reais
- **Causa raiz:** O `Buffer` Node.js pode compartilhar o `ArrayBuffer` subjacente de um pool (`new Buffer(size)` pooled), e no jsdom a cópia do `Buffer.from(Uint8Array)` pode ter byteOffset incorreto
- **Fix:** Substituído por cópia explícita: `new ArrayBuffer(buf.length)` + `new Uint8Array(ab).set(buf)`
- **Arquivos modificados:** `apps/web/src/server/extraction/dispatcher.ts`
- **Commit:** 90adfcd

**2. [Rule 1 - Bug] ZIP_BOMB sintético não era detectado como XLSX pelo file-type**
- **Encontrado durante:** Task 2 (testes de integração)
- **Problema:** `makeZipBombBuffer` criava um ZIP genérico com entradas `.txt` via fflate — `file-type` detectava como `zip` (kind: "unsupported"), não `xlsx`, resultando em UNSUPPORTED_TYPE em vez de ZIP_BOMB
- **Causa raiz:** `file-type` detecta XLSX verificando a presença de `[Content_Types].xml` e estrutura de OfficeOpenXML dentro do ZIP; um ZIP genérico não tem esses arquivos
- **Fix:** Novo `makeZipBombBuffer` descompacta XLSX real (fflate.unzipSync), adiciona 996 entradas extras para exceder MAX_ENTRIES=1000, e recompacta — mantendo os magic bytes de XLSX
- **Arquivos modificados:** `apps/web/tests/extraction/dispatcher.test.ts`
- **Commit:** 90adfcd

## Success Criteria Verification

- [x] `extractContent` detecta tipo por magic bytes (detectFileType)
- [x] Guard anti-ZIP-bomb aplicado ANTES do parse XLSX (SEC-02)
- [x] Binário com nome `.txt` mas magic bytes PNG é roteado como imagem (D-10)
- [x] Toda saída é `ExtractionResult` tipado com mensagens em pt-BR (D-09)
- [x] Suíte completa de extração: `npx vitest run tests/extraction/` → 38 testes passando (4 arquivos)
- [x] `grep -c 'export async function extractContent'` → 1
- [x] `grep -cE 'detectFileType|guardXlsxZip|extractPdf|extractImage|extractCsvXlsx|extractTxt'` → 19 (≥6)
- [x] `npx tsc --noEmit` sem erros em extraction/dispatcher.ts

## TDD Gate Compliance

- RED commit: `6da7786` — `test(09-04): add failing tests for extractContent dispatcher (RED)`
- GREEN commit: `90adfcd` — `feat(09-04): implement extractContent dispatcher — routing by magic bytes (EXT-05/SEC-02)`

## Known Stubs

Nenhum — o dispatcher é ponto de orquestração puro, sem dados hard-coded.

## Threat Flags

Nenhuma nova superfície de ataque introduzida. O dispatcher é a camada de orquestração — as superfícies de risco (bytes não confiáveis, ZIP_BOMB) já estavam modeladas no threat_model do plano e foram mitigadas (T-09-04-01, T-09-04-02, T-09-04-03, T-09-04-04).

## Self-Check: PASSED

- `apps/web/src/server/extraction/dispatcher.ts` — FOUND
- `apps/web/tests/extraction/dispatcher.test.ts` — FOUND
- commit `6da7786` (RED) — FOUND
- commit `90adfcd` (GREEN) — FOUND
- 38/38 testes da suíte extraction passando

---
phase: 09
slug: extraction-infrastructure
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-03
---

# Fase 09 — Segurança: Infraestrutura de Extração

> Contrato de segurança da fase: registro de ameaças, riscos aceitos e trilha de auditoria.

---

## Fronteiras de Confiança

| Fronteira | Descrição | Dado que Cruza |
|-----------|-----------|----------------|
| npm registry → projeto | Pacotes de terceiros entram na árvore de dependências | Código executável (unpdf, file-type, fflate) |
| cliente HTTP → extractContent | Ponto único de entrada de bytes não confiáveis | Conteúdo de arquivo arbitrário (binário/texto) |
| bytes do arquivo → extratores | Conteúdo não confiável decodificado/parseado | Buffer bruto; texto decodificado; prompt de IA |
| ZIP central directory → guardXlsxZip | Metadados do central directory são escritos pelo criador do ZIP | info.originalSize (controlável pelo atacante); info.size (bytes reais) |

---

## Registro de Ameaças

| Threat ID | Categoria | Componente | Disposição | Mitigação | Status |
|-----------|-----------|------------|------------|-----------|--------|
| T-09-SC | Tampering | npm install unpdf/file-type/fflate | mitigate | Gate blocking-human (Task 2 do 09-01-PLAN) honrado; versões pinadas exatas em package.json | closed |
| T-09-01-01 | Tampering | types.ts | accept | Arquivo de tipos puro, sem I/O; superfície nula | closed |
| T-09-02-01 | Tampering | conteúdo do arquivo → prompt | mitigate | formatSchemaForPrompt emite delimitadores `---`/`DADOS DO ARQUIVO` anti-injection (file-chat-stream.ts:17,54-60) | closed |
| T-09-02-02 | Information Disclosure | buffer bruto em logs | mitigate | PRIV-02: zero console.log em todos os extratores; catch retorna código tipado | closed |
| T-09-02-03 | Denial of Service | XLSX multi-aba grande | mitigate | MAX_ROWS_PER_SHEET=200 exportado e aplicado via effectiveRowCount (csv-xlsx-extractor.ts:16,44) | closed |
| T-09-03-01 | Spoofing | byte-validation.ts | mitigate | fileTypeFromBuffer (magic bytes) via dynamic import; extensão/MIME ignorados para binários (byte-validation.ts:33-35) | closed |
| T-09-03-02 | Denial of Service | zip-guard.ts | mitigate | unzipSync com filter:false; cap 50MB total + 1000 entradas; precede XLSX.read no dispatcher (zip-guard.ts:59-85, dispatcher.ts:91-95) | closed |
| T-09-03-03 | Denial of Service | pdf-extractor.ts | mitigate | unpdf getDocumentProxy+extractText + try/catch → EMPTY_EXTRACTION sem logar conteúdo (pdf-extractor.ts:27-49) | closed |
| T-09-03-04 | Information Disclosure | logs de bytes raw em erro | mitigate | PRIV-02: catch em todos os extratores retorna código tipado; grep de console.log em 6 arquivos retorna zero ocorrências | closed |
| T-09-03-05 | Tampering | PDF escaneado silencioso | accept | EXT-06/D-12: heurística text<50 → SCANNED_PDF acionável; sem fallback automático (decisão de produto) | closed |
| T-09-04-01 | Spoofing | dispatcher (extensão declarada) | mitigate | Binários roteados pelo kind DETECTADO; extensão só usada no branch "text" (dispatcher.ts:78-98) | closed |
| T-09-04-02 | Denial of Service | dispatcher caminho xlsx | mitigate | guardXlsxZip invocado na linha 91 antes de extractCsvXlsx na linha 95 do dispatcher | closed |
| T-09-04-03 | Information Disclosure | erros do dispatcher | mitigate | Retornos são ExtractionResult tipado com mensagens pt-BR; nenhum byte/stack exposto | closed |
| T-09-04-04 | Tampering | input não roteável | mitigate | Default explícito UNSUPPORTED_TYPE em duas posições (dispatcher.ts:104,124); sem fall-through silencioso | closed |
| T-09-05-01 | Tampering | zip-guard.ts — info.originalSize | mitigate | Ratio check info.originalSize/info.size > MAX_RATIO=100 usando info.size comprimido (zip-guard.ts:78) | closed |
| T-09-05-02 | Denial of Service | zip-guard.ts — per-entry | mitigate | MAX_ENTRY_UNCOMPRESSED=25MB; info.originalSize > MAX_ENTRY_UNCOMPRESSED lança zip-bomb-cap (zip-guard.ts:71-73) | closed |
| T-09-05-03 | Denial of Service | dispatcher — dupla alocação | mitigate | MAX_INPUT_BYTES=25MB guard na linha 58, antes de new Uint8Array (linha 67) e new ArrayBuffer (linha 71) | closed |
| T-09-05-04 | Information Disclosure | mensagem FILE_TOO_LARGE | mitigate | Mensagem revela apenas limite público (25 MB); sem bytes/stack (dispatcher.ts:62) | closed |
| T-09-05-SC | Tampering | npm installs | accept | Plano 09-05 não instala pacotes novos; sem risco de supply chain adicional | closed |

*Status: open · closed*
*Disposição: mitigate (implementação verificada no código) · accept (risco documentado)*

---

## Log de Riscos Aceitos

| Risk ID | Ref Ameaça | Justificativa | Aceito Por | Data |
|---------|------------|---------------|------------|------|
| AR-09-01 | T-09-01-01 | types.ts é contrato de tipos puro sem I/O nem processamento de entrada externa; superfície de ataque nula por construção | executor da fase (09-01-PLAN Task 1) | 2026-06-03 |
| AR-09-02 | T-09-03-05 | PDF escaneado retorna SCANNED_PDF acionável (orienta o usuário ao tool OCR) sem fallback automático para Vision; decisão de produto baseada em custo/latência | executor da fase (09-03-PLAN Task 3) | 2026-06-03 |
| AR-09-03 | T-09-05-SC | Plano 09-05 modifica apenas arquivos existentes que já usam fflate (verificado e instalado em 09-01); nenhum pacote novo introduzido | executor da fase (09-05-PLAN) | 2026-06-03 |

*Riscos aceitos não reaparecem em execuções futuras de auditoria.*

---

## Deferred Items (não bloqueadores)

| Item | Arquivo | Linha | Descrição | Impacto |
|------|---------|-------|-----------|---------|
| WR-07 | zip-guard.ts | 37 | `_lastOriginalSizes` é estado mutável global compartilhado entre requisições paralelas | Organizacional/concorrência; não afeta SEC-02 nem nenhum success criterion da fase |
| WR-08 | security-extractors.test.ts | 210-263 | 3 testes top-level `it()` fora de `describe` (fechamento prematuro) | Organizacional apenas; Vitest executa corretamente |

---

## Trilha de Auditoria de Segurança

| Data Auditoria | Ameaças Total | Fechadas | Abertas | Executado Por |
|----------------|---------------|----------|---------|---------------|
| 2026-06-03 | 19 | 19 | 0 | gsd-security-auditor (claude-sonnet-4-6) |

---

## Sign-Off

- [x] Todas as ameaças têm uma disposição (mitigate / accept)
- [x] Riscos aceitos documentados no Log de Riscos Aceitos
- [x] `threats_open: 0` confirmado
- [x] `status: verified` definido no frontmatter

**Aprovação:** verificado 2026-06-03

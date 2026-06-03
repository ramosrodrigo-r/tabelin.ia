# Phase 9: Extraction Infrastructure - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Um dispatcher único, isolado no backend, que recebe um arquivo (CSV/XLSX, PNG/JPEG, PDF, TXT) e devolve **texto plano** pronto para injeção no prompt — reusando o parser de schema (Phase 4) e o OCR Vision (Phase 5) existentes, adicionando `unpdf` para PDF, com validação de segurança de bytes (magic bytes + anti-ZIP-bomb) e detecção de PDF sem camada de texto.

Cobre os requisitos **EXT-01 a EXT-06** e **SEC-02**.

**Fora desta fase** (delegado a outras fases do v1.2):
- Injeção no system prompt, delimitadores anti-injection (SEC-01), persistência em `attachmentContext`, truncagem por `MAX_EXTRACTED_CHARS`, Pro-gate/cota — **Phase 10**.
- UI de anexo, feedback de dois estágios, painel de transparência, CTA Pro — **Phase 11**.
- Absorver/remover os tools dedicados OCR e File Analysis — fora de escopo do milestone (mantidos).

</domain>

<decisions>
## Implementation Decisions

### Formato do texto extraído (grounding)
- **D-01:** Para CSV/XLSX, **reusar `formatSchemaForPrompt`** (em `apps/web/src/server/ai/file-chat-stream.ts`) como base da serialização — mantém consistência com o tool File Analysis e já traz delimitadores anti-injection. Zero formato novo.
- **D-02:** Além do schema (colunas+tipos+exemplos por coluna que `formatSchemaForPrompt` já produz), **anexar ~10 linhas completas de amostra** ao texto extraído (o serializador atual NÃO inclui linhas completas — isso é uma extensão a implementar).
- **D-03:** Para OCR (PNG/JPEG), o `ocr-processor.ts` retorna `{ headers, rows }` estruturado; **serializar como tabela Markdown** (`| col | col |`) para o texto plano do dispatcher.
- **D-04:** PDF (`unpdf`) e TXT retornam texto naturalmente — usar o texto direto, sem reformatação tabular.

### XLSX multi-aba & amostragem
- **D-05:** No anexo universal não há seletor de aba; **extrair TODAS as abas**, cada uma prefixada por um rótulo `## Aba: <nome>`. (O `file-parser.ts` atual recebe um `sheetName` único → implica iterar as abas do workbook.)
- **D-06:** Cap de **~200 linhas por aba** no fluxo de anexo (em vez de reusar o `MAX_ROWS=1000` do parser atual) — economiza tokens e reforça anti-DoS, dado que extraímos potencialmente todas as abas.

### Arquitetura de reuso
- **D-07:** Criar um **novo módulo `apps/web/src/server/extraction/`** que **envolve (wraps) as funções puras existentes** (`file-analysis/file-parser.ts`, `ai/ocr-processor.ts`) — **sem tocar** nas rotas/repos dos tools dedicados. Isola risco de regressão; os tools atuais continuam intactos.
- **D-08:** Estrutura espelhando `server/file-analysis/`: um **dispatcher** + um arquivo por formato (ex.: `csv-xlsx`, `image-ocr`, `pdf`, `txt`). EXT-05 = roteamento por tipo sem lógica duplicada nos tools.

### Contrato de erro & segurança de bytes (SEC-02)
- **D-09:** O dispatcher expõe **erros tipados com código** (discriminated union / result type), p.ex.: `SCANNED_PDF`, `INVALID_BYTES`, `ZIP_BOMB`, `EMPTY_EXTRACTION`, `UNSUPPORTED_TYPE`, cada um com mensagem acionável em **pt-BR**. A UI da Phase 11 mapeia código→UX/CTA (ex.: `SCANNED_PDF` → orientar ao tool de OCR, conforme EXT-06).
- **D-10:** Validar **magic bytes via lib `file-type`** (detecção por assinatura), não apenas extensão/MIME declarado. (A rota atual `file-analysis/upload/route.ts` valida só extensão+MIME — esta fase eleva o padrão.)
- **D-11:** Proteção **anti-ZIP-bomb no XLSX**: antes de abrir o workbook, **limitar tamanho descompactado total e número de entradas** do ZIP, rejeitando acima do cap. (Confiar no `MAX_ROWS` NÃO protege — o `xlsx` descompacta tudo em memória antes do parse.)
- **D-12:** EXT-06: PDF escaneado detectado por `text.length < 50` após `unpdf` → retornar `SCANNED_PDF` (sem fallback automático para Vision).

### Claude's Discretion
- Limites numéricos exatos do cap anti-ZIP-bomb (tamanho descompactado / nº de entradas) — escolher valor seguro razoável na implementação.
- Formato exato da tabela Markdown do OCR e do bloco de ~10 linhas de amostra.
- Nomes finais dos arquivos dentro de `server/extraction/`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos & roadmap
- `.planning/REQUIREMENTS.md` — EXT-01..06 e SEC-02 (definições normativas dos requisitos desta fase).
- `.planning/ROADMAP.md` § "Phase 9: Extraction Infrastructure" — goal e success criteria.
- `.planning/PROJECT.md` — milestone v1.2 Anexos Universais, restrição D-07 (arquivo bruto efêmero).

### Código a reaproveitar (ver code_context)
- `apps/web/src/server/file-analysis/file-parser.ts` — parser CSV/XLSX (FileSchema, MAX_ROWS, detecção de delimitador).
- `apps/web/src/server/ai/file-chat-stream.ts` § `formatSchemaForPrompt` — serializador de schema com delimitadores anti-injection.
- `apps/web/src/server/ai/ocr-processor.ts` — OCR Vision retornando `{ headers, rows }`.
- `apps/web/src/app/api/tools/file-analysis/upload/route.ts` — validação atual (extensão+MIME, size ≤5MB) a ser superada por magic bytes.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`file-parser.ts`** (`server/file-analysis/`): módulo `server-only` puro; produz `FileSchema` (colunas+tipos+amostra), detecta `;` vs `,`, `MAX_ROWS=1000`. Recebe `sheetName` único → iterar para multi-aba (D-05).
- **`formatSchemaForPrompt`** (`server/ai/file-chat-stream.ts`): já serializa schema para texto com delimitadores anti-injection. Base de D-01/D-02.
- **`ocr-processor.ts`** (`server/ai/`): OCR Vision; retorna `{ headers, rows }` (estruturado, ainda não texto) → serializar p/ Markdown (D-03). Respeita modo fixture sem OPENAI_API_KEY.

### Established Patterns
- Módulos de servidor marcados `import "server-only"`; lógica de extração pura separada das rotas.
- Modo fixture sem `OPENAI_API_KEY`: extratores que usam IA (OCR) devem servir fixture quando a chave ausente — manter no dispatcher.
- pt-BR em mensagens voltadas ao usuário (incl. mensagens de erro tipadas — D-09).

### Integration Points
- Novo `server/extraction/` consumido pelos route handlers dos 5 tools de texto — mas a integração nas rotas/Pro-gate é **Phase 10**, não esta.
- `unpdf` é dependência nova a adicionar nesta fase (front-loaded, conforme roadmap).
- `file-type` é dependência nova para validação de magic bytes (D-10).

</code_context>

<specifics>
## Specific Ideas

- Saída do dispatcher é **texto plano único por arquivo**; tabular vira schema+~10 linhas (CSV/XLSX) ou tabela Markdown (OCR); XLSX multi-aba concatenado com rótulos `## Aba:`.
- Contrato de erro com códigos enumerados pensados para a UI da Phase 11 ramificar comportamento (especialmente `SCANNED_PDF` → CTA para o tool de OCR).

</specifics>

<deferred>
## Deferred Ideas

- Fallback OCR automático para PDFs escaneados (converter páginas → Vision) — explicitamente fora (EXT-06 sem fallback); custo/latência a validar com uso Pro real.
- Suporte a `.docx`/`.odt`, múltiplos arquivos por mensagem, redação automática de CPF/CNPJ — já listados como Future Requirements no REQUIREMENTS.md.

None novos surgiram — discussão permaneceu dentro do escopo da fase.

</deferred>

---

*Phase: 9-extraction-infrastructure*
*Context gathered: 2026-06-03*

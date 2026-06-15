---
phase: 18
slug: remover-tools-avulsos-ocr-file-analysis-reduzir-dispatcher
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-15
---

# Phase 18 — Security

> Contrato de segurança da fase: registro de ameaças, riscos aceitos e trilha de auditoria.
> Fase de **remoção pura** — o objetivo de segurança é confirmar que a superfície de ataque de upload/OCR/tools avulsos foi de fato eliminada e que o dispatcher reduzido não tem caminho para ferramentas removidas.

---

## Trust Boundaries

| Boundary | Descrição | Dados Cruzando |
|----------|-----------|----------------|
| Browser → /api/tools/* (removidas) | Diretórios deletados; Next.js App Router retorna 404 nativo | nenhum (rota inexistente) |
| Browser → /workspace/{sql,regex,scripts,templates,ocr,file-analysis} (removidas) | Páginas deletadas; 404 nativo | nenhum (página inexistente) |
| Browser → POST /api/chat/unified | Único ponto de entrada do chat; auth (`getSessionFromCookieHeader`) + validação de prompt/intent preservadas | prompt, anexo opcional (CSV/XLSX/imagem), specOverride (planilha viva) |
| /api/chat/unified → extraction/dispatcher.ts → {csv-xlsx-extractor, image-extractor} | Caminho de ingestão genérico de anexos preservado e desacoplado do OCR/File-Analysis removidos | conteúdo do arquivo anexado |
| Histórico persistido → RenderDispatcher / serializeAssistant / intentFromPayload | Payloads antigos com `kind` removido não devem quebrar render nem montagem de contexto | JSON de exchanges antigos |
| @tabelin/shared package boundary | Exports reduzidos não quebram consumidores remanescentes; pacote privado (não publicado) | tipos/schemas internos |

---

## Threat Register

| Threat ID | Categoria | Componente | Disposição | Mitigação | Status |
|-----------|-----------|-----------|------------|-----------|--------|
| T-18-01 | Information Disclosure | Rotas `/api/tools/{formula,sql,regex,scripts,template}/*` | mitigate | Diretórios inexistentes (find vazio); 404 nativo do App Router | closed |
| T-18-02 | Tampering | `copy-button.tsx` consumido por `render-dispatcher.tsx` | mitigate | `CopyButton` promovido para `components/app/copy-button.tsx`; dispatcher posteriormente reescrito (Wave 4/6) sem dependência — sem import quebrado | closed |
| T-18-03 | Denial of Service | Cobertura genérica de `buildToolContextMessages` ao deletar testes de rota | mitigate | Asserções genéricas preservadas em `tests/context-messages.test.ts` (27 testes pós-redução) | closed |
| T-18-04 | Information Disclosure | Rota/página/feature/processor OCR + pacote shared OCR | mitigate | `api/tools/ocr`, `workspace/ocr`, `features/ocr`, `ocr-processor.ts`, `packages/shared/src/ocr/*` todos inexistentes (find vazio) | closed |
| T-18-05 | Tampering | Remover `image-extractor.ts` por engano | mitigate | `image-extractor.ts` preservado e desacoplado: nenhum `import` de `ocr-processor`/`processImageOcr` (apenas menção em comentário, linha 121) | closed |
| T-18-06 | Tampering | `ocrPayloadSchema` quebra route.ts antes da Wave 2 | accept | Vermelho transitório esperado; route.ts pós-Wave 2 não importa schema OCR — sem `case "ocr"` na fonte (grep vazio) | closed |
| T-18-07 | Information Disclosure | Rotas/página/feature File Analysis + stream/repository | mitigate | `api/tools/file-analysis`, `workspace/file-analysis`, `features/file-analysis`, `file-chat-stream.ts`, `file-repository.ts`, `cleanup-job.ts` inexistentes (find vazio) | closed |
| T-18-08 | Tampering | Remover `file-parser.ts`/`csv-xlsx-extractor.ts` por engano | mitigate | Ambos preservados: `server/file-analysis/file-parser.ts` e `server/extraction/csv-xlsx-extractor.ts` presentes | closed |
| T-18-09 | Denial of Service | `instrumentation.ts` referencia `cleanup-job.ts` deletado | mitigate | `instrumentation.ts` é `register(){}` vazio — nenhum import de cleanup-job/file-analysis (grep vazio) | closed |
| T-18-10 | Tampering | `switch` inconsistente / símbolo de branch removido por engano | mitigate | route.ts sem nenhum `case` de tool removido nem `unified_table` no dispatch (grep vazio); typecheck verde por SUMMARY | closed |
| T-18-11 | Denial of Service | Fallback do `case "unified_table"` lança exceção não tratada | mitigate | route.ts não contém nenhum `throw`; dispatch binário usa `createEventStream` (linha 343) | closed |
| T-18-12 | Information Disclosure | Auth (401) e validação de prompt/intent (400) preservados | mitigate | `getSessionFromCookieHeader` → 401 (linha 277); `validatePrompt` → 400 (linha 284); `validateOptionalIntent` → 400 (linhas 289/294) | closed |
| T-18-SC | Tampering | Supply chain (npm/pip/cargo installs) | accept | Fase de remoção pura; `tech-stack.added: []` em todos os 8 SUMMARYs — nenhuma instalação de pacote | closed |
| T-18-13 | Tampering | Enum reduzido rejeita valores antigos (`sql`/`ocr`/`tabela`) com 400 | mitigate | `unifiedIntentSchema`/`overrideIntentSchema` = `z.enum(["sheet_operation","qa"])` (schema.ts); `validateOptionalIntent` usa `.safeParse()` (route.ts:125) → valores antigos retornam 400 | closed |
| T-18-14 | Information Disclosure | `assistantPayload.kind` antigo causa erro de parse não tratado | accept | Camada de persistência opera sobre `toolKind`/`assistantPayload` (JSON livre), sem `.parse()` estrito; parse tratado no RenderDispatcher (T-18-16) | closed |
| T-18-15 | Denial of Service | Fallback binário lança exceção para casos não cobertos | mitigate | route.ts sem `throw`; ambos os branches (`sheet_operation`/`qa`) resolvem via `createEventStream` com resposta determinística (linhas 197/230/256/343) | closed |
| T-18-16 | Information Disclosure | `switch (payload.kind)` sem `default` renderiza nada silenciosamente | mitigate | `render-dispatcher.tsx` tem `default: return null` explícito; apenas `qa_response`/`table_spec` tratados | closed |
| T-18-17 | Information Disclosure | `qaResponsePayloadSchema` aceita `content` vazio → card vazio | mitigate | `content: z.string().trim().min(1)` (schema.ts:77) | closed |
| T-18-18 | Information Disclosure | `unifiedCompletePayloadSchema.parse()` falha com `kind` antigo | accept (nesta plan) | Carregamento de `initialExchanges` tratado no Plan 07 via `intentFromPayload`/`serializeAssistant` com `default: return null` — confirmado abaixo | closed |
| T-18-19 | Information Disclosure | `intentFromPayload` recebe `kind` desconhecido de histórico antigo | mitigate | `intentFromPayload` (unified-chat-tool.tsx:52) com `default:` → `null`; `IntentPill` condicional não renderiza | closed |
| T-18-20 | Tampering | `serializeAssistant` recebe payload antigo com `kind` removido | mitigate | `serializeAssistant` (context-messages.ts:75) `switch` apenas `qa_response`/`table_spec` + `default: return null` (linhas 98-100) → exchange pulada na montagem de contexto | closed |
| T-18-21 | Denial of Service | Remoção de `specOverride`/`overrideGenerate` quebra requests em voo | accept | `SubmitUnifiedChatInput` reduzido a `{prompt,file,overrideIntent,lastIntent}` (use-unified-chat-stream.ts:23-28); `overrideGenerate` removido; `specOverride` retido como payload legítimo da planilha viva (`workspaceState.spec`, linha 77). Campos órfãos em FormData/JSON são no-op via `asString()` — sem 500 | closed |
| T-18-22 | Tampering | Remoção de `entitlements.ts`/`quota-service.ts` deixa unified sem quota | accept | Fora de escopo da Phase 18 (decisão de Phase 17, RESEARCH.md); módulos removidos confirmados inexistentes (find vazio) — código órfão, não introduz a lacuna | closed |
| T-18-23 | Repudiation | `packages/shared/src/index.ts` remove exports usados externamente | accept | `packages/shared/package.json` tem `"private": true` (linha 4) — workspace interno pnpm, não publicado | closed |
| T-18-24 | Denial of Service | `smoke.spec.ts` trava CI por mock incorreto de `/api/chat/unified` | mitigate | `tests/e2e/smoke.spec.ts` usa `page.route("**/api/chat/unified")` com `contentType: "application/x-ndjson"` (linhas 85-88); `formula.spec.ts` removido. `pnpm -r test` verde por SUMMARY | closed |

*Status: open · closed*
*Disposition: mitigate (controle implementado) · accept (risco documentado) · transfer (terceiro)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-18-01 | T-18-06 | Vermelho transitório de `ocrPayloadSchema` resolvido na mesma sessão (Wave 2); estado final sem `case "ocr"` na fonte | Phase 18 plan | 2026-06-15 |
| AR-18-02 | T-18-SC | Fase de remoção pura — zero instalações de pacote em todas as 8 plans | Phase 18 plan | 2026-06-15 |
| AR-18-03 | T-18-14 | Persistência opera sobre JSON livre (`assistantPayload`/`toolKind`), sem parse estrito; render trata o parse defensivamente (T-18-16/18/19) | Phase 18 plan | 2026-06-15 |
| AR-18-04 | T-18-18 | Redução de schema isolada nesta plan; fallback defensivo de carregamento entregue no Plan 07 (verificado) | Phase 18 plan | 2026-06-15 |
| AR-18-05 | T-18-21 | Campos órfãos em FormData/JSON de sessões antigas são no-op (`asString()`); sem 500 — sessão reflui ao recarregar | Phase 18 plan | 2026-06-15 |
| AR-18-06 | T-18-22 | Ausência de quota no chat unificado é decisão herdada da Phase 17 (PRD-MILESTONE/D1-D6); Phase 18 apenas remove código órfão | Phase 18 plan | 2026-06-15 |
| AR-18-07 | T-18-23 | `@tabelin/shared` é `private: true`, sem consumidores externos ao monorepo | Phase 18 plan | 2026-06-15 |

*Riscos aceitos não ressurgem em auditorias futuras.*

---

## Observações Informativas (fora do registro)

| ID | Componente | Achado | Avaliação |
|----|-----------|--------|-----------|
| OBS-18-01 | `/api/conversations/[tool]/route.ts`, `/api/conversations/unified/route.ts` | As rotas DELETE de histórico retêm strings de tool-kinds legados (`formula`, `sql`, `regex`, `script`, `template`, `unified_table`) em `VALID_TOOL_KINDS`/`ALL_UNIFIED_TOOL_KINDS` | NÃO é gap de mitigação. São apenas chaves de partição de banco para purgar histórico persistido de tools removidas. As rotas são auth-guarded (401), allow-listed (400 em valor inválido) e executam somente `deleteConversationExchanges` — sem upload, sem extração, sem dispatch para gerador removido. Fora do escopo de files-modified da Phase 18 (superfície pré-existente intocada). Limpeza opcional em fase futura. |

*Nenhum `## Threat Flags` foi declarado em nenhum dos 8 SUMMARYs — nenhuma nova superfície de ataque não-registrada surgiu durante a implementação.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-15 | 24 | 24 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] Todas as ameaças têm disposição (mitigate / accept / transfer)
- [x] Riscos aceitos documentados no Accepted Risks Log
- [x] `threats_open: 0` confirmado
- [x] `status: verified` definido no frontmatter

**Approval:** verified 2026-06-15

# Phase 18: Remover Tools Avulsos, OCR, File Analysis & Reduzir Dispatcher - Research

**Researched:** 2026-06-11
**Domain:** Remoção comprovada de código morto (Next.js App Router, Zod schemas compartilhados, classificador de intent, render-dispatcher)
**Confidence:** HIGH

## Summary

Esta fase remove a cadeia completa de 5 "tools de texto" avulsos (Fórmula/Scripts/SQL/Regex/Template como geradores via LLM), o OCR, a Análise de Arquivos como tool separada, e a geração de tabela do zero (stub/clarificação/confirmação de spec) — reduzindo `intent-classifier.ts` e `render-dispatcher.tsx` ao eixo binário "operação na planilha vs Q&A".

Toda a investigação foi feita por grep/glob diretos no codebase (não há ambiguidade sobre quais arquivos existem). O grafo de dependências do `apps/web/src/app/api/chat/unified/route.ts` é o nó central: ele importa de `formula-stream`, `regex-stream`, `scripts-stream`, `sql-stream`, `template-stream`, `table-clarifier`, e `intent-classifier`. As 5 rotas de API avulsas (`/api/tools/{formula,sql,regex,scripts,template}/...`) e as páginas órfãs (`/workspace/{sql,regex,scripts,templates,ocr,file-analysis}`) já estão sem navegação desde a Phase 16 (CLEAN-05), mas continuam respondendo e renderizando se acessadas por URL direta — isso violam SC#1 e precisam sumir nesta fase.

**Ponto crítico de risco:** o branch `case "formula"` do `route.ts` do unified-chat usa `resolveFormulaPayload`/`createFormulaEventStream` de `formula-stream.ts` — esse é o "gerador de fórmula via LLM" (texto → fórmula explicada), que está em `§5.1 OUT`. Ele é DIFERENTE de `use-formula-engine.ts` (motor de avaliação `@formulajs/formulajs` na grade, `§4.2 IN`, PRESERVAR). Os dois compartilham apenas `translateFunctionName` de `packages/shared/src/table/formula-locale.ts`, que fica.

**Primary recommendation:** Remover em 8 blocos atômicos na ordem: (1) rotas API de tools avulsos `/api/tools/{formula,sql,regex,scripts,template}` + páginas órfãs `/workspace/{sql,regex,scripts,templates}`; (2) OCR completo (rota, página, ocr-processor, feature, fixtures); (3) File Analysis como tool (rota, página, feature, file-chat-stream); (4) geração de tabela do zero (table-clarifier, ConfirmationCard, ClarificationCard, TableIntentStub, loop de clarificação no route.ts); (5) poda do `case "formula"`/`"sql"`/`"regex"`/`"script"`/`"template"`/`"file_analysis"`/`"ocr"` do `route.ts` + os 5 `*-stream.ts` servidores + `destructive-classifier.ts`; (6) redução de `intent-classifier.ts` ao eixo binário; (7) redução de `render-dispatcher.tsx`/`unified-chat-tool.tsx`/`intent-pill.tsx`/schema `unified-chat/schema.ts`; (8) deps órfãs triviais sem outros consumidores (ex.: `@playwright/test` fica — usado por smoke tests do que sobra; avaliar caso a caso).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Rotas `/api/tools/{formula,sql,regex,scripts,template}` | API/Backend | — | Endpoints próprios, sem outro consumidor após Phase 16 |
| Páginas `/workspace/{sql,regex,scripts,templates,ocr,file-analysis}` | Frontend Server (SSR) | Browser | Páginas Next.js órfãs (sem link desde Phase 16) |
| OCR pipeline (`ocr-processor.ts`, fixtures, `/api/tools/ocr/process`) | API/Backend | — | Vision-based, exclusivo de OCR |
| File Analysis tool (`features/file-analysis/*`, `file-chat-stream.ts`, rotas `/api/tools/file-analysis/*`) | API/Backend | Browser | Chat efêmero próprio — distinto da ingestão CSV/XLSX da grade |
| `intent-classifier.ts` | API/Backend | — | Roteamento server-side do unified chat |
| `render-dispatcher.tsx` | Browser/Client | — | Renderização condicional por `payload.kind` |
| Geração de tabela do zero (`table-clarifier.ts`, `ConfirmationCard`, `ClarificationCard`, `TableIntentStub`) | API/Backend | Browser | Loop de clarificação Phase 13, fora do escopo v3.0 (D5) |
| Motor de fórmulas da grade (`use-formula-engine.ts`, `@formulajs/formulajs`, `formula-locale.ts`) | Browser/Client | — | PRESERVAR — não faz parte de nenhum tool removido |
| `extraction/dispatcher.ts` + extractors (CSV/XLSX/PDF/TXT/imagem) | API/Backend | — | PRESERVAR — usado por `/api/chat/unified` para anexos; CSV/XLSX path também serve ingestão futura da grade (DATA-03, fora desta fase) |

## Standard Stack

Não há pacotes novos a instalar nesta fase — é puramente remoção. Nenhuma seção "Standard Stack"/"Package Legitimacy Audit" aplicável (sem `npm install`).

## Inventário do Código a Remover

### Bloco 1 — Rotas API + Páginas dos 5 tools de texto avulsos (CLEAN-01)

**Rotas de API** `[VERIFIED: grep no repo]`:
| Arquivo | Consumidores IN além do próprio | Ação |
|---|---|---|
| `apps/web/src/app/api/tools/formula/generate/route.ts` | nenhum (só smoke.spec.ts via `page.route` mock) | DELETAR |
| `apps/web/src/app/api/tools/formula/explain/route.ts` | nenhum | DELETAR |
| `apps/web/src/app/api/tools/sql/generate/route.ts` | nenhum | DELETAR |
| `apps/web/src/app/api/tools/regex/generate/route.ts` | nenhum | DELETAR |
| `apps/web/src/app/api/tools/regex/explain/route.ts` | nenhum | DELETAR |
| `apps/web/src/app/api/tools/scripts/generate/route.ts` | nenhum | DELETAR |
| `apps/web/src/app/api/tools/template/generate/route.ts` | nenhum | DELETAR |

**Páginas de workspace** `[VERIFIED: grep no repo]`:
| Arquivo | Status | Ação |
|---|---|---|
| `apps/web/src/app/(workspace)/workspace/sql/page.tsx` | sem link desde Phase 16 | DELETAR |
| `apps/web/src/app/(workspace)/workspace/regex/page.tsx` | idem | DELETAR |
| `apps/web/src/app/(workspace)/workspace/scripts/page.tsx` | idem | DELETAR |
| `apps/web/src/app/(workspace)/workspace/templates/page.tsx` | idem | DELETAR |

**Features dedicadas a esses 4 tools** (Formula tem nuance — ver Bloco 5):
| Diretório | Ação |
|---|---|
| `apps/web/src/features/sql/` (inclui `components/sql-output-panel.tsx`) | DELETAR inteiro |
| `apps/web/src/features/regex/` | DELETAR inteiro |
| `apps/web/src/features/scripts/` | DELETAR inteiro |
| `apps/web/src/features/template/` | DELETAR inteiro |
| `apps/web/src/features/formula/` (formula-tool.tsx, formula-input-panel, hooks/use-formula-stream) | DELETAR — mas ver nota abaixo |

> **Nota Formula:** `apps/web/src/features/formula/components/copy-button.tsx` é importado por `render-dispatcher.tsx` no caminho `FormulaOutputPanel`. Confirmar se `copy-button.tsx` é genérico o suficiente para ficar (renomeável para componente compartilhado) ou se é específico do output do gerador LLM de fórmula — se específico, remove junto no Bloco 5.

### Bloco 2 — OCR completo (CLEAN-02)

| Arquivo/Diretório | Ação |
|---|---|
| `apps/web/src/app/api/tools/ocr/process/route.ts` | DELETAR |
| `apps/web/src/app/(workspace)/workspace/ocr/page.tsx` | DELETAR |
| `apps/web/src/features/ocr/` (inteiro: `ocr-tool.tsx`, `components/image-upload-panel.tsx`, `components/ocr-result-panel.tsx`, `hooks/use-image-upload.ts`) | DELETAR |
| `apps/web/src/server/ai/ocr-processor.ts` | DELETAR — zero consumidores além da rota OCR `[VERIFIED: grep]` |
| `packages/shared/src/ocr/schema.ts`, `packages/shared/src/ocr/fixtures.ts` | DELETAR — `ocrPayloadSchema`/`OcrPayload`/`OCR_FIXTURE_RESPONSE` usados só por `ocr-processor.ts`, `render-dispatcher.tsx` (`FileBackedOutput` case "ocr"), `unified-chat/schema.ts` (union), e `route.ts` (`case "ocr"`/`needsFile`). Todos esses consumidores são removidos no Bloco 2/5/6/7 |
| Export `export * from "./ocr/schema"` e `"./ocr/fixtures"` em `packages/shared/src/index.ts` | REMOVER linhas |
| Assets/fixtures de imagem OCR (buscar em `apps/web/public/` ou `apps/web/tests/fixtures/` por `ocr`, `.png`/`.jpg` de exemplo de tabela) | LOCALIZAR via `find apps/web -iname "*ocr*"` e DELETAR |

**Nota sobre `image-extractor.ts`:** `apps/web/src/server/extraction/image-extractor.ts` é parte do dispatcher de extração usado por `/api/chat/unified` para anexos PNG/JPEG no Q&A — verificar se essa capacidade (anexar imagem ao chat e a IA "ler" via Vision) ainda é uma forma de "OCR" que deve sair, ou se é uma capacidade de anexo geral preservada (Phase 9/10 EXT-01..06, `§4.9` privacidade). **Distinção:** OCR como TOOL dedicado (`/workspace/ocr`, fluxo "imagem → tabela TSV/CSV") sai; o anexo de imagem ao chat unificado para extração de contexto pode ser uma questão separada — **flag para o planner decidir** (ver Open Questions).

### Bloco 3 — File Analysis como tool separada (CLEAN-03)

| Arquivo/Diretório | Ação |
|---|---|
| `apps/web/src/app/api/tools/file-analysis/chat/route.ts` | DELETAR |
| `apps/web/src/app/api/tools/file-analysis/upload/route.ts` | DELETAR |
| `apps/web/src/app/(workspace)/workspace/file-analysis/page.tsx` | DELETAR |
| `apps/web/src/features/file-analysis/` (inteiro: `file-analysis-tool.tsx`, `components/*`, `hooks/use-file-chat.ts`, `hooks/use-file-upload.ts`) | DELETAR |
| `apps/web/src/server/ai/file-chat-stream.ts` | DELETAR — zero consumidores além de file-analysis `[VERIFIED: grep]` |
| `apps/web/src/server/file-analysis/` (`cleanup-job.ts`, `file-parser.ts`, `file-repository.ts`) | INVESTIGAR antes de deletar — `file-parser.ts` pode ser usado pela ingestão CSV/XLSX da grade (DATA-03). Ver Open Questions |
| `packages/shared/src/file-analysis/schema.ts`, `fixtures.ts` | DELETAR se `fileAnalysisPayloadSchema`/`FileAnalysisPayload` ficarem sem consumidor IN após Bloco 5/6/7 |

### Bloco 4 — Geração de tabela do zero (CLEAN-07, D5)

| Arquivo/Diretório | Símbolo | Ação |
|---|---|---|
| `apps/web/src/server/ai/table-clarifier.ts` | `askClarificationQuestion`, `buildTableSpec`, `injectCollectedSpecIntoPrompt` | DELETAR — usados só no `case "unified_table"` do route.ts |
| `apps/web/src/features/unified-chat/components/clarification-card.tsx` | `ClarificationCard` | DELETAR |
| `apps/web/src/features/unified-chat/components/confirmation-card.tsx` | `ConfirmationCard` | DELETAR |
| `apps/web/src/features/unified-chat/components/table-intent-stub.tsx` | `TableIntentStub` | DELETAR — `kind: "table_stub"` é JÁ código morto (nunca emitido pelo route.ts atual, confirmado por grep) |
| `apps/web/tests/table-clarifier.test.ts` | testes do clarifier | DELETAR |
| Em `apps/web/src/app/api/chat/unified/route.ts`: `case "unified_table"` inteiro (clarificação + geração), helpers `countClarTurns`, `hasOpenTableClarification`, `mergeSpecFromHistory`, `promptLooksLikeNewTableRequest`, `conservativeClarTurnCount`, `resolveOverrideSpec`, `tableStubMessage`, `ConversationExchangeLike`, `MAX_CLAR_TURNS` | REMOVER bloco inteiro |

> **ATENÇÃO — risco maior do CLEAN-07:** `tabela` é hoje um `UnifiedIntent` válido e `unified_table` é um `ResolvedToolKind`/`toolKind` persistido em `ConversationExchange` (`userId+toolKind`, decisão registrada em PROJECT.md "Partição userId+toolKind mantida + kind 'unified_table' adicionado"). Remover o branch SEM quebrar:
> - O `RF-03` desta milestone ("protocolo de mutação chat→grade") provavelmente SUBSTITUI este branch por uma nova lógica de "operação na planilha" — mas RF-03 é trabalho de OUTRA fase (provavelmente Phase 19/20, não 18). **Phase 18 deve apenas REMOVER o stub/clarificação/confirmação de geração-do-zero, sem implementar o protocolo novo.**
> - `tableSpecPayloadSchema`/`TableSpecPayload`/`tableColumnSchema`/`TableColumn` são consumidos por `table-grid-panel.tsx` (PRESERVAR, é a estrutura de dados da grade) — **NÃO DELETAR** esses tipos/schemas mesmo removendo o gerador. Apenas o PRODUTOR via LLM-do-zero sai; o TIPO que descreve a grade fica.
> - **Decisão a documentar no plano:** o que o `case "tabela"`/`"unified_table"` deve fazer após esta fase? Opções: (a) remover o intent `"tabela"` do enum `UNIFIED_INTENTS` inteiramente (intent-classifier não classifica mais "tabela"), deixando RF-03 criar um novo branch na Phase seguinte; (b) manter o intent mas sem produzir `table_clar_question`/stub, mapeando para uma resposta "ainda não suportado" temporária. **Recomendação: opção (a)** — alinhado com CLEAN-06 (classificador reduzido a "operação na planilha" vs "Q&A" — ver Bloco 6), e evita estado intermediário confuso. Documentar como ASSUMED e levar para discuss-phase/CONTEXT.md se ainda não decidido.

### Bloco 5 — Poda dos 5 branches de geração no route.ts + server/ai streams (CLEAN-01 parte 2)

Em `apps/web/src/app/api/chat/unified/route.ts`:
- Remover `case "formula"`, `case "sql"`, `case "regex"`, `case "script"`, `case "template"` do switch principal
- Remover `case "file_analysis"`/`case "ocr"` do bloco `if (resolvedToolKind === "file_analysis" || resolvedToolKind === "ocr")`
- Remover imports correspondentes: `createFormulaEventStream`, `resolveFormulaPayload`, `createRegexEventStream`, `resolveRegexPayload`, `createScriptEventStream`, `resolveScriptPayload`, `createSqlEventStream`, `resolveSqlPayload`, `createTemplateEventStream`, `resolveTemplatePayload`, `recordFormulaToolRequest`, `formulaGenerateRequestSchema`, `regexGenerateRequestSchema`, `scriptGenerateRequestSchema`, `sqlGenerateRequestSchema`, `templateGenerateRequestSchema`, `fileAnalysisPayloadSchema`, `ocrPayloadSchema`
- `recordToolRequest`/`saveConversationExchange`/`findConversationExchanges` ficam (genéricos, usados pelo que resta — Q&A e futura operação de grade)

**Arquivos server/ai a deletar** `[VERIFIED: grep — único consumidor é route.ts ou os próprios *-stream]`:
| Arquivo | Consumidores além de route.ts | Ação |
|---|---|---|
| `apps/web/src/server/ai/formula-stream.ts` | `apps/web/src/app/api/tools/formula/{generate,explain}/route.ts` (Bloco 1, já saem) | DELETAR |
| `apps/web/src/server/ai/sql-stream.ts` | `apps/web/src/app/api/tools/sql/generate/route.ts` (Bloco 1) | DELETAR |
| `apps/web/src/server/ai/regex-stream.ts` | `apps/web/src/app/api/tools/regex/{generate,explain}/route.ts` (Bloco 1) | DELETAR |
| `apps/web/src/server/ai/scripts-stream.ts` | `apps/web/src/app/api/tools/scripts/generate/route.ts` (Bloco 1) | DELETAR |
| `apps/web/src/server/ai/template-stream.ts` | `apps/web/src/app/api/tools/template/generate/route.ts` (Bloco 1) | DELETAR |
| `apps/web/src/server/ai/destructive-classifier.ts` | só `sql-stream.ts`/`scripts-stream.ts` `[VERIFIED: grep]` | DELETAR junto |
| `apps/web/src/server/tools/formula-repository.ts` | só `formula-stream`/route.ts/rotas formula | DELETAR (mas confirmar — `recordFormulaToolRequest` é distinto de `recordToolRequest` genérico; `getUserEntitlement` de `entitlements.ts` foi preservado pela Phase 17 explicitamente para "6 páginas de tool da Phase 18" — após Bloco 1-3, essas 6 páginas saem, então re-investigar se `entitlements.ts`/`getUserEntitlement` fica órfão aqui ou é Phase 22) |

**Formula prompts:** `apps/web/src/server/ai/formula-prompts.ts` — verificar se usado só por `formula-stream.ts` (provável DELETAR junto).

**Shared schemas/fixtures a avaliar para remoção** (zero consumidor IN após Blocos 1-5):
- `packages/shared/src/formula/schema.ts`, `formula/fixtures.ts`, `formula/platforms.ts` — **CUIDADO**: `formula/platforms.ts` pode conter tipos usados em `unified-chat/schema.ts` (`FormulaLanguage`, `FormulaPlatform` aparecem em `unified-chat-tool.tsx`'s `UnifiedContext`). Se a UI de seleção de plataforma/idioma (`SessionContextSelector`) sai junto (Bloco 6/7), esses tipos também saem; se algo da grade usa `FormulaLanguage`/separador `;`/`,` (provável — `table-grid-panel.tsx` usa `formulaLanguage`/`separator` em `TableSpecPayload`), **PRESERVAR** os tipos de locale mas remover o resto.
- `packages/shared/src/sql/schema.ts`, `sql/fixtures.ts`, `regex/*`, `scripts/*`, `template/*`, `file-analysis/*` — DELETAR junto com export em `packages/shared/src/index.ts` se zero consumidor IN.

### Bloco 6 — Redução do intent-classifier.ts (CLEAN-06)

`apps/web/src/server/ai/intent-classifier.ts` atualmente classifica 9 intents: `formula | sql | regex | script | template | file_analysis | ocr | tabela | unknown`.

**Estado pós-fase (alvo SC#3):** classificador reconhece apenas 2 categorias + fallback:
- `"planilha"` (ou nome equivalente) — operação estruturada na grade (mutação)
- `"qa"` (ou `"pergunta"`) — pergunta analítica sobre os dados, resposta em texto
- `"unknown"` — pedido ambíguo (mantém, já existe)

**Mudanças necessárias:**
1. `UNIFIED_INTENTS` em `packages/shared/src/unified-chat/schema.ts` reduzido de 9 para 2-3 valores (novo enum)
2. `fixtureClassify()` reescrito — toda a árvore de regex atual (sql/regex/script/template/formula/file_analysis) sai; nova heurística PT-BR binária precisa de PADRÕES NOVOS para distinguir "mutação na grade" vs "Q&A" — **esses padrões SÃO o eval de ~20 prompts do checkpoint 17→18** (ver Validation Architecture)
3. `buildClassifierSystemPrompt()` reescrito para o novo prompt binário
4. `classifyFileIntent()` — removido (só servia ocr/file_analysis)
5. `OVERRIDE_INTENTS`, `FILE_DEPENDENT_INTENTS`, `fileDependentIntentSchema`, `overrideIntentSchema` — reavaliar; `IntentPill`/override UI também é reduzido no Bloco 7

**RISCO:** este é o ÚNICO bloco que envolve trabalho NOVO (não é deleção pura) — definir os novos labels de intent é uma decisão de design que afeta o schema persistido (`toolKind` em `ConversationExchange`). Recomendação: usar nomes que não colidam com os antigos (ex.: `"sheet_operation"` / `"qa"`) para evitar confusão com dados históricos de `toolKind="formula"` etc. já persistidos (que ficam órfãos no banco — registrar para Phase 22/CLEAN-08).

### Bloco 7 — Redução do render-dispatcher.tsx + componentes dependentes (CLEAN-06 parte 2)

Em `apps/web/src/features/unified-chat/components/render-dispatcher.tsx`:
- Remover cases: `"formula"`/`"explanation"`, `"sql"`, `"regex_generate"`/`"regex_explain"`, `"script"`, `"template"`, `"table_clar_question"`, `"table_stub"`, `"file_analysis"`, `"ocr"`
- Remover componente `FileBackedOutput` (só usado por file_analysis/ocr cases)
- Remover componente `NeedsFileCard` (só usado por `needsFile`/`needs_file`, que existia para ocr/file_analysis)
- `case "table_spec"` — **AVALIAR**: hoje só renderiza se `hasRows` (senão `ConfirmationCard`, que sai no Bloco 4). Se `ConfirmationCard` sai e `table_spec` só é produzido pelo gerador-do-zero (que sai no Bloco 4), então `case "table_spec"` no dispatcher pode também sair — A MENOS QUE o protocolo de mutação chat→grade (RF-03, fase futura) reusar `TableSpecPayload`/`TableGridPanel` como formato de saída. **Recomendação:** manter `TableGridPanel` import e renderização de `table_spec` com `hasRows` no dispatcher (componente em si não é "geração do zero"), mas remover o branch sem-rows (ConfirmationCard). Documentar como decisão para o planner.
- Imports a remover: `FormulaOutputPanel`, `CopyButton` (de formula), `RegexOutputPanel`, `ScriptsOutputPanel`, `SqlOutputPanel`, `TemplateOutputPanel`, `ClarificationCard`, `ConfirmationCard`, `TableIntentStub`, tipos `FileAnalysisPayload`, `FileDependentIntent`, `FormulaCompletePayload`, `FormulaMetadata`, `OcrPayload`, `RegexCompletePayload`, `RegexMetadata`, `ScriptGenerateResponse`, `ScriptMetadata`, `SqlGenerateResponse`, `SqlMetadata`, `TableClarQuestionPayload`, `TemplateGenerateResponse`, `TemplateMetadata`

**`apps/web/src/features/unified-chat/unified-chat-tool.tsx`:**
- `intentFromPayload()` — reduzir switch para os 2-3 novos `kind`s
- `UnifiedContext`/`defaultContext()` — `platform`, `formulaLanguage`, `separator`, `sqlDialect`, `scriptType` provavelmente saem (eram inputs específicos dos tools removidos) — **CUIDADO**: `formulaLanguage`/`separator` podem ser necessários para `TableGridPanel`/`use-formula-engine` (locale pt-BR da grade). Investigar se a grade precisa receber `formulaLanguage`/`separator` do contexto do chat ou se tem default próprio.
- `SessionContextSelector` (`apps/web/src/features/unified-chat/components/session-context-selector.tsx`) — provavelmente DELETAR (seletores de plataforma/SQL dialect/script type não fazem sentido no novo escopo) — verificar se algum seletor (ex: idioma de fórmula) ainda é necessário para a grade
- `handleAnswerClarification`, `handleSkipClarification`, `handleConfirmSpec`, `lastSubmitInputRef`, `MAX_CLAR_TURNS`-related client state — REMOVER (dependiam do loop de clarificação do Bloco 4)
- `handleOverride`/`handleLiveOverride`/`IntentPill` override UI — reavaliar com o novo binário de intents (Bloco 6); pode simplificar para 2 opções de override

**`apps/web/src/features/unified-chat/components/intent-pill.tsx`:**
- `INTENT_LABELS`, `INTENT_ICONS`, `OVERRIDE_OPTIONS` — reduzir para os novos 2-3 intents

**`packages/shared/src/unified-chat/schema.ts`:**
- `unifiedCompletePayloadSchema` union — remover `formulaCompletePayloadSchema`, `sqlGenerateResponseSchema`, `regexCompletePayloadSchema`, `scriptGenerateResponseSchema`, `templateGenerateResponseSchema`, `fileAnalysisPayloadSchema`, `ocrPayloadSchema`, `tableStubPayloadSchema`, `tableClarQuestionPayloadSchema`, `needsFilePayloadSchema` — manter `tableSpecPayloadSchema`/`tableColumnSchema` (estrutura da grade) e adicionar novo(s) payload(s) para Q&A/operação (se a Phase 19/20 já tiver schema definido, alinhar; senão deixar união minimalista: `tableSpecPayloadSchema` + um payload de texto/Q&A genérico)
- `unifiedStreamEventSchema` — remover `quota_warning` (cota já saiu na Phase 17 — confirmar se este type ainda é emitido por algo)
- `UNIFIED_INTENTS`, `OVERRIDE_INTENTS`, `FILE_DEPENDENT_INTENTS` — reduzir (Bloco 6)

### Bloco 8 — Testes e fixtures órfãos (parte de CLEAN-11, mas executável aqui se trivial)

| Arquivo | Razão | Ação |
|---|---|---|
| `apps/web/tests/formula-api.test.ts` | testa `/api/tools/formula/*` (Bloco 1) | DELETAR |
| `apps/web/tests/formula-contract.test.ts` | testa contrato do gerador LLM de fórmula (verificar se sobrepõe `formula-engine.test.ts`, que é da GRADE — PRESERVAR) | INVESTIGAR — `formula-contract` vs `formula-engine`: nomes parecidos, propósitos diferentes |
| `apps/web/tests/formula-ui.test.tsx` | testa `formula-tool.tsx`/`FormulaOutputPanel` (Bloco 1/7) | DELETAR (confirmar não sobrepõe `table-grid-panel.test.tsx`) |
| `apps/web/tests/table-clarifier.test.ts` | Bloco 4 | DELETAR |
| `apps/web/tests/intent-classifier.test.ts` | reescrever para o novo binário (Bloco 6), não deletar |
| `apps/web/tests/unified-route.test.ts` | reescrever — remove asserts dos branches removidos, adiciona asserts do que resta | MODIFICAR |
| `apps/web/tests/unified-chat-tool.test.tsx` | reescrever — remove cenários de tools removidos; **contém o teste flaky "corrupt NDJSON enters the error state"** (memória do projeto) | MODIFICAR com cuidado |
| `apps/web/tests/unified-schema.test.ts` | reescrever para o novo schema (Bloco 6/7) | MODIFICAR |
| `apps/web/tests/e2e/smoke.spec.ts` | **JÁ CITADO no code review da Phase 17 como obsoleto** — testa `/workspace/{scripts,sql,regex,file-analysis,ocr}` e rotas `/api/tools/*` que saem inteiramente nesta fase. Confirmar se o relatório de review da Phase 17 já recomendou remoção/reescrita | DELETAR ou REESCREVER para cobrir só fluxo planilha+chat |
| `apps/web/tests/e2e/formula.spec.ts` | testa fluxo do gerador LLM de fórmula (Bloco 1) — distinto de teste E2E da grade | DELETAR (confirmar não é o único E2E de auth+workspace — se for, extrair partes de auth para outro spec) |
| `apps/web/tests/file-parser.test.ts` | testa `server/file-analysis/file-parser.ts` — **depende da decisão do Bloco 3** sobre se `file-parser.ts` é reusado pela ingestão CSV/XLSX da grade | INVESTIGAR antes de deletar |
| `apps/web/tests/multi-turn-context.test.ts` | testa truncagem/contexto multi-turn — verificar se testa branches específicos removidos ou o mecanismo genérico (`buildToolContextMessages`, PRESERVAR) | INVESTIGAR — provável MODIFICAR, não deletar |
| `apps/web/tests/context-messages.test.ts` | `context-messages.ts` tem `case "table_stub"`, `"table_clar_question"`, `"sql"`, etc. em `buildToolContextMessages` — esses cases ficam órfãos após Blocos 4-6 | MODIFICAR `context-messages.ts` + teste |

> **Limite explícito com Phase 22:** modelos Prisma órfãos (CLEAN-08), dependências de `package.json` (CLEAN-09), env vars/.env.example/docker-compose (CLEAN-10), e testes/fixtures genéricos remanescentes (CLEAN-11) são Phase 22. PORÉM, dependências **exclusivas e triviais** descobertas nos Blocos 1-7 (ex.: se `tesseract`/lib de OCR específica existir — não encontrada nesta pesquisa, `@formulajs/formulajs` é usado pela grade e fica) podem ser removidas aqui SE o plano de execução já remove o último import durante o mesmo bloco e o `pnpm install` resultante é trivial. Caso contrário, deixar anotado para Phase 22.

## Mapa de Referências de Entrada (resumo por símbolo crítico)

| Símbolo/Arquivo | Consumidores IN (pós-remoção) | Decisão |
|---|---|---|
| `translateFunctionName` (`formula-locale.ts`) | `use-formula-engine.ts` | PRESERVAR |
| `tableSpecPayloadSchema`/`TableSpecPayload`/`tableColumnSchema` | `table-grid-panel.tsx`, `table-export.ts`, route.ts (se mutação futura reusar) | PRESERVAR |
| `getUserEntitlement` (`entitlements.ts`) | Phase 17 disse "6 páginas de tool da Phase 18" — essas páginas SAEM nesta fase | RE-INVESTIGAR — pode ficar órfão aqui (não Phase 22) |
| `extraction/dispatcher.ts` + extractors | `/api/chat/unified` (anexos Q&A) | PRESERVAR (CSV/XLSX path também futuro DATA-03) |
| `createOpenAIClient`/`getOpenAIModel` (`openai-client.ts`) | `intent-classifier.ts` e futura lógica Q&A/mutação | PRESERVAR |
| `recordToolRequest`/`saveConversationExchange`/`findConversationExchanges` | genéricos, usados pelo que resta | PRESERVAR |
| `buildToolContextMessages`/`buildMultiTurnSystemPrompt`/`truncateHistory` (`context-messages.ts`) | usados por Q&A/mutação restante | PRESERVAR (remover só cases mortos do switch interno) |
| `@formulajs/formulajs`, `react-datasheet-grid`, `unpdf` (deps) | grade + extração PDF | PRESERVAR |

## Architecture Patterns

### Diagrama de fluxo ANTES (estado atual)

```
Browser (UnifiedChatTool)
  │
  ├─> POST /api/chat/unified ──> classifyIntent() [9 intents]
  │                                 │
  │                  ┌──────────────┼───────────────────────────────┐
  │                  ▼              ▼               ▼               ▼
  │             formula-stream  sql-stream    regex/scripts/   table-clarifier
  │             (case "formula")  (case "sql")  template-stream  (case "unified_table")
  │                  │              │               │               │
  │                  └──────────────┴───────────────┴───────────────┘
  │                                 │
  │                            saveConversationExchange (toolKind=*)
  │
  └─> RenderDispatcher (payload.kind) ──> FormulaOutputPanel | SqlOutputPanel |
                                            RegexOutputPanel | ScriptsOutputPanel |
                                            TemplateOutputPanel | ClarificationCard |
                                            ConfirmationCard | TableIntentStub |
                                            FileBackedOutput (file_analysis/ocr) |
                                            TableGridPanel (table_spec c/ rows)

Páginas órfãs (sem link, ainda servidas):
/workspace/{sql,regex,scripts,templates,ocr,file-analysis} ──> /api/tools/{...}/* ──> *-stream.ts
```

### Diagrama de fluxo DEPOIS (alvo desta fase)

```
Browser (UnifiedChatTool, tela única)
  │
  ├─> POST /api/chat/unified ──> classifyIntent() [binário: sheet_operation | qa | unknown]
  │                                 │
  │                  ┌──────────────┴───────────────┐
  │                  ▼                               ▼
  │           (Q&A — texto)                  (operação na planilha —
  │           resposta em texto                trabalho RF-03, OUTRA fase;
  │           sem alterar grade)               nesta fase: apenas remover
  │                                             stub/clarificação antigos)
  │                  │                               │
  │                  └───────────────┬───────────────┘
  │                                   ▼
  │                          saveConversationExchange
  │
  └─> RenderDispatcher (payload.kind reduzido) ──> TableGridPanel (table_spec, se aplicável) |
                                                     componente de resposta Q&A (texto)

Rotas/páginas dos 5 tools, OCR, File Analysis: REMOVIDAS (404/zero referência)
```

### Recommended Project Structure (pós-remoção)

```
apps/web/src/
├── app/
│   ├── (workspace)/workspace/
│   │   ├── layout.tsx          # já reduzido na Phase 16
│   │   └── page.tsx            # única página
│   └── api/
│       ├── chat/unified/route.ts   # reduzido (Bloco 5)
│       └── conversations/unified/route.ts
├── features/
│   └── unified-chat/
│       ├── components/
│       │   ├── render-dispatcher.tsx   # reduzido (Bloco 7)
│       │   ├── intent-pill.tsx          # reduzido (Bloco 6/7)
│       │   ├── table-grid-panel.tsx     # PRESERVADO
│       │   └── session-context-selector.tsx  # avaliar (Bloco 7)
│       ├── hooks/
│       │   ├── use-formula-engine.ts    # PRESERVADO
│       │   └── use-unified-chat-stream.ts  # reduzido
│       └── lib/
│           ├── sample-spec.ts
│           └── table-export.ts          # PRESERVADO
└── server/
    ├── ai/
    │   ├── intent-classifier.ts  # reduzido (Bloco 6)
    │   ├── context-messages.ts   # cases mortos removidos
    │   └── openai-client.ts      # PRESERVADO
    └── extraction/                # PRESERVADO inteiro
```

### Anti-Patterns to Avoid

- **Deletar `tableSpecPayloadSchema`/`TableColumn` junto com `table-clarifier.ts`:** são tipos compartilhados pela grade (`TableGridPanel`/`table-export.ts`), NÃO produzidos exclusivamente pelo gerador-do-zero.
- **Remover `formula-locale.ts`/`translateFunctionName` por estar em diretório `table/`:** está em `packages/shared/src/table/`, mas é usado pela GRADE (`use-formula-engine.ts`), não pelo gerador LLM de fórmula.
- **Assumir que `/api/tools/file-analysis/*` e `extraction/csv-xlsx-extractor.ts` são a mesma coisa:** a rota de file-analysis usa `file-chat-stream.ts` + `file-repository.ts` (chat efêmero específico); o extractor CSV/XLSX é parte do dispatcher genérico usado por `/api/chat/unified` para QUALQUER anexo — investigar antes de deletar `server/file-analysis/file-parser.ts`.
- **Remover commits não-atômicos:** cada bloco (1-7) deve resultar em `pnpm -r typecheck && pnpm -r test` verdes antes do próximo bloco — especialmente importante porque o `route.ts` é o nó central tocado em quase todos os blocos (5, 6, 7).

## Don't Hand-Roll

Não aplicável — fase de remoção pura, sem construção de novas abstrações (exceto o novo eval binário do classificador, que é puramente regex/prompt, não uma "biblioteca").

## Runtime State Inventory

Esta fase é predominantemente remoção de código, mas toca dados persistidos (`ConversationExchange.toolKind`/`assistantPayload`). Aplicando as 5 categorias:

| Categoria | Itens encontrados | Ação requerida |
|----------|-------------|------------------|
| **Stored data** | `ConversationExchange` rows com `toolKind ∈ {formula, sql, regex, script, template, file_analysis, ocr, unified_table}` e `assistantPayload.kind ∈ {formula, sql, regex_generate, script, template, table_clar_question, table_stub, table_spec, file_analysis, ocr, needs_file}` persistidos por usuários reais (Phase 6-15 acumulado). Após Blocos 5-7, esses `toolKind`/`kind` deixam de ter PRODUTOR mas continuam no banco. | CÓDIGO: `unified-chat-tool.tsx`'s `intentFromPayload`/render de histórico inicial (`initialExchanges`) precisa lidar com `assistantPayload.kind` ANTIGO ao carregar histórico — ou esses exchanges órfãos simplesmente não renderizam mais (RenderDispatcher retorna `undefined`/null para `kind` desconhecido pós-redução, já que o switch não tem `default`). **Decisão a documentar:** exibir fallback genérico para exchanges antigas de tools removidos, ou aceitar que ficam "mudas" no histórico (sem quebrar render — `switch` sem `default` retorna `undefined`, React renderiza nada, não erro). RECOMENDAÇÃO: adicionar `default: return null` defensivo no `RenderDispatcher` reduzido. Migração de DADOS (apagar/transformar essas rows) é Phase 22 (CLEAN-08), NÃO esta fase. |
| **Live service config** | Nenhum — não há serviços externos com config fora do git para tools/OCR/file-analysis (Mercado Pago já saiu na Phase 17). Confirmado: nenhuma menção a webhooks/integrações externas específicas destes tools. | Nenhuma ação |
| **OS-registered state** | Nenhum — sem cron jobs/tasks agendadas específicas (cleanup-job.ts do file-analysis é código de app, não registro OS — roda via Next.js, verificar se é invocado por algum scheduler externo) | INVESTIGAR `cleanup-job.ts` — se for invocado por um cron externo (ex.: Vercel cron, systemd timer), o registro de agendamento (não o código) precisa ser removido separadamente |
| **Secrets/env vars** | `.env.example` raiz não tem nenhuma var específica de OCR/Vision/tools de texto (confirmado via grep — só `DATABASE_URL` e o que sobrou do bloco Billing pós-Phase-17). Verificar `apps/web/.env.local`/`.env.example` específico do app (não lido nesta pesquisa) para `OPENAI_API_KEY` (PRESERVAR — usado por intent-classifier e Q&A) | Nenhuma var a remover identificada nesta pesquisa; CLEAN-10 (Phase 22) revisita |
| **Build artifacts** | Nenhum artefato compilado/instalado específico de OCR/tools identificado (sem pacotes de OCR como tesseract.js no package.json) | Nenhuma ação |

**Nada encontrado em "Live service config", "OS-registered state" (exceto cleanup-job a investigar), "Secrets/env vars" e "Build artifacts"** — verificado por grep em `.env.example` e `package.json`.

## Common Pitfalls

### Pitfall 1: Quebrar o `case "tabela"` sem decisão sobre o novo eixo binário
**What goes wrong:** Remover `table-clarifier.ts` e o `case "unified_table"` sem decidir o que `intent-classifier` retorna para pedidos de "criar uma tabela do zero" deixa um buraco — o usuário pede "monta uma tabela de gastos" e nada acontece (nem erro, nem resposta).
**Why it happens:** D5 diz que geração-do-zero "não é objetivo deste milestone", mas não diz O QUE fazer quando o usuário pede isso mesmo assim.
**How to avoid:** Decidir explicitamente (e documentar em CONTEXT.md/plano): pedidos de "criar tabela nova" caem no eixo "Q&A" e recebem uma resposta de texto explicando a limitação atual (ex.: "Você já tem uma planilha aberta — descreva o que quer fazer com ela"), OU caem em "unknown". **Recomendação: tratar como fallback dentro de "sheet_operation" ou "unknown"**, nunca crashar.
**Warning signs:** Teste manual "monta uma tabela de controle de estoque" retorna 502 ou tela vazia.

### Pitfall 2: `RenderDispatcher` sem `default` quebra em histórico antigo
**What goes wrong:** TypeScript exhaustiveness checking pode reclamar (`switch` não exaustivo) OU em runtime, exchanges antigas com `kind` removido do union causam `payload.kind` não bater nenhum `case` e o switch retornar `undefined` implicitamente — React não quebra, mas o `assistant-card` simplesmente não aparece, podendo confundir QA.
**Why it happens:** `unifiedCompletePayloadSchema` é um discriminated union; ao remover variantes do union mas manter dados antigos no banco com `kind` antigo, o `.parse()` em `intentFromPayload`/carregamento de histórico pode FALHAR (zod rejeita `kind` desconhecido em union estrita).
**How to avoid:** Verificar se o carregamento de `initialExchanges` faz `.parse()` ou apenas type-cast (`as UnifiedCompletePayload`) — se for `.parse()`, trocar para `.safeParse()` com fallback, ou usar `z.unknown()` para `assistantPayload` no carregamento de histórico e validar apenas no momento de uso.
**Warning signs:** Erro "Invalid discriminator value" ao abrir `/workspace` para um usuário com histórico de tools antigos.

### Pitfall 3: Reduzir `intent-classifier.ts` quebra fixture mode dos testes existentes
**What goes wrong:** `apps/web/tests/intent-classifier.test.ts` e `apps/web/tests/unified-route.test.ts`/`unified-chat-tool.test.tsx` têm asserts hardcoded para os 9 intents antigos (`"formula"`, `"sql"` etc). Reduzir o enum sem atualizar os testes causa falhas em massa, não apenas no arquivo do classificador.
**Why it happens:** Os testes de integração do unified-route fazem fixture-mode round-trips completos.
**How to avoid:** Buscar TODOS os literais `"formula"|"sql"|"regex"|"script"|"template"|"file_analysis"|"ocr"|"tabela"|"unified_table"` em `apps/web/tests/*.ts*` antes de tocar no enum, e atualizar em conjunto (mesmo commit/bloco).
**Warning signs:** `pnpm -r test` com dezenas de falhas após o Bloco 6, não apenas no arquivo do classificador.

### Pitfall 4: `formula-contract.test.ts` vs `formula-engine.test.ts` — nomes confusos
**What goes wrong:** Deletar o teste errado — `formula-contract.test.ts` parece testar o MESMO domínio que `formula-engine.test.ts` (que testa a GRADE, PRESERVAR).
**Why it happens:** Nomenclatura histórica de v1.0-v1.2 onde "formula" = só o gerador.
**How to avoid:** Ler o conteúdo de `formula-contract.test.ts` antes de decidir — se testa `formulaCompletePayloadSchema`/`resolveFormulaPayload` (gerador LLM), DELETAR; se testa `use-formula-engine`/avaliação, RENOMEAR e PRESERVAR.
**Warning signs:** Cobertura da grade cai após a fase.

### Pitfall 5: prisma generate em worktree (já documentado na memória do projeto)
**What goes wrong:** `pnpm exec tsc --noEmit` falha com erro `.prisma/client/default` em worktrees, mascarando como se a remoção tivesse quebrado tipos do Prisma.
**Why it happens:** Falso-positivo conhecido — worktrees não compartilham o client gerado.
**How to avoid:** Rodar `pnpm exec prisma generate --schema=<worktree-root>/prisma/schema.prisma` antes de cada `typecheck`/`test`.
**Warning signs:** Erro menciona `.prisma/client/default` especificamente, não um símbolo deletado.

### Pitfall 6: teste flaky NDJSON no `unified-chat-tool.test.tsx`
**What goes wrong:** "corrupt NDJSON enters the error state" falha na suite completa mas passa isolado (memória do projeto).
**Why it happens:** Condição de corrida conhecida, não relacionada à remoção.
**How to avoid:** Se falhar durante validação de um bloco desta fase, re-rodar isoladamente antes de marcar o bloco como bloqueado.
**Warning signs:** Falha isolada nesse teste específico — não investigar como regressão da remoção.

## Code Examples

### Padrão de poda de `switch` no route.ts (Bloco 5)

```typescript
// ANTES — apps/web/src/app/api/chat/unified/route.ts
switch (resolvedToolKind) {
  case "formula": { /* ... resolveFormulaPayload ... */ }
  case "sql": { /* ... */ }
  case "regex": { /* ... */ }
  case "script": { /* ... */ }
  case "template": { /* ... */ }
  case "unified_table": { /* ... clarificação/spec ... */ }
}

// DEPOIS — apenas o que serve planilha + Q&A permanece
// (estrutura exata depende de RF-03/RF-04, definidos em fase posterior;
// esta fase apenas REMOVE os branches acima, não adiciona o novo)
```

### Padrão de verificação de zero-referências (Bloco N qualquer)

```bash
# Antes de deletar um arquivo candidato, confirmar zero imports
grep -rn "from ['\"].*nome-do-modulo['\"]" apps/web/src apps/web/tests packages/shared/src \
  --include=*.ts --include=*.tsx | grep -v node_modules

# Para símbolos exportados (não arquivos inteiros)
grep -rn "\bnomeDoSimbolo\b" apps/web/src apps/web/tests packages/shared/src \
  --include=*.ts --include=*.tsx | grep -v node_modules
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Classificador 9-vias com despacho para 7 tools + tabela | Classificador binário (planilha vs Q&A) | Esta fase (CLEAN-06) | Reduz superfície do `route.ts` de ~650 linhas para uma fração; simplifica `RenderDispatcher` |
| Geração de tabela do zero (stub→clarificação→spec) | Removida; protocolo de mutação chat→grade (RF-03) é trabalho futuro | D5 (PRD) | `table-clarifier.ts`, `ClarificationCard`, `ConfirmationCard` saem; `TableSpecPayload`/`TableGridPanel` ficam |

**Deprecated/outdated:**
- `kind: "table_stub"`: já morto (nunca emitido), confirmado por grep — remover schema e referências como parte do Bloco 4/7.
- `UNIFIED_INTENTS` de 9 valores: substituído por enum binário no Bloco 6.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | O novo eixo binário do classificador deve ser `"sheet_operation"`/`"planilha"` vs `"qa"`/Q&A, com `"unknown"` mantido — nomes exatos não confirmados em CONTEXT.md/PRD | Bloco 6 | Se a Phase 19/20 já fixou nomes diferentes para o novo intent, retrabalho do enum e dos testes |
| A2 | `case "tabela"`/`"unified_table"` deve ser REMOVIDO do enum de intents (opção a, não opção b) | Bloco 4 | Se a decisão correta for manter o intent "tabela" como um 3º valor que mapeia para "sheet_operation" futuramente, o enum binário do Bloco 6 precisa de 3 valores, não 2 |
| A3 | `apps/web/src/server/file-analysis/file-parser.ts` NÃO é reusado pela futura ingestão CSV/XLSX da grade (DATA-03) — recomendação provisória de deletar no Bloco 3 | Bloco 3 | Se for reusado, deletar quebra a ingestão futura; recomendação real é INVESTIGAR antes |
| A4 | `apps/web/src/server/billing/entitlements.ts`/`getUserEntitlement` fica órfão DENTRO desta fase (já que as "6 páginas de tool" que o consumiam saem nos Blocos 1-3), não em Phase 22 | Bloco 1-3 | Se algo em `/api/chat/unified` também chama `getUserEntitlement`, não está órfão — confirmar antes de deletar |
| A5 | `apps/web/tests/e2e/smoke.spec.ts` e `formula.spec.ts` podem ser deletados/reescritos nesta fase (não Phase 22) porque testam exclusivamente rotas que saem nos Blocos 1-3 | Bloco 8 | Se algum desses specs também cobre fluxo de auth/login que não tem outro E2E, deletar sem reescrever perde cobertura de auth |
| A6 | `apps/web/src/features/formula/components/copy-button.tsx` é específico do gerador LLM (não genérico) e sai no Bloco 1/5 | Bloco 1 | Se `render-dispatcher.tsx`/outro componente preservado importar esse `copy-button` especificamente (não um genérico em `components/app/`), removê-lo quebra o build |

## Open Questions

1. **Anexo de imagem ao chat unificado (Vision) — é "OCR" no sentido do CLEAN-02?**
   - What we know: `extraction/image-extractor.ts` é parte do dispatcher genérico de anexos (Phase 9, EXT-01..06), usado por `/api/chat/unified` para QUALQUER tipo de anexo incluindo PNG/JPEG. O TOOL "OCR" dedicado (`/workspace/ocr`, `ocr-processor.ts`, fluxo "imagem→tabela TSV") é claramente OUT.
   - What's unclear: se um usuário anexa uma foto/print ao chat unificado hoje, o `intent-classifier` pode classificar como `"ocr"` (`classifyFileIntent` detecta palavras como "imagem"/"foto"/"print") e cair no branch `ocr` do route.ts (Bloco 5) — usando `ocrPayloadSchema`+`extractContent` (o extractor de imagem, não `ocr-processor.ts`). Após remover esse branch, anexar uma imagem ao chat ainda deve funcionar (via extração genérica) ou deve ser bloqueado?
   - Recommendation: tratar como "Q&A com anexo" — o `extractContent`/`image-extractor.ts` fica (extração genérica de anexo, PRESERVAR), mas o branch ESPECÍFICO `resolvedToolKind === "ocr"` + `ocrPayloadSchema` sai. Anexar imagem passa a alimentar o contexto Q&A como qualquer outro anexo. Validar com discuss-phase se necessário.

2. **`apps/web/src/server/file-analysis/cleanup-job.ts` — quem invoca?**
   - What we know: existe em `server/file-analysis/`, provavelmente limpa arquivos efêmeros do tool File Analysis (PRIV-01/privacidade, Phase 4/6).
   - What's unclear: se File Analysis sai inteiro (Bloco 3), o cleanup-job fica órfão — mas se for invocado por um mecanismo agendado externo (cron/Vercel), a remoção do CÓDIGO não remove o REGISTRO do agendamento.
   - Recommendation: planner deve buscar `cleanup-job` em configs de deploy/CI (`vercel.json`, scripts em `package.json`, `docker-compose`) antes de deletar.

3. **Quantos `toolKind` distintos existem hoje em `ConversationExchange` em produção/dev DB?**
   - What we know: schema Prisma tem `toolKind` como string livre (partição `userId+toolKind`).
   - What's unclear: se há dados reais de dev/staging com os 8 toolKinds antigos, o teste de "carregar histórico" pode falhar de formas não cobertas pelos testes unitários atuais (que provavelmente usam fixtures limpas).
   - Recommendation: rodar uma query rápida `SELECT DISTINCT "toolKind" FROM "ConversationExchange"` no ambiente de dev antes de finalizar o Bloco 7, para garantir que o `RenderDispatcher`/`intentFromPayload` reduzidos não quebram ao renderizar histórico real.

## Environment Availability

Fase é puramente código/config — sem novas dependências externas, serviços ou runtimes. `[SKIPPED — sem dependências externas novas]`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit/integration) + Playwright (`apps/web/tests/e2e/*.spec.ts`) |
| Config file | `apps/web/vitest.config.ts` (assumir existente — não lido nesta pesquisa) / `apps/web/playwright.config.ts` |
| Quick run command | `pnpm --filter web exec vitest run <arquivo>` |
| Full suite command | `pnpm -r typecheck && pnpm -r test` (rodar `pnpm exec prisma generate` antes em worktrees) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLEAN-01 | Rotas `/api/tools/{formula,sql,regex,scripts,template}` retornam 404; zero refs UI/rota | grep + smoke | `grep -rn "tools/formula\|tools/sql\|tools/regex\|tools/scripts\|tools/template" apps/web/src --include=*.ts*` deve retornar vazio; `curl -I /api/tools/formula/generate` → 404 | ✅ (grep), 🆕 curl manual ou e2e |
| CLEAN-02 | OCR removido inteiro (rota, página, módulo Vision, fixtures, assets) | grep + build | `grep -rn "ocr" apps/web/src packages/shared/src --include=*.ts*` deve retornar zero refs fora de comentários/histórico; `pnpm -r typecheck` verde | ✅ (grep) |
| CLEAN-03 | File Analysis como tool removido; ingestão CSV/XLSX preservada | grep + unit | `grep -rn "file-analysis" apps/web/src --include=*.ts*` sem refs de rota/página/feature; `apps/web/src/server/extraction/csv-xlsx-extractor.ts` ainda importado por `dispatcher.ts` | ✅ (grep) |
| CLEAN-06 | Classificador binário; render-dispatcher sem branches mortos | unit (novo) | `pnpm --filter web exec vitest run intent-classifier.test.ts` — novo conjunto de ~20 prompts PT (eval binário) | ❌ Wave 0 — eval novo a criar |
| CLEAN-07 | Geração de tabela do zero removida (stub/clarificação/spec) | grep + unit | `grep -rn "table-clarifier\|ClarificationCard\|ConfirmationCard\|TableIntentStub\|table_clar_question\|table_stub" apps/web/src --include=*.ts*` retorna vazio; `pnpm -r test` verde | ✅ (grep) |

### O Eval Binário do Classificador (checkpoint 17→18, SC#3)

Conforme `STATE.md` Blockers/Concerns: o eixo "operação na planilha vs Q&A" precisa de ~20 prompts PT ambíguos como base de validação. Esta fase deve **plantar os rótulos corretos** no `intent-classifier.ts` reduzido; a EXECUÇÃO do eval completo (UAT) é Phase 20, mas o teste unitário do classificador (`intent-classifier.test.ts`) reduzido nesta fase deve incluir pelo menos um SUBCONJUNTO desses ~20 prompts como casos de teste — para que o `fixtureClassify()` binário tenha cobertura desde já.

**Exemplos de prompts ambíguos a incluir como casos de teste (derivar do exemplo do STATE.md):**
- "some a coluna Valor" → mutação (criar fórmula SOMA na grade) vs Q&A (responder o total em texto)? — **decisão de produto**, não apenas classificação; o teste deve fixar a expectativa
- "qual a média da coluna Valor?" → Q&A (resposta em texto, SC#4)
- "ordena por data" → mutação na grade (SC#2)
- "quantas linhas têm valor acima de 1000?" → Q&A
- "cria uma coluna de total" → mutação

**Recomendação:** o teste unitário desta fase NÃO precisa cobrir os 20 prompts completos (isso é Phase 20 UAT), mas deve ter pelo menos 6-8 casos representativos cobrindo: (a) mutação clara, (b) Q&A clara, (c) ambíguo "soma"-like, para que o `fixtureClassify()` binário tenha alguma base de regressão antes da Phase 20.

### Sampling Rate
- **Per task commit (cada bloco 1-8):** `pnpm --filter web exec vitest run <arquivos afetados pelo bloco>`
- **Per bloco completo:** `pnpm exec prisma generate && pnpm -r typecheck && pnpm -r test`
- **Phase gate:** `pnpm -r typecheck && pnpm -r test` verdes + grep de zero-referências por capacidade OUT antes de `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/web/tests/intent-classifier.test.ts` — reescrever para o eixo binário com ~6-8 prompts representativos (subset do eval de 20) — cobre CLEAN-06
- [ ] Confirmar `apps/web/vitest.config.ts`/`playwright.config.ts` existem e cobrem os arquivos a modificar (não verificado nesta pesquisa)
- [ ] Query `SELECT DISTINCT "toolKind" FROM "ConversationExchange"` em dev DB antes do Bloco 7 (Open Question 3)

## Security Domain

> `security_enforcement` não foi confirmado como `false` em `.planning/config.json` — tratando como habilitado.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | não (sem mudança) | Better Auth — preservado, fora do escopo desta fase |
| V3 Session Management | não (sem mudança) | preservado |
| V4 Access Control | sim | `getSessionFromCookieHeader` no `/api/chat/unified` — preservar o guard 401 ao podar branches; cada rota deletada (Bloco 1-3) deve ser confirmada 404, não 401-com-vazamento-de-stack |
| V5 Input Validation | sim | Zod schemas — ao reduzir `unifiedCompletePayloadSchema`/`UNIFIED_INTENTS`, garantir que `validateOptionalIntent`/`overrideIntentSchema` continuem rejeitando valores antigos (`"sql"`, `"ocr"` etc.) com erro 400 limpo, não crash |
| V6 Cryptography | não | sem mudança |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Rotas deletadas continuam acessíveis via cache/CDN ou rota dinâmica residual | Information Disclosure | Confirmar 404 real (não apenas ausência de link) via `curl`/teste — Next.js App Router remove a rota automaticamente ao deletar `route.ts`, mas confirmar build limpo |
| `assistantPayload.kind` antigo no histórico causa erro de parse não tratado exposto ao client | Information Disclosure / DoS | `.safeParse()` com fallback ao carregar `initialExchanges` (Pitfall 2) — nunca deixar exceção Zod não capturada vazar para o client |
| Prompt injection via `lastIntent`/`overrideIntent` com valores do enum antigo após redução | Tampering | `unifiedIntentSchema.safeParse()` em `validateOptionalIntent` já rejeita valores fora do enum — ao reduzir o enum, valores antigos (`"sql"`) devem ser rejeitados com 400, comportamento já existente, apenas confirmar que continua |

## Sources

### Primary (HIGH confidence)
- Codebase grep/glob direto (HEAD do repo, branch `main`, commit `52d57da`) — todos os caminhos de arquivo, imports, e schemas citados foram verificados via `grep -rn`/`find` nesta sessão
- `.planning/REQUIREMENTS.md` — IDs CLEAN-01..11 e mapeamento de fases
- `.planning/STATE.md` — decisões v3.0, concern do checkpoint 17→18
- `PRD-MILESTONE-PLANILHA-VIVA.md` — fonte de verdade D1-D6, §4 IN, §5 OUT, §6 critérios de deleção
- `.planning/phases/17-*/17-03-SUMMARY.md` — o que a Phase 17 já removeu (billing) e o que deixou pendente para esta fase (entitlements, 6 páginas de tool)
- `.planning/phases/16-*/16-02-SUMMARY.md` — confirmação que `/api/tools/*` ficam órfãos intencionalmente até esta fase

### Secondary (MEDIUM confidence)
- Nenhuma — pesquisa não exigiu fontes externas (fase de remoção interna ao codebase)

### Tertiary (LOW confidence)
- Nenhuma

## Metadata

**Confidence breakdown:**
- Standard stack: N/A — fase sem novos pacotes
- Architecture (mapa de deleção/dependências): HIGH — todos os caminhos verificados por grep direto no HEAD do repo
- Pitfalls: HIGH para pitfalls 1-2-3-4 (derivados de evidência direta no código); MEDIUM para pitfalls 5-6 (derivados de memória do projeto, não re-verificados nesta sessão)
- Validation Architecture / eval binário: MEDIUM — framework de teste confirmado por arquivos existentes, mas conteúdo exato do eval de 20 prompts depende de decisão de produto ainda não fixada (A1/A2)

**Research date:** 2026-06-11
**Valid until:** 7 dias (fase destrutiva sobre código em fluxo ativo — Phase 17 acabou de mesclar, outras quick tasks podem alterar o estado)
</content>

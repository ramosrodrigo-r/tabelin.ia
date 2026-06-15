# Retrospective: Tabelin.IA

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-05-26
**Phases:** 5 | **Plans:** 16

---

### What Was Built

1. Authenticated Next.js workspace with Brazilian formula generation (Portuguese + semicolons, 4 platforms).
2. Freemium billing: Mercado Pago Checkout Pro (Pix + card), webhook-driven entitlements, reserve/confirm/release quota.
3. Multi-tool suite: VBA/Apps Script/Airtable Scripts, SQL (5 dialects), regex (with Brazilian examples), Pro templates, destructive guardrails.
4. CSV/XLSX file analysis: upload, schema detection, AI chat, pivot summaries, executive reports, privacy cleanup cron.
5. OCR: PNG/JPEG → reconstructed table → TSV/CSV copy-ready (OpenAI Vision + fixture fallback).
6. Charts: "Sugerir Gráfico" → BarChart/LineChart/PieChart via recharts with local type toggle.
7. Playwright E2E smoke suite: 9/9 tests passing, mocking AI/billing via page.route(), real auth/DB.

---

### What Worked

- **Vertical MVP phase structure:** Each phase delivered a demeable, usable product slice. No orphaned features waiting on downstream work.
- **Fixture fallbacks from day one:** Designing fixture responses early (OCR_FIXTURE_RESPONSE, chartDataFixture) removed API cost and latency from development iterations.
- **Zod schema-first contracts in @tabelin/shared:** Having a single source of truth for tool contracts prevented mismatches between server and client and made validation consistent.
- **Reserve/confirm/release quota pattern:** Using optimistic reservation + transactional confirmation with serializable isolation prevented quota bypasses and worked cleanly with the streaming architecture.
- **page.route() mocking in Playwright:** Decoupling AI/billing calls from smoke tests eliminated flakiness while keeping real auth/quota paths exercised.
- **Gap closure as a named phase plan (05-04):** When UAT revealed fixture wiring gaps, treating it as a named plan (rather than an informal fix) kept audit trail complete and UAT workflow intact.

---

### What Was Inefficient

- **SUMMARY.md one-liner coverage was inconsistent:** Early phases (01, 02, 04) didn't include `One-liner:` fields in frontmatter — made retrospective extraction harder. Later phases (03, 05) added this properly.
- **OCR fixture not connected during 05-01 execution:** The fixture was defined in shared but not wired in the processor, requiring a separate gap-closure plan (05-04). Could have been prevented with a post-plan checklist item for "verify fixture fallback path is reachable in code."
- **CHART_PROMPT detection gap:** Chart fixture was also not wired into the stream handler during 05-02. Same root cause as OCR — fixture defined but path not exercised until UAT.
- **No CI pipeline for smoke tests:** Tests were always run locally. This is deferred to v2 but created a manual step at each phase completion.
- **QUOT-02 and QUOT-03 modeled but not UI-enforced:** These were accepted as partial implementations for v1, but surfaced during requirements review — worth being explicit about modeling-vs-enforcement distinction from the start.

---

### Patterns Established

- **@tabelin/shared for cross-boundary contracts:** Server and client share Zod schemas and fixture constants from a dedicated shared package. New tools follow the same pattern.
- **Feature folders under src/features/**: Each tool has its own folder with hook, input panel, output panel, tool composition, and tests.
- **Auth+quota+AI+stream pipeline:** Server route handlers always follow auth check → quota reserve → AI call → quota confirm → stream back. Quota release on error.
- **Fixture fallback guard:** When OPENAI_API_KEY is absent, processors return fixture early before any client initialization — keeps dev/test fully offline-capable.
- **Gap closure as 05-XX plan:** When UAT finds wiring gaps, they become named plans in the phase (not informal hot-fixes), ensuring full traceability.

---

### Key Lessons

1. **Wire fixture paths during the same plan that creates them.** Don't define a fixture in shared and assume it's connected — verify the early-return path exists in the processor before marking the plan complete.
2. **Include `One-liner:` in SUMMARY.md frontmatter from phase 01.** This makes milestone retrospective extraction automatic.
3. **Partial implementation (modeled vs enforced) should be explicit in requirements.** QUOT-02/QUOT-03 were modeled but enforcement was deferred — this should be noted in the requirement itself at definition time.
4. **page.route() is the right Playwright mock strategy for AI+billing.** It's stable, readable, and keeps real auth/DB paths exercised. Don't try to mock at the server layer for E2E smoke tests.
5. **Vertical MVP phases delivered real value at each step.** After Phase 1, the formula workspace was usable. After Phase 2, it was billable. This structure should be preserved for v2.

---

### Cost Observations

- Model mix: primarily Sonnet 4.6 (balanced profile)
- Sessions: 4 days, 172 commits
- Notable: Full MVP from zero to 9/9 smoke tests in 4 days — vertical slice structure enabled fast, parallel execution

---

## Milestone: v1.1 — Conversas Persistentes

**Shipped:** 2026-06-02
**Phases:** 3 (6–8) | **Plans:** 10

---

### What Was Built

1. Persistência de exchanges por usuário+tool no PostgreSQL (model `ConversationExchange`, cap de 50) integrada nos 7 route handlers; cascade delete no removal de conta (PRIV-01).
2. Carregamento automático do histórico ao abrir o workspace (prefetch server-side + `WorkspaceConversationContext`) e controle "Nova conversa" por tool.
3. Contexto multi-turn no LLM: helper `context-messages.ts` com serialização concisa e truncagem híbrida (últimas N=10 + limite de tokens), injetado nos 4 stream modules com isolamento por tool.
4. Gap closure de prompting (08-04): rótulo `[Resposta anterior]` + `buildMultiTurnSystemPrompt` DRY corrigindo follow-ups que repetiam a resposta anterior verbatim.

---

### What Worked

- **Reuso dos padrões do v1.0:** repository pattern, feature folders e o pipeline auth→quota→AI→stream absorveram a persistência e o contexto sem refatoração estrutural.
- **Gap closure como plano nomeado de novo (08-04):** o bug de multi-turn virou um plano rastreável em vez de hot-fix informal — mesma disciplina que funcionou no v1.0 (05-04).
- **Helper de contexto centralizado:** concentrar serialização + truncagem em `context-messages.ts` manteve os 4 tools consistentes e testáveis em um só ponto.
- **UAT ao vivo com chave real:** rodar o re-teste com `OPENAI_API_KEY` ativa confirmou de forma inequívoca que os follow-ups passaram a funcionar (2/2).

---

### What Was Inefficient

- **Bug de prompting só pego no UAT, não no teste de integração:** o teste de integração da Wave 3 validava isolamento entre tools mas não verificava que o follow-up *mudava* a saída. O LLM retornava a resposta anterior verbatim e isso passou pelos testes automatizados — exigiu a Wave 4 de gap closure.
- **UAT inicial bloqueado por artefato de ambiente:** o primeiro re-teste falhou por estar em fixture mode (sem `OPENAI_API_KEY`), não por defeito de código — custou um ciclo de diagnóstico até identificar que era ambiente.
- **Descasamento de convenção de nomes nos quick tasks:** o workflow grava `{id}-SUMMARY.md` mas o audit de fechamento procura `SUMMARY.md`, fazendo todo quick task aparecer como "missing" no close — falso positivo que exigiu remediação manual.

---

### Patterns Established

- **`WorkspaceConversationContext`** para hidratar o chat com histórico no mount, separando estado de servidor (prefetch) do estado de UI.
- **Truncagem híbrida de contexto** (últimas N + limite de tokens) como padrão para qualquer feature multi-turn futura.
- **Rotular turns no histórico serializado** (`[Resposta anterior]`) para o LLM distinguir contexto de instrução atual — evita repetição verbatim.

---

### Key Lessons

1. **Testes de integração multi-turn devem assertar que a saída muda, não só que não vaza.** Verificar isolamento entre tools não captura o bug de "ignora a nova instrução". Adicionar uma asserção de que o follow-up difere da resposta anterior teria pego o defeito antes do UAT.
2. **Diferenciar falha de ambiente de falha de código no UAT.** Rodar UAT em fixture mode produz falsos negativos para features que dependem do comportamento real do LLM — garantir `OPENAI_API_KEY` ativa antes de marcar gap.
3. **Convenções de nomes de artefatos devem casar entre o que escreve e o que audita.** O mismatch `{id}-SUMMARY.md` vs `SUMMARY.md` deve ser corrigido upstream para não recorrer no próximo close.

---

### Cost Observations

- Model mix: principalmente Opus/Sonnet (balanced profile)
- Sessions: ~4 dias, ~81 commits
- Notable: milestone menor e focado (3 fases) construído inteiramente sobre os padrões do v1.0; 1 gap closure (08-04)

---

## Milestone: v1.2 — Anexos Universais

**Shipped:** 2026-06-05
**Phases:** 3 (9–11) | **Plans:** 14

---

### What Was Built

1. Pipeline de extração multi-formato no backend (Phase 9): dispatcher único com `ExtractionResult` tipado roteando CSV/XLSX, PNG/JPEG (OCR), PDF (`unpdf`) e TXT; segurança de bytes (magic bytes via file-type, anti-ZIP-bomb com ratio em tamanho comprimido + per-entry/total caps).
2. Injeção e persistência no contexto LLM (Phase 10): conteúdo extraído injetado no system prompt com delimitadores anti-injection, persistido em `ConversationExchange.attachmentContext` (arquivo bruto nunca salvo — D-07), reusado em follow-ups via `latestWithAttachment`, truncado a `MAX_EXTRACTED_CHARS=8000`; Pro-gate backend (403 antes de extração) + cota reserve/confirm/release.
3. UI de anexo nos 5 tools (Phase 11): componentes compartilhados (AttachmentButton/Chip/Panel, PrivacyNotice), botão paperclip + drag-and-drop, feedback em dois estágios, badge de grounding, painel de transparência, aviso LGPD e CTA de upgrade para free.
4. Gap closure pós-auditoria: SEAM-05 — os 5 hooks passaram a surfacar erros acionáveis de extração (422/413) ao usuário, com teste de regressão.

---

### What Worked

- **Backend front-loaded antes da UI:** isolar a extração (Phase 9) e a persistência/contexto (Phase 10) antes de qualquer pixel manteve o único unknown técnico (`unpdf`) validado cedo, com smoke test dedicado.
- **Reuso agressivo do v1.0/v1.1:** `context-messages.ts` (truncagem híbrida do v1.1), o parser de schema do File Analysis e o OCR Vision foram embrulhados como extratores em vez de reimplementados.
- **Componentes compartilhados + amostra Nyquist representativa:** os 5 tools compartilham os componentes de anexo; testar render completo no Formula + grep/code-review nos demais evitou 5× o custo de teste sem perder cobertura real.
- **Auditoria de milestone pegou o que os testes verdes não pegaram:** o integration checker encontrou o SEAM-05 (hooks engoliam o erro acionável do backend) mesmo com 206 testes verdes — seam entre fases que nenhum teste unitário de fase cobria.

---

### What Was Inefficient

- **Tabela de rastreabilidade defasou da verificação:** os 11 requisitos da Phase 11 ficaram marcados `Pending`/`[ ]` no REQUIREMENTS.md mesmo após o 11-VERIFICATION.md `verified` + UAT humano 3/3 — corrigido manualmente na auditoria. O checkbox deveria ser atualizado no fechamento da fase.
- **VALIDATION.md ausente nas Phases 9/10:** a cobertura de teste existia (45 + 23 testes verdes) mas o artefato Nyquist formal não foi gerado durante a execução — exigiu `validate-phase` retroativo (reconstrução State B → A) no fechamento.
- **Erro acionável produzido mas não propagado:** o backend caprichou na mensagem de PDF escaneado/tipo inválido (422), mas os 5 hooks a descartavam no `setError` genérico — o valor só chegava até a borda da fase, não ao usuário (SEAM-05).
- **Lixo de extração de one-liner no MILESTONES.md:** `summary-extract --pick one_liner` retornou `"One-liner:"` para vários SUMMARYs, exigindo reescrita manual dos accomplishments no close.

---

### Patterns Established

- **Dispatcher único com contrato de erro tipado** (`ExtractionResult` discriminated union) como ponto único de roteamento por tipo — reutilizável por qualquer consumidor futuro.
- **Defesa anti-ZIP-bomb baseada em tamanho comprimido** (`info.size`, não `originalSize` controlado pelo atacante) + caps por entrada e total, sempre antes do parse.
- **Pro-gate antes de qualquer I/O** como invariante anti-bypass para features pagas que disparam trabalho custoso (OCR/parse).
- **Persistir só o derivado, nunca o bruto** (texto extraído em vez do arquivo) como padrão de privacidade reusável (D-07).

---

### Key Lessons

1. **Testes de fase verdes não cobrem seams entre fases.** O SEAM-05 viveu exatamente na fronteira route→hook que nenhum teste unitário de fase exercitava — a auditoria de integração de milestone é o gate que pega esse tipo de bug. Vale rodá-la antes de declarar pronto.
2. **Atualizar checkbox/rastreabilidade deve fazer parte do fechamento da fase, não do milestone.** Defasagem entre VERIFICATION.md e REQUIREMENTS.md gera falso `gaps_found` no audit.
3. **Gerar VALIDATION.md durante a execução, não retroativamente.** A cobertura existia; faltou o artefato — `validate-phase` no close é remediação, não prevenção.
4. **Uma mensagem de erro só tem valor se chega ao usuário.** Produzir erro acionável no backend sem branch correspondente na UI desperdiça o esforço — verificar a propagação end-to-end, não só a origem.

---

### Cost Observations

- Model mix: principalmente Opus (balanced profile)
- Sessions: ~2 dias de execução + 1 sessão de auditoria/fechamento
- Notable: milestone de 3 fases inteiramente sobre os padrões do v1.0/v1.1; 1 gap closure de auditoria (SEAM-05) + 2 validate-phase retroativos

---

## Milestone: v3.0 — Planilha Viva + Chat de IA (pivô / redução de escopo)

**Shipped:** 2026-06-15
**Phases:** 7 (16–22) | **Plans:** 21 | **Tasks:** 42

---

### What Was Built

1. Tela única (Phase 16): `WorkspaceSplit` com planilha viva (~70%) + chat (~30%) lado a lado, toggle responsivo <900px; sidebar/tool-nav removidos; 6 rotas antigas de tool com redirect 308.
2. Remoção comprovada da cadeia OUT (Phases 17/18): billing/cota (Mercado Pago, checkout, webhooks, Pro, usage ledger), OCR como tool, geradores de texto avulsos, File Analysis como tool, geração de tabela do zero; classificador de intent reduzido ao eixo binário `sheet_operation`/`qa`; render-dispatcher reduzido a `table_spec`/`qa_response`.
3. Ingestão tri-estado (Phase 19): seed / em branco / upload CSV-XLSX que substitui a grade, com arquivo efêmero (só o conteúdo persistido) e validação de bytes reaproveitada.
4. Protocolo de mutação chat→grade + Q&A (Phase 20): estado vivo da grade enviado como `specOverride`, operações estruturadas aplicadas via `setSpec` com undo Ctrl+Z, Q&A em texto, streaming, fixture sem chave, fórmulas EN↔pt-BR traduzidas.
5. Export & persistência (Phase 21): export CSV/XLSX com fórmulas calculadas + sanitização; spec ativo single-row + conversa hidratados server-side; gap closure 21-03 fechando 4 defeitos de perda de dados.
6. Limpeza final (Phase 22): migration destrutiva dropando exatamente 7 tabelas órfãs preservando dados de usuário; deps/config/testes/assets órfãos removidos; suíte verde.

---

### What Worked

- **Deleção dirigida por critérios (§6 do PRD), não por lista fixa:** remover só o que tem zero consumidores IN, comprovado por grep, protegeu símbolos compartilhados (locale, cliente IA, validação de bytes, extração genérica) de remoção acidental num pivô de −16k linhas.
- **Commits atômicos por bloco de remoção, árvore verde a cada passo:** tornou uma limpeza grande e destrutiva (migrations Prisma irreversíveis) bisseccionável e reversível — exatamente o que reduziu o risco do pivô.
- **Auditoria de milestone como rede de segurança real:** o audit pegou 3 fases sem VERIFICATION.md e 9 checkboxes de traceability defasados que os testes verdes não revelavam; o integration checker confirmou os fluxos E2E e rodou os 4 gates de verdade.
- **Verificação retroativa fechou os gaps em minutos:** como a implementação estava de fato pronta, gerar 17/18/22-VERIFICATION.md retroativamente passou de imediato (5/5, 5/5, 7/7) — o gap era de artefato, não de código.

---

### What Was Inefficient

- **VERIFICATION.md ausente em 3 fases (17/18/22) — recorrência do v1.2:** mesma lição não internalizada (gerar o artefato durante a execução, não no close). Phase 22 fez UAT 3/3 conversacional sem produzir o artefato do verifier.
- **Traceability defasada de novo:** 9 requisitos (CLEAN-04/06/08–12, QA-01/02) ficaram `Pending`/`[ ]` apesar de implementados e verificados — terceiro milestone seguido com o mesmo drift entre VERIFICATION.md e REQUIREMENTS.md.
- **Tech debt de limpeza sobreviveu até o close:** rota morta `/api/conversations/[tool]` e copy obsoleto de OCR (`pdf-extractor.ts`) só foram removidos na auditoria de milestone — o critério §6 deveria tê-los pego nas Phases 18/22.
- **Falso-positivo do audit-open em quick tasks recorreu:** o mismatch `{id}-SUMMARY.md` vs `SUMMARY.md` marcou 2 quick tasks concluídas como "unknown" no close — mesmo bug do v1.1, ainda não corrigido upstream.

---

### Patterns Established

- **Fonte única canônica para listas de domínio** (`ALL_PERSISTED_TOOL_KINDS` derivado de `UNIFIED_CHAT_TOOL_KINDS` + `ACTIVE_SPEC_TOOL_KIND`) em vez de literais duplicados — elimina nomes de capacidades removidas espalhados.
- **Persistência fonte-da-verdade falha-em-voz-alta:** o save do spec ativo propaga erro→500 em vez de engolir, para nunca perder dados silenciosamente (gap closure 21-03).
- **Migration destrutiva com allowlist explícito de tabelas preservadas:** dropar por enumeração das órfãs, não por inferência, com os modelos de usuário/sessão/conversa preservados verificados.

---

### Key Lessons

1. **Gerar VERIFICATION.md e atualizar a traceability no fechamento da fase é um gate de processo, não opcional.** Três milestones seguidos (v1.2, v2.0 implícito, v3.0) tiveram o mesmo drift — vale automatizar/forçar no execute-phase.
2. **O critério de deleção por referências deve incluir copy/strings e allow-lists, não só imports.** A rota morta e a mensagem de OCR não eram imports quebrados, então passaram pelos gates — mas eram referências pendentes a capacidades removidas (QA-01).
3. **Num pivô de redução, a auditoria de integração + verificação retroativa é mais barata que bloquear.** A implementação estava pronta; o custo real foi só produzir os artefatos faltantes — fazer isso antes de arquivar mantém o histórico íntegro sem retrabalho.

---

### Cost Observations

- Model mix: principalmente Opus (balanced profile)
- Sessions: ~4 dias de execução + 1 sessão de auditoria/fechamento; pivô pesado em remoção (+20.576 / −16.007 linhas, 334 arquivos)
- Notable: 1 gap closure de fase (21-03) + 3 VERIFICATION.md retroativos + 2 itens de tech debt limpos no close

---

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 | v1.2 | v3.0 |
|--------|------|------|------|------|
| Days to ship | 4 | 4 | ~2 | ~4 |
| Phases | 5 | 3 | 3 | 7 |
| Plans | 16 | 10 | 14 | 21 |
| Requirements | 46/46 | 9/9 | 25/25 | 32/32 |
| Smoke tests | 9/9 pass | — (reusa suite v1.0) | 207 unit/integration pass | 288 unit/integration pass |
| LOC TypeScript | ~10.500 | ~8.450 ins. | — | +20.576 / −16.007 (pivô) |
| Gap closures | 1 (05-04) | 1 (08-04) | 1 (SEAM-05, pós-auditoria) | 1 (21-03) + 3 VERIFICATION.md retroativos |

> **Padrão recorrente a corrigir:** drift entre VERIFICATION.md/traceability e o estado real persiste desde v1.2 (e o falso-positivo do audit-open em quick tasks desde v1.1). Ambos pedem correção upstream no execute-phase/fechamento de fase, não remediação manual por milestone.

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

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 |
|--------|------|------|
| Days to ship | 4 | 4 |
| Phases | 5 | 3 |
| Plans | 16 | 10 |
| Requirements | 46/46 | 9/9 |
| Smoke tests | 9/9 pass | — (reusa suite v1.0) |
| LOC TypeScript | ~10.500 | ~8.450 ins. |
| Gap closures | 1 (05-04) | 1 (08-04) |

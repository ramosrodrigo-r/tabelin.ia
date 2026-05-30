---
status: passed
phase: 08-multi-turn-llm-context
verified: 2026-05-30
goal: "O LLM recebe o histórico da conversa como contexto em cada nova mensagem, tornando follow-ups funcionais sem repetição manual"
requirements: [MULTI-01, MULTI-02, MULTI-03]
score: 11/11 must-haves verificados
method: inline (goal-backward) — gsd-verifier indisponível (limite de sessão); verificação feita pelo orquestrador contra o código real + suíte de testes
---

# Phase 8: Multi-turn LLM Context — Verification

## Veredito

**PASSED** — 11/11 must-haves verificados contra o código real e a suíte de testes. Os 3 requisitos da fase (MULTI-01/02/03) estão implementados, testados e rastreados. Backend puro: a fase injeta o histórico persistido como mensagens de contexto nas chamadas ao LLM dos 4 tools que de fato chamam OpenAI (SQL, Regex, Scripts, Template).

## Evidência por requisito

### MULTI-01 — Backend inclui trocas anteriores como contexto na chamada ao LLM
- `apps/web/src/server/ai/context-messages.ts` (novo): `buildToolContextMessages` monta `[system, ...history, user]` em ordem cronológica ascendente (D-06); serializador conciso por tool extrai artefato + explicação curta (D-05), sem JSON/metadata/warnings.
- Os 4 streams (`sql/regex/scripts/template-stream.ts`) aceitam `history?` opcional e a injetam (D-01); Formula intocado (D-02 — confirmado: 0 refs a `buildToolContextMessages` em `formula-stream.ts`).
- Os 4 route handlers leem o histórico via `findConversationExchanges(user.id, toolKind)` e o passam a `resolve*Payload`.
- Histórico vazio → `[system, user]`, idêntico ao single-turn (D-10), coberto por teste.
- **Status: VERIFICADO** (17 testes unitários do helper + wiring nos 4 streams/routes + typecheck limpo).

### MULTI-02 — Truncagem automática por tokens
- `truncateHistory` (função exportada separada): teto `MAX_EXCHANGES = 10` + guarda por orçamento de tokens via heurística ~4 chars/token (D-07/D-08).
- Responsabilidade única: o helper de montagem NÃO trunca internamente; o call site dos streams aplica `truncateHistory(input.history ?? [])` (contrato fixado nesta fase).
- Testes: 25 trocas → resultado ≤ 10; corte por orçamento quando excede o limite seguro.
- **Status: VERIFICADO** (testes unitários determinísticos).

### MULTI-03 — Isolamento por tool
- Leitura sempre filtrada por `user.id` + `toolKind` correto por rota: `"sql"`, `"regex"`, `"script"` (SINGULAR), `"template"`.
- Gotcha crítico confirmado: scripts usa `"script"` (singular) tanto no `buildToolContextMessages` quanto no `findConversationExchanges`, batendo com o `saveConversationExchange` existente — sem cruzamento/perda de thread.
- Teste de integração com regressão explícita (`"script"` ≠ `"scripts"`) e assertiva de isolamento (sql vs scripts recebem toolKinds distintos).
- **Status: VERIFICADO** (11 testes de integração em `multi-turn-context.test.ts`).

## Critérios de Sucesso do ROADMAP

| # | Critério | Status | Evidência |
|---|----------|--------|-----------|
| 1 | Follow-up sem repetir contexto | VERIFICADO (wiring) / smoke manual recomendado (resposta do LLM ao vivo) | Integração: history lido por toolKind e passado ao stream. A qualidade da resposta do LLM ao vivo só é observável com `OPENAI_API_KEY` real. |
| 2 | Conversas longas não estouram tokens | VERIFICADO | `truncateHistory` testado (teto N=10 + orçamento de tokens). |
| 3 | Trocar de tool não vaza contexto | VERIFICADO | Teste de isolamento por `user.id+toolKind`; regressão `"script"` singular. |

## Decisões travadas (D-01..D-11) — conformidade

Todas as 11 decisões do `08-CONTEXT.md` foram honradas e estão rastreadas nas `must_haves.truths` dos planos (gate de decision-coverage: 11/11). Destaques verificados no código: D-02 (Formula fora), D-03 (regex só no `generate`; branch `explain` sem history), D-05 (serializador sem JSON cru), D-09 (skip-on-error herdado do repository, sem try/catch extra), D-11 (filtro userId+toolKind), gotcha `"script"` singular, e leitura do template APÓS o Pro gate dentro do try.

## Testes

- `apps/web/tests/context-messages.test.ts` — 17 testes (serialização 4 tools, ordem, histórico vazio, filtro de mode, truncagem, edge cases) — **PASS**
- `apps/web/tests/multi-turn-context.test.ts` — 11 testes (toolKind por rota, regressão `"script"`, isolamento, skip-on-error 200, Pro gate 403) — **PASS**
- Total fase 8: **28/28 PASS**. `tsc --noEmit`: **limpo**.

## Avisos / dívida (não bloqueiam esta fase)

1. **Falha pré-existente herdada (não-regressão):** `apps/web/tests/formula-ui.test.tsx > "streams formula output and enables validated copy"` falha (botão "Copiar resultado" não encontrado). Confirmado pré-existente: o componente `FormulaTool` foi alterado por último na fase 07 (`5aeae3e feat(07-04)`); a Phase 8 não tocou em NENHUM arquivo `.tsx`/formula/componente. Drift de acessibilidade do frontend da fase 7 — fora do escopo da Phase 8. Recomenda-se corrigir em uma tarefa de manutenção do frontend.
2. **Code review (gate advisory):** não pôde ser concluído nesta execução por limite de sessão do subagente. Não-bloqueante por design. Recomenda-se rodar `/gsd:code-review 08` quando a sessão resetar.

## Verificação humana recomendada (smoke ao vivo — não-bloqueante)

Com `OPENAI_API_KEY` configurada, em qualquer dos 4 tools (ex.: SQL):
1. Gerar um artefato (ex.: "consulta de vendas por mês").
2. Enviar um follow-up sem repetir contexto (ex.: "agora faça isso no BigQuery").
   - **Esperado:** o LLM adapta a resposta anterior sem o usuário re-explicar.
3. Trocar para outro tool e confirmar que o contexto do tool anterior não aparece.

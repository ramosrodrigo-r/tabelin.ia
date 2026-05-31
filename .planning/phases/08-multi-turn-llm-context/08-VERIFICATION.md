---
phase: 08-multi-turn-llm-context
verified: 2026-05-30T21:14:00Z
status: human_needed
score: 3/3 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 11/11
  previous_note: "Verificação anterior (plans 01-03) feita pelo orquestrador inline, antes do Plan 04 (gap closure). Esta é a verificação pós-04 pelo gsd-verifier."
  gaps_closed:
    - "serializeAssistant sem rótulo causava eco verbatim — corrigido com prefixo [Resposta anterior] em todos os 4 cases"
    - "System prompts single-shot sem instrução multi-turn — corrigido com buildMultiTurnSystemPrompt"
    - "Testes de multi-turn-context.test.ts só exercitavam histórico vazio — corrigido com 3 novos testes de histórico não-vazio"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Follow-up ao vivo aplica nova instrução (SQL)"
    expected: "Após gerar uma query SQL, enviar 'agora adicione ORDER BY nome' — o LLM modifica a query anterior adicionando a cláusula, sem repetir verbatim nem recomeçar do zero."
    why_human: "Em ambiente de teste sem OPENAI_API_KEY o fixture determinístico é retornado independentemente do histórico. Verificar qualidade real da resposta do LLM requer chave ativa."
  - test: "Follow-up ao vivo aplica nova instrução (Regex)"
    expected: "Após gerar regex de CPF, enviar 'quero validar um RG' — o LLM gera um novo padrão para RG, não repete o padrão de CPF."
    why_human: "Mesmo motivo — qualidade da resposta do LLM ao vivo não é verificável por grep ou teste unitário."
---

# Phase 8: Multi-turn LLM Context — Verification Report (Re-verificação pós-Plan 04)

**Phase Goal:** O LLM recebe o histórico da conversa como contexto em cada nova mensagem, tornando follow-ups funcionais sem repetição manual.
**Verified:** 2026-05-30T21:14:00Z
**Status:** human_needed
**Re-verification:** Sim — após gap closure do Plan 04 (bug de echo no multi-turn prompting)

## Contexto da re-verificação

A verificação anterior (inline pelo orquestrador, pré-Plan 04) cobriu Plans 01-03 com status "passed" mas com human verification recomendado para a qualidade do LLM ao vivo. O UAT subsequente encontrou 2 gaps major: follow-ups retornavam resposta verbatim idêntica (instrução ignorada). O Plan 04 foi executado para fechar esses gaps. Esta verificação cobre o estado pós-Plan 04.

## Goal Achievement

### Observable Truths (Success Criteria do Roadmap)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Usuário pode fazer follow-up e o LLM responde corretamente sem repetir contexto anterior | VERIFIED (infra) / HUMAN (qualidade LLM ao vivo) | `[Resposta anterior]` label em todos os 4 cases de `serializeAssistant`; `buildMultiTurnSystemPrompt` anexa instrução multi-turn quando `historyLength > 0`; 4 streams usam o helper; 3 novos testes com histórico não-vazio confirmam pipeline sem crash e evento `complete` emitido. Qualidade real da resposta só verificável com OpenAI API key ativa. |
| 2 | Conversas longas não causam erro de limite de tokens — truncagem automática para últimas N trocas | VERIFIED | `truncateHistory`: teto `MAX_EXCHANGES=10` + corte por `SAFE_TOKEN_BUDGET=4000` tokens (heurística ~4 chars/token). Coberto por testes determinísticos: 25 trocas → ≤10; trocas de 10k chars são cortadas pelas mais antigas. |
| 3 | Trocar de tool não vaza contexto — cada tool injeta apenas seu próprio thread (isolamento por toolKind) | VERIFIED | Cada route lê `findConversationExchanges(user.id, toolKind)` com literal exato: `"sql"`, `"regex"`, `"script"` (singular), `"template"`. Teste de regressão assere que scripts NÃO usa `"scripts"`. Teste de isolamento confirma toolKinds distintos entre sql e scripts. |

**Score:** 3/3 truths verified (infra/código). SC1 tem componente de qualidade de LLM que requer verificação humana.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/src/server/ai/context-messages.ts` | Serializador + buildMultiTurnSystemPrompt + truncagem | VERIFIED | Exporta `buildToolContextMessages`, `truncateHistory`, `MAX_EXCHANGES`, `GENERATE_MODE`, `buildMultiTurnSystemPrompt`. 233 linhas. `serializeAssistant` prefixando `[Resposta anterior]\n` em todos os 4 cases (linhas 75, 82, 89, 96). `buildMultiTurnSystemPrompt` na linha 166. |
| `apps/web/tests/context-messages.test.ts` | Suite cobrindo serialização, rótulo, truncagem, buildMultiTurnSystemPrompt | VERIFIED | 23 testes — todos passam. Inclui 2 testes para o rótulo `[Resposta anterior]` (adicionados no Plan 04) e 3 testes para `buildMultiTurnSystemPrompt`. |
| `apps/web/src/server/ai/sql-stream.ts` | `buildMultiTurnSystemPrompt` wrapping system prompt | VERIFIED | Linha 14: import. Linha 41: `buildMultiTurnSystemPrompt(literal, input.history?.length ?? 0)` dentro de `buildToolContextMessages`. |
| `apps/web/src/server/ai/regex-stream.ts` | `buildMultiTurnSystemPrompt` no branch generate, explain intocado | VERIFIED | Linha 46: `buildMultiTurnSystemPrompt` apenas no branch `generate`. Branch `explain` (linhas 68-88): sem `history`, sem `buildToolContextMessages` — apenas `[system, user]` literal. |
| `apps/web/src/server/ai/scripts-stream.ts` | `buildMultiTurnSystemPrompt` wrapping system prompt, toolKind "script" | VERIFIED | Linha 47: `buildToolContextMessages("script", ...)`. Linha 49: `buildMultiTurnSystemPrompt(...)`. |
| `apps/web/src/server/ai/template-stream.ts` | `buildMultiTurnSystemPrompt` wrapping system prompt | VERIFIED | Linha 37: `buildMultiTurnSystemPrompt(...)` dentro de `buildToolContextMessages`. |
| `apps/web/src/app/api/tools/sql/generate/route.ts` | `findConversationExchanges(user.id, "sql")` antes de `resolveSqlPayload` | VERIFIED | Linha 31: `findConversationExchanges(user.id, "sql")`. Linha 32: passado a `resolveSqlPayload`. |
| `apps/web/src/app/api/tools/regex/generate/route.ts` | `findConversationExchanges(user.id, "regex")` + passagem com `mode:"generate"` | VERIFIED | Linha 31: `findConversationExchanges(user.id, "regex")`. Linha 32: `resolveRegexPayload({ mode: "generate", ..., history })`. |
| `apps/web/src/app/api/tools/scripts/generate/route.ts` | `findConversationExchanges(user.id, "script")` SINGULAR | VERIFIED | Linha 31: `findConversationExchanges(user.id, "script")` — singular, matching `saveConversationExchange` existente. |
| `apps/web/src/app/api/tools/template/generate/route.ts` | History lido APÓS Pro gate, dentro do try | VERIFIED | Pro gate retorna 403 na linha 22. `findConversationExchanges` na linha 39 — dentro do `try` (linha 37), após o Pro gate. |
| `apps/web/tests/multi-turn-context.test.ts` | 14 testes (11 originais + 3 novos com histórico não-vazio) | VERIFIED | 14 testes — todos passam. Novos describes: `"multi-turn: comportamento com histórico não-vazio (regressão do bug echo)"` com 3 testes: sql 200+complete, regex 200+complete, saveConversationExchange chamado com histórico não-vazio. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `sql-stream.ts` | `context-messages.ts` | `import buildToolContextMessages, buildMultiTurnSystemPrompt` | WIRED | Linha 14: import confirmado. Linha 41: `buildMultiTurnSystemPrompt(literal, input.history?.length ?? 0)` passado como systemPrompt. |
| `regex-stream.ts` (generate branch) | `buildMultiTurnSystemPrompt` | Chamada com basePrompt + historyLength | WIRED | Linha 46: dentro do bloco `if (input.mode === "generate")`. Branch explain: sem referência. |
| `regex-stream.ts` (explain branch) | SEM history | Ausência deliberada de injeção | VERIFIED (negativo) | Linhas 68-88: apenas `[system, user]` literal — nenhuma referência a `history`, `buildToolContextMessages`, ou `buildMultiTurnSystemPrompt`. |
| `scripts-stream.ts` | `"script"` singular | toolKind literal | WIRED | Linha 47: `buildToolContextMessages("script", ...)`. Bate com `saveConversationExchange` do route (linha 46 do route). |
| `template/generate/route.ts` | `findConversationExchanges` | APÓS Pro gate | WIRED (ordem correta) | Pro gate: linha 22 (retorno 403 antes do try). `findConversationExchanges`: linha 39 (dentro do try, após o gate). |
| `serializeAssistant` | `role:assistant content` | Rótulo `[Resposta anterior]` | WIRED | Linhas 75, 82, 89, 96: todos os 4 cases retornam string iniciando com `[Resposta anterior]\n`. |
| `buildMultiTurnSystemPrompt` | system prompt final | Concatenação condicional | WIRED | Linha 167: `if (historyLength === 0) return basePrompt` — sem regressão. Linha 169-175: append do parágrafo multi-turn. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| context-messages tests (23) | `cd apps/web && pnpm vitest run tests/context-messages.test.ts` | 23/23 PASS | PASS |
| multi-turn integration tests (14) | `cd apps/web && pnpm vitest run tests/multi-turn-context.test.ts` | 14/14 PASS | PASS |
| TypeScript typecheck | `pnpm --filter web typecheck` | exit 0 (tsc --noEmit limpo) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| MULTI-01 | 08-01, 08-02, 08-03, 08-04 | Backend inclui trocas anteriores como mensagens de contexto na chamada ao LLM | SATISFIED | `buildToolContextMessages` monta `[system, ...history, user]`; 4 streams injetam history; 4 routes leem history; `[Resposta anterior]` + `buildMultiTurnSystemPrompt` garantem que o modelo trata o histórico como contexto (não como output a repetir). |
| MULTI-02 | 08-01, 08-03 | Contexto truncado automaticamente às últimas N trocas | SATISFIED | `truncateHistory`: MAX_EXCHANGES=10 + SAFE_TOKEN_BUDGET=4000. Testes determinísticos cobrem teto numérico e corte por tokens. |
| MULTI-03 | 08-01, 08-02, 08-03 | Contexto independente por tool | SATISFIED | Cada route usa toolKind literal fixo (`"sql"`, `"regex"`, `"script"` singular, `"template"`). Teste de isolamento e regressão `"script"` ≠ `"scripts"` cobertos. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| Nenhum | — | — | — | Nenhum TBD, FIXME, XXX, placeholder ou return vazio encontrado nos arquivos da fase. |

**Nota sobre falha pré-existente:** `apps/web/tests/formula-ui.test.tsx` tem 1 falha pré-existente (componente `FormulaTool` — botão "Copiar resultado" não encontrado). Confirmado como pré-existente da Phase 07, intocada pela Phase 08. Não é regressão desta fase.

### Human Verification Required

#### 1. Follow-up ao vivo aplica nova instrução (SQL)

**Test:** Com `OPENAI_API_KEY` real configurada, no gerador SQL: (1) gerar uma query (ex.: "listar clientes ativos"); (2) enviar follow-up "agora adicione ORDER BY nome".
**Expected:** A segunda resposta constrói sobre a anterior — mantém tabela/colunas, adiciona `ORDER BY nome`. Não repete a query anterior sem alteração nem recomeça do zero.
**Why human:** Em ambiente de teste sem chave OpenAI, o fixture determinístico é retornado independentemente do histórico injetado. A qualidade real da resposta do LLM (se o rótulo `[Resposta anterior]` e a instrução `buildMultiTurnSystemPrompt` produzem o comportamento correto) só é observável com modelo ao vivo.

#### 2. Follow-up ao vivo aplica nova instrução (Regex)

**Test:** Com `OPENAI_API_KEY` real, no gerador Regex: (1) gerar regex de CPF; (2) enviar "quero validar um RG".
**Expected:** O LLM gera um novo padrão para RG (diferente do CPF). O padrão de CPF não é repetido verbatim.
**Why human:** Mesmo motivo do item 1 — qualidade de resposta do LLM ao vivo.

---

## Gaps Summary

Nenhum gap bloqueante. Os dois gaps do UAT (eco verbatim em SQL e Regex) foram endereçados pelo Plan 04:
- Causa 1 (serialização sem rótulo): corrigida com prefixo `[Resposta anterior]` em todos os 4 cases do `serializeAssistant`.
- Causa 2 (system prompts single-shot): corrigida com `buildMultiTurnSystemPrompt` que anexa instrução multi-turn condicional nos 4 streams.
- Cobertura de teste: 3 novos testes em `multi-turn-context.test.ts` exercitam o pipeline com histórico não-vazio e confirmam 200 OK + evento complete + saveConversationExchange chamado (fluxo sem crash).

A verificação humana restante (items 1 e 2 acima) valida a qualidade da resposta do modelo ao vivo, que por design não pode ser verificada programaticamente sem chave OpenAI ativa.

---

_Verified: 2026-05-30T21:14:00Z_
_Verifier: Claude (gsd-verifier)_

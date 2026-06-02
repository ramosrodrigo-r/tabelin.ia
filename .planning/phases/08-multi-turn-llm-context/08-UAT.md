---
status: complete
phase: 08-multi-turn-llm-context
source: [08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md]
started: 2026-05-30T00:00:00Z
updated: 2026-06-01T20:10:00Z
resolution: "Ambos os gaps fechados pelo Plan 08-04 (gap closure) e confirmados em re-teste ao vivo com OPENAI_API_KEY ativa — ver 08-HUMAN-UAT.md (2/2 passed). NOTA: o re-teste inicial falhou por artefato de ambiente (fixture mode sem OPENAI_API_KEY), não por defeito de código."
---

## Current Test

[testing complete]

## Tests

### 1. Follow-up usa contexto da conversa (mesmo tool)
expected: No gerador de SQL, gere uma query, depois peça um ajuste que dependa da anterior ("agora ordene por data") sem repetir o contexto. A segunda resposta constrói sobre a primeira (mantém tabela/colunas, só adiciona o ajuste), em vez de recomeçar do zero.
result: issue
reported: "Follow-up 'agora ordene por data de cadastro' retornou query byte-a-byte idêntica à primeira geração — a nova instrução foi totalmente ignorada (sem ORDER BY data_cadastro, sem qualquer alteração)."
severity: major

### 2. Isolamento entre ferramentas
expected: Depois de conversar no gerador de SQL, abra o gerador de Regex e faça um pedido novo. A resposta do Regex NÃO menciona nem reaproveita nada da conversa de SQL — cada ferramenta tem histórico isolado.
result: issue
reported: "No Regex: após gerar regex de CPF, o follow-up 'quero validar um rg' retornou o MESMO regex de CPF byte-a-byte — instrução ignorada. Reproduz o bug do teste 1 em outra ferramenta. Isolamento cross-tool não validado pois o follow-up intra-tool já falha."
severity: major

### 3. Modo "explicar" não polui o thread de geração
expected: Use a ação de explicar um resultado, depois faça uma nova geração no mesmo tool referenciando a geração anterior (não o explain). O contexto da nova geração ignora o turno de "explicar" — a resposta segue o fio das gerações, não da explicação.
result: skipped
reason: Não testável de forma limpa enquanto o follow-up multi-turn (testes 1-2) está quebrado — re-testar após a correção.

### 4. Conversa longa não quebra (truncagem)
expected: Faça muitas trocas seguidas (10+) no mesmo tool. As respostas continuam corretas e sem erro; trocas muito antigas deixam de influenciar o contexto, mas a conversa segue funcional e responsiva.
result: skipped
reason: Depende do follow-up multi-turn (testes 1-2), que está quebrado — re-testar após a correção.

### 5. Geração single-turn (sem histórico) ainda funciona
expected: Numa sessão/tool sem histórico, a primeira geração funciona normalmente como antes — sem erros e sem comportamento estranho por causa do contexto vazio.
result: pass

## Summary

total: 5
passed: 1
issues: 2
pending: 0
skipped: 2
blocked: 0

## Gaps

- truth: "Um follow-up no mesmo tool ('agora ordene por data de cadastro') deve construir sobre a geração anterior, aplicando a nova instrução."
  status: resolved
  reason: "User reported: follow-up retornou query byte-a-byte idêntica à primeira geração — a nova instrução foi totalmente ignorada (sem ORDER BY data_cadastro, sem qualquer alteração)."
  severity: major
  test: 1
  root_cause: "Defeito de prompting (não de montagem do array). (1) serializeAssistant injeta turnos anteriores como prosa (artefato+explicação), conflitando com o system prompt 'responda APENAS com JSON' + response_format json_object; (2) os system prompts são single-shot e não instruem o modelo a tratar turnos anteriores como contexto e responder ao ÚLTIMO pedido. Com gpt-5-mini e follow-up curto, o modelo 'completa o padrão' e regenera o artefato anterior verbatim. Prova decisiva: a 2ª resposta repetiu as 'Premissas' byte-a-byte, mas serializeAssistant REMOVE as premissas do histórico — só seria possível regenerando a resposta original ao pedido original."
  artifacts:
    - path: "apps/web/src/server/ai/context-messages.ts"
      issue: "serializeAssistant emite prosa que conflita com o contrato JSON (response_format json_object); histórico não é rotulado como contexto de referência"
    - path: "apps/web/src/server/ai/sql-stream.ts"
      issue: "system prompt single-shot sem orientação multi-turn; response_format json_object contra histórico em prosa"
  missing:
    - "Adicionar orientação multi-turn aos system prompts: tratar mensagens anteriores como contexto e responder/refinar o ÚLTIMO pedido do usuário"
    - "Resolver o mismatch de formato: serializar histórico de forma consistente com o JSON exigido OU rotular claramente a prosa como 'resposta anterior (formato de referência)'"
    - "Adicionar teste de integração com histórico NÃO-vazio que dirige um follow-up e asserta que a nova instrução é aplicada"
  debug_session: .planning/debug/multi-turn-followup-echoes-previous-answer.md

- truth: "Um follow-up no Regex ('quero validar um rg') deve gerar um regex novo para a nova instrução, não repetir o anterior."
  status: resolved
  reason: "User reported: após gerar regex de CPF, o follow-up 'quero validar um rg' retornou o MESMO regex de CPF byte-a-byte. Reproduz o bug do teste 1 em outra ferramenta (padrão cross-tool). Isolamento SQL↔Regex não validado de forma limpa."
  severity: major
  test: 2
  root_cause: "Mesma causa-raiz do gap do teste 1 — defeito de prompting compartilhado pelos 4 tools (prosa no histórico vs. contrato JSON + ausência de instrução multi-turn). CPF→RG byte-idêntico sob amostragem padrão confirma 'mesmo pedido efetivo'."
  artifacts:
    - path: "apps/web/src/server/ai/context-messages.ts"
      issue: "serializeAssistant + ausência de rótulo de contexto afeta todos os tools, incluindo regex"
    - path: "apps/web/src/server/ai/regex-stream.ts"
      issue: "system prompt do branch generate sem orientação multi-turn"
    - path: "apps/web/tests/multi-turn-context.test.ts"
      issue: "findConversationExchanges sempre mockado para [] — caminho de histórico não-vazio nunca exercido (falsa confiança)"
  missing:
    - "Mesma correção de prompting/formato do gap 1, aplicada de forma compartilhada aos 4 tools"
    - "Teste de comportamento com histórico não-vazio cobrindo regex (e idealmente os 4 tools)"
  debug_session: .planning/debug/multi-turn-followup-echoes-previous-answer.md

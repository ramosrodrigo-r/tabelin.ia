---
status: complete
phase: 08-multi-turn-llm-context
source: [08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md]
started: 2026-05-30T00:00:00Z
updated: 2026-05-30T00:00:00Z
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
  status: failed
  reason: "User reported: follow-up retornou query byte-a-byte idêntica à primeira geração — a nova instrução foi totalmente ignorada (sem ORDER BY data_cadastro, sem qualquer alteração)."
  severity: major
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Um follow-up no Regex ('quero validar um rg') deve gerar um regex novo para a nova instrução, não repetir o anterior."
  status: failed
  reason: "User reported: após gerar regex de CPF, o follow-up 'quero validar um rg' retornou o MESMO regex de CPF byte-a-byte. Reproduz o bug do teste 1 em outra ferramenta (padrão cross-tool). Isolamento SQL↔Regex não validado de forma limpa."
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

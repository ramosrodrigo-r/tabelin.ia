---
status: testing
phase: 22-limpeza-final
source: [22-01-SUMMARY.md]
started: 2026-06-14T22:52:00Z
updated: 2026-06-14T23:08:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: App sobe do zero — servidor inicia sem erros, migration `remove_orphaned_models` aplica, e o workspace carrega (planilha viva + chat) com dados.
result: pass

### 2. QA Suite Verde (typecheck + lint + test)
expected: `pnpm typecheck`, `pnpm lint` e `pnpm test` passam 100% verdes (deliverables QA-01/QA-02 e "Zero warnings eslint").
result: pass
note: "Falha inicial de lint (6 errors react-hooks/preserve-manual-memoization em workspace-state-context.tsx) corrigida no commit 62645ac (add dispatch às deps dos useCallback). Re-verificado: typecheck PASS, lint PASS, test PASS (291 passed/1 skipped)."

### 3. Planilha viva + chat sem regressão
expected: Abrir o workspace, enviar uma mensagem no chat e ver a grade reagir (edição de célula, fórmulas via use-formula-engine, stream do chat). Sem regressão dos lint-fixes da fase 22 em table-grid-panel / use-formula-engine / use-unified-chat-stream.
result: issue
reported: "Usuário enviou =SOMA(b2). O chat classificou como 'Pergunta · detectado' e a IA respondeu 'Não há planilha no contexto, logo não posso calcular um valor concreto' — explicou o comportamento genérico do SUM em vez de calcular sobre a planilha viva. O estado da planilha não está sendo injetado no contexto do chat."
severity: major

## Summary

total: 3
passed: 2
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "pnpm lint passa 100% verde (Zero warnings eslint — deliverable QA-02)"
  status: resolved
  reason: "Auto-verificado: pnpm lint falhava com 6 errors react-hooks/preserve-manual-memoization em apps/web/src/components/app/workspace-state-context.tsx (linhas 187-191 e 197). Corrigido adicionando `dispatch` às deps dos useCallback (dispatch do useReducer é estável). Commit 62645ac. lint/typecheck/test verdes após o fix."
  severity: major
  test: 2
  root_cause: "useCallback(() => dispatch(...), []) — React Compiler infere `dispatch` como dependência e o eslint plugin rejeita deps [] vazias. Introduzido por ca03d1d (gap-closure 21-03), commitado após a fase 22 (bab7858)."
  artifacts:
    - path: "apps/web/src/components/app/workspace-state-context.tsx"
      issue: "6 useCallback wrappers de dispatch com deps []"
  missing:
    - "Adicionar dispatch às dependency arrays (feito — commit 62645ac)"
  debug_session: ""

- truth: "Planilha viva chega ao contexto do chat — fórmulas/perguntas operam sobre os dados reais da grade"
  status: resolved
  resolved_by: "c768476 fix(20): send specOverride as JSON string — hook agora envia JSON.stringify(spec) no caminho JSON, igualando ao FormData. + teste de regressão em unified-chat-tool.test.tsx (antes codificava o bug). typecheck/lint/test verdes."
  reason: "User reported: enviou =SOMA(b2); chat detectou 'Pergunta' e a IA respondeu 'Não há planilha no contexto'. Estado da planilha não injetado no contexto da requisição do chat."
  severity: major
  test: 3
  root_cause: "PRÉ-EXISTENTE, fora do escopo da fase 22 (não é regressão dos lint-fixes). No caminho JSON sem-arquivo, o cliente envia `specOverride: workspaceState.spec` como OBJETO (use-unified-chat-stream.ts:93, introduzido em e4e19a9 feat(20-02)). O servidor faz `specOverride: asString(input.specOverride)` (route.ts:72, de 136a5e8 feat(13-03)); asString retorna undefined para não-strings → specResult.value=undefined → context.spec=undefined → serializeSpecForPrompt injeta 'Nenhuma planilha foi enviada no contexto' → modelo responde sem a planilha. O caminho com-arquivo (FormData) funciona porque envia JSON.stringify(spec) (string)."
  artifacts:
    - path: "apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts"
      issue: "linha 93: JSON path envia specOverride como objeto em vez de string"
    - path: "apps/web/src/app/api/chat/unified/route.ts"
      issue: "linha 72: asString descarta o objeto specOverride silenciosamente"
  missing:
    - "Cliente: enviar `specOverride: JSON.stringify(workspaceState.spec)` no caminho JSON (igualar ao FormData que o servidor JSON.parse espera)"
    - "Teste de regressão: requisição JSON sem-arquivo preserva a spec no contexto do provider"
  debug_session: ""
  out_of_phase: 20-02

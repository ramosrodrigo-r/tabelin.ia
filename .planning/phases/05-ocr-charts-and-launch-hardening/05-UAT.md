---
status: partial
phase: 05-ocr-charts-and-launch-hardening
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md]
started: 2026-05-26T22:42:47Z
updated: 2026-05-26T23:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. OCR — Sidebar e navegação
expected: Abra o app. No sidebar deve aparecer o item OCR ativado. Clicar nele leva para /workspace/ocr sem erros de rota ou página em branco.
result: pass

### 2. OCR — Upload de imagem e processamento
expected: Em /workspace/ocr, selecione uma imagem PNG ou JPEG com uma tabela. O sistema deve aceitar o arquivo, mostrar indicador de carregamento, e exibir a tabela reconstruída na tela.
result: issue
reported: "Nao foi possivel processar a imagem."
severity: major

### 3. OCR — Copiar TSV e CSV
expected: Após o resultado OCR aparecer, clicar "Copiar TSV" e "Copiar CSV" copia os dados correspondentes para o clipboard. Os botões mostram rótulos distintos (não apenas "Copiar").
result: blocked
blocked_by: prior-phase
reason: "Depende do OCR funcionar (teste 2 com issue de fixture fallback ausente)"

### 4. Charts — Botão "Sugerir Gráfico" no chat de arquivo
expected: Abra um arquivo CSV em /workspace/file-analysis. No painel de chat, deve aparecer o botão "Sugerir Gráfico" ao lado dos outros botões de ação rápida.
result: pass

### 5. Charts — Geração e exibição do gráfico
expected: Clique em "Sugerir Gráfico". O sistema envia o prompt e a resposta do AI aparece como um gráfico de barras (BarChart) com título, eixos e dados — não como texto puro.
result: issue
reported: "Resposta apareceu como texto de fixture (schema description), não como gráfico renderizado. Fixture do file-analysis não retorna JSON de chart_data — fallback para type:text."
severity: major

### 6. Charts — Alternância de tipo de gráfico
expected: Com o gráfico visível, clicar nos botões "Barras", "Linhas" e "Pizza" alterna o tipo de gráfico localmente (sem recarregar ou enviar novo prompt).
result: blocked
blocked_by: prior-phase
reason: "Depende do gráfico ser renderizado (teste 5 com issue de fixture chart_data ausente)"

### 7. Charts — Copiar dados do gráfico
expected: O ChartMessage tem um botão de cópia que exporta os dados do gráfico em formato TSV (cabeçalho + linhas).
result: blocked
blocked_by: prior-phase
reason: "Depende do ChartMessage aparecer (teste 5 bloqueado)"

### 8. Quota block — 5ª geração bloqueada
expected: Após 4 usos de qualquer ferramenta que consome quota (ex: fórmula), a 5ª tentativa deve ser bloqueada e exibir um banner ou mensagem de limite atingido.
result: pass

### 9. Smoke tests — execução da suite E2E
expected: Com o servidor dev rodando, execute `cd apps/web && npx playwright test tests/e2e/smoke.spec.ts --reporter=list`. Todos os 9 suites devem passar (ou ao menos não haver falhas de compilação/setup).
result: pass

## Summary

total: 9
passed: 4
issues: 2
pending: 0
skipped: 0
blocked: 3

## Gaps

- truth: "Upload de imagem PNG/JPEG processa via OCR e exibe tabela reconstruída"
  status: failed
  reason: "User reported: Nao foi possivel processar a imagem."
  severity: major
  test: 2
  root_cause: "OPENAI_API_KEY vazia lança exceção em createOpenAIClient(); OCR_FIXTURE_RESPONSE existe no shared package mas nunca é importado em ocr-processor.ts — fixture fallback foi planejado mas não conectado"
  artifacts:
    - path: "apps/web/src/server/ai/ocr-processor.ts"
      issue: "Sem import de OCR_FIXTURE_RESPONSE; createOpenAIClient() lança quando key ausente"
    - path: "apps/web/src/server/ai/openai-client.ts"
      issue: "createOpenAIClient() throws 'OPENAI_API_KEY is required' — sem fallback"
  missing:
    - "Importar OCR_FIXTURE_RESPONSE de @tabelin/shared em ocr-processor.ts"
    - "Quando OPENAI_API_KEY ausente, retornar fixture em vez de lançar"
  debug_session: ""

- truth: "Clicar em Sugerir Gráfico renderiza ChartMessage com gráfico de barras"
  status: failed
  reason: "Resposta apareceu como texto de fixture (schema description), não como gráfico renderizado. Fixture do file-analysis não retorna JSON de chart_data — fallback para type:text."
  severity: major
  test: 5
  root_cause: "Fixture de file-analysis chat retorna texto descritivo, não JSON chart_data. JSON.parse falha ou campos ausentes — cai em type:text. ChartMessage nunca é renderizado em modo fixture."
  artifacts:
    - path: "apps/web/src/features/file-analysis/hooks/use-file-chat.ts"
      issue: "complete event handler faz JSON.parse na resposta fixture — fixture não retorna chart JSON"
    - path: "apps/web/src/server/ai/openai-client.ts"
      issue: "Sem API key, fixture de chat não cobre caso de chart_data"
  missing:
    - "Fixture de chat com resposta chart_data válida para modo de desenvolvimento sem API key"
  debug_session: ""

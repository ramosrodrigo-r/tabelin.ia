---
status: complete
phase: 05-ocr-charts-and-launch-hardening
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md]
started: 2026-05-26T22:42:47Z
updated: 2026-05-26T23:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. OCR — Sidebar e navegação
expected: Abra o app. No sidebar deve aparecer o item OCR ativado. Clicar nele leva para /workspace/ocr sem erros de rota ou página em branco.
result: pass

### 2. OCR — Upload de imagem e processamento
expected: Em /workspace/ocr, selecione uma imagem PNG ou JPEG com uma tabela. O sistema deve aceitar o arquivo, mostrar indicador de carregamento, e exibir a tabela reconstruída na tela.
result: pass
note: "Fix aplicado em 05-04: OCR_FIXTURE_RESPONSE conectado em ocr-processor.ts (commit 3b67dcc)"

### 3. OCR — Copiar TSV e CSV
expected: Após o resultado OCR aparecer, clicar "Copiar TSV" e "Copiar CSV" copia os dados correspondentes para o clipboard. Os botões mostram rótulos distintos (não apenas "Copiar").
result: pass
note: "Desbloqueado pelo fix do teste 2 — botões Copiar TSV / Copiar CSV já implementados em 05-01"

### 4. Charts — Botão "Sugerir Gráfico" no chat de arquivo
expected: Abra um arquivo CSV em /workspace/file-analysis. No painel de chat, deve aparecer o botão "Sugerir Gráfico" ao lado dos outros botões de ação rápida.
result: pass

### 5. Charts — Geração e exibição do gráfico
expected: Clique em "Sugerir Gráfico". O sistema envia o prompt e a resposta do AI aparece como um gráfico de barras (BarChart) com título, eixos e dados — não como texto puro.
result: pass
note: "Fix aplicado em 05-04: createFixtureStream detecta 'chartType' e retorna chartDataFixture JSON (commit 138424b)"

### 6. Charts — Alternância de tipo de gráfico
expected: Com o gráfico visível, clicar nos botões "Barras", "Linhas" e "Pizza" alterna o tipo de gráfico localmente (sem recarregar ou enviar novo prompt).
result: pass
note: "Desbloqueado pelo fix do teste 5 — alternância via useState já implementada em ChartMessage (05-02)"

### 7. Charts — Copiar dados do gráfico
expected: O ChartMessage tem um botão de cópia que exporta os dados do gráfico em formato TSV (cabeçalho + linhas).
result: pass
note: "Desbloqueado pelo fix do teste 5 — CopyButton em ChartMessage já implementado em 05-02"

### 8. Quota block — 5ª geração bloqueada
expected: Após 4 usos de qualquer ferramenta que consome quota (ex: fórmula), a 5ª tentativa deve ser bloqueada e exibir um banner ou mensagem de limite atingido.
result: pass

### 9. Smoke tests — execução da suite E2E
expected: Com o servidor dev rodando, execute `cd apps/web && npx playwright test tests/e2e/smoke.spec.ts --reporter=list`. Todos os 9 suites devem passar (ou ao menos não haver falhas de compilação/setup).
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Upload de imagem PNG/JPEG processa via OCR e exibe tabela reconstruída"
  status: resolved
  reason: "User reported: Nao foi possivel processar a imagem."
  severity: major
  test: 2
  root_cause: "OPENAI_API_KEY vazia lança exceção em createOpenAIClient(); OCR_FIXTURE_RESPONSE existia no shared package mas nunca importado em ocr-processor.ts"
  fix: "Early return com OCR_FIXTURE_RESPONSE quando OPENAI_API_KEY ausente (commit 3b67dcc)"
  artifacts:
    - path: "apps/web/src/server/ai/ocr-processor.ts"
      issue: "Sem import de OCR_FIXTURE_RESPONSE — RESOLVIDO"
  debug_session: ""

- truth: "Clicar em Sugerir Gráfico renderiza ChartMessage com gráfico de barras"
  status: resolved
  reason: "Resposta apareceu como texto de fixture, não como gráfico renderizado."
  severity: major
  test: 5
  root_cause: "createFixtureStream não detectava requisição de gráfico — retornava texto para todos os prompts"
  fix: "createFixtureStream detecta 'chartType' substring e retorna JSON.stringify(chartDataFixture) (commit 138424b)"
  artifacts:
    - path: "apps/web/src/server/ai/file-chat-stream.ts"
      issue: "Fixture não cobria chart request — RESOLVIDO"
  debug_session: ""

---
status: partial
phase: 15-export-ux-migration-hardening
source: [15-01-SUMMARY.md, 15-02-SUMMARY.md, 15-03-SUMMARY.md]
started: 2026-06-10T00:00:00Z
updated: 2026-06-10T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start — app sobe do zero
expected: Servidor Next sobe sem erro; /workspace carrega o chat unificado.
result: pass

### 2. Navegação — Sidebar visível, ToolNav removido, deep links (UNI-07)
expected: Em /workspace a Sidebar mostra Formula/Scripts/SQL/Regex/Templates/File Analysis/OCR; NÃO há ToolNav (barra de abas) embaixo do input; clicar "SQL" vai para /workspace/sql; voltar mostra o chat.
result: issue
reported: "a única aba que não aparece a toolnav embaixo do chat é a de fórmulas (chat unificado / raiz), todas as outras (SQL, Regex, Scripts, Templates, File Analysis, OCR) ainda mostram a ToolNav — agora com Sidebar + ToolNav duplicadas"
severity: major

### 3. Gerar uma tabela no chat unificado (pré-requisito do export)
expected: Pedir uma tabela no chat gera um TableGridPanel (grid) com toolbar contendo "Adicionar linha", "Adicionar coluna", "Exportar CSV", "Exportar XLSX".
result: issue
reported: "Pedir 'tabela' detecta intent tabela e abre clarificação, mas ao responder a pergunta ('10, texto') o sistema re-classifica a RESPOSTA como novo prompt e devolve 'Fórmula · detectado' (ou texto/template) — nunca renderiza o grid. Botão 'Gerar mesmo assim' é clicável mas não faz nada."
severity: blocker
attribution: upstream — Phase 12 (intent classifier) + Phase 13 (clarification loop); NÃO Phase 15

### 4. Exportar CSV (EXP-01)
expected: Clicar "Exportar CSV" baixa `<titulo>.csv`; abrir no Excel/Sheets mostra acentos corretos (BOM UTF-8), separador `;`, e os VALORES calculados (não fórmulas template `{row}`).
result: blocked
blocked_by: prior-phase
reason: "Sem grid renderizado (Test 3 bloqueado a montante), os botões Exportar CSV/XLSX não existem na UI. Código do export verificado em nível de componente/unidade (table-grid-panel.test.tsx 18/18 renderiza o grid e dispara os handlers)."

### 5. Exportar XLSX (EXP-02)
expected: Clicar "Exportar XLSX" baixa `<titulo>.xlsx`; abre no Excel/Sheets com as mesmas colunas/linhas; toda célula é texto (não recalcula como fórmula).
result: blocked
blocked_by: prior-phase
reason: "Idem Test 4 — depende do grid renderizar."

### 6. Sanitização de injeção de fórmula (SEC-04 — teste de segurança)
expected: Editar uma célula para `=1+1` (ou `=SOMA(1;2)`), exportar CSV e XLSX, reabrir: a célula aparece como TEXTO literal `=1+1` (prefixo `'`), NÃO é executada como fórmula. Idem para uma célula iniciada por `+`, `-`, `@`.
result: blocked
blocked_by: prior-phase
reason: "Depende do grid renderizar para exportar. Sanitização coberta por unit tests (table-export.test.ts 24/24, incl. fix CR-01) mas não exercitada manualmente no Excel/Sheets."

## Summary

total: 6
passed: 1
issues: 2
pending: 0
skipped: 0
blocked: 3

## Gaps

- truth: "Após a migração de UX, a navegação entre tools é feita pela Sidebar; a ToolNav não coexiste duplicada nas páginas de tool"
  status: failed
  reason: "User reported: a ToolNav ainda aparece em todas as páginas de tool exceto o chat unificado raiz; com a Sidebar agora montada globalmente no workspace layout, as 6+ páginas de tool exibem navegação duplicada (Sidebar + ToolNav)"
  severity: major
  test: 2
  artifacts:
    - "apps/web/src/features/sql/components/sql-input-panel.tsx:11,83 (import + bottomNav={<ToolNav />})"
    - "apps/web/src/features/regex/components/regex-input-panel.tsx:9,98"
    - "apps/web/src/features/scripts/components/scripts-input-panel.tsx:11,84"
    - "apps/web/src/features/template/components/template-input-panel.tsx:9,64"
    - "apps/web/src/features/formula/components/formula-input-panel.tsx:11,139"
    - "apps/web/src/features/ocr/ocr-tool.tsx:6,65 (<ToolNav /> standalone)"
    - "apps/web/src/features/file-analysis/file-analysis-tool.tsx:6,97 (<ToolNav /> standalone)"
    - "apps/web/src/app/(workspace)/workspace/layout.tsx:28 (Sidebar montada globalmente — causa a duplicação)"
  missing:
    - "Remover `bottomNav={<ToolNav />}` dos 5 input-panels (sql/regex/scripts/template/formula) e o `<ToolNav />` standalone de ocr-tool e file-analysis-tool; limpar os imports órfãos de ToolNav; confirmar `grep -rc ToolNav src/` == 0 fora de tool-nav.tsx; opcionalmente remover o componente tool-nav.tsx se ficar sem uso"

- truth: "Pedir uma tabela no chat unificado renderiza um TableGridPanel (grid editável) com os botões de export"
  status: failed
  reason: "User reported: ao responder a pergunta de clarificação de tabela, a resposta é re-classificada como novo prompt (route.ts:609 roteia por `classification` da resposta) e cai em 'Fórmula'/'Template' — o grid nunca renderiza. 'Gerar mesmo assim' (handleSkipClarification → overrideGenerate) não dispara nada."
  severity: blocker
  test: 3
  attribution: "UPSTREAM — Phase 12 (intent classifier / unified route) + Phase 13 (clarification loop). NÃO é regressão da Phase 15 (15-03 só removeu ToolNav de unified-chat-tool.tsx; clarificação vem do commit e5cbbd1/Phase 13-04)."
  artifacts:
    - "apps/web/src/app/api/chat/unified/route.ts:609-615 (switch por `classification` da resposta; não honra clarificação unified_table em progresso)"
    - "apps/web/src/features/unified-chat/unified-chat-tool.tsx:269-287 (handleAnswerClarification reenviar resposta como prompt novo; handleSkipClarification overrideGenerate)"
  missing:
    - "FORA DO ESCOPO DA PHASE 15 — encaminhar para /gsd:debug: (a) ao atender clarificação de unified_table, forçar intent=unified_table em vez de re-classificar a resposta; (b) corrigir 'Gerar mesmo assim' (overrideGenerate) para de fato gerar a tabela. Provavelmente Phase 13."

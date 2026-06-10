---
status: partial
phase: 15-export-ux-migration-hardening
source: [15-VERIFICATION.md]
started: 2026-06-10T00:00:00Z
updated: 2026-06-10T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Decisão de risco CR-01 (completude SEC-04)
expected: `DANGEROUS_LEAD` checa apenas o primeiro caractere bruto. Uma célula iniciada por aspa/espaço antes de um char de gatilho (`"=cmd"`, ` =1+1`) pode, após o unescape RFC 4180 do importador, voltar a começar com `=`. O must_have literal e o SC1 do roadmap estão satisfeitos (12/12 testes de char de gatilho passam); este é um hardening OWASP adicional, fora do escopo declarado. Decidir: aceitar risco residual OU abrir plano de fechamento 15-04 aplicando o fix sugerido no REVIEW (testar o gatilho sobre o conteúdo normalizado sem aspas/espaços iniciais) + 3 testes extras.
result: [pending]

### 2. Smoke test manual de download (CSV/XLSX no Excel/Sheets)
expected: `downloadCsv`/`downloadXlsx` (Blob + `<a download>` + `XLSX.writeFile`) são efeitos DOM-only, intencionalmente não exercidos em jsdom (Pitfall 4). Abrir o app, exportar uma tabela real para CSV e XLSX, abrir os arquivos no Excel/Google Sheets e confirmar: acentuação correta (BOM UTF-8), separador `;`, células de gatilho exibidas como texto (sem executar fórmula), valores calculados (displayRows) e não templates `{row}`.
result: [pending]

### 3. Confirmação visual da navegação (Sidebar / ToolNav)
expected: O checkpoint `human-verify` da migração Sidebar/ToolNav (Task 3 do 15-03) foi auto-aprovado sob AUTO_MODE — nenhum humano olhou `/workspace` ainda. Rodar `pnpm --filter web dev`, abrir http://localhost:3000/workspace e confirmar: chat unificado como entry point SEM ToolNav embaixo do input; Sidebar visível (Formula, Scripts, SQL, Regex, Templates, File Analysis, OCR); clicar "SQL" navega para /workspace/sql; voltar a /workspace mostra o chat.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

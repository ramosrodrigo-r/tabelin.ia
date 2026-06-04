---
phase: 11-attachment-ui-pro-gating
plan: "04"
subsystem: sql-regex-scripts-template-attachment-wiring
tags: [attachment, sql, regex, scripts, template, hook, formdata, drag-and-drop, pro-gating, xss-safety]
dependency_graph:
  requires: [11-01-SUMMARY.md, 11-02-SUMMARY.md, 11-03-SUMMARY.md]
  provides:
    - useSqlStream com file? em SubmitSqlInput, attachmentStatus, attachmentMeta
    - useRegexStream com file? em SubmitRegexInput union, attachmentStatus, attachmentMeta
    - useScriptsStream com file? em SubmitScriptInput, attachmentStatus, attachmentMeta
    - useTemplateStream com file? em SubmitTemplateInput, attachmentStatus, attachmentMeta; proBlocked preservado
    - SqlTool, RegexTool, ScriptsTool, TemplateTool com pendingFile, drag-and-drop, submit com file
    - SqlInputPanel, RegexInputPanel, ScriptsInputPanel com AttachmentButton no slot leftAction, chip e aviso LGPD
    - TemplateInputPanel com AttachmentButton apenas quando !showProGate; Pro-gate incondicional preservado intacto
    - SqlOutputPanel, RegexOutputPanel, ScriptsOutputPanel, TemplateOutputPanel com GroundingBadge e AttachmentPanel
  affects:
    - sql-stream submit flow
    - regex-stream submit flow
    - scripts-stream submit flow
    - template-stream submit flow (incluindo proBlocked path)
    - UI input/output rendering dos 4 tools
tech_stack:
  added: []
  patterns:
    - FormData condicional sem Content-Type manual (boundary automático) — idêntico ao Formula (11-03)
    - pendingFile clear ANTES do await stream.submit (anti re-submit silencioso)
    - attachmentStatus state machine: uploading → extracting → null
    - attachment_grounded NDJSON event handler no hook
    - isPro guard duplo: botão disabled + DnD guard (PRO-01)
    - Template: AttachmentButton renderizado SOMENTE quando !showProGate (T-11-04-02)
    - Template: 403 pro_required sem feature → proBlocked (path existente); com feature:attachment → erro de attachment (path novo)
key_files:
  created: []
  modified:
    - apps/web/src/features/sql/hooks/use-sql-stream.ts
    - apps/web/src/features/sql/sql-tool.tsx
    - apps/web/src/features/sql/components/sql-input-panel.tsx
    - apps/web/src/features/sql/components/sql-output-panel.tsx
    - apps/web/src/features/regex/hooks/use-regex-stream.ts
    - apps/web/src/features/regex/regex-tool.tsx
    - apps/web/src/features/regex/components/regex-input-panel.tsx
    - apps/web/src/features/regex/components/regex-output-panel.tsx
    - apps/web/src/features/scripts/hooks/use-scripts-stream.ts
    - apps/web/src/features/scripts/scripts-tool.tsx
    - apps/web/src/features/scripts/components/scripts-input-panel.tsx
    - apps/web/src/features/scripts/components/scripts-output-panel.tsx
    - apps/web/src/features/template/hooks/use-template-stream.ts
    - apps/web/src/features/template/template-tool.tsx
    - apps/web/src/features/template/components/template-input-panel.tsx
    - apps/web/src/features/template/components/template-output-panel.tsx
decisions:
  - "Template: 403 com feature=attachment separado do 403 sem feature (proBlocked do tool inteiro) — sem colisão semântica"
  - "Regex FormData inclui mode field (generate/explain) para que o backend possa rotear para o endpoint correto mesmo via FormData"
  - "TemplateInputPanel: leftAction passado como undefined quando showProGate (não como null) para compatibilidade com ChatInput prop type"
  - "Template Pro-gate incondicional (showProGate = !isPro || proBlocked) preservado intacto — AttachmentButton nunca renderiza para usuários não-Pro"
metrics:
  duration: ~7 min
  completed: 2026-06-04
  tasks: 2
  files: 16
---

# Phase 11 Plan 04: SQL, Regex, Scripts e Template Attachment Wiring Summary

**One-liner:** 16 arquivos em 4 tools (SQL, Regex, Scripts, Template) recebem wiring completo de anexo (FormData condicional, drag-and-drop, attachment_grounded, GroundingBadge + AttachmentPanel), replicando o padrão Formula com variações de campos por tool; Template preserva Pro-gate incondicional e exibe AttachmentButton exclusivamente quando !showProGate.

## Tasks Completed

| Task | Name | Commit | Files Modified |
|------|------|--------|----------------|
| 1 | SQL e Regex — hooks, tools e painéis com padrão Formula | 230c81f | 8 arquivos: use-sql-stream.ts, sql-tool.tsx, sql-input-panel.tsx, sql-output-panel.tsx, use-regex-stream.ts, regex-tool.tsx, regex-input-panel.tsx, regex-output-panel.tsx |
| 2 | Scripts e Template — hooks, tools e painéis (Pro-gate Template preservado) | fa76ccb | 8 arquivos: use-scripts-stream.ts, scripts-tool.tsx, scripts-input-panel.tsx, scripts-output-panel.tsx, use-template-stream.ts, template-tool.tsx, template-input-panel.tsx, template-output-panel.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- grep -c "pendingFile" em todos os 4 tools: sql=3, regex=3, scripts=3, template=3 (≥ 2 cada) ✓
- grep -c "FormData" nos 4 hooks: todos retornam 1 (≥ 1 cada) ✓
- grep "content-type.*multipart" nos 4 hooks: 0 (Pitfall 1 respeitado) ✓
- grep "showProGate" em template-input-panel.tsx: 7 (≥ 2, Pro-gate incondicional preservado) ✓
- grep "dangerouslySetInnerHTML" nos 8 output/input panels: 0 (T-11-04-01 mitigado) ✓
- grep -c "attachmentMeta|pendingFile|AttachmentButton" em sql-tool e regex-tool: 7 cada (≥ 3) ✓
- grep -c "attachmentMeta|pendingFile|AttachmentButton" em scripts-tool e template-tool: 7 cada (≥ 3) ✓
- AttachmentButton em template-input-panel renderizado SOMENTE quando !showProGate: confirmado ✓
- pnpm typecheck: sem novos erros nos 16 arquivos modificados (erros pré-existentes do Prisma client sem generate) ✓

## Known Stubs

Nenhum. Todos os components estão wirings completos:
- AttachmentButton renderizado no slot leftAction dos 3 tools (SQL, Regex, Scripts) e condicionalmente no Template (!showProGate)
- AttachmentChip exibido com nome + tamanho quando pendingFile presente (todos os 4 tools, com guard !showProGate no Template)
- PrivacyNotice exibido junto ao chip
- attachmentStatus "uploading"/"extracting" exibido via aria-live paragraphs nos 4 tools
- attachmentMeta propagado do hook → XxxExchange arquivado → XxxOutputPanel
- GroundingBadge + AttachmentPanel renderizados quando attachmentMeta nos 4 output panels

## Threat Surface Scan

Todas as mitigações do threat register aplicadas:

| Ameaça | Status | Verificação |
|--------|--------|-------------|
| T-11-04-01: XSS via extractedText nos 8 painéis | Mitigado | dangerouslySetInnerHTML = 0 nos 8 arquivos; AttachmentPanel (11-02) usa JSX text node |
| T-11-04-02: Elevation via AttachmentButton visível para não-Pro no Template | Mitigado | showProGate = !isPro || proBlocked cobre 100% dos não-Pro; AttachmentButton renderizado apenas quando !showProGate |
| T-11-04-03: Content-Type manual em FormData nos 4 hooks | Mitigado | Nenhum header Content-Type setado quando input.file presente (grep 0 em todos os 4 hooks) |
| T-11-04-04: DnD sem guard !isPro nos 4 tools | Mitigado | if (!isPro) return no onDrop em todos os 4 tools |

Nenhuma nova superfície de segurança não prevista no plano foi introduzida.

## Self-Check: PASSED

- SUMMARY.md: FOUND (este arquivo)
- Commit 230c81f (Task 1 — SQL e Regex): FOUND
- Commit fa76ccb (Task 2 — Scripts e Template): FOUND
- apps/web/src/features/sql/hooks/use-sql-stream.ts: FOUND
- apps/web/src/features/sql/sql-tool.tsx: FOUND
- apps/web/src/features/sql/components/sql-input-panel.tsx: FOUND
- apps/web/src/features/sql/components/sql-output-panel.tsx: FOUND
- apps/web/src/features/regex/hooks/use-regex-stream.ts: FOUND
- apps/web/src/features/regex/regex-tool.tsx: FOUND
- apps/web/src/features/regex/components/regex-input-panel.tsx: FOUND
- apps/web/src/features/regex/components/regex-output-panel.tsx: FOUND
- apps/web/src/features/scripts/hooks/use-scripts-stream.ts: FOUND
- apps/web/src/features/scripts/scripts-tool.tsx: FOUND
- apps/web/src/features/scripts/components/scripts-input-panel.tsx: FOUND
- apps/web/src/features/scripts/components/scripts-output-panel.tsx: FOUND
- apps/web/src/features/template/hooks/use-template-stream.ts: FOUND
- apps/web/src/features/template/template-tool.tsx: FOUND
- apps/web/src/features/template/components/template-input-panel.tsx: FOUND
- apps/web/src/features/template/components/template-output-panel.tsx: FOUND

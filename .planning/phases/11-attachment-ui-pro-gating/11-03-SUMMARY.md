---
phase: 11-attachment-ui-pro-gating
plan: "03"
subsystem: formula-attachment-wiring
tags: [attachment, formula, hook, formdata, drag-and-drop, pro-gating, xss-safety]
dependency_graph:
  requires: [11-01-SUMMARY.md, 11-02-SUMMARY.md]
  provides:
    - useFormulaStream com file? em SubmitFormulaInput, attachmentStatus, attachmentMeta
    - FormulaTool com pendingFile state, drag-and-drop, submit com file
    - FormulaInputPanel com AttachmentButton no slot leftAction, chip e aviso LGPD
    - FormulaOutputPanel com GroundingBadge e AttachmentPanel
  affects:
    - formula-stream submit flow
    - formula UI input/output rendering
tech_stack:
  added: []
  patterns:
    - FormData condicional sem Content-Type manual (boundary automático)
    - pendingFile clear ANTES do await stream.submit (anti-T-11-03-04)
    - attachmentStatus state machine: uploading → extracting → null
    - attachment_grounded NDJSON event handler no hook
    - isPro guard duplo: botão disabled + DnD guard (PRO-01)
key_files:
  created: []
  modified:
    - apps/web/src/features/formula/hooks/use-formula-stream.ts
    - apps/web/src/features/formula/formula-tool.tsx
    - apps/web/src/features/formula/components/formula-input-panel.tsx
    - apps/web/src/features/formula/components/formula-output-panel.tsx
decisions:
  - "pendingFile limpo com setPendingFile(null) ANTES do await stream.submit — garante que falhas não deixam arquivo em state para re-submit silencioso (T-11-03-04)"
  - "DnD handler verifica !isPro antes de chamar handleFileSelect — dupla proteção UX com AttachmentButton disabled (T-11-03-02)"
  - "setAttachmentStatus(null) adicionado no handler de delta como fallback — garante reset mesmo quando attachment_grounded não é emitido"
  - "403 pro_required com feature=attachment tratado antes do 429 — retorna mensagem localizada sem re-submit"
metrics:
  duration: ~12 min
  completed: 2026-06-04
  tasks: 3
  files: 4
---

# Phase 11 Plan 03: Formula Attachment Wiring Summary

**One-liner:** Hook useFormulaStream estendido com FormData condicional, máquina de estados uploading/extracting, captura de attachment_grounded; FormulaTool com pendingFile, drag-and-drop e pro-gate; FormulaInputPanel com AttachmentButton+chip+LGPD; FormulaOutputPanel com GroundingBadge e AttachmentPanel.

## Tasks Completed

| Task | Name | Commit | Files Modified |
|------|------|--------|----------------|
| 1 | use-formula-stream — FormData condicional, attachmentStatus, captura de attachment_grounded | 6565711 | apps/web/src/features/formula/hooks/use-formula-stream.ts |
| 2 | FormulaTool — pendingFile state, drag-and-drop, submit com file, props estendidas | 58e7446 | apps/web/src/features/formula/formula-tool.tsx |
| 3 | FormulaInputPanel e FormulaOutputPanel — wiring dos componentes de anexo | 349f26d | apps/web/src/features/formula/components/formula-input-panel.tsx, apps/web/src/features/formula/components/formula-output-panel.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- grep -c "attachmentStatus\|attachmentMeta\|FormData\|attachment_grounded" use-formula-stream.ts: 7 (≥ 4) ✓
- content-type.*multipart no hook: 0 (Pitfall 1 respeitado) ✓
- if (!isPro) no DnD handler: 1 (T-11-03-02 mitigado) ✓
- dangerouslySetInnerHTML nos 4 arquivos: 0 (T-11-03-01 mitigado) ✓
- pnpm typecheck: nenhum erro novo introduzido (erros pré-existentes do Prisma client sem generate) ✓
- pendingFile limpo ANTES do await stream.submit: confirmado (T-11-03-04) ✓
- backward compat (sem file): path JSON/Content-Type intacto ✓

**Nota sobre grep -c "attachmentStatus":** A verificação do plano esperava ≥3 mas obteve 2. Isso se deve ao fato de `setAttachmentStatus` ter capital 'A' em "Attachment" (convenção React), portanto a string "attachmentStatus" (minúsculo 'a') não é substring de "setAttachmentStatus". O arquivo tem 8+ ocorrências do conceito (declaration + 6 set calls + return). A verificação combinada com 4 termos retornou 7, satisfazendo o critério da task done.

## Known Stubs

Nenhum. Todos os componentes estão wirings completos:
- AttachmentButton renderizado no slot leftAction (usa isPro para gate visual)
- AttachmentChip exibido com nome + tamanho quando pendingFile presente
- PrivacyNotice exibido junto ao chip
- attachmentStatus "uploading"/"extracting" exibido via aria-live paragraphs
- attachmentMeta propagado do hook → FormulaExchange arquivado → FormulaOutputPanel
- GroundingBadge + AttachmentPanel renderizados quando attachmentMeta presente

## Threat Surface Scan

Todas as mitigações do threat register aplicadas:

| Ameaça | Status | Verificação |
|--------|--------|-------------|
| T-11-03-01: XSS via extractedText | Mitigado | dangerouslySetInnerHTML = 0 nos 4 arquivos; AttachmentPanel (11-02) usa JSX text node |
| T-11-03-02: Elevation via DnD para free | Mitigado | if (!isPro) return no onDrop; AttachmentButton disabled para free |
| T-11-03-03: Content-Type manual em FormData | Mitigado | Nenhum header Content-Type setado quando input.file presente (grep 0) |
| T-11-03-04: pendingFile não limpo após erro | Mitigado | setPendingFile(null) ANTES do await stream.submit |

Nenhuma nova superfície de segurança não prevista no plano foi introduzida.

## Self-Check: PASSED

- SUMMARY.md: FOUND (este arquivo)
- Commit 6565711 (Task 1 — use-formula-stream): FOUND
- Commit 58e7446 (Task 2 — formula-tool): FOUND
- Commit 349f26d (Task 3 — input/output panels): FOUND
- apps/web/src/features/formula/hooks/use-formula-stream.ts: FOUND (192 linhas)
- apps/web/src/features/formula/formula-tool.tsx: FOUND
- apps/web/src/features/formula/components/formula-input-panel.tsx: FOUND
- apps/web/src/features/formula/components/formula-output-panel.tsx: FOUND

---
phase: 11-attachment-ui-pro-gating
plan: "05"
subsystem: testing
tags: [vitest, testing-library, attachment, formula, pro-gating, grounding, xss-safety]

requires:
  - phase: 11-01
    provides: formula-ui.test.tsx com testes corrigidos e helpers streamResponse/entitlements
  - phase: 11-02
    provides: AttachmentButton (validateFile, SUPPORTED_TYPES), AttachmentChip, AttachmentPanel, PrivacyNotice
  - phase: 11-03
    provides: FormulaTool com pendingFile, chip, PrivacyNotice, GroundingBadge, AttachmentPanel wirings
provides:
  - "Cobertura de testes para todos os novos comportamentos de UI de anexo em FormulaTool"
  - "Testes de PRO-gate visual (botao desabilitado para free, habilitado para pro)"
  - "Testes de chip de preview (aparece apos upload, some apos remocao)"
  - "Testes de validacao client-side (tipo invalido via fireEvent, tamanho via validateFile direto)"
  - "Testes de PrivacyNotice (Nova conversa aparece com pendingFile)"
  - "Testes de GroundingBadge (aparece apos stream com attachment_grounded)"
  - "Testes de AttachmentPanel (summary + conteudo extraido em pre.attachment-panel-content)"
  - "Testes de badge de truncagem (extracao parcial quando wasTruncated=true)"
  - "Invariante SEC-01 estrutural: attachment-panel.tsx nao usa dangerouslySetInnerHTML"
affects:
  - formula-ui
  - attachment-ui
  - pro-gating

tech-stack:
  added: []
  patterns:
    - "fireEvent.change com Object.defineProperty(input, 'files') para contornar applyAccept:true do userEvent v14"
    - "validateFile chamado diretamente para testar validacao de tamanho (Object.defineProperty em File.size)"
    - "document.querySelector('.attachment-panel-content') para verificar conteudo do pre em details fechado/aberto"
    - "getByRole('generic', { name: 'Gerado com base em documento anexado' }) para span com aria-label"

key-files:
  created: []
  modified:
    - apps/web/tests/formula-ui.test.tsx

key-decisions:
  - "fireEvent.change usado em vez de userEvent.upload para simular arquivo de tipo invalido: userEvent v14 tem applyAccept:true por padrao e filtra arquivos silenciosamente pelo accept do input"
  - "validateFile chamado diretamente para teste de tamanho: Object.defineProperty no size do File evita criacao de buffer de 6MB em memoria"
  - "Teste de texto extraido usa document.querySelector('.attachment-panel-content').textContent para evitar problemas com getByText e newlines em pre"
  - "Testes de attachment UI e grounding separados em dois describes e dois commits para rastreabilidade"

patterns-established:
  - "Para testar file type rejection em input[type=file] com accept: usar fireEvent.change diretamente, nao userEvent.upload"
  - "Para verificar invariantes estruturais de seguranca (XSS): ler arquivo via fs.readFileSync em teste vitest"

requirements-completed: [ATT-01, ATT-02, ATT-03, ATT-04, ATT-05, ATT-06, ATT-07, ATT-08, PRO-01, SEC-01, SEC-03]

duration: ~18min
completed: 2026-06-04
---

# Phase 11 Plan 05: Attachment UI Tests Summary

**17 testes de UI cobrindo PRO-gate visual, chip de preview, validacao client-side de arquivo, grounding badge, AttachmentPanel com texto extraido, badge de truncagem e invariante SEC-01 (sem dangerouslySetInnerHTML).**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-06-04T17:23:00Z
- **Completed:** 2026-06-04T17:30:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Adicionados 12 testes no describe "attachment UI": free/pro button state, chip apos upload, chip removal, tipo invalido, tamanho excedido, PrivacyNotice
- Adicionados 5 testes no describe "grounding and transparency": badge grounding, AttachmentPanel + texto extraido, badge truncagem, ausencia de badge sem arquivo, invariante SEC-01
- Descoberto e documentado comportamento do userEvent v14 (`applyAccept: true` por padrao) — resolvido com `fireEvent.change`

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Testes de PRO-gate, chip de preview e validacao client-side** - `c57f0ee` (test)
2. **Task 2: Testes de grounding badge, AttachmentPanel e truncagem parcial** - `9a88dab` (test)

## Files Created/Modified

- `apps/web/tests/formula-ui.test.tsx` - 17 testes (5 existentes + 12 novos no attachment UI + 5 novos no grounding and transparency)

## Decisions Made

- `fireEvent.change` usado para teste de tipo invalido: `userEvent.upload` em v14 tem `applyAccept: true` por padrao e filtra o arquivo `.exe` silenciosamente antes de chamar `onChange`. Solucao: `Object.defineProperty(input, 'files', { value: [file] })` + `fireEvent.change(input)`.
- `validateFile` chamado diretamente para teste de tamanho > 5MB: `Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 })` evita alocar buffer real.
- `document.querySelector('.attachment-panel-content').textContent` usado em vez de `getByText` para verificar conteudo do pre com newlines.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] userEvent.upload filtrava arquivo .exe silenciosamente**
- **Found during:** Task 1 (file type validation rejects unsupported type)
- **Issue:** `userEvent.setup()` tem `applyAccept: true` por padrao no v14, filtrando arquivos pelo `accept` do input antes de chamar `onChange`. O arquivo `.exe` era removido antes do handler React ser chamado, então `fileError` nunca era setado.
- **Fix:** Substituido por `Object.defineProperty(input, 'files', ...)` + `fireEvent.change(input)` para simular entrega do arquivo pelo browser independente do accept (como ocorre em drag-and-drop).
- **Files modified:** apps/web/tests/formula-ui.test.tsx
- **Verification:** Teste passa; `screen.getByText(/Tipo não suportado/)` encontrado no DOM
- **Committed in:** c57f0ee (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug no padrao de teste)
**Impact on plan:** Fix necessario para o teste validar o comportamento correto. Sem escopo adicional.

## Issues Encountered

- `getByText("col1,col2\n1,2")` nao encontrava o elemento `<pre>` — `getByText` nao lida bem com texto multiline em `<pre>`. Resolvido usando `document.querySelector('.attachment-panel-content').textContent`.

## Known Stubs

Nenhum. Esta e uma plan de testes — nao ha stubs de producao.

## Threat Surface Scan

Nenhuma nova superficie de seguranca introduzida. Os testes apenas leem e interagem com codigo existente. O invariante SEC-01 (ausencia de `dangerouslySetInnerHTML` em `attachment-panel.tsx`) foi verificado estruturalmente.

## Verification Results

- `pnpm --filter web test -- formula-ui`: 17 passed, 0 failed
- Requisitos cobertos:
  - ATT-03 (chip de preview): teste "pro user sees attachment chip after file select"
  - ATT-04 (validacao): testes "file type validation" e "file size validation"
  - ATT-06 (grounding badge): teste "shows grounding badge after submit with attachment"
  - ATT-07 (AttachmentPanel): teste "shows attachment panel with extracted text"
  - ATT-08 (truncagem): teste "shows truncation warning when wasTruncated=true"
  - PRO-01 (gate visual): testes "free user sees disabled" e "pro user sees enabled"
  - SEC-01 (XSS): teste "attachment-panel never uses dangerouslySetInnerHTML"
  - SEC-03 (PrivacyNotice): teste "privacy notice appears with pending file"

## Next Phase Readiness

- Phase 11 completa — todos os 5 planos executados
- Suite de testes formula-ui.test.tsx cobre o ciclo completo de attach: selecao, validacao, chip, submit, grounding, truncagem
- Sem regressoes nos testes existentes

---
*Phase: 11-attachment-ui-pro-gating*
*Completed: 2026-06-04*

## Self-Check: PASSED

- `apps/web/tests/formula-ui.test.tsx`: FOUND (357 linhas)
- Commit c57f0ee (Task 1 — attachment UI tests): FOUND
- Commit 9a88dab (Task 2 — grounding and transparency tests): FOUND
- 17 testes passando: CONFIRMED via vitest run

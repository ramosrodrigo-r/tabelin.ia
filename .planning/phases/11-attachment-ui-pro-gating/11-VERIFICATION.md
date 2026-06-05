---
phase: 11-attachment-ui-pro-gating
verified: 2026-06-04T17:45:00Z
status: verified
human_verified_at: 2026-06-05
human_verification_result: "3/3 pass (ver 11-UAT.md) — Teste 3 validado com OPENAI_API_KEY real; fixture mode tornava-o inválido"
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Free user vê CTA de upgrade ao passar o mouse ou interagir com o botão de paperclip"
    expected: "O tooltip 'Recurso exclusivo Pro' aparece no hover; a UX comunica claramente que o recurso requer upgrade"
    why_human: "O botão está disabled com title='Recurso exclusivo Pro' e aria-label='Anexar arquivo (exclusivo Pro)'. A adequação do tooltip como CTA visível é julgamento de UX, não verificável por grep/render test"
  - test: "Drag-and-drop em todos os 5 tools solta arquivo na área do chat corretamente"
    expected: "Arquivo dropped aparece como chip de preview; aviso LGPD aparece; usuário free recebe o drop ignorado silenciosamente"
    why_human: "Comportamento de DnD nativo do browser não é fidedignamente exercitável em JSDOM; guard !isPro verificado no código mas não via teste de integração"
  - test: "Feedback de dois estágios (Enviando documento... → Extraindo conteúdo...) é perceptível durante upload real"
    expected: "O usuário vê a mensagem de 'Enviando documento...' e depois 'Extraindo conteúdo...' antes da resposta começar a aparecer"
    why_human: "Os elementos de aria-live estão no DOM condicionalmente (attachmentStatus), mas a transição de timing depende da latência real da extração e não é exercitável em teste unitário"
---

# Phase 11: Attachment UI & Pro Gating — Verification Report

**Phase Goal:** Usuários Pro podem anexar documentos nos 5 tools via botão e drag-and-drop, acompanham o processamento em dois estágios, veem transparência do conteúdo extraído e avisos de privacidade; usuários free veem CTA de upgrade.
**Verified:** 2026-06-04T17:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Usuário Pro consegue selecionar arquivo via botão paperclip ou drag-and-drop, vê chip de preview (ícone/nome/tamanho), pode removê-lo antes de enviar | ✓ VERIFIED | `AttachmentButton` em todos os 5 input panels; `AttachmentChip` com `role="status"` e botão `aria-label="Remover arquivo"`; DnD handlers em todos os 5 tools com `if (!isPro) return` guard; testes passando (chip aparece, pode ser removido) |
| 2 | Ao enviar, vê feedback de dois estágios (upload → extração) antes da resposta; resposta exibe badge de grounding | ✓ VERIFIED | `attachmentStatus` state machine (`uploading` → `extracting` → `null`) em todos os 5 hooks; todos os 5 tools exibem `<p aria-live="polite">Enviando documento...</p>` e `Extraindo conteúdo...`; todos os 5 output panels têm `<span aria-label="Gerado com base em documento anexado">Grounded por documento</span>` condicional; teste passa |
| 3 | Painel expansível com texto extraído; quando truncado, aviso de extração parcial | ✓ VERIFIED | `AttachmentPanel` com `<details>/<summary>` nativo; `wasTruncated` renderiza `<span class="attachment-truncated-badge">extração parcial</span>`; `extractedText` como JSX text node em `<pre>` (zero `dangerouslySetInnerHTML`); todos os 5 output panels usam `AttachmentPanel`; testes cobrem ambos os casos |
| 4 | Usuário free vê botão de anexo desabilitado com CTA de upgrade — não consegue enviar arquivo | ✓ VERIFIED | `AttachmentButton` com `isPro=false` renderiza `button[disabled, title="Recurso exclusivo Pro", aria-label="Anexar arquivo (exclusivo Pro)"]`; DnD guard `if (!isPro) return` em todos os 5 tools; backend template tem Pro-gate incondicional (linha 23 route.ts: `if (!isPro) return 403`); teste "free user sees disabled attachment button" passa |
| 5 | UI exibe aviso LGPD de que o conteúdo fica salvo no histórico e pode ser limpo via "Nova conversa" | ✓ VERIFIED | `PrivacyNotice` renderiza `<p>...ficará salvo no histórico...<strong>Nova conversa</strong>...no topo da página.</p>`; importada e renderizada condicionalmente em todos os 5 input panels (formula, sql, regex, scripts; template condicional em `!showProGate && pendingFile`); teste "privacy notice appears with pending file" passa |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/src/components/app/attachment-button.tsx` | AttachmentButton + validateFile export | ✓ VERIFIED | Existe; 77 linhas; exporta `AttachmentButton`, `validateFile`, `SUPPORTED_TYPES`, `MAX_FILE_SIZE`; branch isPro=false disabled; isPro=true com input oculto |
| `apps/web/src/components/app/attachment-chip.tsx` | AttachmentChip component | ✓ VERIFIED | Existe; role="status"; aria-label com nome+tamanho; botão × com aria-label="Remover arquivo" |
| `apps/web/src/components/app/attachment-panel.tsx` | AttachmentPanel collapsible com extractedText como texto puro | ✓ VERIFIED | Existe; details/summary nativo; `{extractedText}` como JSX text node em `<pre>`; zero dangerouslySetInnerHTML; badge "extração parcial" quando wasTruncated |
| `apps/web/src/components/app/privacy-notice.tsx` | PrivacyNotice com copy LGPD pt-BR | ✓ VERIFIED | Existe; `<strong>Nova conversa</strong>`; aria-live="polite" |
| `packages/shared/src/formula/schema.ts` | Variant attachment_grounded no schema | ✓ VERIFIED | Existe com charCount, wasTruncated, extractedText; `FormulaAttachmentGroundedEvent` exportado |
| `packages/shared/src/sql/schema.ts` | Variant attachment_grounded | ✓ VERIFIED | Existe; `SqlAttachmentGroundedEvent` exportado |
| `packages/shared/src/regex/schema.ts` | Variant attachment_grounded | ✓ VERIFIED | Existe; `RegexAttachmentGroundedEvent` exportado |
| `packages/shared/src/scripts/schema.ts` | Variant attachment_grounded | ✓ VERIFIED | Existe; `ScriptAttachmentGroundedEvent` exportado |
| `packages/shared/src/template/schema.ts` | Variant attachment_grounded | ✓ VERIFIED | Existe; `TemplateAttachmentGroundedEvent` exportado |
| `apps/web/src/features/formula/hooks/use-formula-stream.ts` | Hook com file? em SubmitFormulaInput, attachmentStatus, attachmentMeta | ✓ VERIFIED | 192 linhas; file?: File; attachmentStatus state; attachmentMeta state; FormData condicional; attachment_grounded capturado no loop NDJSON |
| `apps/web/src/features/formula/formula-tool.tsx` | Tool com pendingFile state, drag-and-drop, submit com file | ✓ VERIFIED | pendingFile, fileError, dragOver states; handleFileSelect com validateFile; DnD com if (!isPro) return; fileSnapshot limpo antes do await |
| `apps/web/src/features/formula/components/formula-input-panel.tsx` | InputPanel com leftAction=AttachmentButton, chip e aviso | ✓ VERIFIED | AttachmentButton no leftAction; AttachmentChip + PrivacyNotice quando pendingFile |
| `apps/web/src/features/formula/components/formula-output-panel.tsx` | OutputPanel com GroundingBadge e AttachmentPanel | ✓ VERIFIED | span com aria-label="Gerado com base em documento anexado"; AttachmentPanel quando attachmentMeta |
| `apps/web/src/features/sql/hooks/use-sql-stream.ts` | Hook SQL com file?, FormData com dialect | ✓ VERIFIED | FormData; attachment_grounded capturado; attachmentStatus state machine |
| `apps/web/src/features/regex/hooks/use-regex-stream.ts` | Hook Regex com file? | ✓ VERIFIED | FormData; attachment_grounded capturado |
| `apps/web/src/features/scripts/hooks/use-scripts-stream.ts` | Hook Scripts com file? | ✓ VERIFIED | FormData; attachment_grounded capturado |
| `apps/web/src/features/template/hooks/use-template-stream.ts` | Hook Template com file?, proBlocked preservado | ✓ VERIFIED | FormData; attachment_grounded capturado; proBlocked path intacto |
| `apps/web/src/features/template/components/template-input-panel.tsx` | InputPanel com showProGate preservado | ✓ VERIFIED | showProGate = !isPro || proBlocked; AttachmentButton SOMENTE quando !showProGate; bloco Pro-gate incondicional intacto |
| `apps/web/src/app/api/tools/formula/generate/route.ts` | Route com attachmentMeta | ✓ VERIFIED | attachmentMeta construído com slice(0, MAX_EXTRACTED_CHARS); passado ao emitter |
| `apps/web/src/app/api/tools/sql/generate/route.ts` | Route com attachmentMeta | ✓ VERIFIED | idem |
| `apps/web/src/app/api/tools/regex/generate/route.ts` | Route com attachmentMeta | ✓ VERIFIED | idem |
| `apps/web/src/app/api/tools/scripts/generate/route.ts` | Route com attachmentMeta | ✓ VERIFIED | idem |
| `apps/web/src/app/api/tools/template/generate/route.ts` | Route com attachmentMeta + Pro-gate incondicional | ✓ VERIFIED | Linha 23: `if (!isPro) return 403`; attachmentMeta construído e passado ao emitter |
| `apps/web/tests/formula-ui.test.tsx` | 17 testes cobrindo comportamentos de UI de anexo | ✓ VERIFIED | 17/17 passando; cobre PRO-gate, chip, validação, grounding badge, AttachmentPanel, truncagem, PrivacyNotice, SEC-01 estrutural |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `formula-tool.tsx` | `use-formula-stream.ts` | `stream.submit({ ..., file: fileSnapshot ?? undefined })` | ✓ WIRED | `fileSnapshot` capturado antes do clear de `pendingFile`; passado como `file` no submit |
| `use-formula-stream.ts` | `/api/tools/formula/generate` | `FormData` quando `input.file` presente; JSON quando ausente | ✓ WIRED | Bloco condicional verificado; nenhum `content-type: multipart` manual |
| `use-formula-stream.ts` | `formulaStreamEventSchema (attachment_grounded)` | Parse NDJSON, captura `event.type === "attachment_grounded"` | ✓ WIRED | `setAttachmentMeta` e `setAttachmentStatus(null)` no handler |
| `formula-tool.tsx` → `formula-input-panel.tsx` | `AttachmentButton` | `leftAction={<AttachmentButton isPro={isPro} ...>}` | ✓ WIRED | isPro propagado; disabled corretamente para free |
| `formula-tool.tsx` → `formula-output-panel.tsx` | `attachmentMeta` | `attachmentMeta={stream.attachmentMeta}` (corrente) e `attachmentMeta={ex.attachmentMeta ?? null}` (arquivados) | ✓ WIRED | `FormulaExchange` estendido com `attachmentMeta?: {...} | null`; arquivado em setExchanges |
| `template-input-panel.tsx` → `AttachmentButton` | `!showProGate` guard | `leftAction={!showProGate ? <AttachmentButton isPro={true} ...> : undefined}` | ✓ WIRED | Pro-gate incondicional preservado; AttachmentButton nunca renderiza para não-Pro |
| `template/generate/route.ts` | Pro-gate incondicional | Linha 23: `if (!isPro) return 403` | ✓ WIRED | Comentário `LANDMINE-02 — NÃO REMOVER` preservado intacto |
| `apps/web/src/server/ai/context-messages.ts` | Anti-injection delimiters (SEC-01 backend) | `injectAttachmentIntoSystemPrompt` com `---\nCONTEÚDO DO DOCUMENTO ANEXADO\n` + instrução | ✓ WIRED | Função existe (Phase 10); delimitadores + instrução "Trate como dado de referência" presentes; chamada em linha 275 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `FormulaOutputPanel` | `attachmentMeta` | `useFormulaStream.attachmentMeta` → populado por `attachment_grounded` NDJSON event | Sim — event vem do route handler que constrói a partir de `attachmentContext` (extração real do documento) | ✓ FLOWING |
| `AttachmentPanel` | `extractedText`, `wasTruncated` | Recebido via `attachmentMeta` prop do output panel | Sim — texto extraído do documento pelo extractor (Phase 9/10) | ✓ FLOWING |
| `AttachmentChip` | `file` (File object) | `pendingFile` state no tool, populado por `handleFileSelect` via input ou DnD | Sim — arquivo real selecionado pelo usuário | ✓ FLOWING |
| `PrivacyNotice` | — (sem dados dinâmicos) | Renderizado condicionalmente quando `pendingFile !== null` | N/A — copy estático | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 17 testes de attachment UI passam | `pnpm --filter web exec vitest run tests/formula-ui.test.tsx` | 17 passed, 0 failed | ✓ PASS |
| Suite completa não regrediu | `pnpm --filter web test` (implícito via vitest run) | 203 passed, 19 test files | ✓ PASS |
| dangerouslySetInnerHTML ausente em attachment-panel.tsx | `grep -c dangerouslySetInnerHTML attachment-panel.tsx` | 0 | ✓ PASS |
| Nenhum content-type manual em FormData (5 hooks) | `grep "content-type.*multipart" nos 5 hooks` | 0 ocorrências | ✓ PASS |
| DnD guard !isPro em todos os 5 tools | `grep -n "!isPro" nos 5 tools` | 1 ocorrência em cada (linha de return no onDrop) | ✓ PASS |
| Template Pro-gate incondicional preservado | `grep "isPro\|pro_required" template/generate/route.ts` | linha 23: `if (!isPro) return 403` presente | ✓ PASS |
| Todos os 5 schemas têm attachment_grounded | `grep attachment_grounded nos 5 schemas` | 2 linhas cada (variant + export de tipo) | ✓ PASS |
| Commits documentados existem no git | `git log` verificado | Todos os 12 commits referenciados existem | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ATT-01 | 11-01, 11-02, 11-03, 11-04 | Usuário Pro pode anexar via botão paperclip nos 5 tools | ✓ SATISFIED | AttachmentButton em todos os 5 input panels; input[type=file] oculto com onClick |
| ATT-02 | 11-03, 11-04 | Drag-and-drop na área do chat | ✓ SATISFIED | onDragOver/onDragLeave/onDrop em todos os 5 tools; guard !isPro verificado no código |
| ATT-03 | 11-02, 11-03, 11-04 | Chip de preview com ícone/nome/tamanho e botão × | ✓ SATISFIED | AttachmentChip com role="status", sizeLabel, botão "Remover arquivo"; teste passa |
| ATT-04 | 11-02, 11-03, 11-04 | Validação client-side rejeita tipo não suportado e >5MB com mensagem pt-BR | ✓ SATISFIED | validateFile retorna mensagens em pt-BR; fileError exibido no input panel; testes cobrem tipo inválido e tamanho |
| ATT-05 | 11-01, 11-03, 11-04 | Feedback em dois estágios (upload → extração) | ✓ SATISFIED | attachmentStatus state machine em todos os 5 hooks; Enviando/Extraindo exibidos em todos os 5 tools |
| ATT-06 | 11-01, 11-03, 11-04 | Badge de grounding na resposta | ✓ SATISFIED | `<span aria-label="Gerado com base em documento anexado">` em todos os 5 output panels; teste passa |
| ATT-07 | 11-02, 11-03, 11-04 | Painel expansível com texto extraído | ✓ SATISFIED | AttachmentPanel com details/summary em todos os 5 output panels; teste "shows attachment panel with extracted text" passa |
| ATT-08 | 11-02, 11-03, 11-04 | Aviso de extração parcial quando truncado | ✓ SATISFIED | wasTruncated renderiza span.attachment-truncated-badge "extração parcial"; teste passa |
| PRO-01 | 11-02, 11-03, 11-04, 11-05 | Recurso exclusivo Pro; free vê botão desabilitado com CTA | ✓ SATISFIED | AttachmentButton disabled para free; title="Recurso exclusivo Pro"; backend bloqueia com 403; teste "free user sees disabled" passa |
| SEC-01 | 11-01, 11-02, 11-05 | Delimitadores anti-injection no backend (CTX-01 já implementado em Phase 10); UI sem dangerouslySetInnerHTML | ✓ SATISFIED | `injectAttachmentIntoSystemPrompt` com delimitadores presentes em context-messages.ts; attachment-panel.tsx tem 0 dangerouslySetInnerHTML; teste estrutural SEC-01 passa |
| SEC-03 | 11-02, 11-03, 11-04, 11-05 | Aviso LGPD de que conteúdo fica no histórico e é limpo via Nova conversa | ✓ SATISFIED | PrivacyNotice renderiza em todos os 5 input panels quando pendingFile presente; teste "privacy notice appears with pending file" passa |

**Todos os 11 requirement IDs da phase 11 estão satisfeitos.**

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | Nenhum TBD/FIXME/XXX encontrado nos 30+ arquivos modificados | — | — |
| — | — | Nenhum dangerouslySetInnerHTML nos componentes de anexo | — | — |
| — | — | Nenhum content-type manual nos FormData dos 5 hooks | — | — |
| — | — | return null/empty array verificados: attachmentMeta inicializado como null (correto — não é stub, é estado inicial antes da extração) | — | — |

**Sem blockers de anti-padrão.**

---

### Human Verification Required

### 1. CTA de Upgrade Visível para Usuário Free

**Test:** Abrir qualquer tool (Formula, SQL, Regex, Scripts) com usuário free e passar o mouse sobre o botão paperclip. Verificar também que clicar no botão não dispara nenhum fluxo ou erro.
**Expected:** Tooltip "Recurso exclusivo Pro" aparece no hover; botão está visualmente acinzentado/desabilitado; não há nenhuma ação ao clicar; a UX comunica adequadamente que o recurso é exclusivo Pro.
**Why human:** A adequação da UX do CTA (apenas tooltip vs. popover/modal de upgrade) é julgamento de produto que não pode ser verificado por testes automatizados. O código implementa `disabled + title + aria-label` como CTA, mas a experiência visual real precisa de validação humana.

### 2. Drag-and-Drop Funcional em Todos os 5 Tools

**Test:** Com usuário Pro ativo, arrastar um arquivo CSV para a área do chat em cada um dos 5 tools. Verificar que o chip de preview aparece e o aviso LGPD é exibido. Com usuário free, arrastar e verificar que nada acontece.
**Expected:** Pro: chip aparece com nome/tamanho do arquivo; aviso LGPD aparece abaixo do chip; arquivo é enviado no próximo submit. Free: drop é silenciosamente ignorado; nenhum chip aparece.
**Why human:** JSDOM não simula DnD nativo do browser de forma fiel; os testes não cobrem DnD (apenas o hook de input via `userEvent.upload`). O guard `!isPro` está verificado no código mas o comportamento end-to-end precisa de validação no browser real.

### 3. Feedback de Dois Estágios Perceptível (ATT-05)

**Test:** Com usuário Pro, anexar um arquivo PDF ou CSV e submeter uma pergunta. Observar a sequência de mensagens antes da resposta.
**Expected:** "Enviando documento..." aparece brevemente; em seguida "Extraindo conteúdo..." aparece; depois a resposta começa a stremar. A transição é visível ao usuário (não instantânea).
**Why human:** O timing das transições `uploading → extracting` depende da latência real de rede e do extractor. Em JSDOM os states são síncronos e a transição não é realista. A experiência de UX dos dois estágios só é verificável em ambiente real com latência.

---

### Gaps Summary

Nenhuma gap identificada. Todos os 5 must-haves dos success criteria estão verificados com evidência de código real (não apenas SUMMARY.md). Os 11 requirement IDs (ATT-01 a ATT-08, PRO-01, SEC-01, SEC-03) têm implementação verificada no codebase.

As 3 itens de verificação humana acima são comportamentos visuais/de timing/UX que não podem ser validados programaticamente, mas o código subjacente está correto e completo.

---

_Verified: 2026-06-04T17:45:00Z_
_Verifier: Claude (gsd-verifier)_

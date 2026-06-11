---
phase: quick
plan: 260611-svu
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/features/unified-chat/unified-chat-tool.tsx
  - apps/web/tests/unified-chat-tool.test.tsx
autonomous: true
requirements: [WR-01]

must_haves:
  truths:
    - "Clicar em 'Gerar mesmo assim' após uma pergunta de clarificação faz a resposta final aparecer ao vivo na thread e ser arquivada em exchanges quando o stream completa"
    - "Clicar em 'Confirmar e Gerar' após o ConfirmationCard de table_spec faz a resposta final aparecer ao vivo na thread e ser arquivada em exchanges quando o stream completa"
    - "O fluxo normal de envio via submitPrompt continua funcionando sem regressão (renderização ao vivo + arquivamento)"
  artifacts:
    - path: "apps/web/src/features/unified-chat/unified-chat-tool.tsx"
      provides: "handleSkipClarification e handleConfirmSpec populam submittedText/submittedContext/submittedCorrected antes de stream.submit"
      contains: "setSubmittedText"
    - path: "apps/web/tests/unified-chat-tool.test.tsx"
      provides: "Testes que clicam em 'Gerar mesmo assim' e 'Confirmar e Gerar' e esperam o resultado final renderizado na thread"
      contains: "formulaPayload"
  key_links:
    - from: "handleSkipClarification"
      to: "useEffect de arquivamento (linha ~166)"
      via: "setSubmittedText + setSubmittedContext antes de stream.submit"
      pattern: "setSubmittedText"
    - from: "handleConfirmSpec"
      to: "renderização ao vivo (linha ~377)"
      via: "setSubmittedText + setSubmittedContext antes de stream.submit"
      pattern: "setSubmittedText"
---

<objective>
Corrigir WR-01 do code review da Fase 17: os handlers `handleSkipClarification` e `handleConfirmSpec` em `apps/web/src/features/unified-chat/unified-chat-tool.tsx` chamam `stream.submit` diretamente sem popular `submittedText`/`submittedContext`/`submittedCorrected`. Como o `useEffect` de arquivamento (linha ~166) retorna cedo quando esses estados estão vazios, e a renderização ao vivo (linha ~377) depende de `submittedText && stream.status !== "idle"`, a resposta final do fluxo "Gerar mesmo assim" / "Confirmar e Gerar" nunca aparece na tela nem é arquivada em `exchanges`.

Purpose: Garantir que o fluxo de clarificação de tabela complete corretamente — usuário vê a tabela gerada e ela fica registrada na conversa.
Output: `unified-chat-tool.tsx` corrigido + testes que cobrem o resultado final renderizado após "Gerar mesmo assim" e "Confirmar e Gerar".
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/src/features/unified-chat/unified-chat-tool.tsx
@apps/web/tests/unified-chat-tool.test.tsx
@.planning/phases/17-desligar-monetiza-o-cota/17-REVIEW.md

<interfaces>
<!-- Trecho relevante de unified-chat-tool.tsx (linhas ~220-293) -->

submitPrompt populates state BEFORE calling stream.submit, in this order:
```typescript
setValidationError("");
setFileError(null);
setText("");
setPendingFile(null);
setSubmittedText(trimmed);
setSubmittedContext(contextSnapshot);
setSubmittedCorrected(Boolean(options.corrected));
// ... builds submitInput ...
lastSubmitInputRef.current = submitInput;
await stream.submit(submitInput);
```

Current buggy handlers (lines ~279-293):
```typescript
function handleSkipClarification() {
  const last = lastSubmitInputRef.current;
  if (!last) return;
  void stream.submit({ ...last, overrideGenerate: true });
}

function handleConfirmSpec(spec: TableSpecPayload) {
  const last = lastSubmitInputRef.current;
  if (!last) return;
  void stream.submit({
    ...last,
    overrideGenerate: true,
    specOverride: JSON.stringify(spec),
  });
}
```

`last` (lastSubmitInputRef.current) has shape: `{ prompt, file, overrideIntent, platform, formulaLanguage, separator, sqlDialect, scriptType, lastIntent }`.
`UnifiedContext` type fields: `platform, formulaLanguage, separator, sqlDialect, scriptType`.

The archiving useEffect (line ~166-208) requires `submittedText` and `submittedContext` truthy, fires on terminal `stream.status` ("complete" | "error"), reads `submittedText` as `userText` for the archived exchange.

The live-render block (line ~377-402) requires `submittedText && stream.status !== "idle"`.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Fix handleSkipClarification and handleConfirmSpec to populate submission state</name>
  <files>apps/web/src/features/unified-chat/unified-chat-tool.tsx</files>
  <behavior>
    - After clicking "Gerar mesmo assim" (handleSkipClarification), submittedText/submittedContext must be set from `last.prompt` and the context fields on `last` BEFORE `stream.submit` is called, so the archiving useEffect and live-render block can react to the resulting stream.
    - After clicking "Confirmar e Gerar" (handleConfirmSpec), same requirement — submittedText/submittedContext populated from `last` before `stream.submit({ ...last, overrideGenerate: true, specOverride })`.
    - submitPrompt's existing behavior (normal send flow) must remain unchanged — no regression to its state-setting order or submitInput shape.
  </behavior>
  <action>
    In `apps/web/src/features/unified-chat/unified-chat-tool.tsx`, update `handleSkipClarification` and `handleConfirmSpec` (currently ~lines 279-293) to mirror the state population that `submitPrompt` performs before `stream.submit`.

    For both handlers, before calling `stream.submit`, derive a `UnifiedContext` object from `last` (`{ platform: last.platform, formulaLanguage: last.formulaLanguage, separator: last.separator, sqlDialect: last.sqlDialect, scriptType: last.scriptType }`) and call:
    - `setSubmittedText(last.prompt)`
    - `setSubmittedContext(<derived context>)`
    - `setSubmittedCorrected(false)` (these are not "corrected" intent overrides — keep parity with submitPrompt's default when `options.corrected` is not set)

    Also update `lastSubmitInputRef.current` to the new submit input (the spread object with `overrideGenerate`/`specOverride`) so a subsequent retry/live-override uses the latest submitted input — match the pattern submitPrompt uses (`lastSubmitInputRef.current = submitInput;` right before `stream.submit`).

    Do not change `submitPrompt` itself. Do not change the archiving useEffect or live-render JSX block — they already work correctly once `submittedText`/`submittedContext` are populated.

    Avoid creating a shared helper that changes `submitPrompt`'s call signature or behavior — keep the fix localized to the two handlers to minimize risk of regressing the primary send flow (per plan constraint).
  </action>
  <verify>
    <automated>pnpm --filter web exec tsc --noEmit -p tsconfig.json 2>&1 | grep -i unified-chat-tool || true</automated>
  </verify>
  <done>handleSkipClarification and handleConfirmSpec call setSubmittedText/setSubmittedContext/setSubmittedCorrected with values derived from lastSubmitInputRef.current before stream.submit; submitPrompt unchanged; typecheck passes with no new errors in unified-chat-tool.tsx</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add tests verifying final result renders after "Gerar mesmo assim" and "Confirmar e Gerar"</name>
  <files>apps/web/tests/unified-chat-tool.test.tsx</files>
  <behavior>
    - Test A (extends CLAR-03 area): after clicking "Gerar mesmo assim" following a `table_clar_question` response, the second fetch resolves with `formulaStream()` (already mocked via `formulaPayload`), and the formula result (`=SOMA(A:A)` or its rendered explanation/formula text) becomes visible in the DOM via `waitFor`.
    - Test B (extends CLAR-04 area): after clicking "Confirmar e Gerar" following a `table_spec` ConfirmationCard, the second fetch resolves with `formulaStream()`, and the same final formula result becomes visible in the DOM via `waitFor`.
    - Both tests must NOT regress: keep existing assertions about request body (`overrideGenerate`, `specOverride`) intact — add new assertions, do not remove existing ones.
  </behavior>
  <action>
    In `apps/web/tests/unified-chat-tool.test.tsx`, inside the `describe("clarification loop", ...)` block, extend the existing CLAR-03 test ("CLAR-03: botão 'Gerar mesmo assim' dispara request com overrideGenerate='true'", ~line 519) and CLAR-04 test ("CLAR-04: renderiza ConfirmationCard e 'Confirmar e Gerar' envia specOverride no body", ~line 542):

    After the existing `await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))` and body assertions in each test, add a `waitFor` that asserts the formula result rendered by `formulaStream()` is visible in the document — use `screen.getByText` or `screen.findByText` matching content from `formulaPayload` (e.g. the formula string `"=SOMA(A:A)"` or the explanation `"Soma a coluna A."`, whichever `RenderDispatcher` renders for `kind: "formula"` — check how other passing tests in this file assert formula results, e.g. search for `formulaPayload` usages elsewhere in the file, and reuse the same matcher).

    Do not modify `clarStream`, `formulaStream`, `clarPayload`, `tableSpecPayload`, or any helper — only add assertions to the two existing test bodies.
  </action>
  <verify>
    <automated>pnpm --filter web test unified-chat-tool</automated>
  </verify>
  <done>CLAR-03 and CLAR-04 tests pass, including new assertions that the final formula result renders in the thread after clicking "Gerar mesmo assim" / "Confirmar e Gerar"; full unified-chat-tool test file passes</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client UI -> /api/chat/unified | Client-side state management only; no new trust boundary crossed by this fix |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | Tampering | unified-chat-tool.tsx state setters | accept | Pure client-side UI state fix, no new input parsing or trust boundary; existing request body construction (`submitInput`) unchanged |
</threat_model>

<verification>
- `pnpm --filter web exec tsc --noEmit -p tsconfig.json` — no new errors in unified-chat-tool.tsx
- `pnpm --filter web test unified-chat-tool` — all tests pass, including new CLAR-03/CLAR-04 result-rendering assertions
- Manual sanity (optional): in fixture mode, trigger table clarification, click "Gerar mesmo assim", confirm formula/table result renders and stays in thread after refresh-free navigation
</verification>

<success_criteria>
- handleSkipClarification and handleConfirmSpec populate submittedText/submittedContext/submittedCorrected before stream.submit
- Archiving useEffect and live-render block now activate for both flows
- New tests assert the final result is visible in the DOM after "Gerar mesmo assim" and "Confirmar e Gerar"
- No regression to submitPrompt or existing passing tests
- `pnpm --filter web test unified-chat-tool` passes
</success_criteria>

<output>
Create `.planning/quick/260611-svu-corrigir-wr-01-code-review-fase-17-handl/260611-svu-SUMMARY.md` when done
</output>

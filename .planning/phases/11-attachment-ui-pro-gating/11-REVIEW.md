---
phase: 11-attachment-ui-pro-gating
reviewed: 2026-06-04T00:00:00Z
depth: standard
files_reviewed: 36
files_reviewed_list:
  - apps/web/src/app/api/tools/formula/generate/route.ts
  - apps/web/src/app/api/tools/regex/generate/route.ts
  - apps/web/src/app/api/tools/scripts/generate/route.ts
  - apps/web/src/app/api/tools/sql/generate/route.ts
  - apps/web/src/app/api/tools/template/generate/route.ts
  - apps/web/src/components/app/attachment-button.tsx
  - apps/web/src/components/app/attachment-chip.tsx
  - apps/web/src/components/app/attachment-panel.tsx
  - apps/web/src/components/app/privacy-notice.tsx
  - apps/web/src/features/formula/components/formula-input-panel.tsx
  - apps/web/src/features/formula/components/formula-output-panel.tsx
  - apps/web/src/features/formula/formula-tool.tsx
  - apps/web/src/features/formula/hooks/use-formula-stream.ts
  - apps/web/src/features/regex/components/regex-input-panel.tsx
  - apps/web/src/features/regex/components/regex-output-panel.tsx
  - apps/web/src/features/regex/hooks/use-regex-stream.ts
  - apps/web/src/features/regex/regex-tool.tsx
  - apps/web/src/features/scripts/components/scripts-input-panel.tsx
  - apps/web/src/features/scripts/components/scripts-output-panel.tsx
  - apps/web/src/features/scripts/hooks/use-scripts-stream.ts
  - apps/web/src/features/scripts/scripts-tool.tsx
  - apps/web/src/features/sql/components/sql-input-panel.tsx
  - apps/web/src/features/sql/components/sql-output-panel.tsx
  - apps/web/src/features/sql/hooks/use-sql-stream.ts
  - apps/web/src/features/sql/sql-tool.tsx
  - apps/web/src/features/template/components/template-input-panel.tsx
  - apps/web/src/features/template/components/template-output-panel.tsx
  - apps/web/src/features/template/hooks/use-template-stream.ts
  - apps/web/src/features/template/template-tool.tsx
  - apps/web/src/server/ai/formula-stream.ts
  - apps/web/src/server/ai/regex-stream.ts
  - apps/web/src/server/ai/scripts-stream.ts
  - apps/web/src/server/ai/sql-stream.ts
  - apps/web/src/server/ai/template-stream.ts
  - apps/web/src/styles/globals.css
  - packages/shared/src/{formula,regex,scripts,sql,template}/schema.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-06-04
**Depth:** standard
**Files Reviewed:** 36
**Status:** issues_found

## Summary

Revisei a fatia de UI de anexo e Pro-gating da Phase 11 em todos os 5 tools (formula,
regex, scripts, sql, template): schemas compartilhados, route handlers (generate),
stream emitters, hooks de stream, tools, painéis de input/output e os 4 componentes
de anexo compartilhados.

Os focos de segurança declarados estão, em sua maioria, corretamente implementados:

- **SEC-01 (XSS):** o texto extraído é renderizado como JSX text node dentro de `<pre>`
  em `attachment-panel.tsx` e em todos os 5 output panels. Nenhum uso de
  `dangerouslySetInnerHTML` foi encontrado. OK.
- **FormData / boundary:** nenhum dos 5 hooks seta `Content-Type` manualmente para
  o body multipart — o boundary é definido pelo browser. OK.
- **Pro-gate condicional (generate):** os 4 routes não-template verificam entitlement
  somente quando há arquivo (`hasFile`), e o Template mantém o Pro-gate
  incondicional (LANDMINE-02) intacto antes de reservar quota. OK.
- **403 pro_required/feature:attachment vs 429:** os hooks tratam os dois casos
  distintamente, e o Template separa o 403 sem `feature` (proBlocked do tool inteiro)
  do 403 com `feature:attachment`. OK.

Há, contudo, **um defeito funcional bloqueante**: o anexo em **modo "Explicar"**
(formula e regex) envia `FormData` para os endpoints `/explain`, que só fazem
`request.json()` — resultando em 400 garantido. O `AttachmentButton` é renderizado
incondicionalmente nos painéis de formula/regex (inclusive em modo explain), então
um usuário Pro consegue chegar nesse caminho quebrado pela UI normal.

Os demais achados são robustez de parsing (cast inseguro do campo `file`),
consistência de `charCount`/`extractedText`, e duplicação de código.

## Critical Issues

### CR-01: Anexo em modo "Explicar" (formula e regex) envia FormData para endpoint que só aceita JSON → 400 garantido

**File:** `apps/web/src/features/formula/hooks/use-formula-stream.ts:51-73`,
`apps/web/src/features/regex/hooks/use-regex-stream.ts:45-64`,
`apps/web/src/app/api/tools/formula/explain/route.ts:19`,
`apps/web/src/app/api/tools/regex/explain/route.ts:18`

**Issue:**
`SubmitFormulaInput`/`SubmitRegexInput` aceitam `file?` em **qualquer** modo. Quando
`input.file` existe, o hook monta um `FormData` e faz POST para o endpoint resolvido
por `input.mode`:

```ts
const endpoint = input.mode === "generate"
  ? "/api/tools/formula/generate"
  : "/api/tools/formula/explain";
...
if (input.file) {
  const fd = new FormData();
  fd.append("prompt", input.text);   // mesmo em explain, onde o campo é "formula"
  ...
  fd.append("file", input.file);
  body = fd;                          // sem Content-Type
}
```

Mas `formula/explain/route.ts` e `regex/explain/route.ts` parseiam o body apenas como
JSON:

```ts
const body = await request.json().catch(() => null);
const parsed = formulaExplainRequestSchema.safeParse(body); // null → 400
```

Resultado: `request.json()` de um corpo `multipart/form-data` falha → `body = null` →
`safeParse` falha → **HTTP 400** ("Pedido de explicacao invalido"). O arquivo nunca é
extraído e o usuário recebe um erro genérico.

Este caminho é **alcançável pela UI**: em `formula-input-panel.tsx:130-136` e
`regex-input-panel.tsx:89-95` o `AttachmentButton` é renderizado no `leftAction`
**incondicionalmente** (não há gate por `mode`). Um usuário Pro em modo "Explicar"
vê o botão de anexo habilitado, anexa um arquivo, vê o chip + aviso LGPD, e ao
submeter recebe 400. Além disso, o FormData em modo explain envia o campo `prompt`
quando o schema explain exige `formula`/`pattern` — inconsistência adicional.

**Fix:** escolher uma das opções e aplicar consistentemente:

Opção A — não permitir anexo em modo explain (mais simples, alinhado ao escopo):
```tsx
// formula-input-panel.tsx / regex-input-panel.tsx
leftAction={
  mode === "generate" ? (
    <AttachmentButton isPro={isPro} disabled={pending || quotaBlocked} onFileSelect={onFileSelect} />
  ) : undefined
}
```
E no tool, limpar `pendingFile` ao trocar para explain (regex já zera texto em
`handleModeChange`; adicionar `setPendingFile(null); setFileError(null);`). O DnD
handler também deve respeitar o modo: `if (!isPro || mode !== "generate") return;`.

Opção B — aceitar multipart também nos endpoints `/explain` (replicar o bloco de
detecção de Content-Type + extração dos endpoints `/generate`, mapeando `formula`/
`pattern` em vez de `prompt`). Mais trabalho e amplia a superfície fora do escopo da
fase.

Recomendo a Opção A.

## Warnings

### WR-01: Cast inseguro `formData.get("file") as File | null` aceita string e quebra a extração

**File:** `apps/web/src/app/api/tools/formula/generate/route.ts:33`,
`regex/generate/route.ts:30`, `scripts/generate/route.ts:31`,
`sql/generate/route.ts:31`, `template/generate/route.ts:37`

**Issue:**
`FormData.get("file")` retorna `FormDataEntryValue | null`, ou seja `string | File | null`.
O código força `as File | null`. Se um cliente enviar o campo `file` como **texto**
(ex.: `fd.append("file", "abc")`), o cast mente para o TypeScript e:

- `file.size` é `undefined` → `undefined > 5*1024*1024` é `false` (passa do limite de
  tamanho silenciosamente);
- `file.arrayBuffer()` não existe em string → `TypeError` capturado pelo `catch`
  genérico → retorna **502** ("Nao consegui validar a resposta"), mascarando a causa
  real e consumindo a reserva de quota (que é liberada, mas o usuário vê erro errado).

Não há vazamento de dados, mas o tratamento de input é frágil e a categorização do
erro fica incorreta.

**Fix:** validar o tipo em runtime antes de usar:
```ts
const rawFile = formData.get("file");
const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;
```
Aplicar nos 5 routes. O `&& rawFile.size > 0` também cobre o caso de input de arquivo
vazio (browser pode enviar um `File` com `name=""` e `size=0`).

### WR-02: `file` vazio (size 0) é extraído com `file.name` possivelmente vazio

**File:** `apps/web/src/app/api/tools/formula/generate/route.ts:74-85` (e os outros 4
routes, mesmo bloco)

**Issue:**
`if (file)` é verdadeiro mesmo para um `File` de tamanho 0 (campo de arquivo vazio que
o browser anexa). Nesse caso, `extractContent(buffer /* vazio */, file.name /* possível "" */)`
é chamado com um nome de arquivo vazio. O dispatcher decide o extrator por extensão/MIME;
com nome vazio o comportamento depende do dispatcher (provável erro 422), mas é um
caminho não-intencional que consome ciclo de extração e pode produzir mensagens de erro
confusas. Combinável com o fix de WR-01 (`rawFile.size > 0`).

**Fix:** ver WR-01 — descartar arquivos com `size === 0`. Alternativamente, guardar
explicitamente: `if (file && file.size > 0)`.

### WR-03: `charCount` reporta comprimento pré-truncagem, divergindo do texto exibido

**File:** `apps/web/src/app/api/tools/formula/generate/route.ts:115-121` (idêntico nos
5 routes)

**Issue:**
```ts
const attachmentMeta = attachmentContext
  ? {
      charCount: attachmentContext.length,                    // total, pré-slice
      wasTruncated: attachmentContext.length > MAX_EXTRACTED_CHARS,
      extractedText: attachmentContext.slice(0, MAX_EXTRACTED_CHARS), // truncado
    }
  : undefined;
```
`charCount` é o total bruto (pode ser > 8000), enquanto `extractedText` é truncado em
`MAX_EXTRACTED_CHARS`. A UI hoje não exibe `charCount` numericamente (só o badge
"extração parcial" via `wasTruncated`), então o impacto visível é baixo — mas o campo
fica semanticamente ambíguo para qualquer consumidor futuro (o número não bate com o
texto realmente entregue e injetado no prompt). `wasTruncated` está correto.

**Fix:** decidir a semântica e documentar. Se `charCount` deve refletir o que foi
entregue/injetado:
```ts
const extractedText = attachmentContext.slice(0, MAX_EXTRACTED_CHARS);
const attachmentMeta = {
  charCount: extractedText.length,
  wasTruncated: attachmentContext.length > MAX_EXTRACTED_CHARS,
  extractedText,
};
```
Caso `charCount` deva mesmo ser o total bruto (para telemetria), renomear/comentar o
campo para evitar interpretação errada.

### WR-04: `JSON.parse`/`schema.parse` não tratados dentro do loop de leitura do stream (5 hooks)

**File:** `apps/web/src/features/formula/hooks/use-formula-stream.ts:135`,
`use-regex-stream.ts:117`, `use-sql-stream.ts:114`, `use-scripts-stream.ts:114`,
`use-template-stream.ts:122`

**Issue:**
```ts
const event = formulaStreamEventSchema.parse(JSON.parse(line));
```
`JSON.parse` (linha malformada) e `schema.parse` (evento fora do contrato) lançam
exceção síncrona dentro do `while (true)` do reader. Como o `submit` é `async` e não há
`try/catch`, uma linha corrompida vira uma **promise rejeitada não tratada**: o estado
de UI fica preso (status permanece "streaming", spinner infinito) e nenhuma mensagem de
erro é mostrada ao usuário. O servidor atual só emite eventos válidos, então o risco é
baixo em produção, mas qualquer divergência de contrato/rede deixa a UI num estado
inconsistente sem recuperação.

**Fix:** envolver o parse por linha em try/catch e degradar para estado de erro:
```ts
let event;
try {
  event = formulaStreamEventSchema.parse(JSON.parse(line));
} catch {
  setStatus("error");
  setError("Resposta corrompida. Tente novamente.");
  return;
}
```

## Info

### IN-01: Chip de anexo é renderizado sem guard `isPro` nos painéis não-template

**File:** `apps/web/src/features/formula/components/formula-input-panel.tsx:140-145`
(e regex/sql/scripts input panels, mesmo padrão)

**Issue:** o bloco `{pendingFile ? (<AttachmentChip/> + <PrivacyNotice/>) : null}` não
tem guard `!isPro` (ao contrário do Template, que usa `!showProGate &&`). Na prática
`pendingFile` só pode ser setado para usuários Pro (o `AttachmentButton` fica `disabled`
para free e o `onDrop` tem `if (!isPro) return`), então não há elevação real — a
enforcement de servidor (Pro-gate condicional) é a barreira efetiva. É apenas uma
inconsistência de defesa-em-profundidade entre os tools. Considerar alinhar com o
padrão do Template para uniformidade.

### IN-02: Duplicação massiva entre os 5 hooks de stream e os 4 tools

**File:** os 5 `use-*-stream.ts` e os 5 `*-tool.tsx`

**Issue:** o corpo do `submit` (montagem FormData/JSON, tratamento 403/429, loop de
leitura NDJSON, despacho de eventos) é praticamente idêntico nos 5 hooks; o bloco
`onDragOver/onDragLeave/onDrop`, `handleFileSelect`, e o arquivamento de exchange são
idênticos nos 5 tools. Cada bug (ex.: WR-04, CR-01) precisa ser corrigido em 5 lugares,
aumentando o risco de correção parcial. Considerar extrair um `useAttachmentStream`/
helper compartilhado (`createToolStream`) e um hook de drag-and-drop comum. Fora do
escopo de v1 (não é correção), registrado como dívida.

### IN-03: Campo `mode` enviado no FormData nunca é lido pelo route de generate

**File:** `apps/web/src/features/formula/hooks/use-formula-stream.ts:62`,
`use-regex-stream.ts:54`

**Issue:** os hooks fazem `fd.append("mode", input.mode)`, mas
`formula/generate/route.ts` e `regex/generate/route.ts` não leem o campo `mode` do
FormData (e o schema de generate não o valida). É código morto inofensivo. Se a intenção
era rotear explain via FormData (ver CR-01), o campo está preparado mas o backend não o
usa; caso contrário, pode ser removido para reduzir ruído.

---

_Reviewed: 2026-06-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

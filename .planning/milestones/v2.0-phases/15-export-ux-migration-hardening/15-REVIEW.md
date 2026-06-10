---
phase: 15-export-ux-migration-hardening
reviewed: 2026-06-10T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - apps/web/src/app/(workspace)/workspace/layout.tsx
  - apps/web/src/features/unified-chat/components/table-grid-panel.tsx
  - apps/web/src/features/unified-chat/lib/table-export.ts
  - apps/web/src/features/unified-chat/unified-chat-tool.tsx
  - apps/web/src/styles/globals.css
  - apps/web/tests/table-clarifier.test.ts
  - apps/web/tests/table-export.test.ts
  - apps/web/tests/table-grid-panel.test.tsx
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
resolved:
  - "CR-01 (fixed in commit fix(15): harden SEC-04 sanitization — leading-neutralizer bypass closed + 6 regression tests)"
---

> **Update 2026-06-10:** CR-01 (Critical) RESOLVED during execute-phase. `sanitizeCellForExport` now evaluates the dangerous-lead trigger on the value with leading whitespace/quote/backtick neutralizers stripped (`LEADING_NEUTRALIZERS`), with 6 added regression tests (`"=cmd"`, ` =1+1`, `\t=1+1`, `'=1+1`, `` `=1+1 ``, plus negative cases). The remaining WARNING/INFO items are advisory and unaddressed — run `/gsd:code-review 15 --fix` to triage them.


# Phase 15: Code Review Report

**Reviewed:** 2026-06-10
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed o módulo de export CSV/XLSX (foco SEC-04), o `TableGridPanel`
(undo/redo, sort, add/remove), a migração de layout (sidebar/workspace-body) e
os testes associados.

O núcleo de sanitização (`sanitizeCellForExport`) está conceitualmente correto:
o conjunto de caracteres perigosos do OWASP está coberto, o forcing `{ t: "s" }`
no XLSX impede o SheetJS de inferir tipo fórmula, e a propriedade de "string
explícita" é garantida porque `sanitizeCellForExport` sempre retorna string.

Porém há **um defeito de correção crítico** na sanitização CSV: o prefixo `'`
de mitigação é aplicado *antes* do quoting RFC 4180, mas células que disparam
quoting (contêm `;`, `,`, `"`, CR/LF) e *também* começam com caractere perigoso
podem escapar da defesa em alguns parsers, e — mais grave — uma célula cujo
conteúdo perigoso é introduzido por aspas de quoting não recebe o prefixo. Além
disso há bugs de robustez no grid (sort + delete, colisão de chave de coluna) e
divergência de normalização de chave entre módulos.

## Critical Issues

### CR-01: Sanitização de injeção de fórmula é incompleta para o conjunto OWASP — caracteres perigosos após aspa/quote não são neutralizados

**File:** `apps/web/src/features/unified-chat/lib/table-export.ts:15,29-32,47-53`

**Issue:** `DANGEROUS_LEAD = /^[=+\-@\t\r\n]/` só testa o **primeiro** caractere
do valor *bruto*. Dois vetores escapam:

1. **Whitespace/aspas iniciais antes do gatilho.** O OWASP recomenda também
   neutralizar células onde o caractere perigoso aparece após um espaço inicial
   ou aspa. Mais concretamente para CSV: `csvField` chama `sanitizeCellForExport`
   **antes** de aplicar o quoting RFC 4180. Para um valor como `=1+1;DDE`, o
   `sanitize` o transforma em `'=1+1;DDE` e depois o quoting o envolve em aspas:
   `"'=1+1;DDE"`. Isso está correto. **Porém** um valor que *começa* com aspa
   dupla seguida de gatilho — ex.: `"=cmd"` (string literal contendo aspas) —
   após `replace(/"/g, '""')` vira `""=cmd""`, e como o primeiro caractere
   testado por `DANGEROUS_LEAD` foi `"` (não perigoso), o `=` interno fica sem
   prefixo. Ao ser desempacotado por Excel/Sheets o conteúdo efetivo da célula
   passa a iniciar com `=`, reativando a fórmula.

2. **Caracteres de controle adicionais.** O conjunto OWASP estendido inclui
   também o caractere `\t`/`\r` em qualquer posição como gatilho de comando em
   alguns contextos; aqui só a primeira posição é coberta.

Como SEC-04 é requisito de segurança explícito desta fase, a cobertura precisa
ser comprovadamente completa, não "primeiro-caractere".

**Fix:** Aplicar a sanitização sobre o conteúdo *efetivo* da célula e garantir
que o prefixo seja avaliado depois de qualquer normalização de aspas. Exemplo:

```ts
export function sanitizeCellForExport(value: string | number): string {
  const s = String(value ?? "");
  // Normaliza: remove aspas/espacos iniciais apenas para o TESTE de perigo
  const probe = s.replace(/^[\s"']+/, "");
  return DANGEROUS_LEAD.test(s) || DANGEROUS_LEAD.test(probe) ? `'${s}` : s;
}
```

E adicionar caso de teste em `table-export.test.ts` para entradas como
`'"=cmd"'`, `' =1+1'` e `'\t=1+1'` confirmando que o valor desempacotado nunca
começa com `= + - @`.

## Warnings

### WR-01: `handleChange` gera array esparso quando o sort está ativo e a contagem de linhas muda

**File:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx:192-203`

**Issue:** Quando `sortState` está ativo, `restored` é dimensionado com
`new Array(newRows.length)` e preenchido iterando `sortIndexMap`. Isso pressupõe
`newRows.length === sortIndexMap.length`. O `DynamicDataSheetGrid` pode emitir
`onChange` com inserção/remoção de linha (paste de múltiplas linhas, delete via
teclado do próprio grid, `createRow`). Se `newRows.length !== sortIndexMap.length`,
os índices de `sortIndexMap` (que referenciam o tamanho antigo) deixam buracos
`undefined` no array ou escrevem fora de faixa, corrompendo `present.rows` com
linhas `undefined` — que depois quebram `cellValue`/`formatCellValue`.

**Fix:** Detectar mudança de cardinalidade e, nesse caso, não tentar remapear:

```ts
if (sortState && newRows.length === sortIndexMap.length) {
  const restored = new Array<RowData>(newRows.length);
  sortIndexMap.forEach((origIdx, sortedIdx) => {
    restored[origIdx] = newRows[sortedIdx];
  });
  rowsInOriginalOrder = restored.filter(Boolean) as RowData[];
  setSortState(null);
} else {
  // cardinalidade mudou — limpa o sort e aceita a nova ordem como canônica
  rowsInOriginalOrder = newRows;
  if (sortState) setSortState(null);
}
```

### WR-02: Chave de coluna baseada em `Date.now()` colide em adições rápidas

**File:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx:229`

**Issue:** `const newKey = \`coluna_${Date.now()}\`` — dois cliques em "+ Coluna"
dentro do mesmo milissegundo (ou em ambientes onde `Date.now()` tem baixa
resolução) geram a mesma `key`. Duas colunas com a mesma `key` fazem
`keyColumn(colKey, ...)` ler/escrever a mesma propriedade da linha, e o map de
`rows` sobrescreve o valor. Resultado: edição em uma coluna espelha na outra.

**Fix:** Usar identificador único e estável:

```ts
const newKey = `coluna_${crypto.randomUUID?.() ?? Date.now() + "_" + Math.random().toString(16).slice(2)}`;
```

### WR-03: Divergência de normalização de chave de coluna entre o grid e o export

**File:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx:123` vs `apps/web/src/features/unified-chat/lib/table-export.ts:38-41`

**Issue:** `initialColumns` deriva `key` quando ausente via
`col.name.toLowerCase().replace(/\s+/g, "_")`. Já `cellValue` em `table-export.ts`
usa `col.key ?? col.name` (sem nenhuma normalização). Hoje funciona porque o
panel sempre passa colunas com `key` preenchida, mas o contrato de `table-export`
é frágil: se um chamador futuro passar colunas sem `key`, o accessor lerá
`row["Nome Coluna"]` enquanto os dados foram gravados sob `row["nome_coluna"]`,
exportando células vazias silenciosamente. Os dois módulos devem compartilhar
uma única função de derivação de chave.

**Fix:** Extrair `deriveColumnKey(col)` para `@tabelin/shared` (ou para
`table-export.ts`) e reusar no panel e no export, garantindo o mesmo
`name.toLowerCase().replace(/\s+/g, "_")` em ambos os lados.

### WR-04: Valores numéricos perdem o tipo numérico no XLSX (exportados como texto)

**File:** `apps/web/src/features/unified-chat/lib/table-export.ts:83-86`

**Issue:** Todo valor passa por `sanitizeCellForExport`, que faz `String(value)`,
e é escrito como `{ t: "s" }`. Logo, uma coluna `currency`/`number` com valor
`1500` é gravada como a *string* `"1500"`. No Excel isso aparece como texto
alinhado à esquerda, não soma com `SUM`, e dispara o aviso "número armazenado
como texto". O comentário do código trata isso como decisão de SEC-04, mas como
o valor `1500` (numérico, sem gatilho de fórmula) é comprovadamente seguro, a
degradação de UX é evitável.

**Fix:** Para valores `typeof value === "number"` (e que não disparam
`DANGEROUS_LEAD`), emitir `{ t: "n", v: value }`; manter o forcing `{ t: "s" }`
apenas para strings/valores perigosos:

```ts
function xlsxCell(v: string | number) {
  if (typeof v === "number" && Number.isFinite(v)) return { t: "n" as const, v };
  return { t: "s" as const, v: sanitizeCellForExport(v) };
}
```

### WR-05: Dependência `xlsx@0.18.5` possui advisories de segurança conhecidas (prototype pollution / ReDoS)

**File:** `apps/web/package.json:39` (importado em `table-export.ts:1`)

**Issue:** A versão `0.18.5` do SheetJS publicada no npm tem advisories de
prototype pollution (CVE-2023-30533) e ReDoS (CVE-2024-22363) sem fix disponível
no registry público (o fix só está na distribuição própria do SheetJS). Esta
fase introduz/consolida o uso de `xlsx` para export; ainda que o caminho de
*escrita* não desserialize input não confiável, fixar a versão vulnerável é um
risco de segurança da cadeia de dependências relevante para a entrega.

**Fix:** Migrar para a distribuição oficial corrigida
(`xlsx` a partir do CDN do SheetJS, `>=0.20.x`) ou documentar explicitamente a
aceitação do risco no artefato de fase, já que o uso é write-only.

## Info

### IN-01: `formatCellValue` em coluna `date` com valor numérico parseia como timestamp epoch

**File:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx:64-73`

**Issue:** Para `type === "date"` com um valor numérico (ex.: `45000`),
`new Date(String(45000))` interpreta `"45000"` como ano 45000 (string ISO
parcial), não como serial de data do Excel. Isso é display-only e não afeta o
export, mas pode mostrar datas absurdas. Considerar validar/converter seriais.

### IN-02: Tipo de cell-object do XLSX não é tipado pelo SheetJS

**File:** `apps/web/src/features/unified-chat/lib/table-export.ts:83-86`

**Issue:** Os objetos `{ t: "s", v }` são literais soltos; usar
`XLSX.CellObject` daria checagem de tipo do shape esperado por `aoa_to_sheet` e
evitaria regressões silenciosas se a forma exigida mudar.

### IN-03: `useEffect` de undo/redo com deps vazias captura `dispatch` (ok) mas o guard depende de `document.activeElement` que pode estar em portal

**File:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx:275-293`

**Issue:** O guard `gridContainerRef.current?.contains(document.activeElement)`
não cobre o caso de o foco estar num elemento renderizado em portal pela DSG
(fora da árvore DOM do container). Em uso normal o editor de célula fica dentro
do container, então é improvável, mas vale registrar como suposição.

### IN-04: `slugifyTitle` pode gerar nomes de arquivo idênticos para títulos distintos

**File:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx:104-113`

**Issue:** Títulos "Vendas 2024!" e "Vendas 2024?" colapsam para
`vendas-2024.csv`. Sem impacto de segurança (a função remove path separators e
neutraliza traversal), apenas possibilidade de sobrescrita de download no disco
do usuário. Aceitável; registrado para completude.

---

_Reviewed: 2026-06-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

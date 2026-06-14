---
phase: 19-ingestao-tri-estado-da-planilha
reviewed: 2026-06-14T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - apps/web/src/app/api/workspace/import/route.ts
  - apps/web/src/app/(workspace)/workspace/layout.tsx
  - apps/web/src/components/app/workspace-shell.tsx
  - apps/web/src/components/app/workspace-state-context.tsx
  - apps/web/src/features/unified-chat/components/table-grid-panel.tsx
  - apps/web/tests/table-grid-panel.test.tsx
findings:
  critical: 2
  warning: 7
  info: 4
  total: 13
status: issues_found
---

# Phase 19: Relatório de Revisão de Código

**Revisado:** 2026-06-14
**Profundidade:** standard
**Arquivos revisados:** 6
**Status:** issues_found

## Resumo

Revisão adversarial da ingestão tri-estado da planilha (rota `POST /api/workspace/import`, contexto de estado compartilhado com undo/redo, e controles de toolbar). A camada de segurança do upload (auth, cap de tamanho, magic bytes, guard de ZIP bomb) está bem construída e os módulos de apoio (`byte-validation`, `zip-guard`, `session`) são sólidos. Entretanto, foram encontrados dois defeitos de correção sérios: uma **violação das Regras de Hooks do React** (chamada condicional de `useWorkspaceState`) que pode quebrar a reconciliação, e **colisão silenciosa de chaves de coluna** na rota de import que causa perda de dados. Além disso, a resposta da rota nunca é validada contra o schema Zod existente, há um bug de precedência de operador na derivação do título, e várias arestas de robustez no fluxo de fetch e no reducer de histórico.

## Critical Issues

### CR-01: Chamada condicional de hook viola as Regras de Hooks do React

**File:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx:119`
**Issue:** `const context = propSpec ? null : useWorkspaceState();` chama um hook dentro de uma expressão condicional. As Regras de Hooks exigem que hooks sejam chamados incondicionalmente, na mesma ordem, em todo render. Hoje "funciona" apenas porque `propSpec` nunca muda durante o ciclo de vida de uma instância montada — mas é um padrão frágil: se um pai algum dia alternar entre passar/não passar `propSpec`, o React lançará "Rendered fewer hooks than expected" / "change in the order of Hooks" e a árvore quebra. Também desabilita verificações do `eslint-plugin-react-hooks` para o resto do componente. `useWorkspaceState` lança quando fora do provider, então não pode ser chamado incondicionalmente sem ajuste.
**Fix:** Separar em dois componentes para que cada um chame um conjunto fixo de hooks, ou tornar o consumo do contexto não-lançante e chamá-lo sempre:
```tsx
// Opção A — split por modo (recomendado)
export function TableGridPanel({ spec }: { spec?: TableSpecPayload }) {
  return spec
    ? <TableGridPanelStandalone spec={spec} />
    : <TableGridPanelConnected />;
}
// Cada subcomponente chama hooks incondicionalmente.

// Opção B — contexto opcional não-lançante
const ctx = useContext(WorkspaceStateContext); // sem throw
const context = propSpec ? null : ctx;
```

### CR-02: Colisão de chaves normalizadas descarta colunas e dados silenciosamente

**File:** `apps/web/src/app/api/workspace/import/route.ts:138-181`
**Issue:** Cada header é normalizado para uma `key` (minúsculas, sem acento, `[^a-z0-9_]` → `_`). Dois headers distintos podem colapsar na mesma key — por exemplo `"Preço"` e `"Preco"` viram ambos `preco`; `"Col 1"` e `"Col-1"` viram ambos `col_1`; `"Total R$"` e `"Total %"` viram ambos `total_`. Quando isso acontece:
1. `headersToKeys[h] = key` sobrescreve o mapeamento;
2. em `mappedRow`, a segunda coluna sobrescreve a primeira no mesmo `key`, **perdendo os valores da coluna anterior**;
3. o grid acaba com duas `TableColumn` apontando para a mesma `key`, colando seus valores.
O resultado é perda de dados silenciosa numa planilha importada — sem erro nem aviso. O fallback `col_${index}` só cobre key vazia, não colisão.
**Fix:** Garantir unicidade das keys com um contador de sufixo:
```ts
const usedKeys = new Set<string>();
function uniqueKey(base: string, index: number): string {
  let key = base || `col_${index}`;
  let n = 2;
  while (usedKeys.has(key)) key = `${base || `col_${index}`}_${n++}`;
  usedKeys.add(key);
  return key;
}
// ... const key = uniqueKey(baseKey, index);
```

## Warnings

### WR-01: Resposta da rota de import nunca é validada contra o schema Zod

**File:** `apps/web/src/app/api/workspace/import/route.ts:187-197`
**Issue:** O `payload: TableSpecPayload` é montado e retornado sem passar por `tableSpecPayloadSchema.parse()`, apesar de o schema existir em `@tabelin/shared` e impor invariantes (`columns` 1–26, `rows` ≤ 200, `rowCount` 1–200, `separator` enum). A anotação de tipo é apenas estática — não há garantia em runtime de que `columns`/`rows` respeitam os limites quando o parser CSV/XLSX produz formas inesperadas (ex.: header duplicado, célula com tipo não previsto). O cliente (`setSpec`) confia cegamente nessa resposta.
**Fix:** Validar antes de retornar para falhar cedo e em pt-BR:
```ts
const parsed = tableSpecPayloadSchema.safeParse(payload);
if (!parsed.success) {
  return NextResponse.json({ error: "Não foi possível estruturar a planilha importada." }, { status: 422 });
}
return NextResponse.json(parsed.data);
```

### WR-02: Bug de precedência de operador na derivação do título

**File:** `apps/web/src/app/api/workspace/import/route.ts:184-185`
**Issue:** `const title = cleanFileName.charAt(0).toUpperCase() + cleanFileName.slice(1) || "Planilha Importada";`. Por precedência, `+` liga antes de `||`, então a expressão é `upperFirst + (slice(1) || "Planilha Importada")`. O fallback só dispara para o pedaço `slice(1)`, nunca para o título inteiro. Se `cleanFileName` for vazio (ex.: nome de arquivo só com extensão, ou só com `_`/`-`), o resultado é `"" + ""` = `""` — um título vazio, não o fallback pretendido. Um título vazio quebra o `<h2>` e o `aria-label` da tabela.
**Fix:**
```ts
const base = cleanFileName.charAt(0).toUpperCase() + cleanFileName.slice(1);
const title = base.trim() || "Planilha Importada";
```

### WR-03: `historyReducer` sem `default` retorna `undefined` para ação desconhecida

**File:** `apps/web/src/components/app/workspace-state-context.tsx:28-88` e `apps/web/src/features/unified-chat/components/table-grid-panel.tsx:30-53`
**Issue:** Ambos os `switch` cobrem os tipos de ação conhecidos mas não têm `case default` nem `return state` final. Para o conjunto de ações atual o TS garante exaustividade, mas qualquer ação futura/serializada inesperada faz o reducer retornar `undefined`, transformando o `HistoryState` em `undefined` e derrubando o provider inteiro no próximo acesso a `history.present`. É uma armadilha de manutenção sem rede de segurança.
**Fix:** Adicionar guarda exaustiva:
```ts
default: {
  const _exhaustive: never = action;
  return state;
}
```

### WR-04: `RESET_TO_SEED` não normaliza as `rows` ao formato de `key`

**File:** `apps/web/src/components/app/workspace-state-context.tsx:71-86`
**Issue:** Em `RESET_TO_SEED`, as `columns` recebem uma `key` derivada (`c.key ?? slug(name)`), mas as `rows` são usadas como vêm (`action.seed.rows ?? []`). Se um payload (ex.: vindo de `setSpec` após import, ou de uma seed sem `key` explícita) tiver as rows chaveadas pelo *name* da coluna enquanto a coluna derivou uma `key` diferente, o grid renderiza células vazias — descompasso silencioso entre `column.key` e as chaves presentes em cada row. A rota de import felizmente alinha key↔row, mas o reducer não impõe isso e aceita qualquer `TableSpecPayload`.
**Fix:** Re-mapear as rows pelas keys das colunas resolvidas, ou validar/normalizar a correspondência key→row dentro de `RESET_TO_SEED` antes de aceitar o estado.

### WR-05: Resposta `ok` com corpo não-JSON quebra o fluxo de sucesso sem feedback

**File:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx:519-520`
**Issue:** No caminho de sucesso, `const payload = (await response.json()) as TableSpecPayload;` não está protegido por try/catch. Se o servidor retornar `200` com corpo vazio ou não-JSON (ex.: proxy/erro de infra que ainda devolve 200), `response.json()` lança, o erro cai no `catch` externo e mostra a mensagem genérica de conexão — confuso, pois a rede funcionou. Além disso, `payload` não é validado: um 200 com JSON arbitrário é repassado direto para `context?.setSpec`, podendo injetar um estado inválido na grade.
**Fix:** Validar o payload (idealmente com `tableSpecPayloadSchema.safeParse`) e tratar JSON inválido:
```ts
let payload: unknown;
try { payload = await response.json(); }
catch { setImportError("Resposta inválida do servidor."); return; }
const parsed = tableSpecPayloadSchema.safeParse(payload);
if (!parsed.success) { setImportError("Planilha importada em formato inválido."); return; }
context?.setSpec(parsed.data);
```

### WR-06: Heurística de tipo `date` por `Date.parse` é não-determinística e gera falsos positivos

**File:** `apps/web/src/app/api/workspace/import/route.ts:38-45`
**Issue:** A segunda checagem de data infere `date` quando todos os valores têm `length > 5` e `!isNaN(Date.parse(s))`. `Date.parse` em strings não-ISO é dependente de implementação/locale e é notoriamente permissivo: aceita coisas como `"Aluguel 2024"`, `"Quarto 101 - Bloco B"` ou nomes que contenham um número de ano, classificando colunas de texto como `date`. Isso corrompe a formatação subsequente (`formatCellValue` tenta formatar como data BR). A primeira checagem (números) já roda antes, mas a de data textual é frágil demais para dados de usuário arbitrários.
**Fix:** Restringir a detecção de data a formatos explícitos (regex ISO `YYYY-MM-DD` e BR `DD/MM/YYYY`) em vez de delegar a `Date.parse` genérico.

### WR-07: `removeColumn` pode deixar o grid sem colunas, violando o invariante `min(1)`

**File:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx:271-285`
**Issue:** `removeColumn` não tem guarda de mínimo — é possível remover todas as colunas, chegando a `columns: []`. Isso contradiz o invariante `columns.min(1)` do schema e produz um grid degenerado (sem dados endereçáveis, export quebrado). `addColumn`/`addRow` têm guardas de máximo (26/200) mas não há piso simétrico para remoção.
**Fix:** Bloquear a remoção da última coluna:
```ts
const removeColumn = useCallback((key: string) => {
  if (currentColumns.length <= 1) return;
  // ...
}, [currentColumns, ...]);
```
E desabilitar/ocultar o botão "Remover" quando `currentColumns.length <= 1`.

## Info

### IN-01: `detectDelimiter` é recomputado decodificando o buffer inteiro de novo

**File:** `apps/web/src/app/api/workspace/import/route.ts:193`
**Issue:** Para construir o `separator` do payload, o código faz `detectDelimiter(new TextDecoder("utf-8").decode(buffer))` — re-decodifica o buffer completo e re-detecta o delimitador, mesmo no caminho CSV onde `delimiter` já foi calculado na linha 110. Para XLSX o `separator` é fixado em `";"`. É trabalho redundante e propenso a divergir do valor usado no parse.
**Fix:** Reusar a variável `delimiter` já calculada no ramo CSV e fixar `";"` no ramo XLSX, sem re-decodificar.

### IN-02: `localHistoryState`/`localDispatch` permanecem alocados mesmo no modo conectado

**File:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx:140-147`
**Issue:** O `useReducer` de histórico local sempre é instanciado, mesmo quando `propSpec` é ausente (modo conectado ao contexto), onde ele nunca é usado para `present`. É estado morto que confunde a leitura e mantém uma cópia inicial das rows. Não é bug, mas acopla os dois modos no mesmo componente (ver CR-01; o split resolveria isso também).
**Fix:** Ao dividir o componente por modo (CR-01), o histórico local fica apenas no subcomponente standalone.

### IN-03: `as TableSpecPayload` mascara a ausência de validação no cliente

**File:** `apps/web/src/features/unified-chat/components/table-grid-panel.tsx:519`
**Issue:** O `as TableSpecPayload` é uma asserção de tipo que silencia o TS sem nenhuma garantia em runtime, reforçando o risco descrito em WR-05. Asserções `as` em fronteiras de I/O escondem exatamente os bugs que a revisão deve pegar.
**Fix:** Substituir por validação (`safeParse`) conforme WR-05.

### IN-04: Teste DATA-04 usa `.pdf` mas o mock força a resposta de erro — não exercita a detecção real

**File:** `apps/web/tests/table-grid-panel.test.tsx:434-471`
**Issue:** O teste "importação com erro" stubba `fetch` para sempre retornar 422 com a mensagem fixa, e envia um arquivo `arquivo.pdf` com `new File(["conteúdo"])`. Como o fetch é mockado, a rota real (magic bytes, rejeição de PDF) nunca roda — o teste valida apenas o tratamento do banner no cliente, não a rejeição de formato. O nome do arquivo (`.pdf`) sugere cobertura que não existe. É um teste válido para o banner, mas o título/fixture induz a crer que cobre a validação server-side.
**Fix:** Renomear o caso para deixar claro que cobre só o caminho de erro do cliente, e adicionar um teste de integração separado contra a rota real para a rejeição por magic bytes.

---

_Revisado: 2026-06-14_
_Revisor: Claude (gsd-code-reviewer)_
_Profundidade: standard_

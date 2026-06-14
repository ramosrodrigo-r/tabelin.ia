---
phase: 20-protocolo-de-muta-o-chat-grade-q-a
reviewed: 2026-06-14T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - apps/web/src/app/api/chat/unified/route.ts
  - apps/web/src/server/ai/unified-provider.ts
  - apps/web/src/server/ai/formula-translator.ts
  - apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts
  - apps/web/src/features/unified-chat/unified-chat-tool.tsx
  - apps/web/tests/formula-translator.test.ts
  - apps/web/tests/unified-route.test.ts
  - apps/web/tests/unified-chat-tool.test.tsx
findings:
  critical: 1
  warning: 6
  info: 4
  total: 11
status: issues_found
---

# Phase 20: Relatório de Revisão de Código

**Revisado:** 2026-06-14
**Profundidade:** standard
**Arquivos revisados:** 8
**Status:** issues_found

## Resumo

Revisão adversarial do protocolo de mutação chat→grade e Q&A do chat unificado.
Foco especial: segurança de strings não traduzidas no tradutor de fórmulas, caminho
fixture keyless vs. OpenAI real, tratamento de erro no streaming NDJSON e o efeito
React que aplica mutações `table_spec` via `setSpec`.

O efeito de mutação (dedupe via `appliedResultRef`) e o guard de status estão
corretos — não há loop de re-render infinito, e o undo-history fica íntegro
(`RESET_TO_SEED` empurra o estado anterior para `past`). O streaming NDJSON
particiona linhas corretamente e trata corrupção. Porém o tradutor de fórmulas
tem uma falha real de preservação de strings (aspas escapadas) que quebra a
garantia central do módulo, além de vários defeitos de robustez no provedor
fixture e na rota.

## Critical Issues

### CR-01: Tradutor de fórmulas não trata aspas escapadas — separadores dentro de strings são corrompidos

**File:** `apps/web/src/server/ai/formula-translator.ts:61-67, 73-99`
**Issue:** Tanto `isInsideString` quanto `swapSeparators` rastreiam o estado
"dentro de string" alternando um booleano a cada caractere `"`. Nenhum dos dois
reconhece aspas escapadas. Em fórmulas de planilha, aspas literais dentro de uma
string são escritas como `""` (duplicação no estilo Excel) e, dependendo da origem
do modelo, podem aparecer como `\"`. Em ambos os casos o contador de aspas fica
dessincronizado e a troca de separador passa a operar **dentro** do que deveria ser
texto literal — exatamente a garantia que o cabeçalho do módulo promete preservar
("vírgulas/ponto-e-vírgulas dentro de literais de string ... são preservados").

Exemplo concreto (escape estilo Excel `""`):

```
Entrada EN:  =IF(A1="say ""hi, there""", 1, 0)
```

A primeira aspa abre string, a segunda fecha, o par `""` interno é lido como
fechar+abrir, e a contagem termina invertida. A vírgula em `hi, there` é tratada
como fora de string e, se `depth > 0`, é convertida em `;`, corrompendo o dado
literal do usuário. O mesmo vale para `\"`.

Isso é uma corrupção silenciosa de dados que chega à grade viva (a fórmula traduzida
é aplicada via `setSpec`), portanto classificada como BLOCKER.

**Fix:** Tratar aspas escapadas no varredor de caracteres. Para o dialeto Excel
(`""`), olhar o próximo caractere ao encontrar `"` dentro de string; se for outro
`"`, consumir os dois como literal sem alternar o estado:

```ts
function swapSeparators(formula: string, from: string, to: string): string {
  let result = "";
  let inString = false;
  let depth = 0;

  for (let i = 0; i < formula.length; i += 1) {
    const char = formula[i];

    if (char === '"') {
      if (inString && formula[i + 1] === '"') {
        // aspa escapada no estilo Excel ("") — literal, não alterna estado
        result += '""';
        i += 1;
        continue;
      }
      inString = !inString;
      result += char;
      continue;
    }

    if (!inString) {
      if (char === "(") depth += 1;
      else if (char === ")") depth = Math.max(0, depth - 1);
      if (char === from && depth > 0) {
        result += to;
        continue;
      }
    }
    result += char;
  }
  return result;
}
```

`isInsideString` precisa do mesmo tratamento de `""`. Adicionar um caso de teste
em `formula-translator.test.ts` com aspas escapadas para travar a regressão.

## Warnings

### WR-01: `fixtureMutation` perde colunas numéricas sem `key` e usa índice do array filtrado

**File:** `apps/web/src/server/ai/unified-provider.ts:114-124`
**Issue:** O `.map((c, index) => ...)` recebe o índice **dentro do array já filtrado**,
não a posição original da coluna no spec. O fallback `c.key ?? col${index}` produz
uma chave (`col0`, `col1`, ...) que não existe em `base.columns` (cujas chaves são
`c.key ?? c.name`), então `columnRef` retorna `null` e o `.filter(entry => entry.ref !== null)`
seguinte **descarta** silenciosamente essa coluna do somatório. Resultado: colunas
numéricas sem `key` explícita nunca entram na fórmula `=SUM(...)`, gerando um total
incorreto sem aviso.

**Fix:** Usar a chave real da coluna e não inventar um fallback que `columnRef` não
consegue resolver. Como `columnRef` já aceita `c.key ?? c.name`, basta passar isso:

```ts
const numericKeys = base.columns
  .filter((c) => c.type === "number" || c.type === "currency")
  .map((c) => ({ column: c, ref: columnRef(base, c.key ?? c.name) }))
  .filter((entry) => entry.ref !== null);
```

### WR-02: `columnRef` quebra para a 27ª+ coluna (`String.fromCharCode` estoura `Z`)

**File:** `apps/web/src/server/ai/unified-provider.ts:142-147`
**Issue:** `String.fromCharCode("A".charCodeAt(0) + index)` só gera letras válidas
para `index` 0–25. O schema permite até 26 colunas (`columns.max(26)`), e como a
fixture **adiciona** a coluna "Total IA", o `base` pode legitimamente ter 26 colunas
numéricas; nesse caso, com index 25 ainda funciona, mas qualquer coluna numérica na
posição original ≥ 26 (possível após a mutação ou em specs futuros) produz caracteres
como `[`, `\`, `]` — referências de fórmula inválidas. O cálculo de referência também
ignora que a coluna pode ter sido reordenada.

**Fix:** Implementar conversão real para notação de coluna estilo Excel (AA, AB, ...)
ou validar `index < 26` e cair no caminho de echo quando exceder:

```ts
function columnLetter(index: number): string {
  let n = index;
  let letter = "";
  do {
    letter = String.fromCharCode("A".charCodeAt(0) + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letter;
}
```

### WR-03: `fixtureMutation` propaga `rowCount` desatualizado quando o spec é mutado

**File:** `apps/web/src/server/ai/unified-provider.ts:133-138`
**Issue:** Ao adicionar a coluna "Total IA", o spread `{ ...base, columns: [...] }`
mantém `base.rowCount` intacto — o que é correto para contagem de linhas — mas a
fórmula `=SUM(A{row}, B{row})` referencia `{row}`, um placeholder que **não é
resolvido** pela fixture. A fixture devolve a fórmula com `{row}` literal. Se a grade
viva (`seedToGridState` / motor de fórmulas) não substituir `{row}` pelo número da
linha real, a célula "Total IA" exibe `#NAME?`/`#REF?`. A garantia de uma fixture
"determinística e coerente" não inclui resolver o template, e nenhum teste verifica
que a fórmula é *avaliável* — só que contém `SOMA(` e `;`.

**Fix:** Confirmar que o consumidor da grade resolve `{row}`. Se não resolver,
gerar referências por linha ou documentar explicitamente o contrato `{row}` e
adicionar um teste que avalia a fórmula resultante numa linha concreta.

### WR-04: Erro de stream após `complete` é silenciosamente engolido pelo cliente

**File:** `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts:168-180`
**Issue:** No handler de linha, `complete` define `status = "complete"` e um `error`
posterior define `status = "error"`. Como a ordem dos eventos é controlada pelo
servidor e ambos são processados sequencialmente, um servidor que emita `complete`
seguido de `error` (ou vice-versa) deixa a UI num estado final dependente da ordem,
sem que o `result` já aplicado à grade via `setSpec` seja revertido. Pior: o
`createEventStream` no servidor enfileira o evento `error` **e** chama `controller.close()`,
mas os eventos `complete` já podem ter sido coletados em `result.events` antes de uma
falha de persistência — o cliente nunca recebe sinal de que a mutação aplicada pode
ser inconsistente com o que foi (ou não) salvo.

**Fix:** Tornar os estados terminais mutuamente exclusivos: assim que `status` for
`error`, ignorar `complete`; assim que for `complete`, ignorar `error`. E reverter/
não aplicar `setSpec` quando um `error` chegar após o `complete`.

### WR-05: Persistência ocorre antes de o stream ser entregue — `complete` aplicado na grade mesmo se a resposta nunca chegar ao cliente

**File:** `apps/web/src/app/api/chat/unified/route.ts:334-351`
**Issue:** `buildBinaryResult` coleta **todos** os eventos (incluindo `complete` com
o `table_spec`) e `saveConversationExchange` persiste **antes** de `responseFromStream`
ser construído. Como os eventos já estão materializados em memória, `createEventStream`
nunca lança — o `catch` de erro de stream (linha 174-182) é, na prática, código morto
para o caminho atual (a geração já terminou). Isso significa que a mensagem de erro de
streaming "Falha ao gerar a resposta." nunca é emitida para falhas reais de geração;
qualquer falha em `generateMutation`/`generateQaDeltas` cai no `catch` externo (linha
352) e retorna 502 JSON — mas o cliente em `submit` trata 502 como erro genérico, o que
é aceitável. O defeito é a divergência entre a arquitetura aparente (streaming
incremental) e o comportamento real (buffer completo + stream sintético), tornando o
tratamento de erro do `ReadableStream` enganoso e não testável.

**Fix:** Ou transmitir de verdade (gerar deltas dentro do `ReadableStream` e persistir
ao final do start), ou remover o `try/catch` de `createEventStream` e documentar que a
fonte é sempre um array pré-computado. Manter ambos induz a crer numa robustez que não
existe.

### WR-06: `EN_TO_PT_BR` colide funções pt-BR distintas que compartilham o mesmo EN — round-trip não é garantido

**File:** `apps/web/src/server/ai/formula-translator.ts:22-32`
**Issue:** O comentário admite que `CONT_SE`, `CONTSE` e `CONT.SE` mapeiam para
`COUNTIF`, e "a primeira ocorrência vence". A forma canônica escolhida é `CONT.SE`
(primeira chave no objeto). Mas `translateEnToPtBr` então emite `CONT.SE`, e
`translatePtBrToEn` aceita `CONT.SE` de volta — ok para esse caso. O risco real:
o teste de round-trip (`formula-translator.test.ts:56-59`) só cobre `IF/SUM`, que
não têm aliases. Funções com aliases **não são round-trippable** se o usuário digitar
a forma não-canônica (`CONTSE`), pois `translateEnToPtBr` jamais devolve `CONTSE`.
Não é um bug de tradução, mas a ausência de teste mascara que a "round-trip"
anunciada é parcial.

**Fix:** Adicionar um teste de round-trip cobrindo uma função com alias e documentar
explicitamente que a normalização colapsa aliases para a forma canônica (comportamento
intencional, não reversível bit-a-bit).

## Info

### IN-01: `console.error` com objeto `{ err }` pode vazar contexto sensível em logs

**File:** `apps/web/src/app/api/chat/unified/route.ts:180, 353`
**Issue:** `console.error("unified chat failed", { err })` registra o erro bruto. Se
o erro vier do cliente OpenAI, pode conter trechos do prompt/planilha do usuário ou
fragmentos de configuração. Não há vazamento de chave (a chave nunca é logada), mas
convém serializar apenas `err.message`/`err.name` em produção.
**Fix:** Logar `{ message: err instanceof Error ? err.message : String(err) }`.

### IN-02: `metadata` tipado como `unknown` propaga `any` implícito para a UI

**File:** `apps/web/src/features/unified-chat/hooks/use-unified-chat-stream.ts:34, 155-157`
**Issue:** `metadata` é `unknown | null` e gravado direto do evento sem narrowing.
A UI consome `stream.metadata` sem validação. Não é bug, mas perde a tipagem que o
schema já garante.
**Fix:** Tipar `metadata` com o shape conhecido (`{ mode: string; providerModel: string }`)
ou validar na borda.

### IN-03: Mensagem `UNKNOWN_MESSAGE` usada como fallback de Q&A vazio nunca é exercitada por teste

**File:** `apps/web/src/app/api/chat/unified/route.ts:208-209, 246`
**Issue:** `aggregated.trim() || UNKNOWN_MESSAGE` cobre o caso de o provedor não
emitir nenhum delta, mas nenhum teste cobre esse caminho. Dado que a fixture sempre
emite conteúdo e o stream real raramente é vazio, é um caminho não verificado.
**Fix:** Adicionar teste com `generateQaDeltas` retornando zero deltas.

### IN-04: `serializeSpecForPrompt` injeta dados do usuário sem limite de tamanho no prompt do sistema

**File:** `apps/web/src/server/ai/unified-provider.ts:45-66`
**Issue:** As linhas do spec são serializadas via `JSON.stringify(row)` e concatenadas
sem truncamento. O spec já é limitado pelo schema (`rowCount.max(200)`, `columns.max(26)`),
então não há estouro ilimitado, mas células de texto longas podem inflar o prompt além
do esperado. Não é injeção (vai como `user` content), apenas custo/limite.
**Fix:** Truncar valores de célula muito longos ao serializar para o prompt.

---

_Revisado: 2026-06-14_
_Revisor: Claude (gsd-code-reviewer)_
_Profundidade: standard_

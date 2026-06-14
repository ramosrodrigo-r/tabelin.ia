---
phase: 21-export-persistencia-da-planilha-conversa
reviewed: 2026-06-14T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - apps/web/src/server/tools/conversation-repository.ts
  - apps/web/src/app/api/workspace/state/route.ts
  - apps/web/src/components/app/workspace-state-context.tsx
  - apps/web/src/components/app/workspace-shell.tsx
  - apps/web/src/app/(workspace)/workspace/layout.tsx
  - apps/web/src/app/(workspace)/workspace/page.tsx
  - apps/web/src/features/unified-chat/unified-chat-tool.tsx
  - apps/web/tests/workspace-state-context.test.tsx
  - apps/web/tests/workspace-state-route.test.ts
  - apps/web/tests/unified-chat-tool.test.tsx
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Phase 21: Relatório de Code Review

**Revisado:** 2026-06-14
**Profundidade:** standard
**Arquivos revisados:** 10
**Status:** issues_found

## Resumo

Esta fase adiciona a persistência server-side do spec da planilha viva (`unified_table`) e
do histórico do chat unificado, com auto-save debancado no `WorkspaceStateProvider`, uma
rota `POST /api/workspace/state` validada por schema, e helpers de repositório escopados por
`userId`.

**Avaliação geral:** A camada de AuthZ/IDOR está sólida — toda query do repositório filtra por
`userId` derivado de uma sessão HMAC-assinada, e a rota `POST` valida sessão + payload antes de
gravar. Não encontrei vazamento cross-user nem leak de erro interno na resposta.

Porém, há dois defeitos de **perda de dados** com gravidade BLOCKER: (1) o reset de "Nova conversa"
sofre uma corrida entre o `DELETE` server-side e o auto-save, que ressuscita um spec recém-apagado;
(2) `seedToGridState` descarta silenciosamente colunas com `key` duplicada/colidida ao re-hidratar
o spec persistido, corrompendo a planilha do usuário no reload. Há também concerns de coerência no
auto-save (overwrite do spec persistido com SAMPLE_SPEC) e robustez de serialização RSC.

## Issues Críticas

### CR-01: Corrida entre "Nova conversa" (DELETE) e auto-save ressuscita o spec apagado

**File:** `apps/web/src/features/unified-chat/unified-chat-tool.tsx:115` e `apps/web/src/components/app/workspace-state-context.tsx:168-188`

**Issue:** Ao clicar em "Nova conversa", dois efeitos concorrem:

1. O fluxo de delete dispara `DELETE /api/conversations/unified`, que remove a linha
   `unified_table` (o kind está em `ALL_UNIFIED_TOOL_KINDS`, ver `api/conversations/unified/route.ts:14`),
   apagando o spec persistido.
2. `handleNewConversation` chama `workspaceState.resetToSeed()`
   (`unified-chat-tool.tsx:115`), que despacha `RESET_TO_SEED` com `SAMPLE_SPEC`. Isso muda
   `present`, muda `specJson`, e o `useEffect` de auto-save
   (`workspace-state-context.tsx:168`) agenda um `POST /api/workspace/state` após 1.5s que
   **re-cria** uma linha `unified_table` contendo o `SAMPLE_SPEC`.

Resultado: o usuário pede para limpar tudo, mas o banco fica com um spec `unified_table`
(o sample) que não existia antes — o delete é desfeito pelo auto-save. Pior, se o `DELETE`
demorar mais que 1.5s, o auto-save pode rodar antes/depois do delete de forma não-determinística,
deixando o estado final indefinido. Não há coordenação (nenhum flag suprime o auto-save durante o reset).

**Fix:** Suprimir o auto-save durante o ciclo de reset, ou tratar `RESET_TO_SEED(SAMPLE_SPEC)`
como "limpar persistência" em vez de "salvar sample". Ex.: marcar `lastSavedRef` para o estado
de reset antes do dispatch, de modo que o efeito veja `specJson === lastSavedRef.current` e não
dispare POST:

```ts
const resetToSeed = useCallback(() => {
  const seedSpec = /* spec derivado de SAMPLE_SPEC, igual ao computado no render */;
  lastSavedRef.current = JSON.stringify(seedSpec); // suprime o auto-save do reset
  dispatch({ type: "RESET_TO_SEED", seed: SAMPLE_SPEC });
}, []);
```
Alternativamente, o `POST /api/workspace/state` deveria interpretar um payload igual ao
SAMPLE_SPEC como `deleteMany` (sem re-create), ou o fluxo de "Nova conversa" deveria aguardar
(`await`) o DELETE e só então resetar o grid com auto-save suprimido.

### CR-02: `seedToGridState` perde dados quando colunas colidem na mesma `key` derivada

**File:** `apps/web/src/components/app/workspace-state-context.tsx:31-51`

**Issue:** `seedToGridState` re-deriva `key` de cada coluna via
`c.name.toLowerCase().replace(/\s+/g, "_")` quando `key` está ausente, e usa essa key como
chave do objeto `RowData`. Se duas colunas colidirem na mesma key derivada (ex.: nomes
`"Valor R$"` e `"Valor (R$)"` → ambos contêm caracteres não-alfanuméricos que `\s+` não
normaliza, ou simplesmente duas colunas chamadas `"Total"`), o `newRow[resolvedKey] = ...`
sobrescreve a coluna anterior e os dados de uma coluna inteira são perdidos silenciosamente
no reload. Como esse spec vem de payload gerado por LLM e persistido, nomes duplicados/colididos
são plausíveis. O schema (`tableSpecPayloadSchema`) **não** exige `key` única nem `name` único,
então o spec persistido pode legalmente ter colisões.

Além disso, a normalização de key é frágil: `replace(/\s+/g, "_")` só troca espaços; pontuação,
acentos e parênteses permanecem, então a key derivada pode diferir entre `seedToGridState` (que
usa essa key como índice de `newRow`) e qualquer lookup posterior por `c.name`. O lookup em
`workspace-state-context.tsx:40` (`r[c.key ?? ""] ?? r[c.name] ?? r[resolvedKey]`) mascara
parte do problema na leitura, mas a **escrita** em `newRow[resolvedKey]` ainda colide.

**Fix:** Garantir keys únicas ao derivar (sufixar índice em colisão) e validar unicidade no
schema ao persistir:

```ts
const seen = new Set<string>();
const columns = seed.columns.map((c, i) => {
  let key = c.key ?? c.name.toLowerCase().replace(/\s+/g, "_");
  while (seen.has(key)) key = `${key}_${i}`;
  seen.add(key);
  return { ...c, key };
});
```

## Warnings

### WR-01: Auto-save sobrescreve o spec persistido com SAMPLE_SPEC em qualquer reset não relacionado

**File:** `apps/web/src/components/app/workspace-state-context.tsx:148,168-188`

**Issue:** Independente da corrida do CR-01, qualquer `resetToSeed()` (também chamado por
`table-grid-panel.tsx:488`) muda o grid para o SAMPLE_SPEC e o auto-save persiste esse sample
como o "spec ativo" do usuário. Se o usuário tinha uma planilha real salva e qualquer fluxo
dispara `resetToSeed`, a planilha persistida é trocada pela amostra estática sem confirmação.
Isso degrada o invariante "uma planilha ativa por usuário" para "sample sobrescreve trabalho real".

**Fix:** Decidir explicitamente a semântica de reset vs. persistência. Provavelmente o reset
deveria limpar a persistência (delete) e não gravar o sample como conteúdo do usuário. Ver CR-01.

### WR-02: Dedupe do auto-save é frágil porque `spec` é recriado a cada render e depende de ordem de chaves

**File:** `apps/web/src/components/app/workspace-state-context.tsx:150-166`

**Issue:** O objeto `spec` é reconstruído literalmente em todo render e serializado via
`JSON.stringify(spec)` para `specJson` e `lastSavedRef`. A dedupe por igualdade de string
funciona apenas porque a ordem de chaves é estável aqui, mas é frágil: `columns`/`rows` são
referências ao `history.present`, e qualquer mudança de ordem de propriedades ou de formato
numérico (ex.: `-0`, floats) em alguma mutação pode produzir strings diferentes para estados
semanticamente iguais, disparando POSTs redundantes (save storm leve). Não é um loop infinito
— o `useEffect` depende só de `specJson` e o efeito não muda `specJson` — mas o dedupe por
string não é uma garantia robusta de "estado mudou de verdade".

**Fix:** Aceitável para v1, mas documentar que a estabilidade depende da ordem de chaves do
literal `spec`. Considerar um hash estável (chaves ordenadas) ou comparar por versão/contador
de mutação do reducer em vez de string do payload inteiro.

### WR-03: `saveActiveSpreadsheetSpec` engole o erro e a rota nunca retorna 500

**File:** `apps/web/src/server/tools/conversation-repository.ts:160-188` e `apps/web/src/app/api/workspace/state/route.ts:32-38`

**Issue:** `saveActiveSpreadsheetSpec` envolve toda a transação num `try/catch` que apenas
`console.warn` e retorna `void` (linha 185-187). A rota `POST` tem um `try/catch` esperando que
`saveActiveSpreadsheetSpec` lance para retornar 500 (route.ts:35), mas como o helper **nunca
lança**, a rota sempre retorna `200 { ok: true }` mesmo quando a gravação falhou. O cliente
então atualiza `lastSavedRef` (workspace-state-context.tsx:178-179) e nunca reagenda — a
mudança do usuário é perdida silenciosamente, sem feedback. O teste `route.test.ts:79` que
verifica 500 só passa porque mocka `saveActiveSpreadsheetSpec` para rejeitar, o que não
reflete o comportamento real do helper.

Note ainda que a transação faz `deleteMany` antes do `create`: se o `create` falhar dentro da
transação Serializable, o rollback preserva o spec anterior (bom — sem perda do spec prévio).
Mas o caller não fica sabendo da falha.

**Fix:** Ou propagar o erro do helper (remover o catch, deixando a rota mapear para 500), ou
fazer o helper retornar um booleano de sucesso que a rota usa para decidir o status:

```ts
export async function saveActiveSpreadsheetSpec(userId, spec): Promise<boolean> {
  try { await prisma.$transaction(/* ... */); return true; }
  catch (err) { console.warn(/* ... */); return false; }
}
// na rota:
const ok = await saveActiveSpreadsheetSpec(user.id, parsed.data);
return NextResponse.json(ok ? { ok: true } : { error: "Erro interno." }, { status: ok ? 200 : 500 });
```

### WR-04: `guardPayloadSize` retorna placeholder sem rejeitar — spec truncado é persistido como "ativo"

**File:** `apps/web/src/server/tools/conversation-repository.ts:39-57,178`

**Issue:** Em `saveActiveSpreadsheetSpec`, quando o spec excede 32 KB, `guardPayloadSize`
retorna `{ kind: <kind>, truncated: true }` em vez do payload real (linha 52-55). Esse
placeholder é persistido como o spec `unified_table` ativo. No próximo reload,
`getActiveSpreadsheetSpec` roda `tableSpecPayloadSchema.safeParse` sobre o placeholder, que
falha (`columns`/`rowCount` ausentes), retorna `null`, e o usuário cai no SAMPLE_SPEC —
**perdendo a planilha grande inteira** silenciosamente. Para o histórico de chat
(`saveConversationExchange`) truncar é tolerável, mas para o spec ativo isso é perda de dados
do trabalho do usuário sem aviso. O payload limite (200 rows × 26 cols) pode legitimamente
exceder 32 KB com conteúdo pt-BR.

**Fix:** Para o spec ativo, ou aumentar o teto para acomodar o máximo permitido pelo schema
(200×26), ou rejeitar a gravação com erro explícito (4xx/feedback ao usuário) em vez de
persistir um placeholder que será descartado no read. Não silenciar a perda.

### WR-05: `UnifiedChatTool` confia cegamente em `assistantPayload` persistido como `UnifiedCompletePayload`

**File:** `apps/web/src/features/unified-chat/unified-chat-tool.tsx:79-95`

**Issue:** Ao hidratar `initialExchanges`, o código faz
`const payload = exchange.assistantPayload as UnifiedCompletePayload` (linha 80) sem validar
com `unifiedCompletePayloadSchema`. `assistantPayload` é uma coluna `Json` arbitrária vinda do
banco; com schema drift, escrita parcial, ou um payload `truncated` (ver WR-04), esse cast
mente para o `RenderDispatcher`, que pode renderizar lixo ou quebrar. `intentFromPayload`
(linha 52-64) já trata payload não-objeto, mas o resto do código trata `payload` como um
`UnifiedCompletePayload` válido. Diferente de `getActiveSpreadsheetSpec` (que faz fail-closed
via `safeParse`), aqui não há validação no boundary.

**Fix:** Validar cada payload persistido com `unifiedCompletePayloadSchema.safeParse` na
hidratação e descartar (ou marcar como erro) as trocas inválidas, alinhando com a postura
fail-closed do repositório:

```ts
const result = unifiedCompletePayloadSchema.safeParse(exchange.assistantPayload);
const payload = result.success ? result.data : null;
```

## Info

### IN-01: Serialização RSC do `createdAt` (Date) atravessa o boundary mas nunca é usada

**File:** `apps/web/src/app/(workspace)/workspace/page.tsx:26` e `apps/web/src/features/unified-chat/unified-chat-tool.tsx:38-46`

**Issue:** `page.tsx` mapeia `createdAt: exchange.createdAt` (um `Date` do Prisma) para o prop
client. O Next.js serializa `Date` no boundary RSC (vira string ISO no cliente), então o tipo
`PersistedExchange.createdAt: Date` (unified-chat-tool.tsx:45) está tecnicamente incorreto — em
runtime chega uma string, não um `Date`. Isso não causa bug porque o campo `createdAt` **nunca
é lido** no `UnifiedChatTool` (não aparece no `setExchanges` inicial). É campo morto que apenas
cruza o boundary à toa. `assistantPayload` (Json plain object) serializa sem problema.

**Fix:** Ou remover `createdAt` do mapeamento (não é usado), ou tipá-lo como `string` e
serializar explicitamente (`createdAt: exchange.createdAt.toISOString()`) se for usado no futuro.

### IN-02: `READ_LIMIT` (10) e o prune-50 do write-path são magic numbers desacoplados

**File:** `apps/web/src/server/tools/conversation-repository.ts:37,76,80`

**Issue:** O write-path mantém até 50 linhas (`count >= 50`, `take: count - 49`) enquanto o
read-path lê só 10 (`READ_LIMIT`). Os números `50`, `49` e `10` são literais sem constante
nomeada compartilhada; a relação entre eles (manter 50, ler 10) é só documentada em comentário.
Mudar um sem o outro é fácil de errar.

**Fix:** Extrair `MAX_HISTORY_ROWS = 50` e usar `MAX_HISTORY_ROWS - 1` no `take`, deixando a
relação explícita no código e não só no comentário.

### IN-03: `getActiveSpreadsheetSpec` usa `findFirst` desc em vez de garantir 1 linha

**File:** `apps/web/src/server/tools/conversation-repository.ts:141-144`

**Issue:** O invariante declarado é "exatamente uma linha `unified_table` por usuário"
(garantido pelo delete+create em `saveActiveSpreadsheetSpec`). Mas `getActiveSpreadsheetSpec`
usa `findFirst` com `orderBy: createdAt desc`, defensivamente assumindo que pode haver mais de
uma. Se o invariante quebrar (ex.: dois auto-saves concorrentes de abas diferentes do mesmo
usuário inserindo antes do delete do outro vencer), linhas órfãs `unified_table` ficam no banco
sem serem limpas e consomem espaço. Não é incorreto (lê a mais recente), mas a ausência de uma
unique constraint em `(userId, toolKind=unified_table)` no schema deixa o invariante apenas
"best-effort".

**Fix:** Considerar uma unique constraint parcial no Prisma para `unified_table` por `userId`,
ou um `deleteMany` periódico. Para v1, documentar que linhas órfãs são possíveis sob
concorrência de múltiplas abas.

---

_Revisado: 2026-06-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Profundidade: standard_

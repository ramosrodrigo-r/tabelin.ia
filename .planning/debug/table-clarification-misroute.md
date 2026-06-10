---
status: resolved
trigger: "Tabela Viva nunca renderiza o grid: ao responder a clarificação de tabela no chat unificado, a resposta é re-classificada como prompt novo e cai em Fórmula/Template em vez de gerar table_spec. Botão 'Gerar mesmo assim' (overrideGenerate) não dispara nada. Descoberto no UAT da Phase 15 (Test 3, blocker). Atribuição: Phase 12 (classificador/rota unificada) + Phase 13 (loop de clarificação)."
created: 2026-06-10T00:00:00Z
updated: 2026-06-10T00:00:00Z
---

## Current Focus

hypothesis: A rota /api/chat/unified (route.ts:609 `case "unified_table"`) roteia por `classification` — o resultado do classificador de intent sobre o TEXTO ATUAL (a resposta da clarificação). Como a resposta ("10, texto") não parece tabela, o classificador a manda para `formula`/`template`, perdendo o fato de haver uma clarificação unified_table em progresso. O fluxo de tabela só é re-entrado se a NOVA mensagem também classificar como unified_table, o que raramente acontece com respostas curtas de clarificação.
test: Reproduzir em /workspace: "tabela" → responder Q1/Q2 → observar payload kind retornado (esperado table_clar_question→table_spec; observado formula/template). Inspecionar como a rota decide o case ANTES de checar histórico de clarificação unified_table pendente.
expecting: Confirmar que não há, antes do switch por classification, um curto-circuito que detecte "há clarificação unified_table aberta (clarTurnCount < MAX e sem spec final) → forçar case unified_table".
next_action: gather initial evidence — ler route.ts (classificação → switch → case unified_table, clarTurnCount, mergeSpecFromHistory, shouldGenerate, overrideGenerate) e o cliente unified-chat-tool.tsx (handleAnswerClarification / handleSkipClarification / lastSubmitInputRef).

## Symptoms

expected: Pedir uma tabela e responder as perguntas de clarificação gera um table_spec que renderiza o TableGridPanel (grid editável com Adicionar linha / Adicionar coluna / Exportar CSV / Exportar XLSX). "Gerar mesmo assim" pula a clarificação e gera a tabela direto.
actual: Ao responder a clarificação, retorna "Fórmula · detectado" (ex.: =TEXTO(A1;"0") & ", " & B1) ou um texto/template (POST /api/tools/template/generate). O grid nunca renderiza. "Gerar mesmo assim" é clicável mas não dispara nada (nenhuma requisição/efeito).
errors: none (sem crash — saída errada / no-op)
reproduction: 1) /workspace 2) digitar "tabela" 3) responder a pergunta de clarificação (ex.: "10, texto") 4) observar que vem fórmula/template, não grid. Alternativa: clicar "Gerar mesmo assim" → nada acontece.
started: Não é regressão da Phase 15. O loop de clarificação foi conectado no commit e5cbbd1 (Phase 13-04). A Phase 15 (15-03) só removeu ToolNav de unified-chat-tool.tsx (diff confirmado).

## Evidence

- timestamp: 2026-06-10
  checked: apps/web/src/app/api/chat/unified/route.ts:609-644 (case "unified_table")
  found: O switch é feito sobre `classification` (resultado do classificador sobre o prompt atual). Dentro do case unified_table há MAX_CLAR_TURNS=2, conservativeClarTurnCount, mergeSpecFromHistory, e shouldGenerate = clarTurnCount>=MAX || overrideGenerate==="true". Mas o case só é ALCANÇADO se classification == unified_table para a mensagem atual.
  implication: Quando a resposta da clarificação ("10, texto") classifica como formula/template, o case unified_table nunca é re-entrado → o fluxo de tabela é abandonado. Falta um curto-circuito que force unified_table quando há clarificação aberta no histórico.

- timestamp: 2026-06-10
  checked: apps/web/src/features/unified-chat/unified-chat-tool.tsx:269-297
  found: handleAnswerClarification chama submitPrompt(answer, ...) — reenvia a resposta como PROMPT NOVO (sujeito a re-classificação). handleSkipClarification chama stream.submit({ ...last, overrideGenerate: true }) usando lastSubmitInputRef.current.
  implication: (a) a resposta de clarificação não carrega um sinal forte de "continue a tabela"; (b) "Gerar mesmo assim" no-op sugere que lastSubmitInputRef.current está null no momento do clique OU o stream ignora submit enquanto o card de clarificação está montado — investigar.

- timestamp: 2026-06-10
  checked: lint (eslint --max-warnings=0)
  found: route.ts reporta `tableStubPayloadSchema` (linha 18) e `tableStubMessage` (linha 246) como never used.
  implication: O caminho de table_stub pode estar morto/desconectado — possível pista de que a montagem do fluxo de tabela (stub → clar → spec) ficou parcialmente desligada.


- timestamp: 2026-06-10
  checked: apps/web/src/app/api/chat/unified/route.ts:389-444 (classifyIntent -> resolvedToolKind -> switch) + hooks/use-unified-chat-stream.ts:100-115 (plumbing de overrideGenerate/specOverride)
  found: resolvedToolKind = INTENT_TO_TOOL_KIND[classification.intent] (linha 395) e derivado EXCLUSIVAMENTE do classificador sobre o texto atual. O switch (linha 444) nao tem curto-circuito para clarificacao unified_table aberta. overrideGenerate e specOverride sao lidos SOMENTE dentro do case unified_table (linhas 615 e 655), que so e alcancado se resolvedToolKind=="unified_table". A plumbing cliente->hook->rota de overrideGenerate/specOverride esta correta (hook linhas 100-101/114-115; route 108/135). Logo o flag nao chega a ser avaliado.
  implication: Causa raiz unica para AMBOS os defeitos. (1) resposta de clarificacao reclassifica como formula/template -> case unified_table nunca re-entrado -> grid nunca renderiza. (2) "Gerar mesmo assim" (overrideGenerate) e "Confirmar spec" (specOverride) sao no-op porque so seriam lidos dentro do case que nunca e atingido. O hint lastIntent passado ao classifyIntent e fraco demais para garantir o roteamento.

## Eliminated

- hypothesis: Regressão introduzida pela Phase 15.
  evidence: git show 65a6e0b (15-03) em unified-chat-tool.tsx mostra apenas a remoção do import ToolNav e da prop bottomNav={<ToolNav />}. overrideGenerate está corretamente conectado cliente→hook→rota (use-unified-chat-stream.ts:100, route.ts:615). O loop de clarificação vem da Phase 13-04 (e5cbbd1).
  timestamp: 2026-06-10

## Resolution

root_cause: A rota /api/chat/unified decide o roteamento (resolvedToolKind) exclusivamente pelo classificador de intent sobre a mensagem ATUAL, sem checar se ha uma clarificacao unified_table aberta no historico nem se a requisicao carrega overrideGenerate/specOverride. Quando a resposta da clarificacao ("10, texto") reclassifica como formula/template, o `case "unified_table"` nunca e re-entrado: o grid nunca renderiza e os flags overrideGenerate/specOverride (lidos so dentro daquele case) viram no-op.
fix: applied
fix_applied: route.ts — (1) hoisted MAX_CLAR_TURNS para constante de modulo; (2) novo helper hasOpenTableClarification(history, MAX) que detecta clarificacao aberta a partir do banco (ultimo exchange == table_clar_question E countClarTurns < MAX) — T-13-08; (3) curto-circuito antes do switch: se resolvedToolKind != "unified_table" e !file, forca "unified_table" quando fields.overrideGenerate==="true" || fields.specOverride presente, OU quando ha clarificacao aberta no historico unified_table. O corpo do case unified_table (cota/quota, buildTableSpec, specOverride) ficou intacto.
verification: pnpm --filter web typecheck OK; pnpm exec vitest run = 361 passed + 1 skipped, unica falha e o teste flaky conhecido "corrupt NDJSON enters the error state" (passa isolado — memoria do projeto). 4 testes de regressao adicionados em tests/unified-route.test.ts (describe "regressao de misroute na clarificacao"): resposta reclassificada como formula com clar aberta -> permanece em unified_table; overrideGenerate reclassificado como template -> gera tabela (nao no-op); specOverride+overrideGenerate (handleConfirmSpec) -> usa spec do client; guarda: sem clar aberta (ultima e table_spec finalizada) -> NAO sequestra o roteamento (cai em formula). eslint route.ts: 0 erros; 2 warnings PRE-EXISTENTES (tableStubPayloadSchema/tableStubMessage, dead path fora de escopo — Evidencia #3).
cliente: nenhuma mudanca necessaria — handleAnswerClarification/handleSkipClarification/handleConfirmSpec ja postam para /api/chat/unified; o roteamento agora e resolvido no servidor a partir do historico (mais robusto que confiar no hint lastIntent).

## Specialist Review

specialist_hint: typescript / react
result: NAO_DISPONIVEL — skill typescript-expert nao instalada neste ambiente (apenas skills gsd-* presentes). Review inline equivalente realizada pelo session-manager.
notes: Direcao de fix idiomatica e de baixo risco — reaproveita findConversationExchanges/countClarTurns/mergeSpecFromHistory, deriva estado do banco (T-13-08) e nao altera o corpo do case unified_table (cota/quota intactos). Armadilha a vigiar: o override so deve disparar quando o ULTIMO exchange unified_table for table_clar_question (nao um table_spec finalizado) e turns < MAX, evitando capturar um pedido novo apos uma tabela ja gerada. Os flags overrideGenerate/specOverride so sao enviados pelos botoes do card de clarificacao, entao chavear por eles e seguro.

---
status: resolved
trigger: "Fórmulas vivas de tabelas geradas pela IA (gpt-5-mini) avaliam para #NAME? em todas as linhas. Descoberto no UAT da Phase 15 (Test 6): coluna 'Total' de uma tabela de vendas gerada ao vivo exportou #NAME? em todas as 10 linhas. Fixture (Controle de Gastos, =SOMA(C{row};-D{row})) calcula OK. Atribuição: Phase 14 (Tabela Viva / motor de fórmulas)."
created: 2026-06-10T00:00:00Z
updated: 2026-06-10T13:05:00Z
---

## Current Focus

hypothesis: CONFIRMADO — o motor (use-formula-engine.ts) só avaliava `=FUNCAO(args)` e o caso isolado `=A1`. A IA gerou EXPRESSÃO ARITMÉTICA (`=D{row}*E{row}`, produto Quantidade×Preço) que não começa com função → extractFunctionName retorna null → parseA1("D2*E2") falha → "#NOME?"/"#NAME?".
test: Reproduzido em teste de regressão (recalcAll com coluna Total="=D{row}*E{row}") — antes do fix retornaria #NAME?, agora calcula 239.7 e 245.
expecting: (cumprido) Tabela estilo-IA calcula valores reais em vez de #NAME?.
next_action: (nenhum — resolvido)

## Symptoms

expected: Coluna fórmula de uma tabela gerada pela IA calcula valores corretos no grid e no export (ex.: Total = Quantidade * Preço).
actual: Coluna 'Total' exporta/exibe `#NAME?` em todas as linhas (verificado em ~/Downloads/tabela-de-vendas---exemplo.csv, 10/10 linhas #NAME?).
errors: "#NAME?" (código de erro estilo Excel emitido pelo próprio motor — não é crash)
reproduction: 1) /workspace 2) "tabela" → responder clarificação → grid renderiza 3) observar coluna calculada = #NAME? 4) Exportar CSV → todas as linhas da coluna fórmula vêm #NAME?.
started: Phase 14 (motor de fórmulas vivas). Conhecido como risco em STATE.md ("PT_BR_TO_EN mapping ~20 funções deve ser validado empiricamente"). Exposto agora que o fluxo de tabela ao vivo finalmente renderiza.

## Evidence

- timestamp: 2026-06-10
  checked: apps/web/src/features/unified-chat/hooks/use-formula-engine.ts (evaluateFormula linhas 89, 339-358)
  found: A fórmula é tratada como chamada de função; se não mapeia para nome EN → "#NAME?"; se formulajs[enFnName] não é função → "#NAME?". Caso especial para ref isolada `=A1`. Refs por LETRA+número (parseA1).
  implication: Fórmulas que NÃO são `=FUNCAO(...)` nem `=A1` puro retornam #NAME?.

- timestamp: 2026-06-10
  checked: ~/Downloads/tabela-de-vendas---exemplo.csv (evidência ao vivo) + buildSpecSystemPrompt em table-clarifier.ts
  found: GROUND TRUTH — a tabela de vendas tem colunas ID,Nome,Data,Quantidade,Preço,Total,Status. "Total" = Quantidade × Preço = `=D{row}*E{row}` (expressão aritmética). O system prompt antigo só exemplificava forma de FUNÇÃO e nunca proibia/documentava aritmética nem fixava referência por LETRA — então o LLM emitiu produto aritmético, que o motor não parseava.
  implication: Falha modo (a) confirmado: expressão aritmética não-avaliável. Fixture funciona por usar `=SOMA(C{row};-D{row})` (forma de função).

## Eliminated

- hypothesis: Bug no export da Phase 15.
  evidence: O export exporta fielmente displayRows. #NAME? já é o valor que o motor produz ANTES do export. O defeito é a AVALIAÇÃO da fórmula, não o export.
  timestamp: 2026-06-10

## Specialist Review

- specialist_hint: typescript / react
  note: Dispatch de skill não disponível neste ambiente de sessão (sem ferramenta de invocação). Fix segue as convenções já estabelecidas no motor: funções puras module-scope e testáveis sem React; SEM uso de eval (tokenizador + shunting-yard explícito); códigos de erro estilo Excel (#NAME?, #DIV/0!, #VALUE!); recalcAll permanece imutável (nunca muta rawRows). Coberto por testes de regressão.

## Resolution

root_cause: O mini motor de fórmulas (use-formula-engine.ts) só avaliava fórmulas no formato CHAMADA DE FUNÇÃO `=FUNCAO(...)` e o caso isolado `=A1`. A IA gera naturalmente EXPRESSÕES ARITMÉTICAS (ex.: `=D{row}*E{row}` para Total = Quantidade × Preço), que caíam no ramo "sem função" e retornavam #NAME? em todas as linhas. O system prompt reforçava o problema: exemplificava apenas a forma de função e não documentava aritmética nem fixava referências por LETRA de coluna.

fix: (1) Adicionado avaliador aritmético seguro (evaluateArithmetic + isArithmeticExpression + tokenizeArithmetic, sem eval) que suporta + - * /, menos unário, parênteses, números BR, referências de célula (D2) e nomes de coluna (Quantidade); wired no caminho ao vivo evaluateFormulaCells (recalcAll) com o rowIdx atual. (2) Adicionado PRODUTO→PRODUCT em formula-locale.ts (forma de função de multiplicação). (3) Endurecido buildSpecSystemPrompt: documenta as DUAS formas (função e aritmética), exige referência por LETRA de coluna + {row} e proíbe referência por nome dentro da fórmula. (4) 7 testes de regressão em formula-engine.test.ts (repro da tabela de vendas, nome de coluna, parênteses+desconto, #DIV/0!, isArithmeticExpression, PRODUTO, não-regressão do fixture SOMA).

verification: pnpm --filter web typecheck OK; pnpm exec vitest run nas 4 suites de fórmula = 61/61 passando (28 em formula-engine.test.ts, incluindo o teste de repro que calcula 239.7 e 245 em vez de #NAME?).

files_changed:
- apps/web/src/features/unified-chat/hooks/use-formula-engine.ts (avaliador aritmético + wiring)
- packages/shared/src/table/formula-locale.ts (PRODUTO→PRODUCT)
- apps/web/src/server/ai/table-clarifier.ts (system prompt endurecido)
- apps/web/tests/formula-engine.test.ts (7 testes de regressão)

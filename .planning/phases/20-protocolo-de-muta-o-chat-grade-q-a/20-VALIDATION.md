# Phase 20: Protocolo de Mutação Chat→Grade & Q&A - Validation

Esta fase será validada utilizando testes unitários, testes de integração de rota de API, e validação E2E/componente do fluxo de chat e planilha viva.

---

## 1. Critérios de Aceitação (UAT)

| ID | Caso de Teste | Ação | Expectativa |
|----|---------------|------|-------------|
| UAT-20-01 | Pergunta Analítica (Q&A) | Enviar pergunta analítica ("qual a média da coluna Valor?") | A IA detecta intent `qa`, faz streaming da resposta em Markdown no chat lateral e NÃO altera nenhuma célula da grade da planilha viva. |
| UAT-20-02 | Operação na Planilha (Mutação) | Enviar pedido de mutação ("ordene pela coluna Valor" ou "crie uma coluna de total") | A IA detecta intent `sheet_operation` e retorna o novo `TableSpecPayload` completo, que é aplicado diretamente na grade viva (Zero-click). |
| UAT-20-03 | Desfazer Alteração da IA (Undo) | Pressionar Ctrl+Z ou usar botão de histórico logo após uma mutação da IA | A planilha viva é revertida exatamente para o estado anterior à mutação da IA, demonstrando integração perfeita com o histórico de undo/redo. |
| UAT-20-04 | Localização de Fórmulas | Pedir para a IA criar uma fórmula condicional ou matemática (ex. soma condicional) | A IA gera a fórmula em inglês (ex.: `SUMIF(..., ">10")`), e o BFF/frontend converte para o padrão pt-BR (ex.: `=SOMASE(...; ">10")`) antes de injetar na grade. |
| UAT-20-05 | Execução sem OpenAI Key (Fixture) | Rodar o sistema localmente/testes sem a variável `OPENAI_API_KEY` configurada | O chat intercepta e responde deterministicamente via fixture simulando NDJSON stream (mutação ou Q&A) sem falhar nem depender de credenciais. |

---

## 2. Testes de Integração & Unidade

### A. Tradutor de Fórmulas
Criaremos o arquivo de teste `apps/web/tests/formula-translator.test.ts` para validar o mapeamento bidirecional:
* **Funções Básicas:** Tradução de `SUM` -> `SOMA`, `IF` -> `SE`, `AVERAGE` -> `MÉDIA`, etc.
* **Separadores de Argumentos:** Converte `,` para `;` em chamadas de função (ex.: `SUM(A1, B1)` -> `SOMA(A1; B1)`).
* **Segurança de Strings:** Garante que vírgulas contidas dentro de strings literais (aspas) NÃO sejam alteradas.

### B. Rota `/api/chat/unified`
Atualizaremos `apps/web/tests/unified-route.test.ts` para testar os seguintes fluxos:
* **Injeção de Contexto:** Garante que o estado completo da planilha enviado no payload é injetado no prompt do LLM.
* **Mapeamento de Intent:** Testa se a classificação binária (`sheet_operation` ou `qa`) é retornada com a confiança correta no stream NDJSON.
* **Fixture Fallback:** Valida que a rota responde deterministicamente via stream NDJSON mockado quando `OPENAI_API_KEY` está vazia.

### C. Unified Chat Tool (Client UI)
Atualizaremos `apps/web/tests/unified-chat-tool.test.tsx`:
* **Embrulho de Provedor:** Garante que o componente de chat é testado dentro de `WorkspaceStateProvider`.
* **Mutação E2E:** Simula a chegada de evento `complete` com `table_spec` e valida se o estado do contexto da planilha é atualizado via `setSpec`.

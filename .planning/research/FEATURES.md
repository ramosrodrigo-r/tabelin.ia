# Feature Research — v2.0 Chat Unificado & Tabela Viva

**Domain:** Unified AI chat with intent routing + interactive browser spreadsheet (contexto: Tabelin.IA, SaaS de planilhas para o Brasil)
**Researched:** 2026-06-08
**Confidence:** HIGH (padrões de mercado bem estabelecidos; localization stack verificado em docs oficiais)

---

## Escopo desta pesquisa

Esta pesquisa cobre exclusivamente as **três capacidades novas** do milestone v2.0:

1. **Chat unificado com roteamento automático de intent** — substituição das abas de tools por um único input que detecta o tipo de output (formula, SQL, regex, script, análise, OCR, tabela).
2. **Tabela interativa estilo mini-Excel** — grid editável no browser com fórmulas vivas, edição de células, export CSV/XLSX.
3. **Loop de clarificação multi-turn** — a IA faz perguntas até ter certeza da especificação da tabela antes de gerá-la.

Capacidades já existentes (autenticação, quota Pro, multi-turn history, anexos, geração de fórmulas/SQL/regex/scripts, OCR, File Analysis, charts) são tratadas como **dependências disponíveis**, não como alvos de build.

---

## Feature Landscape

### Table Stakes — Chat Unificado (Usuário espera que exista)

| Feature | Por que é esperado | Complexidade | Notas |
|---------|-------------------|--------------|-------|
| Input único que aceita qualquer pedido | ChatGPT, Claude, Julius AI, Sourcetable — todos usam um único campo de texto. Usuário não quer escolher "qual ferramenta usar" antes de digitar | LOW | Textarea idêntico ao atual; o que muda é o backend e a ausência de seleção de tool no frontend |
| Roteamento automático sem intervenção do usuário | Julius AI roteia para tabela/gráfico/análise/código sem o usuário declarar o tipo; Sourcetable faz o mesmo. Usuário espera que a IA "saiba" o que deve produzir | MEDIUM | Classificador de intent no backend (LLM call de baixo custo, temperatura ~0) retornando enum: `formula | sql | regex | script | table | analysis | ocr` |
| Output diferente renderizado inline no mesmo thread | ChatGPT renderiza código, tabelas markdown, imagens e texto no mesmo fio de conversa. Julius renderiza gráficos e tabelas inline. Usuário espera ver tudo no mesmo scroll | MEDIUM | Dispatcher de render no frontend: detecta tipo do response e escolhe o componente correto (CodeBlock, TableGrid, TextResponse) — extensão dos componentes existentes |
| Migração sem regressão das 7 capacidades existentes | Usuário que usava "aba SQL" espera continuar recebendo SQL; remover a aba não pode degradar a qualidade | MEDIUM | O classificador deve rotear para os mesmos system prompts/handlers já validados; a mudança é no roteamento, não nos geradores |
| Sem "modo de tool" obrigatório a declarar | Usuário não quer escrever "modo: fórmula" ou selecionar um menu drop-down antes de digitar | LOW | Seletor de tool vira histórico; o "modo atual" inferido aparece como label opcional confirmado — não como pré-requisito |
| Indicador visual do tipo de output que será gerado | Julius AI e Sourcetable mostram um badge/pill indicando "Gerando tabela…" ou "Escrevendo fórmula…" — usuário sabe o que esperar | LOW | Pill de status durante streaming: "Formula", "SQL", "Tabela", etc. — derivado do resultado do classificador |
| Preservação do contexto de ferramenta entre turns | Usuário que fez "me dê uma fórmula PROCV" espera que o follow-up "agora explica ela" continue no contexto de fórmula sem reclassificar | LOW | Armazenar `lastIntent` na sessão; classificador usa o turn anterior como contexto; override explícito pelo usuário sempre possível |

### Table Stakes — Tabela Interativa (Usuário espera que exista)

| Feature | Por que é esperado | Complexidade | Notas |
|---------|-------------------|--------------|-------|
| Grid editável com células clicáveis | Toda referência de mercado (Sourcetable, Handsontable, Google Sheets web) gera uma grade clicável. Tabela só-leitura parece rascunho, não produto | MEDIUM | Handsontable ou jspreadsheet (ambos React-compatíveis); Handsontable é mais maduro para uso enterprise |
| Fórmulas vivas: `=A1+B2` recalcula no browser | Sourcetable e GRID.is fazem recálculo local em tempo real. Usuário de Excel espera ver fórmulas funcionando imediatamente após edição | HIGH | HyperFormula (engine headless do time Handsontable) integrado com Handsontable via plugin Formulas. Suporta 400+ funções Excel, undo/redo, dependência em grafo |
| Adicionar e remover linhas | Usuário espera poder inserir dados extras sem sair da interface. É comportamento elementar de qualquer planilha | LOW | API nativa de Handsontable: `hot.alter('insert_row_below', index)` |
| Adicionar e remover colunas | Mesmo raciocínio de linhas | LOW | `hot.alter('insert_col_end')` — idem |
| Edição inline de nome de coluna (header) | Google Sheets: double-click no header edita. Usuário espera esse comportamento | MEDIUM | Handsontable suporta custom headers com edição; requer configuração de `nestedHeaders` ou custom header renderer |
| Copiar e colar células (Ctrl+C / Ctrl+V) | Comportamento universal de planilha; ausência é bloqueante | LOW | Plugin `CopyPaste` nativo do Handsontable |
| Undo/Redo (Ctrl+Z / Ctrl+Y) | Excel e Google Sheets têm 100 steps de undo. Ausência em uma interface de planilha é regressão severa | LOW | Plugin `UndoRedo` nativo do Handsontable + HyperFormula mantém histórico de mutações |
| Ordenar coluna (sort) | Planilha sem sort parece incompleta para qualquer analista | LOW | Plugin `ColumnSorting` do Handsontable |
| Filtrar linhas (filter dropdown) | Analistas brasileiros usam AutoFiltro no Excel diariamente | MEDIUM | Plugin `Filters` do Handsontable |
| Export CSV | Toda ferramenta de planilha no browser exporta CSV. Usuário espera poder baixar os dados | LOW | Plugin `ExportFile` do Handsontable ou serialização manual com `papaparse` |
| Export XLSX | Usuário de Excel brasileiro espera abrir o arquivo no Excel nativo. CSV pode perder formatação | MEDIUM | `xlsx` (SheetJS) no frontend para geração client-side, ou endpoint `/api/export/xlsx` no backend. SheetJS tem licença dual (community gratuita mas com limitações comerciais — verificar) |
| Navegação por teclado (Tab, Enter, setas) | Excel e Google Sheets: Tab avança célula, Enter confirma, setas navegam. Ausência torna a grade inutilizável para digitação rápida | LOW | Comportamento padrão do Handsontable |

### Table Stakes — Loop de Clarificação (Usuário espera que exista)

| Feature | Por que é esperado | Complexidade | Notas |
|---------|-------------------|--------------|-------|
| IA faz perguntas antes de gerar a tabela | Sourcetable faz isso ("ask for clarification only when necessary"). Usuário que pede "crie uma tabela de controle de estoque" sem mais detalhes espera ser guiado, não receber algo arbitrário | MEDIUM | System prompt com instrução de slot-filling: se `intent == table` e slots insuficientes, retornar `{ action: "clarify", question: "..." }` em vez de gerar |
| Uma pergunta por vez | Padrão estabelecido em slot-filling de task-oriented dialogue: uma pergunta por turno evita sobrecarga cognitiva. Bots que fazem 5 perguntas ao mesmo tempo causam abandono | LOW | Instrução explícita no prompt: "Faça UMA pergunta por vez. Nunca liste múltiplas perguntas no mesmo turno." |
| Resumo de confirmação antes de gerar | Antes de gerar a tabela, mostrar para o usuário: "Vou criar uma tabela com X colunas, Y linhas, dados sobre Z. Pode gerar?" — reduz retrabalho | LOW | Último turn do loop retorna `{ action: "confirm", summary: "Tabela: X colunas (Nome, Preço, Qtd), Y=10 linhas, formato de moeda R$. Gerar?" }` com botão Sim/Editar |
| Botão "Gerar" explícito na confirmação | UX de "são você sure?" é padrão quando há custo computacional envolvido. Usuário não deve ter a tabela gerada sem ter visto o resumo | LOW | Componente `ConfirmationCard` inline no thread com resumo + dois botões: "Gerar tabela" e "Ajustar especificação" |
| Loop termina após confirmação positiva | Depois que o usuário confirma, a tabela é gerada imediatamente — sem mais perguntas | LOW | Estado de sessão: `clarificationState: idle | asking | confirmed`. Transição `confirmed → generate` é determinística |

---

### Differentiators — Chat Unificado (Vantagem competitiva)

| Feature | Proposta de valor | Complexidade | Notas |
|---------|-------------------|--------------|-------|
| Confirmação visual do tipo detectado com opção de override | Julius e Sourcetable não mostram qual intenção foi inferida — o usuário não sabe por que recebeu uma tabela em vez de uma fórmula. Mostrar "Detectei: Fórmula Excel — mudar?" eleva confiança | LOW | Pill clicável no input: "Fórmula ▾" — dropdown permite reclassificar manualmente. Reclassificação armazenada como feedback implícito |
| Seletor de plataforma/dialeto persistido no chat unificado | No modelo multi-aba, o seletor de plataforma (Excel vs Google Sheets; PostgreSQL vs MySQL) vivia por tool. No chat unificado, o contexto de plataforma deve sobreviver entre pedidos relacionados | LOW | `chatContext.platform` persiste na sessão; editável via comando `/contexto Excel` ou seletor no header |
| Histórico unificado: todos os tipos de output em um único thread | Hoje o usuário tem 7 threads separados. Chat unificado cria uma linha do tempo única por workspace. Isso é como ChatGPT funciona vs "modo tool" antigo | MEDIUM | Migrar o modelo de `ConversationExchange` de `userId+toolKind` para `userId+sessionId`; toolKind vira metadado do exchange, não chave primária de isolamento |
| Sugestões de "próximo passo" baseadas no output | Após gerar uma fórmula PROCV, sugerir "Quer explicar esta fórmula?" ou "Quer transformar em tabela?" — padrão ShapeOfAI follow-ups | LOW | Resposta do assistente inclui campo opcional `suggestions: string[]`; componente de chips clicáveis abaixo da resposta |

### Differentiators — Tabela Interativa

| Feature | Proposta de valor | Complexidade | Notas |
|---------|-------------------|--------------|-------|
| Fórmulas em português (PROCV, SE, SOMASE) visíveis na célula | HyperFormula não vem com pt-BR; apenas pt-PT. Registrar um language pack customizado com as funções brasileiras seria diferenciador direto para o usuário-alvo (Mariana, analista Excel Brasil) | HIGH | Criar e registrar `HyperFormula.registerLanguage('pt-BR', { ... })` com mapeamento completo de ~100 funções PT-BR. Trabalho manual mas alto impacto de localização |
| Separador de argumento `;` por default em fórmulas | HyperFormula suporta `functionArgSeparator: ';'` via config. Usuário brasileiro que digita `=SE(A1>10; "sim"; "não")` sem configuração recebe erro de sintaxe — bloqueante | MEDIUM | Configurar `functionArgSeparator: ';'` e `decimalSeparator: ','` e `thousandSeparator: '.'` no HyperFormula init. Documentar como decisão de localização |
| Formato de moeda R$ em células | Brasileiro formata valores como `R$ 1.234,56`. Nenhum produto estrangeiro faz isso por padrão | LOW | Formatter personalizado de célula: detecta tipo numérico em colunas de "valor/preço/total" e aplica `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` |
| Formato de data DD/MM/AAAA por padrão | Brasil usa DD/MM/AAAA. Tabela gerada com datas em ISO 8601 (YYYY-MM-DD) parece incorreta para o usuário | LOW | HyperFormula tem `dateFormats` configurável; definir `['DD/MM/YYYY', 'DD/MM/YY']` como padrão |
| "Preencher com dados de exemplo" ao criar tabela vazia | Tabela gerada pela IA com dados reais de contexto (ou dados de exemplo plausíveis) é muito mais útil que grid vazia. Julius AI faz isso bem | MEDIUM | System prompt instrui o LLM a gerar dados de exemplo plausíveis para o contexto brasileiro (R$, CPF mascarado, datas BR) quando o usuário não fornece dados reais |
| Edição retroativa: chat-pede-modificação na tabela | "Adicione uma coluna de % desconto" após a tabela ter sido gerada — reprocessa só os deltas | HIGH | Complexo: requer serializar estado atual da tabela, passar de volta para o LLM como contexto, e aplicar patch. Diferenciador real mas com risco de estado inconsistente. Avaliar para v2.1 |

### Differentiators — Loop de Clarificação

| Feature | Proposta de valor | Complexidade | Notas |
|---------|-------------------|--------------|-------|
| Slots pré-definidos para tabela (checklist interno) | Em vez de o LLM "improvisar" o que perguntar, ter um schema de slots fixo: `[colunas, tipos, linhas, dados, formato]`. Slot-filling determinístico reduz variância | MEDIUM | System prompt define schema de slots. LLM preenche slots a partir da mensagem do usuário e identifica qual está faltando. Abordagem HierTOD/ClarifyMT |
| Estimativa de progresso ("2 de 3 informações coletadas") | Usuário sabe quantas perguntas faltam — reduz ansiedade de loop infinito | LOW | Barra ou indicador `(2/3 informações coletadas)` derivado do estado dos slots preenchidos vs. pendentes |
| Possibilidade de "pular clarificação" com um clique | Alguns usuários querem geração imediata com a melhor hipótese da IA — não querem responder perguntas. Oferecer "Gerar com sua melhor hipótese" no primeiro turno | LOW | Botão secundário `Gerar assim mesmo →` disponível desde o primeiro turno de clarificação. IA usa defaults razoáveis para slots não preenchidos |

---

### Anti-Features (Comumente pedido, mas problemático)

| Feature | Por que é pedida | Por que é problemática | Alternativa |
|---------|-----------------|----------------------|-------------|
| Múltiplas perguntas de clarificação por turno | "Mais eficiente" | Sobrecarga cognitiva comprovada. Pesquisa (ClarifyMT-Bench) mostra abandono quando o agente lista 3+ perguntas ao mesmo tempo | Uma pergunta por turno; estado de slot-filling no backend |
| Tabela gerada sem confirmação ("surpresa") | "Mais rápido" | Usuário recebe tabela com estrutura errada → frustração + retrabalho. Uma tabela mal-especificada é pior que nenhuma tabela | Confirmação resumida antes de gerar — basta um click para confirmar |
| Fórmulas calculadas no servidor (não no browser) | "Mais confiável" | Latência para cada edição; custo de API para recalcular; dependência de conexão para operação básica. Spreadsheet sem resposta offline quebra o contrato de UX | HyperFormula no browser: recálculo instantâneo sem rede |
| Remover completamente as abas de tools na sidebar | "Interface mais limpa" | Usuários que têm fluxos dedicados (SQL diário do Carlos, fórmulas da Mariana) perderiam acesso rápido. Remoção forçada é regressão de navegação | Migração gradual: chat unificado como default, tools acessíveis via sidebar colapsável ou shortcut |
| Edição retroativa da tabela via chat sem state management robusto (v2.0) | Feature rica e atraente | Requer serializar estado atual da grade, passar como contexto ao LLM, receber patch, aplicar sem corrompê-la. Altíssima complexidade e risco de estado inconsistente em v2.0 | Implementar em v2.1 com estado delta explícito. Em v2.0: usuário pode editar diretamente na grade após geração |
| Suporte a múltiplas abas (multi-sheet) na tabela interativa | Excel tem abas, então o usuário vai pedir | Multiplica complexidade de state management, formulas cross-sheet, serialização e export. Para o caso de uso v2.0 (tabela gerada por pedido único) desnecessário | Tabela single-sheet com export para XLSX. Abas em v3+ com dados de demanda |
| Colaboração em tempo real na tabela (multiple cursors) | "Google Sheets" | Requer WebSockets, CRDT, resolução de conflito. Está explicitamente fora do escopo no PROJECT.md | Sem colaboração em v2.0. Compartilhar via export CSV/XLSX |
| Histórico de versões da tabela (undo persistido entre sessões) | "Segurança" | Undo é em memória (HyperFormula) — persisti-lo no banco é engenharia de database não trivial | Undo/redo em memória para a sessão atual. Export como checkpoint manual |
| Intent routing via modelo dedicado treinado do zero | "Mais preciso" | Nenhum sinal de que vale o custo. LLMs de propósito geral com prompt cuidadoso + temperatura 0 são suficientes para 7 classes determinísticas | Classificador via LLM com prompt estruturado + enum de saída fixo |

---

## Feature Dependencies

```text
[Chat Unificado — Roteamento de Intent]
    └──reusa──> [system prompts dos 7 tools existentes] (Phases 1–5, já existentes)
    └──reusa──> [buildMultiTurnSystemPrompt] (Phase 8, já existente)
    └──reusa──> [ConversationExchange + persistência] (Phase 6, já existente)
    └──novo──>  [Classificador de intent] (LLM call leve; retorna enum)
    └──novo──>  [Dispatcher de render no frontend] (componente React)
    └──conflito──> [isolamento por toolKind] (Phase 6 - modelo atual usa userId+toolKind como chave; chat unificado precisa de sessionId)

[Loop de Clarificação]
    └──requer──> [Classificador de intent] (só ativa para intent == "table")
    └──requer──> [Estado de slot-filling na sessão] (novo: { slots, filledSlots, state })
    └──reusa──> [Multi-turn context injection] (Phase 8)
    └──novo──>  [ConfirmationCard component] (UI de resumo + botões Gerar/Ajustar)

[Tabela Interativa]
    └──requer──> [Loop de clarificação confirmado] (sem confirmação, não gera tabela)
    └──novo──>  [Handsontable + HyperFormula] (biblioteca externa; ~400KB gzipped — avaliar lazy-load)
    └──novo──>  [Language pack pt-BR para HyperFormula] (mapeamento manual de ~100 funções)
    └──novo──>  [Serialização para export] (SheetJS/xlsx para XLSX; papaparse para CSV)
    └──reusa──> [Quota reserve/confirm/release] (Phase 2) — geração de tabela consome quota

[Export XLSX]
    └──requer──> [Estado serializado da tabela] (grade atual com dados e fórmulas)
    └──novo──>  [SheetJS client-side] (verificar licença: community edition pode ter restrições comerciais)
```

### Notas de dependência críticas

- **Modelo de dados `ConversationExchange` precisa de extensão**: O campo de chave atual `userId+toolKind` precisa ser expandido para suportar `sessionId` genérico no chat unificado. Migração de schema sem breaking change: adicionar `sessionId` nullable; exchanges legados continuam funcionando via `toolKind`.
- **HyperFormula pt-BR é o maior risco técnico novo**: A biblioteca não vem com language pack brasileiro. O time precisa criar o mapeamento de ~100 funções (PROCV, SE, SOMASE, CONT.SE, ÍNDICE, CORRESP, etc.). Trabalho de 1–2 dias mas é pré-requisito para que a tabela seja utilizável pelo persona-alvo.
- **SheetJS licença**: A versão community (MIT) é gratuita mas a versão Pro tem features extras. Para XLSX básico de saída, community é suficiente. Verificar antes de commitar.
- **Lazy-load de Handsontable é obrigatório**: Handsontable + HyperFormula somam ~400KB gzipped. Não podem ser carregados na rota principal. Usar `next/dynamic` com `ssr: false` e loading state até o grid montar.
- **Intent classificador não substitui o roteador existente**: Os system prompts dos 7 tools existentes continuam inalterados. O classificador apenas decide *qual* system prompt usar e *qual* renderizador de output ativar.

---

## Localização Brasileira — Checklist Detalhado

Esta seção consolida expectativas de localização para a Tabela Interativa, que é o único componente com lógica de localização nova.

| Aspecto | Padrão BR | Configuração HyperFormula | Status |
|---------|-----------|--------------------------|--------|
| Separador de argumento de fórmula | `;` (ponto e vírgula) | `functionArgSeparator: ';'` | Suportado nativo |
| Separador decimal | `,` (vírgula) | `decimalSeparator: ','` | Suportado nativo |
| Separador de milhar | `.` (ponto) | `thousandSeparator: '.'` | Suportado nativo |
| Nomes de funções | PROCV, SE, SOMASE, CONT.SE, ÍNDICE, CORRESP, MÉDIA, MÍNIMO, MÁXIMO, CONCATENAR, etc. | Language pack custom `pt-BR` via `registerLanguage()` | Requer criação do pack |
| Formato de data | DD/MM/AAAA | `dateFormats: ['DD/MM/YYYY']` | Suportado nativo |
| Formato de moeda | R$ 1.234,56 | Custom cell formatter via `Intl.NumberFormat('pt-BR', {currency:'BRL'})` | Implementação própria |
| Separador de data em fórmulas | `/` | Configurável via date format string | Suportado nativo |

**Nota**: HyperFormula suporta Portuguese europeu (`ptPT`) nativamente — os nomes de função nessa variante são **idênticos** ao português brasileiro para a maioria das funções comuns (PROCV, SE, SOMA, MÉDIA). O risco real é em funções menos comuns onde pt-BR e pt-PT divergem. Validar contra a lista completa em https://easy-excel.com/excel-in-other-languages/excel-functions-in-portuguese-brazil/ antes de criar o pack customizado.

---

## MVP para o Milestone v2.0

### Lançar com (v2.0)

#### Chat Unificado
- [ ] Classificador de intent (LLM call, enum de 7 tipos, temperatura 0)
- [ ] Dispatcher de render: `formula/sql/regex/script` → CodeBlock existente; `analysis` → TextResponse; `table` → TableGrid; `ocr` → redirect para OCR tool
- [ ] Pill de status durante streaming mostrando tipo inferido
- [ ] Pill de override manual de tipo (para casos de classificação errada)
- [ ] Histórico unificado: migração de `userId+toolKind` para `userId+sessionId`
- [ ] Context carry: `lastIntent` na sessão para coerência de follow-ups
- [ ] Seletor de plataforma/dialeto persistido no contexto de sessão (Excel/Sheets/SQL dialect)

#### Loop de Clarificação
- [ ] Ativação condicional: classificador retorna `table` → loop entra em ação
- [ ] Slot schema para tabela: `colunas`, `tipos de dado`, `número de linhas`, `dados de exemplo`, `formato especial`
- [ ] Uma pergunta por turno (hard constraint no system prompt)
- [ ] ConfirmationCard com resumo de slots preenchidos antes de gerar
- [ ] Botão "Gerar assim mesmo" para usuário que não quer responder perguntas
- [ ] Estado de clarificação no backend (idle → asking → confirmed → generating)

#### Tabela Interativa
- [ ] Handsontable + HyperFormula integrados (lazy-loaded via `next/dynamic`)
- [ ] Configuração de localização BR: `;` como separador, `,` decimal, `DD/MM/YYYY`
- [ ] Language pack pt-BR para HyperFormula (funções mais usadas: PROCV, SE, SOMASE, SOMA, MÉDIA, CONT.SE, ÍNDICE, CORRESP, SE.ERRO, CONCATENAR)
- [ ] Edição inline de células com recálculo live
- [ ] Adicionar/remover linhas e colunas
- [ ] Copiar/colar (Ctrl+C/V), Undo/Redo (Ctrl+Z/Y)
- [ ] Ordenar coluna (sort)
- [ ] Export CSV (papaparse ou ExportFile plugin)
- [ ] Export XLSX (SheetJS community)
- [ ] Formatação de moeda R$ em células de valor numérico
- [ ] Formatação de data DD/MM/YYYY

### Adicionar após validação (v2.x)

- [ ] Filtro de linhas (AutoFiltro) — padrão Excel, mas complexidade de UI é médio; validar demanda
- [ ] Edição retroativa via chat ("adicione uma coluna de desconto") — alto risco, vale v2.1 com state delta explícito
- [ ] Language pack pt-BR completo (100+ funções) — ampliar depois do pack MVP das 10 funções mais usadas
- [ ] Histórico unificado com view por tipo (filtrar só fórmulas, só SQL) — UX ergonômica mas não bloqueante para lançamento
- [ ] Sugestões de "próximo passo" clicáveis após cada output

### Diferir para v3+

- [ ] Multi-sheet (múltiplas abas) na tabela interativa
- [ ] Colaboração em tempo real
- [ ] Versioning persistido da tabela
- [ ] Formatos adicionais de export (ODS, PDF, HTML)

---

## Feature Prioritization Matrix

| Feature | Valor ao Usuário | Custo de Implementação | Prioridade |
|---------|-----------------|----------------------|------------|
| Classificador de intent | HIGH | MEDIUM | P1 |
| Dispatcher de render inline no thread | HIGH | MEDIUM | P1 |
| Loop de clarificação com slot-filling | HIGH | MEDIUM | P1 |
| ConfirmationCard antes de gerar tabela | HIGH | LOW | P1 |
| Handsontable + HyperFormula integração | HIGH | MEDIUM | P1 |
| Localização BR (`;`, `,`, `DD/MM/YYYY`) | HIGH | LOW | P1 |
| Language pack pt-BR (10 funções core) | HIGH | MEDIUM | P1 |
| Export CSV | HIGH | LOW | P1 |
| Export XLSX | HIGH | MEDIUM | P1 |
| Undo/Redo + Copy/Paste + Sort | HIGH | LOW | P1 |
| Adicionar/remover linhas e colunas | HIGH | LOW | P1 |
| Migração de modelo de dados (sessionId) | HIGH | MEDIUM | P1 |
| Pill de tipo inferido + override manual | MEDIUM | LOW | P2 |
| Formatação R$ e DD/MM/YYYY automática | MEDIUM | LOW | P2 |
| Sugestões de "próximo passo" | MEDIUM | LOW | P2 |
| Filtro de linhas (AutoFiltro) | MEDIUM | MEDIUM | P2 |
| Language pack pt-BR completo (100+ funções) | HIGH | HIGH | P2 |
| Edição retroativa via chat | HIGH | HIGH | P3 |
| "Gerar assim mesmo" skip de clarificação | LOW | LOW | P2 |

**Chave de prioridade:** P1 = obrigatório para lançar o milestone | P2 = incluir se possível | P3 = diferir para v2.1+

---

## Competitor Feature Analysis

| Feature | Julius AI | Sourcetable | GPTExcel | Tabelin.IA v2.0 |
|---------|-----------|-------------|---------|----------------|
| Intent routing automático | Sim — detecta tabela/gráfico/análise/código automaticamente | Sim — autopilot mode | Não — tool selecionado explicitamente pelo usuário | Classificador LLM + dispatcher de render |
| Inline rendering de tipos diferentes no thread | Sim — gráficos, tabelas, código no mesmo scroll | Sim | Não | CodeBlock + TableGrid + TextResponse no mesmo thread |
| Tabela editável gerada pela IA | Não — output é tabela read-only ou exportável | Sim — células editáveis com fórmulas live | Não | Handsontable + HyperFormula com recálculo live |
| Loop de clarificação antes de gerar | Não explícito | "Ask when necessary" — não é loop estruturado | Não | Slot-filling estruturado com ConfirmationCard |
| Localização brasileira (pt-BR, `;`, R$, DD/MM) | Não | Não | Não (apesar de ser o modelo de inspiração) | Diferenciador central da proposta |
| Export XLSX | Sim | Sim | Sim (output principal) | SheetJS client-side |
| Fórmulas vivas no browser | Não (executa código Python no servidor) | Sim | Não | HyperFormula no browser |

---

## Sources

- https://julius.ai/ — Referência de intent routing e inline rendering de múltiplos tipos de output em chat único (403 no fetch direto, análise via reviews e documentação pública)
- https://sourcetable.com/ — Referência de tabela editável AI-generated com fórmulas live e chat sobre dados
- https://hyperformula.handsontable.com/guide/i18n-features.html — Documentação oficial de I18N do HyperFormula: `functionArgSeparator`, `decimalSeparator`, `dateFormats`, custom language packs
- https://hyperformula.handsontable.com/guide/localizing-functions.html — Lista dos 17 idiomas suportados; Portuguese = pt-PT (europeu), não pt-BR; confirmado que pt-BR requer language pack custom
- https://handsontable.com/ — Grid component com plugins CopyPaste, UndoRedo, ColumnSorting, Filters, ExportFile, Formulas (powered by HyperFormula)
- https://medium.com/@milesk_33/when-agents-learn-to-ask-active-questioning-in-agentic-ai-f9088e249cf7 — "One clarifying question reduced error rate by 27%; retries fell from 4.1 to 1.3 per session"
- https://arxiv.org/pdf/2512.21120 — ClarifyMT-Bench: benchmarking multi-turn clarification in LLMs — validação acadêmica do padrão de one-question-at-a-time
- https://www.bprigent.com/article/7-ux-patterns-for-human-oversight-in-ambient-ai-agents — Padrões de UX para confirmação antes de ação de agente AI
- https://www.shapeof.ai/patterns/follow-up — Padrões de follow-up AI: clarifying questions, confirmation, depth probes; recomendação de separação visual entre follow-ups e output principal
- https://easy-excel.com/excel-in-other-languages/excel-functions-in-portuguese-brazil/ — Lista completa de funções Excel em português brasileiro para construção do language pack HyperFormula pt-BR
- https://langfuse.com/guides/cookbook/example_intent_classification_pipeline — Arquitetura de pipeline de intent classification com LLM (supervised + unsupervised approaches)

---

*Feature research para: Tabelin.IA v2.0 Chat Unificado & Tabela Viva*
*Pesquisado em: 2026-06-08*

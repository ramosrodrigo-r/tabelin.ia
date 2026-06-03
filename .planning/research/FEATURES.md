# Feature Research — v1.2 Anexos Universais

**Domain:** Document-attachment / "chat with your file" em ferramentas de texto de AI SaaS (contexto: Tabelin.IA)
**Researched:** 2026-06-03
**Confidence:** HIGH

---

## Escopo desta pesquisa

Esta pesquisa cobre exclusivamente a camada de **anexo universal de documentos** nos 5 tools de texto já existentes (Formula, SQL, Regex, Scripts, Template). Capacidades pré-existentes (OCR dedicado, File Analysis dedicado, multi-turn persistence) são tratadas como dependências, não como alvos de build.

---

## Feature Landscape

### Table Stakes (Usuário espera que exista)

Ausência de qualquer item abaixo faz o recurso parecer incompleto ou quebrado.

| Feature | Por que é esperado | Complexidade | Notas |
|---------|-------------------|--------------|-------|
| Botão de anexo (ícone paperclip) no input | É o padrão universal — ChatGPT, Claude, Gemini, Slack, WhatsApp todos usam paperclip junto ao textarea | LOW | Posicionado à esquerda do textarea, antes do botão de envio. File input `display:none` acionado por click no ícone. |
| Drag-and-drop para soltar arquivo no chat input | Todos os players maiores (Claude, ChatGPT, Telegram) aceitam; usuário espera arrastar da área de trabalho | MEDIUM | `FileDropZone` envolvendo `ChatInput`; borda destaque no dragover. |
| Preview chip acima do textarea antes de enviar | Claude e Telegram são referência de boas práticas: permite revisar o que vai ser enviado. Ausência = usuário fica sem saber o que foi anexado | LOW | Chip exibe: ícone de tipo (PDF, CSV, XLSX, IMG, TXT), nome do arquivo truncado, tamanho, botão × de remoção. |
| Botão × para remover o anexo antes de enviar | Usuário pode mudar de ideia; é comportamento elementar | LOW | Ao remover, limpa o estado de anexo pendente sem resetar o textarea. |
| Feedback visual durante upload + extração | Usuários abandonam se não veem progresso. Padrão: spinner/progress bar + texto descritivo | LOW | Dois estágios: "Enviando…" (upload) → "Extraindo conteúdo…" (parse/OCR). |
| Tratamento de erro visível e acionável | Erros silenciosos causam confusão; usuário precisa saber o que fazer | MEDIUM | Mensagem inline no chip (não toast isolado) com instrução de recovery: tamanho excedido, formato não suportado, extração falhou. |
| Confirmação visual de que a IA leu o arquivo | O usuário precisa saber que a resposta foi baseada no documento, não apenas no prompt | LOW | Badge/label na resposta do assistente: "Com base em `arquivo.csv`". Sem isso o grounding parece mágica invisível. |
| Persistência do contexto do documento no thread multi-turn | Referência padrão em todos os players: o documento permanece acessível nos follow-ups sem re-upload | MEDIUM | Conteúdo extraído armazenado no thread (texto/schema, não o arquivo bruto). Arquivo bruto descartado após extração (D-07 — já validado). |
| Indicação clara de que o documento ainda está ativo no thread | Após envio, usuário deve saber que o contexto do arquivo persiste para perguntas futuras | LOW | Chip de estado "persistido" acima do input nos turns seguintes, ou indicador sutil no header da conversa. |
| Validação client-side de tipo e tamanho antes do upload | Usuário não deve esperar um round-trip de rede para descobrir que o formato não é suportado | LOW | Validar no `onChange` do file input: tipos aceitos (CSV, XLSX, PNG, JPEG, PDF, TXT) e limite de 5 MB. |
| Gating Pro com CTA de upgrade (free vê botão bloqueado) | Qualquer feature Pro precisa de um caminho de upgrade acessível; botão completamente oculto em vez de bloqueado é pior | LOW | Botão paperclip visível mas desabilitado para free; tooltip/modal com CTA de upgrade Pro. Padrão de freemium estabelecido no projeto. |

### Differentiators (Vantagem competitiva)

Não obrigatórios, mas elevam significativamente o valor percebido.

| Feature | Proposta de valor | Complexidade | Notas |
|---------|-------------------|--------------|-------|
| Detecção automática de schema CSV/XLSX com exibição das colunas no chip de confirmação | Mostra ao usuário que o sistema entendeu a estrutura antes de gerar a fórmula/SQL — reduz desconfiança e erros | MEDIUM | Reusa o parser de schema já existente (Phase 4). Chip expandido mostra as 3–5 primeiras colunas detectadas. |
| Sugestão proativa de tool ao anexar um arquivo | Se o usuário está na tool Formula e anexa um CSV, sugerir "Quer gerar uma fórmula baseada nesta planilha?" — reduz fricção cognitiva | MEDIUM | Heurística simples: CSV/XLSX no Formula tool → sugerir PROCV/SOMASE sobre o schema. |
| Mensagem de grounding no prompt do sistema com estrutura do arquivo | A IA produz output muito mais preciso quando recebe schema + amostra de dados, não apenas "o usuário anexou algo" | HIGH | Injetar no system prompt: tipo do arquivo, schema/colunas, amostra de linhas (N=5), e a pergunta do usuário. Diferença real na qualidade de fórmulas e SQL. |
| Preview de texto extraído colapsável antes de enviar (opt-in) | Usuário avançado quer confirmar que o texto foi extraído corretamente antes de consumir quota Pro | HIGH | "Ver conteúdo extraído" → accordion com primeiros 500 caracteres do texto extraído. Útil especialmente para PDFs que podem ser mal extraídos. |
| Indicação quando extração foi parcial (PDF escaneado, tabela sem texto) | Em vez de falhar silenciosamente ou retornar resposta genérica, avisar que a qualidade é reduzida | MEDIUM | Warning badge: "Extração parcial — PDF pode conter imagens sem texto. A resposta pode ser menos precisa." |
| Fallback automático para OCR quando PDF scaneado é detectado | PDFs escaneados são frequentes em empresas brasileiras (boletos, NFes digitalizadas) | HIGH | Se extrator de texto PDF retornar < N caracteres por página, redirecionar para Vision OCR. Custo adicional de API — comunicar ao usuário. |

### Anti-Features (Comumente pedido, mas problemático)

| Feature | Por que é pedida | Por que é problemática | Alternativa |
|---------|-----------------|----------------------|-------------|
| Múltiplos arquivos por mensagem | Usuário quer contexto "completo" | Explode o context window, aumenta latência, custo e complexidade de truncagem; a maioria dos casos de uso real é um arquivo por vez | 1 arquivo por mensagem, cap de 5 MB. Deixar o usuário trocar de arquivo em follow-ups. |
| Re-upload automático do arquivo a cada mensagem do thread | Parece "mais seguro" | Reprocessa OCR/parse toda vez, multiplica custo de API e latência; o conteúdo extraído no primeiro turn já deve persistir | Persistir conteúdo extraído no thread (já no design do milestone). |
| Armazenamento permanente do arquivo bruto | Usuário quer "acessar depois" | Conflito direto com a política D-07 já validada; cria risco de LGPD e custo de storage | Persistir apenas o conteúdo extraído (texto/schema) no thread, arquivo bruto descartado após extração. |
| Upload disponível no plano free | "Todo mundo deveria ter acesso" | OCR (Vision API) e PDF parsing têm custo por chamada; free tier tornaria o recurso economicamente inviável sem quota muito restritiva | Gating Pro com CTA visível. Free pode ver o botão como preview/incentivo de upgrade. |
| Suporte a .docx, .pptx, .odt, .epub na v1 | Usuários pedem por completude | Parsers adicionais = mais superfície de bugs, mais edge cases, mais testes; formatos raramente usados em contextos de planilha/SQL/regex | Lançar com CSV, XLSX, PNG, JPEG, PDF, TXT. Expandir formatos em v2 com dados de demanda real. |
| Respostas com citações clicáveis no texto extraído (visual grounding tipo V7/docAnalyzer) | Feature rica em tools de document QA | Irrelevante para o caso de uso: o output é uma fórmula/SQL/regex, não um relatório com parágrafos citáveis. Complexidade de implementação não justificada | Badge simples "Com base em `arquivo.csv`" é suficiente para o contexto de uso. |
| Absorção dos tools OCR e File Analysis dedicados | Parece simplificação da UI | OCR e File Analysis têm fluxos de output diferentes (tabela TSV, análise exploratória) que não se encaixam no output de fórmula/SQL/regex. Remover os tools dedicados piora o caso de uso deles | Manter OCR e File Analysis como tools independentes. Anexo universal é "contexto para geração", não "análise de arquivo". Ver seção Zona Cinzenta abaixo. |

---

## Feature Dependencies

```text
[Extrator multi-formato]
    └──reusa──> [CSV/XLSX schema parser] (Phase 4 — já existente)
    └──reusa──> [OCR Vision API] (Phase 5 — já existente)
    └──novo──>  [PDF text extractor] (novo — pdfjs-dist ou similar)
    └──trivial─> [TXT reader] (leitura direta)

[Chip de preview de anexo no input]
    └──requer──> [Validação client-side tipo + tamanho]
    └──requer──> [Estado de upload/extração no componente ChatInput]

[Grounding no output do assistente]
    └──requer──> [Conteúdo extraído persistido no thread]
    └──requer──> [buildMultiTurnSystemPrompt] (Phase 8 — já existente, precisa de extensão)

[Persistência de conteúdo extraído no thread]
    └──requer──> [Modelo de dados do thread de conversa] (Phase 6 — já existente)
    └──conflito──> [Política D-07 de arquivo bruto efêmero] (arquivo bruto apagado; texto extraído sobrevive)

[Gating Pro do botão de anexo]
    └──reusa──> [Entitlement Pro check] (Phase 2 — já existente)
    └──reusa──> [CTA de upgrade inline] (Phase 2 — já existente)

[Fallback OCR para PDF escaneado] (diferenciador, não table stakes)
    └──requer──> [Detecção de extração parcial no PDF extractor]
    └──reusa──> [OCR Vision API] (Phase 5)
```

### Notas de dependência

- **Extrator de PDF é o único componente genuinamente novo**: CSV/XLSX e OCR já existem; TXT é trivial. O investimento principal de build está em um PDF extractor confiável.
- **buildMultiTurnSystemPrompt precisa de extensão**: O método já unificado (v1.1) deve receber um novo parâmetro opcional `attachmentContext: { fileName, extractedText, schema? }` para injetar grounding sem duplicar lógica.
- **Modelo de dados da `conversation_exchanges` precisa de coluna**: Adicionar `attachment_context JSONB nullable` à tabela existente para persistir conteúdo extraído sem alterar a estrutura de troca de mensagens.
- **Conflito intencional com D-07**: Arquivo bruto é descartado após extração (comportamento correto); o texto extraído persiste no thread — essa distinção deve ser explícita na UI ("Seu arquivo foi processado e removido. O conteúdo extraído permanece nesta conversa.").

---

## Zona Cinzenta: Tools dedicados OCR e File Analysis

Esta é a decisão de design mais importante do milestone. A pesquisa recomenda **manter os tools dedicados** pelos seguintes motivos evidenciados no ecossistema:

**Casos de uso são fundamentalmente diferentes:**
- Tool OCR dedicado: entrada é uma imagem de tabela → saída é TSV/CSV copiável. O usuário quer reconstruir a tabela, não gerar uma fórmula.
- Tool File Analysis dedicado: entrada é CSV/XLSX → saída é análise exploratória, gráficos, relatório executivo. O usuário quer entender os dados.
- Anexo universal: entrada é qualquer documento → saída é fórmula/SQL/regex/script contextualizada no documento. O usuário quer *gerar código* com contexto do arquivo.

**Absorver criaria regressão**: File Analysis tem fluxo de gráficos, pivot tables, e relatório executivo que não existem nos 5 tools de texto. Forçar tudo em um único ponto de entrada degradaria ambos os fluxos.

**Recomendação**: Manter OCR e File Analysis como tools dedicados na sidebar. O botão de anexo nos 5 tools de texto serve um caso de uso ortogonal: contextualizar a geração, não analisar o arquivo. Se futuramente a diferença virar confusão de usuário, revisitar com dados reais.

---

## MVP para o Milestone v1.2

### Lançar com (v1.2)

- [x] Botão paperclip no ChatInput de todos os 5 tools de texto
- [x] Drag-and-drop com FileDropZone
- [x] Validação client-side de tipo e tamanho (5 MB, formatos: CSV, XLSX, PNG, JPEG, PDF, TXT)
- [x] Chip de preview com ícone, nome, tamanho, botão ×
- [x] Estados de feedback: enviando → extraindo → pronto / erro
- [x] Extração: CSV/XLSX (schema parser existente), PNG/JPEG (OCR existente), PDF (novo), TXT (direto)
- [x] Injeção de contexto extraído no system prompt via `buildMultiTurnSystemPrompt`
- [x] Persistência do conteúdo extraído no thread (campo `attachment_context` na tabela de exchanges)
- [x] Badge "Com base em `arquivo.csv`" na resposta do assistente
- [x] Indicador no input de que documento ainda está ativo no thread
- [x] Gating Pro: botão visível mas desabilitado para free com CTA de upgrade
- [x] Mensagem explícita de descarte do arquivo bruto após extração

### Adicionar após validação (v1.2.x)

- [ ] Preview colapsável do texto extraído antes de enviar — adicionar quando usuários reportarem baixa qualidade de output por PDFs mal extraídos
- [ ] Warning badge de extração parcial — adicionar se logs mostrarem PDFs escaneados frequentes
- [ ] Sugestão proativa de tool ao detectar tipo de arquivo — adicionar após A/B test de onboarding

### Diferir para v2

- [ ] Fallback automático OCR para PDFs escaneados — custo de API e complexidade de detecção justificam só com volume
- [ ] Formatos adicionais (.docx, .odt) — adicionar com dados de demanda
- [ ] Múltiplos arquivos por mensagem — requer redesign de truncagem e context window management

---

## Feature Prioritization Matrix

| Feature | Valor ao Usuário | Custo de Implementação | Prioridade |
|---------|-----------------|----------------------|------------|
| Botão + drag-drop + chip de preview | HIGH | LOW | P1 |
| Extração CSV/XLSX (reuso) | HIGH | LOW | P1 |
| Extração PNG/JPEG OCR (reuso) | HIGH | LOW | P1 |
| Extração PDF (novo) | HIGH | MEDIUM | P1 |
| Injeção de contexto no system prompt | HIGH | MEDIUM | P1 |
| Persistência do contexto no thread | HIGH | MEDIUM | P1 |
| Badge de grounding na resposta | HIGH | LOW | P1 |
| Gating Pro + CTA | HIGH | LOW | P1 |
| Error states completos | HIGH | MEDIUM | P1 |
| Indicador de documento ativo no thread | MEDIUM | LOW | P2 |
| Preview colapsável do texto extraído | MEDIUM | MEDIUM | P2 |
| Warning badge de extração parcial | MEDIUM | LOW | P2 |
| Sugestão proativa de tool | LOW | MEDIUM | P3 |
| Fallback OCR para PDF escaneado | MEDIUM | HIGH | P3 |

**Chave de prioridade:** P1 = obrigatório para lançar o milestone | P2 = incluir se possível | P3 = diferir

---

## Competitor Feature Analysis (contexto de anexo em tools de geração)

| Feature | GPTExcel | FormulaBot | ChatGPT/Claude (referência de chat) | Abordagem Tabelin.IA |
|---------|----------|------------|--------------------------------------|----------------------|
| Anexo de arquivo em formula/SQL tool | Disponível como File Chat separado; não integrado à geração de fórmulas diretamente | Upload → análise exploratória; geração de fórmulas via conversa sobre o arquivo | Arquivo injetado como contexto em qualquer mensagem | Botão paperclip diretamente no ChatInput dos 5 tools — contexto vai para a geração, não para uma tela separada |
| Suporte a PDF | Não documentado claramente | Não claro | Claude: sim (full text). ChatGPT: sim (keyword search) | Novo extrator PDF para v1.2 |
| Persistência multi-turn do documento | Disponível no File Chat | Sim, na sessão | Claude: sim. ChatGPT: sim (com degradação após ~11 turns) | Persistência no thread via `attachment_context` — sem degradação dentro do cap de 50 exchanges |
| Gating de plano | Free tem limites de arquivo e quantidade; Pro+ desbloqueio de capacidade maior | Free tem limites | N/A (produto de chat geral) | Pro-only para anexo; free vê CTA de upgrade |
| Feedback de grounding | Não evidente | Não evidente | ChatGPT: sem label explícito. Claude: mostra o arquivo no histórico | Badge "Com base em `arquivo.csv`" — diferenciador de transparência |

---

## Error States Cobertos (checklist para requirements)

| Erro | Momento de detecção | Mensagem ao usuário | Recovery |
|------|--------------------|--------------------|---------|
| Formato não suportado | Client-side, no `onChange` | "Formato não suportado. Use CSV, XLSX, PNG, JPEG, PDF ou TXT." | Nenhum botão — usuário fecha o chip e seleciona outro arquivo |
| Arquivo > 5 MB | Client-side, no `onChange` | "Arquivo excede o limite de 5 MB." | Idem |
| Falha de upload (rede) | Server response | "Erro ao enviar o arquivo. Tente novamente." | Botão "Tentar novamente" no chip |
| Extração falhou (PDF corrompido, senha) | Server, após parse | "Não foi possível extrair o conteúdo. O arquivo pode estar protegido ou corrompido." | Sugestão de converter para PDF sem senha ou exportar como TXT |
| Extração vazia / resultado muito curto | Server, após parse | "O conteúdo extraído está vazio ou incompleto. A resposta pode ser menos precisa." | Warning non-blocking — permite enviar mesmo assim |
| PDF escaneado (< N chars/página) | Server, após parse | "Este PDF parece conter imagens sem texto. Extração pode ser incompleta." | Warning + sugestão de usar o tool OCR dedicado |
| Quota Pro expirou entre turns | Server, ao tentar usar anexo em follow-up | "Seu plano Pro expirou. Renove para usar anexos." | CTA de renovação |

---

## Sources

- https://www.shapeof.ai/patterns/attachments — Padrões canônicos de attachment UX em tools AI (2025)
- https://dev.to/amullagaliev/osd700-how-llms-and-messengers-handling-attachments-ui-4264 — Análise comparativa: Claude, ChatGPT, Telegram, WhatsApp — padrões de chip, preview, remoção
- https://medium.com/@georgekar91/how-do-our-chatbots-handle-uploaded-documents-01483cb99948 — Análise de como ChatGPT, Perplexity, Le Chat, Copilot, Claude e Gemini tratam documentos multi-turn
- https://dev.to/programmingcentral/stop-treating-ai-like-a-typewriter-the-ultimate-guide-to-file-uploads-attachments-in-chat-51pe — Implementação técnica de attachment em chat AI: estados, feedback, multi-turn
- https://www.assistant-ui.com/docs/guides/attachments — Estados formais de attachment (pending, running:progress, complete, incomplete:error) e padrão de adapter/remove
- https://www.patternfly.org/patternfly-ai/chatbot/chatbot-attachments/react-demos/ — Design system de chatbot: FileDropZone, chips, estados de carregamento
- https://gptexcel.uk/ — Baseline de competitor: limites de arquivo, tipos suportados, planos
- https://www.formulabot.com/ — Competitor: upload para análise; contexto de arquivos para geração de SQL/fórmulas

---

*Feature research para: Tabelin.IA v1.2 Anexos Universais*
*Pesquisado em: 2026-06-03*

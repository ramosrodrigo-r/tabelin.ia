# Phase 5: OCR, Charts, and Launch Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 05-ocr-charts-and-launch-hardening
**Areas discussed:** OCR: abordagem técnica, Charts: biblioteca e UX, Launch hardening: escopo E2E

---

## OCR: Abordagem Técnica

### Pergunta 1: Extração de tabela de imagem

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| OpenAI Vision | Envia imagem ao GPT-4o-mini, recebe JSON estruturado. Alta precisão, zero lib extra. | ✓ |
| Tesseract.js (local) | OCR tradicional, sem custo de API. Menos preciso para tabelas complexas. | |
| Outro provider (Google Vision, AWS Textract) | Maior precisão OCR especializado, nova infraestrutura e credenciais. | |

**Escolha:** OpenAI Vision (gpt-4o-mini)

---

### Pergunta 2: Modelo OpenAI para OCR

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| gpt-4o-mini | Mesmo modelo padrão, suporta vision, custo baixo (~$0,002/imagem). | ✓ |
| gpt-4o | Maior precisão, custo ~10x maior. | |
| Deixar configurável (env OPENAI_VISION_MODEL) | Variável de ambiente separada para OCR. | |

**Escolha:** gpt-4o-mini (consistente com OPENAI_MODEL env já estabelecido)

---

### Pergunta 3: Formato do resultado do OCR

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Preview tabela HTML + botões TSV/CSV | Tabela visual reconstruída + botões de cópia. Alinha com copy-ready pattern. | ✓ |
| Só texto TSV direto | Bloco de código TSV com botão copiar. Mais simples. | |
| Chat conversacional | Chat multi-turn para refinar reconstrução. Maior complexidade. | |

**Escolha:** Preview da tabela HTML + botões "Copiar TSV" e "Copiar CSV"

---

### Pergunta 4: Envio da imagem para OpenAI

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Base64 inline | Sem storage, sem URL pública. Alinha com PRIV-02. | ✓ |
| Upload temporário + URL | Armazena imagem temporariamente, gera URL pública transitória. | |

**Escolha:** Base64 inline

---

## Charts: Biblioteca e UX

### Pergunta 1: Biblioteca de charts

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Recharts | React-first, declarativo, integra com React 19. BarChart/LineChart/PieChart nativos. | ✓ |
| Chart.js + react-chartjs-2 | Canvas-based, grande ecossistema de exemplos. API mais imperativa. | |
| Nivo | D3-based, visual sofisticado, mais pesado. | |

**Escolha:** Recharts

---

### Pergunta 2: Como o usuário aciona gráficos

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Botão rápido no file-analysis | "Sugerir Gráfico" nos quick-action buttons (junto com Resumo Pivô e Relatório Executivo). | ✓ |
| Linguagem natural no chat | AI detecta intent de gráfico nas mensagens. | |
| Tab separada /workspace/charts | Ferramenta independente com seleção de arquivo e tipo. | |

**Escolha:** Botão rápido "Sugerir Gráfico" no file-analysis

---

### Pergunta 3: Como o gráfico aparece

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Inline no chat como mensagem visual | Recharts renderizado como mensagem do assistente. Botão copiar dados CSV. | ✓ |
| Modal/overlay sobre o chat | Gráfico em tela cheia. Interrompe fluxo do chat. | |
| Painel lateral deslizável | Gráfico ao lado do chat para comparação. | |

**Escolha:** Inline no chat como mensagem visual especial

---

### Pergunta 4: Seleção do tipo de gráfico

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| AI sugere + usuário pode trocar | AI analisa dados e sugere tipo. Botões Bar/Line/Pie para alternar sem nova requisição. | ✓ |
| Usuário escolhe o tipo antes | Selector de tipo antes de gerar. Mais controle, fluxo adicional. | |
| AI renderiza os 3 tipos | Mostra bar, line e pie simultâneos. Mais denso. | |

**Escolha:** AI sugere tipo adequado + botões de alternância Bar/Line/Pie

---

## Launch Hardening: Escopo E2E

### Pergunta 1: Cobertura do Playwright

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Todos os happy paths | Auth, formula, quota, checkout, multi-tools, upload+chat, OCR, charts, privacy cleanup. | ✓ |
| Subset crítico (auth + formula + quota) | Foco nos flows de maior risco. OCR e charts sem cobertura E2E. | |
| Só Fase 5 (OCR + charts) | Apenas features novos. Fases anteriores sem regressão automatizada. | |

**Escolha:** Todos os happy paths do MVP

---

### Pergunta 2: Infraestrutura dos testes E2E

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Banco de dados real em modo dev | Postgres local, setup/teardown real por suite. Valida integração real. | ✓ |
| Mocks de API (MSW ou similar) | Rápido e isolado, mas não valida integrações reais. | |
| Staging environment dedicado | Mais próximo de prod, requer infraestrutura extra. | |

**Escolha:** Banco de dados real em modo de desenvolvimento

---

### Pergunta 3: Providers externos nos testes

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Mock de OpenAI + mock webhook MP | Respostas fixas para AI, webhook sintético de pagamento. Rápido e determinístico. | ✓ |
| Chamadas reais a OpenAI + webhook sandbox MP | Realista mas lento, caro, dependente de conexão. | |
| Pular flows com providers externos | Omite formula generation e checkout dos testes. | |

**Escolha:** OpenAI mockado + webhook Mercado Pago sintético

---

## Claude's Discretion

- Estrutura exata do prompt de OCR ao gpt-4o-mini (formato JSON solicitado, tratamento de células vazias)
- Heurística de seleção de tipo de gráfico pelo AI
- Estrutura do componente de chart no ChatPanel
- Limite de tamanho de imagem para OCR (sugerido: 5 MB, consistente com uploads)
- Copy em português para OCR tool
- Estrutura de componentes da feature OCR
- Configuração de cores/tema Recharts
- Setup de mocks no Playwright

## Deferred Ideas

- Export de gráfico como PNG (v2)
- Modo conversacional de refinamento OCR (v2)
- Suporte a PDF com tabelas no OCR (v2)
- Charts em ferramenta separada /workspace/charts com múltiplos datasets (v2)
- CI/CD pipeline com Playwright no GitHub Actions (pós-launch)

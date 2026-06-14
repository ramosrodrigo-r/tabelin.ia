# Phase 20: Protocolo de Mutação Chat→Grade & Q&A - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-14
**Phase:** 20-Protocolo de Mutação Chat→Grade & Q&A
**Areas discussed:** Envio da Planilha no Contexto do Chat, Aplicação de Mutações na Planilha, Localização de Fórmulas Geradas pela IA, Exibição de Respostas Analíticas (Q&A)

---

## Envio da Planilha no Contexto do Chat

| Option | Description | Selected |
|--------|-------------|----------|
| Enviar toda a planilha (JSON/Markdown) | Enviar a planilha inteira (JSON/Markdown) para garantir precisão total em edições de até 200 linhas. | ✓ |
| Enviar metadados e amostra | Enviar a estrutura de colunas e tipos + amostra das 10 primeiras linhas para economizar tokens. | |

**User's choice:** Enviar a planilha inteira (JSON/Markdown) para garantir precisão total em edições de até 200 linhas.
**Notes:** O limite máximo de 200 linhas já implementado garante que a planilha caiba confortavelmente no contexto das chamadas da API sem grandes custos, permitindo que a IA possua visibilidade total do estado atual para efetuar mutações/análises com alta precisão.

---

## Aplicação de Mutações na Planilha

| Option | Description | Selected |
|--------|-------------|----------|
| Aplicar diretamente (Zero-click) | Aplicar diretamente na planilha (Zero-click) assim que o stream terminar. O usuário desfaz via Ctrl+Z (Undo) ou interface caso queira reverter. | ✓ |
| Confirmar antes de aplicar | Exibir um botão de confirmação ("Aplicar Alterações") no chat antes de atualizar a planilha. | |

**User's choice:** Aplicar diretamente na planilha (Zero-click) assim que o stream terminar. O usuário desfaz via Ctrl+Z (Undo) ou interface caso queira reverter.
**Notes:** Como o sistema já possui um mecanismo de undo/redo robusto e acessível por teclado (Ctrl+Z) e botões, aplicar diretamente reduz fricção na experiência de "planilha viva" auxiliada por IA.

---

## Localização de Fórmulas Geradas pela IA

| Option | Description | Selected |
|--------|-------------|----------|
| LLM gera em inglês, BFF traduz | O LLM gera no padrão inglês/americano e o BFF/frontend traduz dinamicamente para pt-BR (separador ';' e funções traduzidas como SE/PROCV/SOMA) antes de atualizar a planilha. Isso aumenta a confiabilidade da IA. | ✓ |
| LLM gera diretamente em pt-BR | O LLM é instruído por prompt a gerar fórmulas diretamente no padrão pt-BR (funções em português e separador ';'). | |

**User's choice:** O LLM gera no padrão inglês/americano e o BFF/frontend traduz dinamicamente para pt-BR (separador ';' e funções traduzidas como SE/PROCV/SOMA) antes de atualizar a planilha. Isso aumenta a confiabilidade da IA.
**Notes:** LLMs são muito mais precisos gerando fórmulas no padrão US. Fazer a tradução programática no BFF/frontend garante maior estabilidade e evita erros de sintaxe gerados pelo modelo.

---

## Exibição de Respostas Analíticas (Q&A)

| Option | Description | Selected |
|--------|-------------|----------|
| Apenas Markdown em streaming | Apenas texto formatado em Markdown com streaming direto no chat. | ✓ |
| Markdown + Cards visuais | Texto em Markdown acompanhado de cards visuais/métricas estruturadas no final da resposta (se aplicável). | |

**User's choice:** Apenas texto formatado em Markdown com streaming direto no chat.
**Notes:** Mantém a interface limpa e ágil. Melhorias de cards de métricas estruturadas são delegadas para marcos futuros de UI/UX.

---

## the agent's Discretion

- A formatação exata do prompt e regras de sistema do LLM (instruções few-shot).
- Detalhes de implementação do mapeamento inglês -> português para a tradução de fórmulas.
- Respostas mockadas determinísticas quando a chave `OPENAI_API_KEY` estiver ausente.

---

## Deferred Ideas

- **Metric Cards no Chat:** Cards estruturados de métricas em respostas analíticas.
- **Divisória lateral arrastável:** Redimensionamento flexível da grade vs. chat.
- **Persistência de Planilha + Conversa:** Escopo da Phase 21.

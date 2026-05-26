# Phase 4: Spreadsheet File Analysis - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 04-spreadsheet-file-analysis
**Areas discussed:** Armazenamento Temporário, Análise pelo AI, Modelo de Chat, Pivôs e Relatórios

---

## Armazenamento Temporário

**Questão 1 — Onde o arquivo enviado deve ficar armazenado temporariamente?**

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Buffer em memória | Parse no upload, extração imediata, descarta binário. Mais privado. | ✓ |
| Vercel Blob / S3 com TTL | Arquivo raw em storage externo com expiração automática. | |
| Banco de dados (base64) | Arquivo raw serializado no Postgres. Não recomendado para binários. | |

**Escolha:** Buffer em memória
**Notas:** Raw file nunca fica em disco ou storage externo — alinha com PRIV-02.

---

**Questão 2 — O schema extraído deve ser persistido entre sessões?**

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Persistido no Postgres | Schema + amostras em modelo UploadedFile. Usuário pode retomar. | ✓ |
| Session-only | Schema apenas em memória. Descartado ao fechar o navegador. | |

**Escolha:** Persistido no Postgres
**Notas:** Raw file nunca vai ao banco — apenas o schema extraído.

---

**Questão 3 — Como o arquivo deve ser limpo após o uso (PRIV-01)?**

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Cron job periódico | Job busca registros com > 1h de inatividade e deleta. | ✓ |
| Limpeza no próximo request | Verifica e deleta na próxima requisição do usuário. | |

**Escolha:** Cron job periódico
**Notas:** Garante cleanup independente de atividade do usuário.

---

## Análise pelo AI

**Questão 1 — Como o arquivo deve ser analisado pelo AI?**

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Parse local + contexto texto | csv-parse / xlsx extrai schema. Texto injetado no prompt. Raw file não sai do servidor. | ✓ |
| OpenAI Files API com file_expiry | Arquivo raw enviado para OpenAI com expiração configurada. | |

**Escolha:** Parse local + contexto texto
**Notas:** Alinha com PRIV-02 (sem raw file nos logs) e PRIV-04 (sem envio para provider de AI).

---

**Questão 2 — Quanto de análise deve ser feita localmente?**

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Heurística local | Tipos inferidos localmente (número, data, texto, booleano). AI recebe schema pré-calculado. | ✓ |
| AI infere tipos | Primeiras N linhas enviadas ao modelo para inferência. | |

**Escolha:** Heurística local
**Notas:** Mais rápido, sem custo de API extra por upload.

---

**Questão 3 — Para XLSX com múltiplas abas?**

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Seletor de aba | Lista abas após upload. Usuário escolhe qual analisar. | ✓ |
| Apenas primeira aba | Sempre usa Sheet1 sem seletor. | |
| Todas as abas juntas | Contexto combinado de todas as abas. | |

**Escolha:** Seletor de aba
**Notas:** Explícito e evita confusão com arquivos multi-aba.

---

## Modelo de Chat

**Questão 1 — Como deve funcionar o histórico de mensagens?**

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Multi-turn com histórico | ChatMessage no Prisma, conversa acumula contexto. | ✓ |
| Single-turn stateless | Cada pergunta injeta schema independentemente, sem histórico. | |

**Escolha:** Multi-turn com histórico
**Notas:** Permite referências a mensagens anteriores ("o que mais?").

---

**Questão 2 — Quantas mensagens de histórico são enviadas ao AI?**

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Janela deslizante de 10 mensagens | Últimas 10 + schema. Limite previsível de tokens. | ✓ |
| Histórico completo | Toda a conversa. Risco de exceder contexto em chats longos. | |
| Claude decide | Estratégia dinâmica por tokens. | |

**Escolha:** Janela deslizante de 10 mensagens

---

**Questão 3 — Múltiplos arquivos simultâneos?**

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Um arquivo ativo por vez | Upload substitui o atual. Interface mais simples. | ✓ |
| Múltiplos arquivos em abas | Vários arquivos abertos com chats separados. | |

**Escolha:** Um arquivo ativo por vez
**Notas:** Consistente com limite de 5 arquivos no histórico para usuários Free (QUOT-03).

---

## Pivôs e Relatórios

**Questão 1 — Como o usuário aciona pivôs e relatórios?**

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Botões rápidos | "Resumo Pivô" e "Relatório Executivo" fixos abaixo do chat. | ✓ |
| Linguagem natural | Usuário descreve a intenção; AI detecta e usa template. | |
| Ambos | Botões + detecção por linguagem natural. | |

**Escolha:** Botões rápidos
**Notas:** Mais descobrível para usuários novos.

---

**Questão 2 — Formato de entrega?**

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Markdown formatado | Tabelas, títulos, métricas. Copy-ready. | ✓ |
| Texto puro | Sem markdown. Fácil de colar em qualquer lugar. | |
| Download CSV/XLSX | Pivô exportado como arquivo. Scope maior. | |

**Escolha:** Markdown formatado

---

**Questão 3 — Onde o output aparece?**

| Opção | Descrição | Selecionada |
|-------|-----------|-------------|
| Inline no chat | Mensagem do assistente com botão de copiar. | ✓ |
| Painel separado | Output em painel dedicado ao lado do chat. | |

**Escolha:** Inline no chat

---

## Claude's Discretion

- Estrutura exata do JSON de schema no `UploadedFile`
- Heurísticas exatas de inferência de tipo (thresholds para data vs texto)
- Número de linhas de amostra enviadas ao AI (5–10 sugerido)
- Frequência do cron job de limpeza (15 min sugerido)
- Estrutura de componentes da feature (layout de chat vs dois painéis)
- Copy em português para labels, placeholders, mensagens de erro
- Schema do `ChatMessage` (role, content, createdAt, etc.)

## Deferred Ideas

- Export de pivô/relatório como CSV/XLSX — scope maior, Fase 5 ou v2
- Múltiplos arquivos abertos simultâneos — v2 (team/workspace)
- Modo de comparação entre dois arquivos — v2
- Integração com Google Drive/OneDrive — v2 (INTG-01/02)

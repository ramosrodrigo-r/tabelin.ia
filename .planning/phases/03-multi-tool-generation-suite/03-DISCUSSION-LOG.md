# Phase 3: Multi-Tool Generation Suite - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 03-multi-tool-generation-suite
**Areas discussed:** Navegação e rotas, Estrutura da ferramenta Scripts, Avisos de segurança (SAFE-01), Renderização de código e Pro template

---

## Navegação e Rotas

| Option | Description | Selected |
|--------|-------------|----------|
| Rota própria por ferramenta | /workspace/scripts, /workspace/sql, /workspace/regex — URLs diretas, sidebar por rota | ✓ |
| Tabs ou painel no /workspace | Todas as ferramentas em /workspace, estado local controla ativa | |
| Você decide | Claude escolhe a abordagem | |

**User's choice:** Rota própria por ferramenta — /workspace/scripts, /workspace/sql, /workspace/regex

| Option | Description | Selected |
|--------|-------------|----------|
| Não preservar | Cada ferramenta começa limpa | ✓ |
| Preservar dentro da sessão | Estado persiste no layout ao voltar para a ferramenta | |
| Você decide | Claude escolhe conforme padrão mais simples | |

**User's choice:** Não preservar — cada ferramenta começa limpa ao navegar

---

## Estrutura da Ferramenta Scripts

| Option | Description | Selected |
|--------|-------------|----------|
| Uma ferramenta 'Scripts' com seletor | Único slot na sidebar, seletor de tipo (VBA/Apps Script/Airtable) dentro da ferramenta | ✓ |
| Três ferramentas separadas | Sidebar mostra VBA, Apps Script e Airtable como entradas individuais | |

**User's choice:** Uma ferramenta 'Scripts' com seletor de tipo

| Option | Description | Selected |
|--------|-------------|----------|
| Não — só geração (Scripts) | CODE-01/02/03 especificam apenas geração | ✓ |
| Sim — geração e explicação | Adicionar modo explain para scripts | |
| Você decide | Claude escolhe escopo | |

**User's choice (Scripts modo):** Não — só geração

| Option | Description | Selected |
|--------|-------------|----------|
| Não — só geração (SQL) | SQL-01/02 especificam apenas geração com dialeto | ✓ |
| Sim — geração e explicação | Adicionar modo explain para SQL | |

**User's choice (SQL modo):** Não — só geração

**Notes:** Regex é a exceção — REGX-02 exige modo explicar, então Regex terá gerar + explicar como a Formula.

---

## Avisos de Segurança (SAFE-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Banner inline no output | Aviso colorido acima do código, copy button disponível | ✓ |
| Confirmação antes de copiar | Modal/inline prompt ao clicar Copiar em output destrutivo | |
| Embutido no output pelo AI | AI inclui aviso como parte do texto gerado | |

**User's choice:** Banner inline no output — copy button continua disponível

| Option | Description | Selected |
|--------|-------------|----------|
| DROP, DELETE, TRUNCATE, UPDATE sem WHERE | Conjunto conservador e objetivo | ✓ |
| Qualquer DML + DDL | INSERT, UPDATE, DELETE, CREATE, DROP, ALTER recebe aviso | |
| Você decide com base no AI | AI classifica o risco destrutivo | |

**User's choice (SQL destrutivo):** DROP, DELETE, TRUNCATE, UPDATE sem WHERE

| Option | Description | Selected |
|--------|-------------|----------|
| Operações de delete de arquivo/linha/planilha | VBA: DeleteFile/Kill/Rows.Delete; Apps Script: remove*/deleteSheet; Airtable: deleteRecord | ✓ |
| Qualquer acesso ao sistema de arquivos ou API externa | Mais amplo | |
| Você decide | Claude classifica | |

**User's choice (Scripts destrutivo):** Operações de delete de arquivo/linha/planilha

---

## Renderização de Código e Pro Template

| Option | Description | Selected |
|--------|-------------|----------|
| Syntax highlighting | Shiki ou Prism.js, colorização por linguagem | ✓ |
| Plain code-font sem highlight | Fonte monoespaçada com background diferenciado | |
| Você decide | Claude escolhe pela stack | |

**User's choice:** Syntax highlighting (Shiki ou Prism.js)

| Option | Description | Selected |
|--------|-------------|----------|
| Template de planilha estruturado pronto para copiar | Cabeçalhos, colunas, fórmulas sugeridas como Markdown ou CSV | ✓ |
| Template de tabela HTML/visual | Output visual formatado | |
| Ferramenta de schema de planilha | Schema completo com nomes de abas, tipos, instruções | |

**User's choice (PRO-01):** Template de planilha estruturado copy-ready (Markdown/CSV)

| Option | Description | Selected |
|--------|-------------|----------|
| Ferramenta separada na sidebar | Visível a todos, Pro-only ao usar | ✓ |
| Integrado como modo na Formula | Formula ganha terceiro modo "Template" | |
| Você decide | Claude escolhe localização | |

**User's choice (Pro template nav):** Ferramenta separada na sidebar

| Option | Description | Selected |
|--------|-------------|----------|
| Apenas pt-BR | Output sempre em português | ✓ |
| pt-BR e en com seletor | Seletor de idioma como na Formula | |
| Você decide | Claude baseia na consistência | |

**User's choice (Pro template lang):** Apenas pt-BR

---

## Claude's Discretion

- Estrutura de componentes por ferramenta (replicar Formula ou abstrair base compartilhado)
- Biblioteca de syntax highlighting exata
- Mecanismo de classificação de destrutividade (pattern matching, AI estruturado, ou híbrido)
- Copy em português para labels e mensagens de cada ferramenta

## Deferred Ideas

- Modo "Explicar" para Scripts e SQL — excluído explicitamente desta fase
- Pro template com suporte a idioma inglês — futuro
- Pro template com output visual HTML — futuro

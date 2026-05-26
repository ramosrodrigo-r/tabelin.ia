# Phase 3: Multi-Tool Generation Suite - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>

## Phase Boundary

Phase 3 ativa Scripts (VBA / Google Apps Script / Airtable Scripts), SQL e Regex como ferramentas geradoras copy-ready dentro do workspace existente. Cada ferramenta tem rota própria, seletores relevantes, output com syntax highlighting, e avisos de segurança para operações destrutivas. Pro users ganham acesso a uma ferramenta separada de geração de templates de planilha estruturados.

Esta fase não inclui: upload de arquivos, chat com schema, OCR, charts, múltiplos usuários, modo "explicar" para SQL ou Scripts (apenas Regex tem explicar), nem internacionalização do Pro template (apenas pt-BR).

</domain>

<decisions>

## Implementation Decisions

### Navegação e Roteamento

- **D-01:** Cada ferramenta nova tem rota própria na App Router: `/workspace/scripts`, `/workspace/sql`, `/workspace/regex`. A sidebar ativa o link correto por rota. O slot "Templates" (Pro) também terá rota própria (`/workspace/templates` ou similar).
- **D-02:** Ao navegar entre ferramentas, o estado não é preservado. Cada ferramenta começa limpa. Não há gerenciamento de estado global entre ferramentas.

### Estrutura da Ferramenta Scripts

- **D-03:** VBA, Google Apps Script e Airtable Scripts ficam em uma única ferramenta "Scripts" na sidebar com um seletor de tipo de script (equivalente ao seletor de plataforma da Formula). Um único slot na nav.
- **D-04:** A ferramenta Scripts é apenas geração — sem modo "explicar". Requirements CODE-01/02/03 especificam apenas geração a partir de prompt português.
- **D-05:** A ferramenta SQL é apenas geração com seletor de dialeto (PostgreSQL, MySQL, SQL Server, Oracle, BigQuery). Sem modo "explicar SQL".
- **D-06:** A ferramenta Regex tem dois modos: gerar (REGX-01) e explicar regex colado (REGX-02). Segue o mesmo modelo dualista da Formula (gerar / explicar).

### Avisos de Segurança (SAFE-01)

- **D-07:** O aviso de segurança aparece como um banner inline no painel de output, acima do código gerado. O botão de copiar permanece disponível — o warning não bloqueia o fluxo.
- **D-08:** Para SQL, operações destrutivas que disparam aviso: `DROP`, `DELETE`, `TRUNCATE`, e `UPDATE` sem cláusula `WHERE`.
- **D-09:** Para Scripts (VBA/Apps Script/Airtable), operações destrutivas que disparam aviso: operações de delete de arquivo, linha, ou planilha — ex: VBA `DeleteFile`/`Kill`/`Rows.Delete`, Apps Script `DriveApp.remove*`/`deleteSheet`, Airtable `deleteRecord`.
- **D-10:** A classificação de destrutividade pode ser feita por análise do output gerado (pattern matching no código) ou pela resposta estruturada do AI. Claude tem discrição sobre a implementação da classificação, desde que seja determinística e consistente.

### Renderização de Código

- **D-11:** O output de scripts, SQL e regex usa syntax highlighting — biblioteca leve como Shiki ou Prism.js. A linguagem para highlighting é determinada pelo tipo selecionado (SQL para SQL, VBA/JavaScript para scripts, regex para Regex).
- **D-12:** O padrão de output mantém o mesmo layout de dois painéis (input/output) e copy button proeminente da Formula.

### Pro Template de Planilha (PRO-01)

- **D-13:** O template de planilha Pro é uma ferramenta separada na sidebar — visível para todos os usuários, mas gerando CTA de upgrade para usuários Free ao tentar usar.
- **D-14:** O output do Pro template é uma planilha estruturada copy-ready: cabeçalhos, colunas sugeridas, fórmulas de referência, e opcionalmente instruções de uso — entregue como Markdown formatado ou CSV.
- **D-15:** Pro template suporta apenas pt-BR. Sem seletor de idioma para o MVP.
- **D-16:** O input do Pro template é uma descrição em português do tipo de planilha desejada (ex: "controle de gastos mensais", "pipeline de vendas", "folha de ponto").

### Claude's Discretion

- Estrutura exata de componentes por ferramenta (pode espelhar o padrão Formula com InputPanel/OutputPanel/hook ou extrair um base compartilhado).
- Se extrair uma abstração de ferramenta compartilhada ou duplicar o padrão Formula por ferramenta — escolher o que minimizar débito técnico.
- Biblioteca de syntax highlighting exata (Shiki, Prism.js, ou outra leve compatível com Next.js App Router).
- Mecanismo de classificação de destrutividade (pattern matching, resposta AI estruturada, ou híbrido).
- Nomes exatos de rotas e slugs (desde que /workspace/scripts, /workspace/sql, /workspace/regex sejam os padrões-base).
- Copy em português para labels, placeholders, e mensagens de erro de cada ferramenta.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope

- `PRD.md` — Requisitos originais, módulos de código/SQL/regex/templates, personas e prioridades de MVP.
- `.planning/PROJECT.md` — Contexto vivo do projeto, princípios Brazil-first, constraints e decisões-chave.
- `.planning/REQUIREMENTS.md` — Requirements checkáveis v1: CODE-01/02/03, SQL-01/02, REGX-01/02, SAFE-01, PRO-01.
- `.planning/ROADMAP.md` — Goal, success criteria, e plan outline da Fase 3.

### Prior Phase Decisions

- `.planning/phases/01-localized-formula-workspace/01-CONTEXT.md` — Modelo de interação (D-08), server-side AI (D-14), validação estruturada (D-15), workspace quiet (D-07), streaming (D-16).
- `.planning/phases/02-freemium-billing-and-entitlements/02-CONTEXT.md` — Quota reservation/confirm/release pattern, Pro entitlement check, blocked-state CTA.

### Existing Code Integration Points

- `apps/web/src/components/app/sidebar.tsx` — Slots desativados para Scripts, SQL, Regex (precisam ser ativados com rotas próprias).
- `apps/web/src/features/formula/formula-tool.tsx` — Padrão de composição de ferramenta a replicar/abstrair.
- `apps/web/src/features/formula/components/formula-input-panel.tsx` — InputPanel pattern com seletores, modo e validação inline.
- `apps/web/src/features/formula/components/formula-output-panel.tsx` — OutputPanel pattern com status, warnings, copy button, e metadata.
- `apps/web/src/features/formula/hooks/use-formula-stream.ts` — Hook de streaming NDJSON a replicar para cada nova ferramenta.
- `apps/web/src/app/api/tools/formula/generate/route.ts` — Route handler pattern com quota reservation/confirm/release a seguir.
- `apps/web/src/server/tools/formula-repository.ts` — ToolRequest persistence pattern a estender para novos toolKinds.
- `prisma/schema.prisma` — ToolRequest model existente (toolKind, mode, status, latencyMs) a estender ou reutilizar para scripts/SQL/regex.
- `packages/shared/src/index.ts` — Shared contracts para tipos, schemas e fixtures — adicionar equivalentes para cada nova ferramenta.

### Research

- `.planning/research/STACK.md` — Stack recomendada e direções de integração de AI.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **Formula tool pattern completo** (`features/formula/`): `FormulaTool` (estado), `FormulaInputPanel` (seletores + input), `FormulaOutputPanel` (status/output/copy), `useFormulaStream` (NDJSON hook) — template direto para cada nova ferramenta.
- **Route handler pattern** (`app/api/tools/formula/generate/route.ts`): autenticação → parse/validate → quota reserve → AI → validate output → confirm quota → record → stream response. Reutilizável para scripts/SQL/regex com modificações mínimas.
- **Quota service** (`server/usage/quota-service`): `reserveToolUse`, `confirmToolUse`, `releaseToolUse` — já funcionam com qualquer `toolKind`.
- **ToolRequest model** (Prisma): `toolKind` é string — pode receber "script", "sql", "regex", "template" sem migração de schema obrigatória.
- **Sidebar slots** já existem com labels corretos (Scripts, SQL, Regex, File Analysis, OCR) — apenas ativar links.

### Established Patterns

- App code usa Next.js App Router, rotas sob `apps/web/src/app/api` e pages sob `apps/web/src/app/(workspace)`.
- Server-only logic sob `apps/web/src/server`.
- Shared Zod contracts sob `packages/shared`.
- Streaming NDJSON com `content-type: application/x-ndjson`.
- UI usa Tailwind CSS com classes funcionais (sem design system externo complexo).

### Integration Points

- Ativar links na sidebar: `{ label: "Scripts", href: "/workspace/scripts", active: true }`.
- Criar `apps/web/src/app/(workspace)/workspace/scripts/page.tsx` (e equivalentes para sql, regex, templates).
- Adicionar shared schemas para cada nova ferramenta em `packages/shared/src/`.
- Quota service já suporta novos `toolKind` — sem mudança de API.
- Pro entitlement check na workspace page já está disponível via `UserEntitlement` (patterns do Phase 2).

</code_context>

<specifics>

## Specific Ideas

- A ferramenta Scripts deve funcionar como a Formula com seletor de plataforma — o seletor de tipo de script (VBA / Apps Script / Airtable) é o equivalente do seletor de plataforma.
- O warning de segurança deve ser visualmente distinto (cor de alerta, ícone de atenção) mas não intrusivo — inline acima do bloco de código, não modal.
- O Pro template deve sentir como uma planilha real gerada pelo AI: cabeçalhos em português, colunas com tipos sugeridos, fórmulas de referência no estilo brasileiro.
- Syntax highlighting deve ser sutil e compatível com o visual quiet do workspace — não sobrepor com cores excessivas.

</specifics>

<deferred>

## Deferred Ideas

- Modo "Explicar" para Scripts e SQL — não está nos requirements da Fase 3 e foi explicitamente excluído nesta discussão.
- Pro template com suporte a idioma inglês (en) — deferred para versão futura quando houver demanda internacional.
- Pro template com output visual (HTML table) — deferred; MVP entrega Markdown/CSV copy-ready.
- Line numbering nos blocos de código — pode ser considerado pelo agente se a biblioteca de syntax highlighting suportar sem overhead.

</deferred>

---

*Phase: 03-multi-tool-generation-suite*
*Context gathered: 2026-05-25*

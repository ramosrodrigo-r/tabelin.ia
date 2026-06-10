# Phase 14: Tabela Viva - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-09
**Phase:** 14-tabela-viva
**Areas discussed:** Origem do conteúdo do grid, Escopo do motor de fórmulas, UX de erro de fórmula, Formatação BR (R$ / data)

---

## Origem do conteúdo do grid

| Option | Description | Selected |
|--------|-------------|----------|
| IA gera estrutura + dados + fórmulas | Estende o TableSpecPayload (colunas type 'formula' + template + seed data); grid abre preenchido | ✓ |
| IA gera só colunas + fórmulas-template | Colunas + qual é fórmula, mas linhas começam vazias para o usuário digitar | |
| Grid vazio, só dimensões | IA só define título/colunas/rowCount; usuário digita tudo; schema atual basta | |

**User's choice:** IA gera estrutura + dados + fórmulas
**Notes:** Alinhado com ARCHITECTURE.md e com os critérios de sucesso (tabela populada cujas fórmulas recalculam após editar B2). Implica estender o `tableSpecPayloadSchema` de forma retrocompatível com o `table-clarifier.ts`.

---

## Escopo do motor de fórmulas

| Option | Description | Selected |
|--------|-------------|----------|
| Refs A1 + intervalos + cascata | Suporta B2, B1:C10 cross-row, recálculo em cascata via grafo de dependências; necessário para PROCV | ✓ |
| Só fórmulas da própria linha | Apenas =SOMA(B{row};C{row}); sem intervalos cross-row nem PROCV | |

**User's choice:** Refs A1 + intervalos + cascata
**Notes:** Exigido pelo critério de sucesso #3 (`=PROCV(A1;B1:C10;2;0)`). Como formulajs é calculadora de funções isoladas, a fase constrói camada fina: parser A1/intervalos, ordenação topológica + detecção de ciclo, mapa PT-BR→EN, parse de separadores BR (`;` / `,`).

---

## UX de erro de fórmula

| Option | Description | Selected |
|--------|-------------|----------|
| Código Excel + tooltip pt-BR | #NAME?/#REF!/#DIV/0!/#CIRC! inline + tooltip explicativo em pt-BR no hover | ✓ |
| Só código estilo Excel | Apenas códigos inline, sem tooltip | |
| Mensagem amigável pt-BR | Texto em português na célula em vez do código Excel | |

**User's choice:** Código Excel + tooltip pt-BR
**Notes:** Usuário de Excel BR já reconhece os códigos; tooltip educa sem poluir a célula.

---

## Formatação BR (R$ / data)

| Option | Description | Selected |
|--------|-------------|----------|
| Pelo `type` que a IA atribui | currency/date/number/text → formatação derivada; valor cru armazenado; formatação só na exibição | ✓ |
| Type da IA + heurística por nome | Como acima + fallback por nome de coluna (preço/valor/total → R$) | |
| Só heurística por nome | Decide formato só pelo nome da coluna | |

**User's choice:** Pelo `type` que a IA atribui
**Notes:** Schema já tem campo `type` por coluna. Edição opera sobre o valor cru; formatação é apenas de exibição.

---

## Claude's Discretion

- Biblioteca de grid: `react-datasheet-grid` v4.11.6 (MIT), conforme STACK.md.
- Forma concreta do schema estendido (nomes de campos, seed vs fórmula-template), desde que retrocompatível.
- Implementação de copy/paste, undo/redo e ordenação via capacidades nativas do grid.
- Conjunto exato das ~20 funções no mapa PT-BR→EN inicial e fallback de função não mapeada (sugestão: `#NAME?`).

## Deferred Ideas

- Export CSV/XLSX sanitizado e migração do ToolNav — Phase 15.
- Edição retroativa via chat, AutoFiltro, language pack pt-BR completo (100+ funções) — v2.1/v2.x.
- Persistência de edições manuais do grid (tabelas salvas/nomeadas) — exigiria modelo Prisma; fora do escopo v2.0.

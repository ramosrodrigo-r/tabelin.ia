# Phase 15: Export, UX Migration & Hardening - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning
**Source:** plan-phase decision pass (research + 4 locked decisions)

<domain>
## Phase Boundary

Final v2.0 hardening phase. Três workstreams:
1. **Export (EXP-01, EXP-02, SEC-04)** — exportar a Tabela Viva (Phase 14) para CSV e XLSX com sanitização de injeção de fórmula. Único trabalho greenfield real.
2. **UX migration** — remover o `<ToolNav />` da rota raiz `/workspace` (o chat unificado da Phase 12 já é o default mount); cada tool continua acessível.
3. **Fixture fallback** — o table generator já tem fixture fallback (`table-clarifier.ts:254` retorna spec determinística sem `OPENAI_API_KEY`); esta fase só precisa **testar/validar**, não construir.

</domain>

<decisions>
## Implementation Decisions

### Export — formato CSV
- Separador: **ponto-e-vírgula `;`** (padrão Excel locale pt-BR; abre direto em colunas).
- Incluir **BOM UTF-8** (`U+FEFF`) no início do arquivo para acentos não quebrarem no Excel.
- Sanitização de injeção (SEC-04 / OWASP CSV injection): células cujo valor começa com `=`, `+`, `-`, `@`, TAB (`\t`) ou CR (`\r`) recebem prefixo `'`.

### Export — formato XLSX
- Usar a lib `xlsx@0.18.5` **já instalada** — sem novas dependências.
- Todas as células gravadas como **texto** via cell-objects `{ t: "s", v: ... }` em `aoa_to_sheet`, garantindo que nada seja interpretado como fórmula (SEC-04 coberto pela própria tipagem de string).

### Export — conteúdo
- Exportar **valores calculados** (`displayRows` — o resultado final que o usuário vê), gravados como texto. NÃO exportar templates de fórmula brutos.

### UX migration
- Remover `<ToolNav />` da renderização da raiz (hoje em `unified-chat-tool.tsx:455`). O chat unificado permanece como entry point default.
- Tools continuam acessíveis pela **sidebar existente** do workspace (reuso) + deep links (`/workspace/<tool>`). A sidebar é o mecanismo primário de acesso pós-remoção.

### Claude's Discretion
- Posição/label exatos do botão "Exportar CSV" / "Exportar XLSX" (slot já existe em `table-grid-panel.tsx:446`).
- Estrutura interna da utilidade pura de export e nomes de helpers.
- Detalhes de download no browser (Blob + anchor download vs `XLSX.writeFile`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research
- `.planning/phases/15-export-ux-migration-hardening/15-RESEARCH.md` — mapeamento completo de arquivos, API SheetJS, regra OWASP, pitfalls pt-BR, Validation Architecture.

### Export target (Tabela Viva — Phase 14)
- `table-grid-panel.tsx` (slot de botão de export ~linha 446; shape de `displayRows`).

### UX migration
- `unified-chat-tool.tsx` (ToolNav renderizado ~linha 455).

### Fixture fallback (já implementado — só testar)
- `table-clarifier.ts` (`buildTableSpec` ~linha 254 — spec determinística sem `OPENAI_API_KEY`). Ver [[fixture-mode-sem-openai-key]].

</canonical_refs>

<specifics>
## Specific Ideas

- Test framework: **vitest 4.1.7**, config `apps/web/vitest.config.ts`. Quick run: `pnpm --filter web test`.
- Package manager: **pnpm** (não npm).
- A utilidade de export deve ser **pura** (`table-export.ts`) e testável unitariamente — sanitização e tipagem de célula são o coração do SEC-04.

</specifics>

<deferred>
## Deferred Ideas

- UI-SPEC formal para a migração de navegação — pulado (mudança mínima, sem UI nova).

</deferred>

---

*Phase: 15-export-ux-migration-hardening*
*Context gathered: 2026-06-09 via plan-phase decision pass*

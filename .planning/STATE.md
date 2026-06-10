---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Planilha Viva + Chat de IA
status: planning
last_updated: "2026-06-10T22:22:37.058Z"
last_activity: 2026-06-10 — ROADMAP.md v3.0 criado (Phases 16-22), 31/31 requisitos mapeados
progress:
  total_phases: 11
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-08)

**Core value:** Usuários brasileiros trabalham numa planilha viva sempre na tela e pedem em português que a IA manipule os dados na própria grade — ou responda dúvidas sobre eles — sem escolher ferramentas nem navegar entre módulos.
**Current focus:** Phase 16 — Tela Única & Fim da Navegação Multi-Ferramenta

## Current Position

Phase: 16 — Tela Única & Fim da Navegação Multi-Ferramenta
Plan: —
Status: Planning
Last activity: 2026-06-10 — ROADMAP.md v3.0 criado (Phases 16-22), 31/31 requisitos mapeados

## Performance Metrics

**Velocity:**

- Total plans completed: 54 (v1.0–v1.2 acumulado)
- Average duration: ~10 min/plan
- Total execution time: ~7.8 hours (histórico acumulado)

**Recent Trend:**

- Last 5 plans: 8, 8, 10, 7, 8 min
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v2.0 planning: Engine de fórmulas `@formulajs/formulajs` (MIT) — HyperFormula GPL bloqueado sem licença comercial assinada
- v2.0 planning: Classificação de intent embutida na chamada de geração (Structured Outputs, campo intent primeiro) — preserva SLA 2,5s
- v2.0 planning: Partição `userId+toolKind` mantida + kind `"unified_table"` adicionado — sem migração Prisma
- v2.0 planning: Grid state efêmero; `TableSpecPayload` persistido em `ConversationExchange.assistantPayload` (padrão File Analysis)
- v2.0 planning: Abas por tool preservadas como deep links — chat unificado é default, não substituição forçada
- [Phase ?]: Wiring final Phase 14-06

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 14: PT_BR_TO_EN mapping (~20 funções) deve ser validado empiricamente com `=PROCV()`, `=SOMASE()`, `=SE()` antes de conectar o grid ao gerador
- Phase 12: Validar acurácia do classificador com 20 prompts reais em português antes de avançar

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Teams | Team workspaces and seat management | v2+ | v1.0 init |
| History | Busca e filtro no histórico | Future | v1.1 requirements |
| History | Export de conversas (PDF, texto) | Future | v1.1 requirements |
| Attachments | Fallback OCR automático para PDFs escaneados | Post-v1.2 | v1.2 requirements |
| Attachments | Suporte a .docx / .odt | Post-v1.2 | v1.2 requirements |
| Tech debt | Phase 9 zip-guard `_lastOriginalSizes` estado global entre requisições | Backlog | v1.2 close |
| Tech debt | Phase 9 csv-xlsx N+1 read multi-aba + `catch {}` mascara INVALID_BYTES | Backlog | v1.2 close |
| Table v2.x | Edição retroativa da tabela via chat | v2.1 | v2.0 requirements |
| Table v2.x | AutoFiltro (filtro dropdown por coluna) | v2.x | v2.0 requirements |
| Table v2.x | Language pack pt-BR completo (100+ funções) | v2.x | v2.0 requirements |
| Phase 14-tabela-viva P01 | 12 | 2 tasks | 6 files |
| Phase 14 P02 | 8 | 2 tasks | 3 files |
| Phase 14-tabela-viva P04 | 8 | 1 tasks | 1 files |
| Phase 14-tabela-viva P06 | 12 | 2 tasks | 1 files |

## Session Continuity

Last session: 2026-06-10T22:22:37.041Z
Stopped at: Phase 16 context gathered
Resume file: .planning/phases/16-tela-nica-fim-da-navega-o-multi-ferramenta/16-CONTEXT.md

## Operator Next Steps

- Run `/gsd-plan-phase 14` to plan Phase 14 (Tabela Viva — grid editável com fórmulas vivas, localização pt-BR, segurança XSS). No CONTEXT.md yet.
- ⚠️ Antes de executar qualquer fase: há ~50 deleções pendentes de docs das Phases 09/10/11 na árvore git (não staged). Limpar/commitar antes de rodar execute-phase para não contaminar o worktree do executor.

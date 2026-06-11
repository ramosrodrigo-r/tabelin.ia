---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Planilha Viva + Chat de IA
status: executing
last_updated: "2026-06-11T20:20:39.738Z"
last_activity: 2026-06-11 -- Phase 17 planning complete
progress:
  total_phases: 11
  completed_phases: 1
  total_plans: 5
  completed_plans: 2
  percent: 9
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-08)

**Core value:** Usuários brasileiros trabalham numa planilha viva sempre na tela e pedem em português que a IA manipule os dados na própria grade — ou responda dúvidas sobre eles — sem escolher ferramentas nem navegar entre módulos.
**Current focus:** Phase 17 — desligar monetização & cota

## Current Position

Phase: 17
Plan: Not started
Status: Ready to execute
Last activity: 2026-06-11 -- Phase 17 planning complete

## Performance Metrics

**Velocity:**

- Total plans completed: 56 (v1.0–v1.2 acumulado)
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
- Phase 12 → reescrito para o pivô v3.0: o classificador de 9 vias (`intent-classifier.ts`) é demolido na Phase 18 (ramos sql/regex/script/template/file_analysis/ocr saem do switch do `route.ts` e do `render-dispatcher.tsx`), então a antiga matriz de confusão evapora — NÃO re-validar o classificador velho. O risco migra para um eixo binário NOVO criado na Phase 20: *operação na planilha* (SC#2, ops estruturadas na grade) vs *pergunta analítica/Q&A* (SC#4, só texto). Falha assimétrica: Q&A lido como mutação altera a grade indevidamente (undo salva, mas surpreende); mutação lida como Q&A faz a proposta de valor falhar silenciosamente. **Validação:** definir ~20 prompts PT reais ambíguos ("some a coluna Valor" = fórmula na grade ou total no chat?) como critério de aceite/UAT da Phase 20. **Checkpoint:** na transição 17→18, confirmar que esse eval binário foi plantado no plano da Phase 18 (rótulos de intent) e Phase 20 (UAT). Não bloqueia a Phase 17.

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

Last session: 2026-06-11T14:22:33.985Z
Stopped at: Phase 16 completa (2/2) e verificada — sessão resumida, indo para Phase 17
Resume file: none

## Operator Next Steps

- Phase 17 (Desligar Monetização & Cota) ainda não tem diretório nem CONTEXT.md. Rodar `/gsd-plan-phase 17` para planejar direto (ou `/gsd-discuss-phase 17` para levantar contexto antes).
- ⚠️ Checkpoint na transição 17→18: confirmar que o eval binário "mutação na grade vs Q&A" (~20 prompts PT reais) foi plantado no plano da Phase 18 (rótulos de intent corretos) e da Phase 20 (UAT/aceite). Ver concern reescrito da Phase 12 em Blockers/Concerns.
- Árvore git limpa (só `AICHAT.md` untracked) — sem deleções pendentes contaminando o worktree.

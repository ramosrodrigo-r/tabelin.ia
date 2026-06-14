---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Planilha Viva + Chat de IA
status: verifying
stopped_at: Phase 20 context gathered
last_updated: "2026-06-14T17:53:18.281Z"
last_activity: 2026-06-14
progress:
  total_phases: 11
  completed_phases: 4
  total_plans: 15
  completed_plans: 16
  percent: 36
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-08)

**Core value:** Usuários brasileiros trabalham numa planilha viva sempre na tela e pedem em português que a IA manipule os dados na própria grade — ou responda dúvidas sobre eles — sem escolher ferramentas nem navegar entre módulos.
**Current focus:** Phase 19 — ingestao-tri-estado-da-planilha

## Current Position

Phase: 20
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-06-14

## Performance Metrics

**Velocity:**

- Total plans completed: 58 (v1.0–v1.2 acumulado)
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
- [Phase ?]: Phase 19-02: controles de ingestao (Nova em Branco/Carregar Exemplo/Importar) so no grid principal; importacao aciona setSpec e entra no historico de undo; falha preserva o estado anterior.

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 14: PT_BR_TO_EN mapping (~20 funções) deve ser validado empiricamente com `=PROCV()`, `=SOMASE()`, `=SE()` antes de conectar o grid ao gerador
- Phase 12 → reescrito para o pivô v3.0: o classificador de 9 vias (`intent-classifier.ts`) é demolido na Phase 18 (ramos sql/regex/script/template/file_analysis/ocr saem do switch do `route.ts` e do `render-dispatcher.tsx`), então a antiga matriz de confusão evapora — NÃO re-validar o classificador velho. O risco migra para um eixo binário NOVO criado na Phase 20: *operação na planilha* (SC#2, ops estruturadas na grade) vs *pergunta analítica/Q&A* (SC#4, só texto). Falha assimétrica: Q&A lido como mutação altera a grade indevidamente (undo salva, mas surpreende); mutação lida como Q&A faz a proposta de valor falhar silenciosamente. **Validação:** definir ~20 prompts PT reais ambíguos ("some a coluna Valor" = fórmula na grade ou total no chat?) como critério de aceite/UAT da Phase 20. **Checkpoint:** na transição 17→18, confirmar que esse eval binário foi plantado no plano da Phase 18 (rótulos de intent) e Phase 20 (UAT). Não bloqueia a Phase 17.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260611-svu | Corrigir WR-01 (clarificação chat→tabela não renderizava/arquivava resposta de "Gerar mesmo assim"/"Confirmar e Gerar") | 2026-06-11 | 318844b | [260611-svu](./quick/260611-svu-corrigir-wr-01-code-review-fase-17-handl/) |
| Phase 18 P01 | 5 min | 2 tasks | 40 files |
| Phase 18 P02 | 4 min | 2 tasks | 13 files |
| Phase 18 P03 | 3 min | 2 tasks | 19 files |
| Phase 18 P04 | 8 min | 2 tasks | 14 files |
| Phase 18 P05 | 13 min | 2 tasks | 14 files |
| Phase 19 P02 | 5 min | 2 tasks | 2 files |

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

Last session: 2026-06-14T17:53:18.269Z
Stopped at: Phase 20 context gathered
Resume file: .planning/phases/20-protocolo-de-muta-o-chat-grade-q-a/20-CONTEXT.md

## Operator Next Steps

- Phase 18 CONCLUÍDA (8/8 planos): inventário de deleção fechado — tools avulsos/OCR/file-analysis removidos, dispatcher e schema reduzidos ao eixo binário sheet_operation/qa, packages/shared enxuto, billing/quota órfãos removidos. WR-02 (smoke obsoleto) resolvido no 18-08. Próximo: verificar a fase (/gsd-verify-work ou /gsd-progress) e avançar para a Phase 19 (ingestão tri-estado da planilha — diretório já criado em .planning/phases/19-*).
- Nota: billing/schema.ts preservado em packages/shared para reuso futuro do AbacatePay; FileSchema preservado (reduzido) pois a extração de anexos CSV/XLSX do chat unificado ainda o consome.
- ✅ Checkpoint 17→18 cumprido: o eval binário "operação na planilha vs Q&A" foi plantado no Plan 18-05 (6-8 prompts PT representativos como testes automatizados em intent-classifier.test.ts); o eval completo (~20 prompts) permanece como UAT formal da Phase 20.
- Limite com Phase 22: esta fase remove código/rotas/UI/testes; migrations/deps Prisma destrutivas finais ficam na Phase 22 (nenhum plano da 18 roda migration destrutiva).
- Pendência da Phase 17 (code review): WR-02 (smoke.spec.ts obsoleto) é resolvido dentro do Plan 18-08 (reescrita dos smokes para a tela unificada). WR-01 já corrigido (quick task 260611-svu).

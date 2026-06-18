---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Planilha Viva + Chat de IA
status: Awaiting next milestone
stopped_at: "Sessão retomada — milestone v3.0 completo (fases 16–22 concluídas & securizadas); SECURITY.md da fase 16 gerado e 17/18/21/22 versionados. Próximo: auditar/concluir milestone."
last_updated: "2026-06-15T13:22:25.108Z"
last_activity: 2026-06-16 — Completed quick task 260616-qei: funcoes topbar da tabela — Filtrar e Colunas
progress:
  total_phases: 22
  completed_phases: 22
  total_plans: 21
  completed_plans: 21
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-15)

**Core value:** Usuários brasileiros trabalham numa planilha viva sempre na tela e pedem em português que a IA manipule os dados na própria grade — ou responda dúvidas sobre eles — sem escolher ferramentas nem navegar entre módulos.
**Current focus:** v3.0 shipped & arquivado — próximo milestone a definir via /gsd-new-milestone

## Current Position

Phase: Milestone v3.0 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-06-18 — Completed quick task 260618-l61: edição direta de células da planilha via teclado, sem passar pelo chat da IA

## Performance Metrics

**Velocity:**

- Total plans completed: 66 (v1.0–v1.2 acumulado)
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
- [Phase 20]: Phase 20-01: tradução de fórmulas EN<->pt-BR no BFF (translateEnToPtBr) antes de devolver o table_spec à grade; provider unificado com ramo fixture vs OpenAI por hasOpenAiKey()
- [Phase ?]: Phase 20-02: frontend transmite o estado vivo da grade como specOverride e aplica o table_spec via setSpec (efeito dedicado + dedupe por ref), preservando o undo Ctrl+Z
- [Phase ?]: 21-01: spec ativo persistido single-row (toolKind=unified_table, mode=active_spec) via transaction Serializable delete+create
- [Phase ?]: 21-01: auto-save do WorkspaceStateProvider debancado 1.5s e deduplicado por lastSavedRef; sem POST no mount inicial
- [Phase ?]: WorkspacePage reusa a sessao via getCachedUser (React cache) ao hidratar o historico server-side, evitando segunda query de auth
- [Phase ?]: Reset coerente (D-04): handleNewConversation chama workspaceState.resetToSeed() para devolver a planilha viva a SAMPLE_SPEC junto com a conversa limpa
- [Phase 21]: 21-03: dedupe de key na escrita (seedToGridState) é a garantia primária de round-trip; superRefine do schema é defesa secundária
- [Phase 21]: 21-03: spec ativo usa MAX_ACTIVE_SPEC_BYTES (512KB) e LANÇA em oversize; histórico de chat mantém 32KB tolerante a truncamento
- [Phase 21]: 21-03: persistência fonte-de-verdade falha-em-voz-alta (propaga→500); supressão de auto-save por pré-marcação de lastSavedRef no reset

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 14: PT_BR_TO_EN mapping (~20 funções) deve ser validado empiricamente com `=PROCV()`, `=SOMASE()`, `=SE()` antes de conectar o grid ao gerador
- Phase 12 → reescrito para o pivô v3.0: o classificador de 9 vias (`intent-classifier.ts`) é demolido na Phase 18 (ramos sql/regex/script/template/file_analysis/ocr saem do switch do `route.ts` e do `render-dispatcher.tsx`), então a antiga matriz de confusão evapora — NÃO re-validar o classificador velho. O risco migra para um eixo binário NOVO criado na Phase 20: *operação na planilha* (SC#2, ops estruturadas na grade) vs *pergunta analítica/Q&A* (SC#4, só texto). Falha assimétrica: Q&A lido como mutação altera a grade indevidamente (undo salva, mas surpreende); mutação lida como Q&A faz a proposta de valor falhar silenciosamente. **Validação:** definir ~20 prompts PT reais ambíguos ("some a coluna Valor" = fórmula na grade ou total no chat?) como critério de aceite/UAT da Phase 20. **Checkpoint:** na transição 17→18, confirmar que esse eval binário foi plantado no plano da Phase 18 (rótulos de intent) e Phase 20 (UAT). Não bloqueia a Phase 17.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260611-svu | Corrigir WR-01 (clarificação chat→tabela não renderizava/arquivava resposta de "Gerar mesmo assim"/"Confirmar e Gerar") | 2026-06-11 | 318844b | [260611-svu](./quick/260611-svu-corrigir-wr-01-code-review-fase-17-handl/) |
| 260615-ns8 | Restaurar verificacao real de usuario com Better Auth, removendo fallback insegura de sessao que permite acesso ao workspace sem conta | 2026-06-15 | 5e42151 | [260615-ns8](./quick/260615-ns8-restaurar-verificacao-real-de-usuario-co/) |
| 260616-dw3 | Remover landing page: site abre direto no workspace; deslogado vê preview travado e qualquer clique abre modal de login/cadastro (auth reusa /api/auth); autenticado libera o app | 2026-06-16 | 5b8c3d4 | [260616-dw3](./quick/260616-dw3-auth-gate-workspace/) |
| 260616-o50 | Higiene de código: harmonizar auth gate com Better Auth (JSDoc atualizado + 4 testes unitários para AuthGate) | 2026-06-16 | c3dfd8d | [260616-o50](./quick/260616-o50-harmonizar-auth-gate-com-better-auth/) |
| 260616-qei | Funcoes topbar da tabela: Filtrar (barra de texto em tempo real) e Colunas (dropdown de visibilidade); remove botão Imprimir | 2026-06-16 | 5cb2c84 | [260616-qei](./quick/260616-qei-adicionar-funcoes-da-topbar-da-tabela/) |
| 260617-ukf | Funções da toolbar da planilha: todos os 19 botões antes desabilitados ("em breve") agora funcionais — formatação de texto, número, zoom, fonte, sigma, mesclar, ordenar, agrupar, compartilhar | 2026-06-18 | 1f10bda | [260617-ukf](./quick/260617-ukf-crie-as-funcoes-da-toolbar-da-planilha-q/) |
| 260618-l61 | Edição direta de valor de célula via teclado, sem passar pelo chat da IA (ausente desde v1) — captura de teclado global + cache de renderers estáveis para corrigir remount em cascata do react-datasheet-grid | 2026-06-18 | 3695e60 | [260618-l61](./quick/260618-l61-habilitar-edicao-direta-de-celulas-da-pl/) |
| Phase 18 P01 | 5 min | 2 tasks | 40 files |
| Phase 18 P02 | 4 min | 2 tasks | 13 files |
| Phase 18 P03 | 3 min | 2 tasks | 19 files |
| Phase 18 P04 | 8 min | 2 tasks | 14 files |
| Phase 18 P05 | 13 min | 2 tasks | 14 files |
| Phase 19 P02 | 5 min | 2 tasks | 2 files |
| Phase 20 P01 | 12 | 3 tasks | 5 files |
| Phase 20 P02 | 3 | 3 tasks | 3 files |
| Phase 21 P01 | 10min | 3 tasks | 5 files |
| Phase 21 P02 | 2min | 4 tasks | 5 files |
| Phase 21 P03 | 18min | 3 tasks | 8 files |

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

Last session: 2026-06-15
Stopped at: Sessão retomada — milestone v3.0 completo (fases 16–22 concluídas & securizadas); SECURITY.md da fase 16 gerado e 17/18/21/22 versionados. Próximo: auditar/concluir milestone.
Resume file: none

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone

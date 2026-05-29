# Requirements: Tabelin.IA v1.1

**Milestone:** v1.1 Conversas Persistentes
**Status:** Active
**Created:** 2026-05-29

---

## Milestone v1.1 Requirements

### Histórico de Conversas

- [x] **HIST-01**: Usuário pode fechar e reabrir um workspace de tool e ver as trocas anteriores (exchanges salvos no banco por usuário + tipo de tool)
- [x] **HIST-02**: Cada exchange salva os metadados do tool junto com a resposta (plataforma, dialeto, modo) para renderização correta no reload
- [x] **HIST-03**: Usuário vê o histórico de trocas populado automaticamente ao abrir o workspace
- [x] **HIST-04**: Histórico limitado às últimas 50 trocas por usuário por tool; exchanges mais antigos são descartados
- [x] **HIST-05**: Usuário pode limpar o histórico de um tool individual ("Nova conversa")

**Scope:** Fórmula, SQL, Regex, Scripts, Template, File Analysis

### Multi-turn LLM

- [ ] **MULTI-01**: Backend inclui as trocas anteriores da conversa como mensagens de contexto na chamada ao LLM (usuário pode fazer follow-up sem repetir contexto)
- [ ] **MULTI-02**: Contexto truncado automaticamente às últimas N trocas quando o total de tokens exceder o limite seguro do modelo
- [ ] **MULTI-03**: Contexto de conversa é independente por tool — cada tool mantém seu próprio thread de contexto

### Privacidade

- [x] **PRIV-01**: Histórico de conversas deletado em cascade ao excluir conta de usuário

---

## Future Requirements

- Busca e filtro no histórico de conversas
- Export de conversas (PDF, texto)
- Conversas compartilháveis entre usuários do mesmo time

## Out of Scope

- Sincronização de histórico entre dispositivos em tempo real (WebSocket push) — persiste no banco, carrega no reload
- Histórico de arquivos CSV/XLSX (apenas mensagens de texto são persistidas no File Analysis; arquivos continuam sendo deletados após sessão)
- Time/shared workspaces — defer até adoção Pro provar demanda

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HIST-01 | Phase 6 | Complete |
| HIST-02 | Phase 6 | Complete |
| HIST-04 | Phase 6 | Complete |
| PRIV-01 | Phase 6 | Complete |
| HIST-03 | Phase 7 | Complete |
| HIST-05 | Phase 7 | Complete |
| MULTI-01 | Phase 8 | Pending |
| MULTI-02 | Phase 8 | Pending |
| MULTI-03 | Phase 8 | Pending |

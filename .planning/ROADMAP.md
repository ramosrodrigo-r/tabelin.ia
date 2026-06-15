# Roadmap: Tabelin.IA

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-05-26)
- ✅ **v1.1 Conversas Persistentes** — Phases 6–8 (shipped 2026-06-02)
- ✅ **v1.2 Anexos Universais** — Phases 9–11 (shipped 2026-06-05)
- ✅ **v2.0 Chat Unificado & Tabela Viva** — Phases 12–15 (shipped 2026-06-10)
- ✅ **v3.0 Planilha Viva + Chat de IA (pivô)** — Phases 16–22 (shipped 2026-06-15)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–5) — SHIPPED 2026-05-26</summary>

- [x] Phase 1: Localized Formula Workspace (3/3 plans) — completed 2026-05-24
- [x] Phase 2: Freemium Billing and Entitlements (3/3 plans) — completed 2026-05-25
- [x] Phase 3: Multi-Tool Generation Suite (3/3 plans) — completed 2026-05-26
- [x] Phase 4: Spreadsheet File Analysis (3/3 plans) — completed 2026-05-26
- [x] Phase 5: OCR, Charts, and Launch Hardening (4/4 plans) — completed 2026-05-26

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Conversas Persistentes (Phases 6–8) — SHIPPED 2026-06-02</summary>

**Milestone Goal:** Transformar o chat-thread visual em experiência multi-turn real — histórico salvo no banco e contexto passado ao LLM em cada nova mensagem.

- [x] Phase 6: Persistence Layer (2/2 plans) — completed 2026-05-29
- [x] Phase 7: Frontend History (4/4 plans) — completed 2026-05-30
- [x] Phase 8: Multi-turn LLM Context (4/4 plans) — completed 2026-06-01

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Anexos Universais (Phases 9–11) — SHIPPED 2026-06-05</summary>

**Milestone Goal:** Permitir que usuários Pro anexem documentos (CSV/XLSX, PNG/JPEG, PDF, TXT) em qualquer um dos 5 tools de texto, com extração automática, injeção no contexto LLM e persistência do conteúdo extraído no thread.

- [x] Phase 9: Extraction Infrastructure (5/5 plans) — completed 2026-06-03
- [x] Phase 10: Persistence & LLM Context (4/4 plans) — completed 2026-06-04
- [x] Phase 11: Attachment UI & Pro Gating (5/5 plans) — completed 2026-06-04

Full details: `.planning/milestones/v1.2-ROADMAP.md`
Audit: `.planning/milestones/v1.2-MILESTONE-AUDIT.md` (status: passed)

</details>

<details>
<summary>✅ v2.0 Chat Unificado & Tabela Viva (Phases 12–15) — SHIPPED 2026-06-10</summary>

**Milestone Goal:** Substituir as abas de tools por um único chat com roteamento de intent automático, introduzir geração de tabelas interativas com fórmulas vivas no browser e loop de clarificação multi-turn antes de gerar qualquer tabela.

- [x] Phase 12: Intent Classifier & Unified Route (4/4 plans) — completed 2026-06-08
- [x] Phase 13: Clarification Loop (4/4 plans) — completed 2026-06-08
- [x] Phase 14: Tabela Viva (6/6 plans) — completed 2026-06-09
- [x] Phase 15: Export, UX Migration & Hardening (3/3 plans) — completed 2026-06-10

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v3.0 Planilha Viva + Chat de IA (Phases 16–22) — SHIPPED 2026-06-15</summary>

**Milestone Goal:** Estreitar o produto para uma única tela — planilha viva sempre presente + chat de IA que opera sobre ela — removendo a cadeia completa de código morto (billing/cota, OCR, tools de texto avulsos, navegação multi-ferramenta, geração de tabela do zero), comprovadamente e sem imports quebrados.

- [x] Phase 16: Tela Única & Fim da Navegação Multi-Ferramenta (2/2 plans) — completed 2026-06-11
- [x] Phase 17: Desligar Monetização & Cota (3/3 plans) — completed 2026-06-11
- [x] Phase 18: Remover Tools Avulsos, OCR, File Analysis & Reduzir Dispatcher (8/8 plans) — completed 2026-06-14
- [x] Phase 19: Ingestão Tri-Estado da Planilha (2/2 plans) — completed 2026-06-14
- [x] Phase 20: Protocolo de Mutação Chat→Grade & Q&A (2/2 plans) — completed 2026-06-14
- [x] Phase 21: Export & Persistência da Planilha+Conversa (3/3 plans) — completed 2026-06-15
- [x] Phase 22: Limpeza Final — Prisma, Dependências, Config, Testes & QA Verde (1/1 plan) — completed 2026-06-15

Full details: `.planning/milestones/v3.0-ROADMAP.md`
Audit: `.planning/milestones/v3.0-MILESTONE-AUDIT.md` (status: passed — 32/32 requirements)

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Localized Formula Workspace | v1.0 | 3/3 | Complete | 2026-05-24 |
| 2. Freemium Billing and Entitlements | v1.0 | 3/3 | Complete | 2026-05-25 |
| 3. Multi-Tool Generation Suite | v1.0 | 3/3 | Complete | 2026-05-26 |
| 4. Spreadsheet File Analysis | v1.0 | 3/3 | Complete | 2026-05-26 |
| 5. OCR, Charts, and Launch Hardening | v1.0 | 4/4 | Complete | 2026-05-26 |
| 6. Persistence Layer | v1.1 | 2/2 | Complete | 2026-05-29 |
| 7. Frontend History | v1.1 | 4/4 | Complete | 2026-05-30 |
| 8. Multi-turn LLM Context | v1.1 | 4/4 | Complete | 2026-06-01 |
| 9. Extraction Infrastructure | v1.2 | 5/5 | Complete | 2026-06-03 |
| 10. Persistence & LLM Context | v1.2 | 4/4 | Complete | 2026-06-04 |
| 11. Attachment UI & Pro Gating | v1.2 | 5/5 | Complete | 2026-06-04 |
| 12. Intent Classifier & Unified Route | v2.0 | 4/4 | Complete | 2026-06-08 |
| 13. Clarification Loop | v2.0 | 4/4 | Complete    | 2026-06-09 |
| 14. Tabela Viva | v2.0 | 6/6 | Complete   | 2026-06-09 |
| 15. Export, UX Migration & Hardening | v2.0 | 3/3 | Complete    | 2026-06-10 |
| 16. Tela Única & Fim da Navegação Multi-Ferramenta | v3.0 | 2/2 | Complete    | 2026-06-11 |
| 17. Desligar Monetização & Cota | v3.0 | 3/3 | Complete   | 2026-06-11 |
| 18. Remover Tools Avulsos, OCR, File Analysis & Reduzir Dispatcher | v3.0 | 8/8 | Complete | 2026-06-14 |
| 19. Ingestão Tri-Estado da Planilha | v3.0 | 2/2 | Complete    | 2026-06-14 |
| 20. Protocolo de Mutação Chat→Grade & Q&A | v3.0 | 2/2 | Complete    | 2026-06-14 |
| 21. Export & Persistência da Planilha+Conversa | v3.0 | 3/3 | Complete    | 2026-06-15 |
| 22. Limpeza Final — Prisma, Dependências, Config, Testes & QA Verde | v3.0 | 1/1 | Complete | 2026-06-15 |

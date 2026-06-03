# Roadmap: Tabelin.IA

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-05-26)
- ✅ **v1.1 Conversas Persistentes** — Phases 6–8 (shipped 2026-06-02)
- 🚧 **v1.2 Anexos Universais** — Phases 9–11 (in progress)

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

### 🚧 v1.2 Anexos Universais (In Progress)

**Milestone Goal:** Permitir que usuários Pro anexem documentos (CSV/XLSX, PNG/JPEG, PDF, TXT) em qualquer um dos 5 tools de texto, com extração automática, injeção no contexto LLM e persistência do conteúdo extraído no thread.

- [ ] **Phase 9: Extraction Infrastructure** — Pipeline de extração multi-formato (backend isolado, `unpdf` front-loaded)
- [ ] **Phase 10: Persistence & LLM Context** — Persistência do conteúdo extraído, injeção no system prompt e Pro-gate nos route handlers
- [ ] **Phase 11: Attachment UI & Pro Gating** — Interface de anexo nos 5 tools, Pro CTA para free, painel de transparência e UAT

## Phase Details

### Phase 9: Extraction Infrastructure
**Goal**: O sistema consegue extrair conteúdo textual de qualquer formato suportado (CSV/XLSX, PNG/JPEG, PDF, TXT) e retornar texto plano via dispatcher único, com validação de segurança de bytes e detecção de PDF sem camada de texto
**Depends on**: Phase 8 (multi-turn infrastructure already in place)
**Requirements**: EXT-01, EXT-02, EXT-03, EXT-04, EXT-05, EXT-06, SEC-02
**Success Criteria** (what must be TRUE):
  1. Um CSV/XLSX enviado ao extrator retorna schema + amostra de dados como texto plano, sem erro
  2. Uma imagem PNG/JPEG de tabela enviada ao extrator retorna linhas/colunas reconstruídas via OCR
  3. Um PDF com camada de texto enviado ao extrator retorna o texto via `unpdf`; um PDF escaneado (sem camada) retorna erro acionável orientando o usuário ao tool de OCR
  4. Um arquivo TXT enviado ao extrator retorna seu conteúdo diretamente
  5. O dispatcher roteia cada tipo ao extrator correto sem lógica duplicada nos tools; upload com magic bytes inválidos ou ZIP bomb é rejeitado antes de processar
**Plans**: 4 plans
- [x] 09-01-PLAN.md — Fundação: contrato ExtractionResult (D-09) + instalar unpdf/file-type/fflate (checkpoint de legitimidade)
- [x] 09-02-PLAN.md — Extratores de reuso: CSV/XLSX (schema+amostra+multi-aba), imagem OCR→Markdown, TXT
- [x] 09-03-PLAN.md — Segurança/novas-libs: magic bytes (file-type), guard anti-ZIP-bomb (fflate), PDF (unpdf) + scanned-PDF
- [ ] 09-04-PLAN.md — Dispatcher único (EXT-05) + teste de integração end-to-end

### Phase 10: Persistence & LLM Context
**Goal**: O conteúdo extraído é injetado no system prompt do tool, persistido na troca de conversa (sem guardar o arquivo bruto) e reutilizável em follow-ups; gerações com anexo passam pelo Pro-gate no backend
**Depends on**: Phase 9
**Requirements**: CTX-01, CTX-02, CTX-03, CTX-04, CTX-05, PRO-02, PRO-03
**Success Criteria** (what must be TRUE):
  1. Uma geração com documento anexado inclui o conteúdo extraído no system prompt, delimitado para grounding, e produz resposta contextualizada ao documento
  2. Após a geração, o conteúdo extraído aparece no `ConversationExchange.attachmentContext` no banco; o arquivo bruto não é armazenado
  3. Um follow-up ("agora filtre pela coluna X") reutiliza automaticamente o conteúdo extraído da troca anterior, sem o usuário reanexar o documento
  4. Um usuário free que tenta enviar um arquivo recebe HTTP 403 do backend antes de qualquer extração ocorrer
  5. Uma geração com anexo debita 1 uso da cota normal via reserve/confirm/release
**Plans**: TBD
**UI hint**: yes

### Phase 11: Attachment UI & Pro Gating
**Goal**: Usuários Pro podem anexar documentos nos 5 tools via botão e drag-and-drop, acompanham o processamento em dois estágios, veem transparência do conteúdo extraído e avisos de privacidade; usuários free veem CTA de upgrade
**Depends on**: Phase 10
**Requirements**: ATT-01, ATT-02, ATT-03, ATT-04, ATT-05, ATT-06, ATT-07, ATT-08, PRO-01, SEC-01, SEC-03
**Success Criteria** (what must be TRUE):
  1. Usuário Pro consegue selecionar um arquivo via botão paperclip ou drag-and-drop, vê o chip de preview com ícone/nome/tamanho, e pode removê-lo antes de enviar
  2. Ao enviar, usuário vê feedback de dois estágios (upload → extração) antes da resposta do LLM iniciar; a resposta exibe badge de grounding indicando que foi gerada com base no documento
  3. Usuário pode expandir um painel que exibe o texto extraído; quando truncado, aparece aviso de extração parcial
  4. Usuário free vê o botão de anexo desabilitado com CTA de upgrade — não consegue enviar arquivo
  5. A UI exibe aviso de que o conteúdo do documento fica salvo no histórico e pode ser limpo via "Nova conversa" (LGPD/D-07)
**Plans**: TBD
**UI hint**: yes

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
| 9. Extraction Infrastructure | v1.2 | 3/4 | In Progress|  |
| 10. Persistence & LLM Context | v1.2 | 0/? | Not started | - |
| 11. Attachment UI & Pro Gating | v1.2 | 0/? | Not started | - |

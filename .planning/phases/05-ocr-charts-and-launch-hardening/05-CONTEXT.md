# Phase 5: OCR, Charts, and Launch Hardening - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>

## Phase Boundary

Fase 5 entrega três capabilities que completam o MVP:

1. **OCR** — Upload de imagens `.png`, `.jpeg`, `.jpg` com tabelas, extração via OpenAI Vision, reconstrução em rows/columns com preview e botões de cópia TSV/CSV.
2. **Charts** — Sugestão de tipo de gráfico + renderização bar/line/pie via Recharts inline no chat do file-analysis, acionado por botão rápido.
3. **Launch Hardening** — Smoke tests E2E com Playwright cobrindo todos os happy paths do MVP (auth, formula, quota, checkout, multi-tools, upload+chat, OCR, charts, privacy cleanup).

**Não inclui:** Charts em ferramenta separada, export de gráfico como PNG (v2), integração com Google Drive/OneDrive (v2), testes de carga, mobile responsiveness além do existente.

</domain>

<decisions>

## Implementation Decisions

### OCR

- **D-01:** OCR usa **OpenAI Vision** — envia a imagem como **base64 inline** no corpo da mensagem para o modelo `gpt-4o-mini`. Sem storage de imagem, sem URL pública. Alinha com PRIV-02 (raw file não persiste).
- **D-02:** Modelo: **gpt-4o-mini** (mesmo modelo das outras ferramentas, via env `OPENAI_MODEL`). Sem nova variável de ambiente para OCR.
- **D-03:** Resultado do OCR: **preview da tabela HTML** reconstruída + dois botões: "Copiar TSV" e "Copiar CSV". Sem chat conversacional — OCR é one-shot.
- **D-04:** OCR é uma **ferramenta separada** na sidebar (`/workspace/ocr`), não integrada ao file-analysis. Slot "OCR" já previsto em WORK-01.

### Charts

- **D-05:** Biblioteca: **Recharts**. Componentes declarativos React-first, integra com React 19. `BarChart`, `LineChart`, `PieChart` nativos. Sem Chart.js ou D3.
- **D-06:** Charts são acionados via **botão rápido "Sugerir Gráfico"** adicionado aos quick-action buttons do file-analysis (junto com "Resumo Pivô" e "Relatório Executivo" — padrão D-10 da Fase 4).
- **D-07:** Após gerado, o gráfico aparece **inline no chat como mensagem visual especial** (componente React Recharts renderizado como mensagem do assistente). Botão para copiar os dados como CSV ao lado.
- **D-08:** **AI sugere o tipo de gráfico mais adequado** ao dataset (ex: "barras para categorias vs valores"). O usuário vê o gráfico renderizado e pode **alternar entre Bar/Line/Pie** com botões abaixo do gráfico. Sem seleção prévia de tipo.

### Launch Hardening

- **D-09:** Playwright cobre **todos os happy paths do MVP**: auth (sign up / sign in / sign out), formula generation, quota block (free-tier 4 uses), checkout Pix/card, scripts/SQL/regex, file upload + chat, OCR (imagem → tabela), chart (gerar gráfico do dataset), e privacy cleanup (upload deletado após sessão).
- **D-10:** Testes E2E rodam contra **banco de dados real em modo de desenvolvimento** (Postgres local). Setup/teardown de dados por suite. Sem banco em memória — valida integração real com Prisma/Postgres.
- **D-11:** **OpenAI mockado** (resposta fixa para formula, OCR e chart) e **webhook Mercado Pago sintético** nos testes. Testes rápidos, determinísticos e sem custo de API.

### Claude's Discretion

- Estrutura exata do prompt de OCR ao gpt-4o-mini (formato de saída JSON solicitado, instruções de linhas/colunas, tratamento de células vazias).
- Heurística de seleção do tipo de gráfico no AI (quais metadados do dataset orientam a sugestão: número de colunas, tipo de dados, cardinalidade).
- Estrutura do componente de chart no ChatPanel (se é um subcomponente de `ChatMessage` ou tipo de mensagem especial).
- Limite de tamanho de imagem para OCR (ex: 5 MB, consistente com uploads de arquivo).
- Copy em português para labels, placeholder, e mensagens de erro da ferramenta OCR.
- Estrutura de componentes da feature OCR (pode espelhar o padrão one-shot das outras ferramentas ou ter layout próprio).
- Configuração de cores/tema para os Recharts (usar CSS variables do Tailwind existentes).
- Setup de mocks no Playwright (MSW ou handler custom do Next.js para rotas de API `/api/tools/*`).

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope

- `.planning/REQUIREMENTS.md` — Requirements pendentes: CHRT-01, CHRT-02, OCR-01, OCR-02, OCR-03.
- `.planning/ROADMAP.md` — Goal, success criteria (5 itens), e plan outline da Fase 5.
- `.planning/PROJECT.md` — Contexto Brazil-first, constraints de privacidade e upload limits.

### Prior Phase Decisions (críticas para integração)

- `.planning/phases/04-spreadsheet-file-analysis/04-CONTEXT.md` — D-10 (quick action buttons), D-12 (output inline no chat), padrão de upload, ChatPanel, quota pattern para file-chat.
- `.planning/phases/01-localized-formula-workspace/01-CONTEXT.md` — Server-side AI only (D-14), streaming NDJSON pattern, copy-ready output.
- `.planning/phases/02-freemium-billing-and-entitlements/02-CONTEXT.md` — Quota reserve/confirm/release, Pro entitlement check.

### Existing Code Integration Points

- `apps/web/src/features/file-analysis/file-analysis-tool.tsx` — Estrutura do tool a espelhar/estender para OCR e para adicionar botão de Chart.
- `apps/web/src/features/file-analysis/components/chat-panel.tsx` — Onde o componente de chart inline deve ser renderizado.
- `apps/web/src/server/ai/openai-client.ts` — Cliente OpenAI compartilhado; gpt-4o-mini suporta vision nesta versão.
- `apps/web/src/server/tools/tool-repository.ts` — Estender para `toolKind: "ocr"`.
- `apps/web/src/server/usage/quota-service.ts` — `reserveToolUse` / `confirmToolUse` / `releaseToolUse` para toolKind: "ocr".
- `apps/web/src/components/app/sidebar.tsx` — Slot OCR existe mas desativado — ativar com `href: "/workspace/ocr"`.
- `apps/web/src/app/api/tools/file-analysis/chat/route.ts` — Route handler a espelhar para `/api/tools/ocr/process/route.ts`.
- `packages/shared/src/index.ts` — Adicionar contratos Zod para OCR request/response e chart data schema.
- `prisma/schema.prisma` — Sem novos modelos necessários para OCR (one-shot, sem persistência). Chart usa dados de `UploadedFile` já existente.

### Testing

- `@playwright/test` `1.60.0` já instalado em `apps/web/package.json`. Verificar se `playwright.config.ts` existe.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **File upload flow** (`features/file-analysis/hooks/use-file-upload.ts`): padrão de upload com validação de tamanho — reutilizar para imagens OCR com mime types `.png`, `.jpeg`, `.jpg`.
- **ChatPanel** (`features/file-analysis/components/chat-panel.tsx`): suporta mensagens do assistente como componentes React — adicionar suporte a tipo `"chart"` para renderizar Recharts inline.
- **Quota service** (`server/usage/quota-service.ts`): `reserveToolUse("ocr", userId)` funciona sem mudança de API.
- **Copy button** (`features/file-analysis/components/copy-button.tsx`): reutilizável para TSV/CSV do OCR.
- **OpenAI client** (`server/ai/openai-client.ts`): `gpt-4o-mini` suporta vision via `content: [{ type: "image_url", image_url: { url: "data:image/...;base64,..." } }]`.

### Established Patterns

- Next.js App Router; páginas em `apps/web/src/app/(workspace)/workspace/`.
- Server-only logic em `apps/web/src/server/`.
- Shared Zod contracts em `packages/shared/src/`.
- Route handler: auth → parse → quota reserve → AI → confirm → record → respond.
- Sidebar slot activation: remover `disabled: true` e adicionar `href`.
- Tailwind CSS functional classes; sem CSS modules.

### Integration Points

- Criar `apps/web/src/app/(workspace)/workspace/ocr/page.tsx`.
- Criar `apps/web/src/features/ocr/` com componente de upload e resultado.
- Criar `apps/web/src/app/api/tools/ocr/process/route.ts`.
- Adicionar `toolKind: "ocr"` ao tool-repository.
- Adicionar botão "Sugerir Gráfico" ao `file-analysis-tool.tsx` quick actions.
- Adicionar suporte a mensagem tipo `"chart"` no `chat-panel.tsx`.
- Instalar `recharts` em `apps/web`.
- Criar testes Playwright em `apps/web/e2e/` (ou diretório existente — verificar).

</code_context>

<specifics>

## Specific Ideas

- O resultado do OCR deve mostrar primeiro o **preview visual da tabela reconstruída** (tabela HTML formatada com bordas) e logo abaixo os dois botões "Copiar TSV" e "Copiar CSV" com feedback imediato de copiado.
- O botão "Sugerir Gráfico" nos quick actions do file-analysis deve **aparecer apenas quando há um arquivo ativo** (estado `chat`), não em `idle` ou `sheet_selection`.
- A **mensagem de chart no ChatPanel** deve incluir: tipo de gráfico sugerido (em português, ex: "Gráfico de Barras"), os dados usados (ex: "Coluna X vs Coluna Y"), e botões "Bar", "Line", "Pie" para alternar sem nova requisição ao AI.
- OCR deve ter uma **mensagem de boas-vindas clara**: "Envie uma imagem com tabela (PNG, JPEG) e ela será convertida para planilha copiável." — consistente com o padrão de onboarding da Fase 4.

</specifics>

<deferred>

## Deferred Ideas

- Export de gráfico como imagem PNG — v2 (requer `html2canvas` ou similar).
- Modo de refinamento de OCR via chat (usuário corrige colunas reconstruídas) — v2.
- Suporte a PDF com tabelas no OCR — v2.
- Charts em ferramenta separada `/workspace/charts` com múltiplos datasets — v2.
- CI/CD pipeline com Playwright no GitHub Actions — válido para v2 ou pós-launch; escopo atual é rodar localmente.

</deferred>

---

*Phase: 05-ocr-charts-and-launch-hardening*
*Context gathered: 2026-05-26*

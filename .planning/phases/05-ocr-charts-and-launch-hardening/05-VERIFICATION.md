---
phase: 05-ocr-charts-and-launch-hardening
verified: 2026-05-26T03:00:00Z
status: human_needed
score: 4/5 must-haves verified
overrides_applied: 0
gaps: []
deferred: []
human_verification:
  - test: "Executar smoke tests E2E completos com servidor de desenvolvimento rodando"
    expected: "npx playwright test tests/e2e/smoke.spec.ts --reporter=list retorna exit code 0 com 9 suites passing"
    why_human: "O checkpoint:human-verify (Task 2 do Plano 03) foi auto-aprovado com AUTO_CFG=true sem execução real dos testes. Os testes requerem servidor dev rodando + Postgres local ativo. O sucesso do SC#5 (smoke tests passando) só pode ser confirmado por execução real."
  - test: "Corrigir erro TypeScript em smoke.spec.ts linha 195 e confirmar 0 erros"
    expected: "npx tsc --project apps/web/tsconfig.json --noEmit retorna 0 (sem erros)"
    why_human: "Há 1 erro de tipo em smoke.spec.ts(195,62): 'Property __smokeCount does not exist on type Window & typeof globalThis'. O fix é trivial (adicionar cast como as typeof window & { __smokeCount?: number }), mas requer que um humano confirme a correção e re-execute a checagem."
---

# Phase 05: OCR, Charts, and Launch Hardening — Verification Report

**Phase Goal:** Users can convert table images to copy-ready spreadsheet data, render charts from parsed data, and run the full launch workflow.
**Verified:** 2026-05-26T03:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can upload .png, .jpeg, or .jpg table images | VERIFIED | `use-image-upload.ts` valida `image/png` e `image/jpeg`, normaliza `image/jpg` → `image/jpeg`; `input accept=".png,.jpg,.jpeg"` em `image-upload-panel.tsx`; rota POST valida via `ocrRequestSchema.safeParse` |
| 2 | System reconstructs image tables into structured rows and columns with preview | VERIFIED | `ocr-processor.ts` chama OpenAI Vision com `response_format: json_object`, retorna `{ headers, rows }`; `OcrResultPanel` renderiza tabela HTML com `<thead>/<tbody>`, cabeçalhos, linhas, com scroll; fixture fallback ativo quando sem API key |
| 3 | User can copy reconstructed tables as TSV or CSV and paste them into Excel | VERIFIED | `OcrResultPanel` usa `toTsv()` e `toCsv()` locais; `CopyButton` reutilizado com `label="Copiar TSV"` e `label="Copiar CSV"`; feedback "Copiado!" de ~1.8s (especificado como 1.5s — diferença menor e irrelevante) |
| 4 | User can request chart suggestions and render bar, line, and pie charts from parsed spreadsheet data | VERIFIED | `ChatPanel` tem botão "Sugerir Gráfico" → `sendQuickAction(uploadedFileId, "chart")` → `CHART_PROMPT`; `use-file-chat.ts` detecta JSON no `complete` event e cria msg `type: "chart"`; `ChartMessage` renderiza `BarChart/LineChart/PieChart` do Recharts com alternância local via `useState<ChartType>` |
| 5 | Full MVP smoke tests cover auth, formula, quota, checkout, multi-tools, upload analysis, OCR, charts, and privacy cleanup | UNCERTAIN | `smoke.spec.ts` existe com 9 suites cobrindo todos os happy paths declarados; fixtures PNG e CSV criadas; porém: (a) testes não foram executados realmente (checkpoint human-verify auto-aprovado via AUTO_CFG=true); (b) há 1 erro TypeScript em smoke.spec.ts(195,62) |

**Score:** 4/5 truths verified (1 UNCERTAIN)

---

### Deferred Items

Nenhum item identificado para fases posteriores.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/src/ocr/schema.ts` | ocrRequestSchema, ocrResponseSchema, chartDataSchema, tipos | VERIFIED | Exporta todos os 3 schemas e 3 tipos; TypeScript 0 erros |
| `packages/shared/src/ocr/fixtures.ts` | OCR_FIXTURE_RESPONSE, chartDataFixture | VERIFIED | Exporta OCR_FIXTURE_RESPONSE + ocrResponseFixture + chartDataFixture com dados reais |
| `apps/web/src/server/ai/ocr-processor.ts` | processImageOcr com OpenAI Vision, fixture fallback | VERIFIED | `import "server-only"` na linha 1; `image_url` com base64 inline; `response_format: json_object`; fallback sem API key |
| `apps/web/src/app/api/tools/ocr/process/route.ts` | POST /api/tools/ocr/process — auth + quota + OCR | VERIFIED | `reserveToolUse`, `confirmToolUse`, `releaseToolUse` presentes; 401 sem sessão; 413 para >5MB; 429 com quota_exceeded |
| `apps/web/src/features/ocr/hooks/use-image-upload.ts` | Hook com estados, validação, FileReader, fetch | VERIFIED | `image/jpeg` normalização; `5 * 1024 * 1024` validação; `FileReader`; fetch POST JSON; `quotaBlocked` handling |
| `apps/web/src/features/ocr/components/image-upload-panel.tsx` | Drop zone, chip de arquivo, CTA, banner quota | VERIFIED | Drop zone, file chip, botão "Enviar imagem"/"Processando...", banner quotaBlocked com CTA Pro |
| `apps/web/src/features/ocr/components/ocr-result-panel.tsx` | Tabela HTML, botões TSV/CSV, estado vazio | VERIFIED | Tabela com `border-collapse`, `maxHeight: 240px`, `CopyButton` reutilizado, estado vazio "Nenhuma tabela detectada" |
| `apps/web/src/features/ocr/ocr-tool.tsx` | Componente coordenador com estados idle/processing/complete/error | VERIFIED | Union de estados; renderiza `ImageUploadPanel` em idle/error e `OcrResultPanel` em complete |
| `apps/web/src/app/(workspace)/workspace/ocr/page.tsx` | RSC autenticado com OcrTool | VERIFIED | `redirect("/sign-in")` se sem user; `getUserEntitlement`; layout `workspace-layout` com Sidebar, Topbar, OcrTool |
| `apps/web/src/features/file-analysis/components/chart-message.tsx` | ChartMessage com Recharts, alternância local | VERIFIED | `"use client"` linha 1; importa de `recharts`; `height={220}` (número, não string); `minHeight: 220`; `aria-pressed`; `var(--primary)` |
| `apps/web/src/features/file-analysis/hooks/use-file-chat.ts` | union discriminada + CHART_PROMPT + JSON.parse | VERIFIED | `type: "chart"` / `type: "text"`; `CHART_PROMPT`; `chartData`; `JSON.parse` com try/catch |
| `apps/web/src/features/file-analysis/components/chat-panel.tsx` | Botão "Sugerir Gráfico", branch msg.type==="chart" | VERIFIED | `Sugerir Gráfico` presente; `sendQuickAction(uploadedFileId, "chart")`; `ChartMessage` importado e usado no branch |
| `apps/web/tests/e2e/smoke.spec.ts` | 9 suites E2E cobrindo todos os happy paths do MVP | PARTIAL | Arquivo existe, 9 suites presentes, estrutura correta, mas 1 erro TS em linha 195 e testes não foram executados realmente |
| `apps/web/tests/fixtures/tabela-teste.png` | PNG válido mínimo para setInputFiles | VERIFIED | `file` command confirma: PNG image data, 1 x 1, 8-bit/color RGBA |
| `apps/web/tests/fixtures/dados.csv` | CSV mínimo para testes de file-analysis | VERIFIED | Arquivo existe com conteúdo `Nome,Valor\nAlice,100\nBob,200` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `use-image-upload.ts` | `/api/tools/ocr/process` | `fetch POST com JSON { imageBase64, mimeType }` | WIRED | `fetch("/api/tools/ocr/process", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ imageBase64, mimeType }) })` presente na linha 54 |
| `route.ts (ocr/process)` | `ocr-processor.ts` | `processImageOcr(imageBase64, mimeType)` | WIRED | `import { processImageOcr }` + chamada dentro do try block na linha 47 |
| `sidebar.tsx` | `/workspace/ocr` | `href: "/workspace/ocr"` sem `disabled: true` | WIRED | `{ label: "OCR", icon: Image, href: "/workspace/ocr" }` — sem `disabled` |
| `chat-panel.tsx` | `use-file-chat.ts` | `chat.sendQuickAction(uploadedFileId, 'chart')` | WIRED | `onClick={() => chat.sendQuickAction(uploadedFileId, "chart")}` na linha 218 |
| `use-file-chat.ts` | `/api/tools/file-analysis/chat` | `submit(uploadedFileId, CHART_PROMPT)` | WIRED | `CHART_PROMPT` definido; `void submit(uploadedFileId, prompt)` chamado no branch "chart" do `sendQuickAction` |
| `chart-message.tsx` | `recharts` | `import { BarChart, ... } from 'recharts'` | WIRED | Import direto de recharts com todos os componentes necessários (BarChart, LineChart, PieChart, etc.) |
| `smoke.spec.ts` | `/api/tools/ocr/process` | `page.route('**/api/tools/ocr/process', ...)` | WIRED | Mock presente na linha 376; responde com `ocrMockResponse` |
| `smoke.spec.ts` | `/api/tools/file-analysis/chat` | `page.route('**/api/tools/file-analysis/chat', ...)` com chart NDJSON | WIRED | Mock presente para chat pivot (linha 347) e chart (linha 410) |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `OcrResultPanel` | `result` (OcrResponse) | `useImageUpload.result` → `POST /api/tools/ocr/process` → `processImageOcr` → OpenAI Vision | Sim — chamada real à API OpenAI ou fixture determinístico | FLOWING |
| `ChartMessage` | `data` (ChartData) | `useFileChat.messages[].chartData` ← JSON.parse do `complete` event ← AI stream | Sim — dados do AI parseados do stream | FLOWING |
| `ocr-tool.tsx` | `result` state | `imageUploadHook.result` — sincronizado via efeito de re-render condicional | Sim — dados reais do hook; nota: o sync via re-render em corpo do componente (linhas 36-43) é um padrão não-idiomático mas funcional | FLOWING (com aviso de padrão) |

---

### Behavioral Spot-Checks

Testes E2E requerem servidor em execução. Verificação estática substituída por análise de código:

| Behavior | Evidence | Status |
|----------|----------|--------|
| OCR: sidebar ativada | `sidebar.tsx` linha 27: `{ label: "OCR", icon: Image, href: "/workspace/ocr" }` — sem `disabled` | PASS |
| OCR: rota 401 sem sessão | `route.ts` linha 12-14: `getSessionFromCookieHeader`; se null → `{ status: 401 }` | PASS |
| OCR: quota 429 | `route.ts` linha 38-44: `reserveToolUse` → se `!allowed` retorna `{ status: 429, code: "quota_exceeded" }` | PASS |
| OCR: fixture fallback | `ocr-processor.ts` linha 38-46: `if (!process.env.OPENAI_API_KEY)` retorna dados fixture | PASS |
| Charts: alternância local | `chart-message.tsx` linha 31: `useState<ChartType>(data.chartType)` — sem round-trip ao servidor | PASS |
| TypeScript zero erros (produção) | `npx tsc --project apps/web/tsconfig.json --noEmit` → 1 erro em `smoke.spec.ts(195,62)` — arquivo de teste apenas | PARTIAL |

---

### Probe Execution

Nenhuma probe convencional (`scripts/*/tests/probe-*.sh`) identificada para esta fase. O plano 03 define um `checkpoint:human-verify` (Task 2) que requer servidor de desenvolvimento ativo — não executável neste ambiente sem servidor rodando.

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| Playwright smoke tests | `npx playwright test tests/e2e/smoke.spec.ts` | Requer servidor dev em http://127.0.0.1:3000 | SKIP (servidor não rodando) |

---

### Requirements Coverage

| Requirement | Fonte | Descrição | Status | Evidência |
|-------------|-------|-----------|--------|-----------|
| OCR-01 | 05-01-PLAN | User can upload .png, .jpeg, or .jpg images that contain tables | SATISFIED | `input accept=".png,.jpg,.jpeg"`; validação MIME em `use-image-upload.ts`; normalização `image/jpg` → `image/jpeg` |
| OCR-02 | 05-01-PLAN | System reconstructs image tables into structured rows and columns | SATISFIED | `ocr-processor.ts` → OpenAI Vision → `{ headers, rows }`; tabela HTML em `OcrResultPanel` |
| OCR-03 | 05-01-PLAN | User can copy reconstructed tables as TSV or CSV | SATISFIED | `toTsv()` / `toCsv()` em `OcrResultPanel`; `CopyButton` com label customizado; feedback "Copiado!" |
| CHRT-01 | 05-02-PLAN | User can request chart suggestions for uploaded spreadsheet data | SATISFIED | Botão "Sugerir Gráfico" no `ChatPanel`; `sendQuickAction(uploadedFileId, "chart")`; `CHART_PROMPT` enviado via rota existente |
| CHRT-02 | 05-02-PLAN | User can render bar, line, and pie charts in the frontend | SATISFIED | `ChartMessage` com Recharts `BarChart/LineChart/PieChart`; alternância local via `useState`; `aria-pressed` correto |

**Todos os 5 requisitos da Fase 5 satisfeitos pela implementação.**

---

### Anti-Patterns Found

| Arquivo | Linha | Padrão | Severidade | Impacto |
|---------|-------|--------|------------|---------|
| `smoke.spec.ts` | 195 | `window.__smokeCount` sem cast TypeScript | WARNING | Erro de tipo TS não-bloqueante para execução Playwright, mas falha no `tsc --noEmit`; critério de aceitação do Plano 03 exige 0 erros TS |
| `ocr-tool.tsx` | 36-43 | Sync de estado via re-render condicional (efeito em corpo do componente) | WARNING | Padrão não-idiomático no React — `setResult`/`setUiState` chamados diretamente em render (sem useEffect) pode causar re-render extra; funciona mas React devmode pode emitir warnings; não é uma falha bloqueante |

**Nenhum marcador de dívida técnica (TBD/FIXME/XXX) encontrado em nenhum arquivo modificado pela fase 5.**

---

### Human Verification Required

#### 1. Execução Real dos Smoke Tests E2E

**Test:** Com servidor de desenvolvimento rodando (`pnpm --filter web dev`) e Postgres local ativo, executar:
```
cd /home/rodrigo/tabelin.ia/apps/web && npx playwright test tests/e2e/smoke.spec.ts --reporter=list
```
**Expected:** Exit code 0, 9 suites passando (auth, formula, quota, checkout, multi-tools, file-upload+chat, OCR, chart, privacy cleanup)
**Why human:** O `checkpoint:human-verify` (Task 2, Plano 03) foi auto-aprovado com `AUTO_CFG=true` sem execução real. Os testes exigem servidor dev rodando e banco Postgres ativo — nenhum dos dois está disponível neste ambiente de verificação estática. O SC#5 do ROADMAP ("Full MVP smoke tests cover all happy paths") só pode ser confirmado por execução real.

#### 2. Corrigir Erro TypeScript em smoke.spec.ts

**Test:** Corrigir a linha 195 de `smoke.spec.ts`:
```typescript
// Atual (com erro TS):
const requestCount = (await page.evaluate(() => window.__smokeCount ?? 0)) as number;

// Corrigido:
const requestCount = (await page.evaluate(() => (window as typeof window & { __smokeCount?: number }).__smokeCount ?? 0)) as number;
```
Em seguida executar: `npx tsc --project apps/web/tsconfig.json --noEmit`
**Expected:** Zero erros de tipo TypeScript
**Why human:** O critério de aceitação do Plano 03 exige 0 erros TS. Atualmente há 1 erro em `smoke.spec.ts(195,62)`. O fix é trivial mas requer execução humana e confirmação.

---

### Gaps Summary

Nenhum gap bloqueante (BLOCKER) identificado. Todos os 5 requisitos da fase estão implementados com código substantivo e conectado. As duas pendências são:

1. **Erro TS menor em smoke.spec.ts** — trivialmente corrigível, não impede execução dos testes Playwright mas falha no `tsc --noEmit`
2. **Smoke tests não executados realmente** — o checkpoint humano foi auto-pulado; requer execução manual para confirmar SC#5 do ROADMAP

A implementação de OCR, Charts e os artefatos de smoke tests estão completos e parecem funcionais. A verificação de que "todos os smoke tests passam" (SC#5) requer execução real que só um humano pode fazer neste ambiente.

---

_Verificado: 2026-05-26T03:00:00Z_
_Verificador: Claude (gsd-verifier)_

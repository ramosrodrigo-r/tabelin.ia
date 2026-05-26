# Phase 5: OCR, Charts, and Launch Hardening — Research

**Researched:** 2026-05-26
**Domain:** OpenAI Vision API, Recharts, Playwright E2E, Next.js App Router integration
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** OCR usa OpenAI Vision — envia a imagem como base64 inline para `gpt-4o-mini`. Sem storage de imagem, sem URL pública. Alinha com PRIV-02.
- **D-02:** Modelo: `gpt-4o-mini` (via env `OPENAI_MODEL`). Sem nova variável de ambiente para OCR.
- **D-03:** Resultado do OCR: preview da tabela HTML reconstruída + botões "Copiar TSV" e "Copiar CSV". Sem chat conversacional — OCR é one-shot.
- **D-04:** OCR é uma ferramenta separada na sidebar (`/workspace/ocr`), não integrada ao file-analysis.
- **D-05:** Biblioteca de charts: Recharts. `BarChart`, `LineChart`, `PieChart` nativos. Sem Chart.js ou D3.
- **D-06:** Charts acionados via botão rápido "Sugerir Gráfico" adicionado aos quick-action buttons do file-analysis.
- **D-07:** Gráfico aparece inline no chat como mensagem visual especial (componente Recharts como mensagem do assistente).
- **D-08:** AI sugere o tipo de gráfico mais adequado. Usuário pode alternar entre Bar/Line/Pie com botões abaixo do gráfico, sem nova requisição ao AI.
- **D-09:** Playwright cobre todos os happy paths do MVP: auth, formula, quota, checkout, scripts/SQL/regex, file upload + chat, OCR, chart, privacy cleanup.
- **D-10:** Testes E2E rodam contra banco de dados real em modo de desenvolvimento (Postgres local). Setup/teardown de dados por suite.
- **D-11:** OpenAI mockado (resposta fixa) e webhook Mercado Pago sintético nos testes.

### Claude's Discretion

- Estrutura exata do prompt de OCR ao gpt-4o-mini (formato de saída JSON, instruções de linhas/colunas, células vazias).
- Heurística de seleção do tipo de gráfico no AI (metadados: número de colunas, tipo de dados, cardinalidade).
- Estrutura do componente de chart no ChatPanel (subcomponente de `ChatMessage` ou tipo de mensagem especial).
- Limite de tamanho de imagem para OCR (5 MB, consistente com uploads de arquivo).
- Copy em português para labels, placeholder, e mensagens de erro da ferramenta OCR.
- Estrutura de componentes da feature OCR.
- Configuração de cores/tema para os Recharts (usar CSS variables do Tailwind existentes).
- Setup de mocks no Playwright (padrão page.route existente nos specs atuais).

### Deferred Ideas (OUT OF SCOPE)

- Export de gráfico como imagem PNG.
- Modo de refinamento de OCR via chat.
- Suporte a PDF com tabelas no OCR.
- Charts em ferramenta separada `/workspace/charts`.
- CI/CD pipeline com Playwright no GitHub Actions.

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHRT-01 | User can request chart suggestions for uploaded spreadsheet data | Recharts + `sendQuickAction` pattern extension + chart AI stream |
| CHRT-02 | User can render bar, line, and pie charts using parsed spreadsheet data | Recharts `BarChart`, `LineChart`, `PieChart` com `"use client"` wrapper |
| OCR-01 | User can upload `.png`, `.jpeg`, or `.jpg` images that contain tables | New `/workspace/ocr` page + `useImageUpload` hook espelhando `useFileUpload` |
| OCR-02 | System reconstructs image tables into structured rows and columns | OpenAI Vision gpt-4o-mini base64 inline + prompt JSON + `/api/tools/ocr/process` route |
| OCR-03 | User can copy reconstructed tables as TSV or CSV for direct paste into Excel | `CopyButton` reutilizável + conversão rows→TSV/CSV no client |

</phase_requirements>

---

## Summary

A Fase 5 tem três domínios técnicos independentes que se integram ao codebase existente da Fase 4. O código da Fase 4 estabelece todos os padrões necessários: upload de arquivo com FormData, quota reserve/confirm/release, streaming NDJSON, quick-action buttons no ChatPanel, e `CopyButton` reutilizável. A Fase 5 reutiliza esses padrões integralmente, adicionando apenas a chamada de visão ao OpenAI e o componente Recharts.

O OCR usa a API de visão do OpenAI com imagem base64 inline — o cliente OpenAI existente já suporta esse formato via `content: [{ type: "image_url", image_url: { url: "data:image/...;base64,..." } }]`. O limite de 20 MB por imagem da OpenAI está bem acima do limite de 5 MB do projeto, portanto a validação existente de tamanho é suficiente. O resultado do OCR é one-shot (sem streaming): a rota retorna JSON com `rows: string[][]`, o cliente converte para HTML/TSV/CSV.

O Recharts 3.8.1 (publicado 2026-03-25) declara suporte explícito a React 19 em seus peer dependencies e é uma biblioteca puramente client-side — requer `"use client"` no componente que o utiliza. O padrão correto no App Router é: RSC (page.tsx) busca dados e passa para um Client Component que renderiza o Recharts. No ChatPanel, o componente de chart é um Client Component já que o ChatPanel inteiro já é `"use client"`.

Os testes Playwright já existem em `tests/e2e/` com `playwright.config.ts` configurado para `baseURL: http://127.0.0.1:3000` e `reuseExistingServer: !CI`. O padrão de mock é `page.route("**/api/tools/...", ...)` — idêntico ao usado em `formula.spec.ts` e `billing.spec.ts`. Nenhuma configuração adicional de infraestrutura é necessária para os novos specs.

**Recomendação primária:** Espelhar exatamente o padrão file-analysis para OCR (upload → route handler → OpenAI → JSON response → componente de resultado), instalar `recharts` como Client Component dentro do ChatPanel existente, e escrever specs Playwright usando o mesmo padrão `page.route()` já presente nos specs existentes.

---

## Architectural Responsibility Map

| Capability | Tier Principal | Tier Secundário | Justificativa |
|------------|---------------|-----------------|---------------|
| Upload de imagem OCR | Browser / Client | API / Backend | FormData upload é client-side; validação de MIME e tamanho é dupla (client + server) |
| Chamada Vision gpt-4o-mini | API / Backend | — | Server-only — chave OpenAI nunca exposta no cliente (padrão D-14 Fase 1) |
| Reconstrução de tabela HTML | API / Backend | — | Resposta JSON do AI processada no route handler |
| Preview da tabela + botões TSV/CSV | Browser / Client | — | Renderização de HTML + clipboard API são client-side |
| Sugestão de tipo de gráfico | API / Backend | — | AI decision feita server-side via chat stream existente |
| Renderização Recharts | Browser / Client | — | Recharts usa browser APIs — requer "use client" obrigatoriamente |
| Alternância Bar/Line/Pie | Browser / Client | — | Estado local no componente, sem round-trip ao servidor |
| Testes E2E Playwright | Dev / CI | — | Roda contra servidor Next.js local com mocks de API |

---

## Standard Stack

### Core

| Biblioteca | Versão | Propósito | Por que é padrão |
|------------|--------|-----------|-----------------|
| recharts | 3.8.1 | Bar/Line/Pie charts declarativos | React-first, peer dep React 19 explícito, instalado em production; 10+ anos de maturidade [VERIFIED: npm registry] |
| openai | 6.39.0 | Cliente OpenAI existente — vision via messages content array | Já instalado, já usado no projeto; suporta image_url base64 [VERIFIED: codebase] |
| @playwright/test | 1.60.0 | E2E tests — já instalado como devDependency | Já em package.json, playwright.config.ts já existe [VERIFIED: codebase] |

### Supporting

| Biblioteca | Versão | Propósito | Quando usar |
|------------|--------|-----------|-------------|
| react-is | 19.2.6 | Peer dep do recharts | Instalado automaticamente como dep transitiva — verificar se já existe no node_modules |
| zod | 4.4.3 | Validação dos schemas OCR e Chart | Já usado em todo o projeto via @tabelin/shared |

### Alternativas Consideradas

| Em vez de | Poderia usar | Tradeoff |
|-----------|-------------|---------|
| recharts | Chart.js + react-chartjs-2 | Menos declarativo, API mais imperativa, peso similar — não justifica troca dado D-05 |
| recharts | victory (FormidableLabs) | Menor adoção, mesma restrição client-only |
| page.route() mock | MSW (Mock Service Worker) | MSW requer service worker setup extra — page.route() já funciona e é padrão no projeto |

**Instalação:**
```bash
# Em apps/web/
pnpm add recharts
```

**Verificação de versão:**
```bash
npm view recharts version   # 3.8.1 (verificado em 2026-05-26)
```

---

## Package Legitimacy Audit

> slopcheck não estava disponível no ambiente. Verificação manual via npm registry e GitHub oficial.

| Package | Registry | Idade | Source Repo | Verificação Manual | Disposição |
|---------|----------|-------|-------------|-------------------|-----------|
| recharts | npm | ~10 anos (2015-08) | github.com/recharts/recharts | 10+ anos, MIT, peer dep React 19 explícito, publicado 2026-03-25, repo ativo [ASSUMED] | Aprovado |
| react-is | npm | ~8 anos | github.com/facebook/react | Parte do monorepo oficial do React (Facebook/Meta) [ASSUMED] | Aprovado |

**Pacotes removidos por slopcheck [SLOP]:** nenhum
**Pacotes suspeitos [SUS]:** nenhum

*slopcheck não disponível no ambiente — pacotes acima marcados [ASSUMED] com base em verificação manual de registry + repositório oficial. O planner deve confirmar antes da instalação se exigido pelo modo human_verify.*

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  OCR FLOW                                                           │
│                                                                     │
│  Browser                                                            │
│  [ImageUploadPanel] ──FormData(PNG/JPEG)──► [/api/tools/ocr/process]│
│         │                                         │                 │
│         │                               auth + quota reserve       │
│         │                                         │                 │
│         │                               gpt-4o-mini vision call    │
│         │                               (base64 inline, no store)  │
│         │                                         │                 │
│         ◄────JSON { rows: string[][] }─────────────┘                │
│         │                                                           │
│  [OcrResultPanel]                                                   │
│   ├─ tabela HTML preview                                            │
│   ├─ [CopyButton] "Copiar TSV"                                      │
│   └─ [CopyButton] "Copiar CSV"                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  CHART FLOW                                                         │
│                                                                     │
│  Browser [ChatPanel] (already "use client")                         │
│  [quick-action: "Sugerir Gráfico"] ──► sendQuickAction("chart")     │
│         │                                                           │
│         ▼                                                           │
│  [/api/tools/file-analysis/chat] ── AI stream ──► NDJSON events    │
│         │  (prompt especial p/ sugestão de gráfico)                │
│         │  Responde com event type="chart_data"                     │
│         │  { chartType, xKey, yKeys, rows, title }                 │
│         ▼                                                           │
│  useFileChat.submit() ── recebe event type="chart_data"             │
│         │                                                           │
│         ▼                                                           │
│  messages[] += { role: "assistant", type: "chart", chartData: ... } │
│         │                                                           │
│         ▼                                                           │
│  [ChatMessage] ── type==="chart" ──► [ChartMessage] (Client Comp)  │
│   ├─ Recharts (BarChart | LineChart | PieChart)                     │
│   ├─ Botões [Bar] [Line] [Pie] (estado local, sem nova req AI)      │
│   └─ [CopyButton] dados CSV                                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  PLAYWRIGHT E2E FLOW                                                │
│                                                                     │
│  npx playwright test                                                │
│         │                                                           │
│         ▼                                                           │
│  Next.js dev server (reuseExistingServer: true local)               │
│  Real Postgres DB (local dev)                                       │
│         │                                                           │
│  page.route("**/api/tools/**") ── mock responses ──► deterministic  │
│  page.route("**/api/billing/**") ── synthetic MP webhook            │
└─────────────────────────────────────────────────────────────────────┘
```

### Estrutura de Arquivos Recomendada

```
apps/web/src/
├── features/
│   ├── file-analysis/
│   │   ├── components/
│   │   │   ├── chat-panel.tsx          ← adicionar botão "Sugerir Gráfico" + type="chart"
│   │   │   ├── chat-message.tsx        ← adicionar branch type="chart"
│   │   │   └── chart-message.tsx       ← NOVO: Client Component Recharts
│   │   └── hooks/
│   │       └── use-file-chat.ts        ← adicionar "chart" ao sendQuickAction + LocalChatMessage type
│   └── ocr/
│       ├── components/
│       │   ├── image-upload-panel.tsx  ← NOVO: espelha FileUploadPanel
│       │   └── ocr-result-panel.tsx    ← NOVO: tabela HTML + botões TSV/CSV
│       └── ocr-tool.tsx                ← NOVO: coordenador (padrão FileAnalysisTool)
├── server/
│   └── ai/
│       └── ocr-processor.ts           ← NOVO: chamada vision gpt-4o-mini
├── app/
│   ├── (workspace)/workspace/
│   │   └── ocr/
│   │       └── page.tsx               ← NOVO: RSC espelhando file-analysis/page.tsx
│   └── api/tools/
│       └── ocr/
│           └── process/
│               └── route.ts           ← NOVO: auth + quota + ocr-processor
└── components/app/
    └── sidebar.tsx                    ← remover disabled:true do OCR slot

packages/shared/src/
└── ocr/
    ├── schema.ts                      ← NOVO: OcrRequest, OcrResponse Zod
    └── fixtures.ts                    ← NOVO: fixture response

tests/e2e/
├── formula.spec.ts                    ← existente
├── billing.spec.ts                    ← existente
└── smoke.spec.ts                      ← NOVO: MVP smoke tests completos
```

### Padrão 1: OCR Route Handler (espelha file-analysis/chat/route.ts)

**O quê:** POST `/api/tools/ocr/process` recebe `{ imageBase64: string, mimeType: string }`, chama gpt-4o-mini vision, retorna `{ rows: string[][] }`.

**Quando usar:** Sempre que uma imagem PNG/JPEG precisar ser convertida em tabela.

```typescript
// Source: espelho direto de apps/web/src/app/api/tools/file-analysis/chat/route.ts
// apps/web/src/app/api/tools/ocr/process/route.ts
import { NextResponse } from "next/server";
import { ocrRequestSchema } from "@tabelin/shared";
import { processImageOcr } from "@/server/ai/ocr-processor";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { confirmToolUse, releaseToolUse, reserveToolUse } from "@/server/usage/quota-service";

export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = ocrRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Pedido invalido." }, { status: 400 });

  const quotaCheck = await reserveToolUse(user.id, "ocr", "process");
  if (!quotaCheck.allowed) {
    return NextResponse.json({ code: "quota_exceeded", cta: "pro_checkout" }, { status: 429 });
  }

  try {
    const result = await processImageOcr(parsed.data.imageBase64, parsed.data.mimeType);
    await confirmToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ rows: result.rows, headers: result.headers });
  } catch {
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ error: "Nao foi possivel processar a imagem." }, { status: 502 });
  }
}
```

### Padrão 2: OCR Vision Call (gpt-4o-mini base64 inline)

**O quê:** `processImageOcr` envia a imagem como base64 inline, solicita JSON estruturado.

**Quando usar:** No `ocr-processor.ts`, chamado pelo route handler.

```typescript
// Source: [ASSUMED] baseado em openai SDK docs + padrão existente de createOpenAIClient
// apps/web/src/server/ai/ocr-processor.ts
import "server-only";
import { createOpenAIClient, getOpenAIModel } from "./openai-client";

const OCR_SYSTEM_PROMPT = `Voce e um assistente de extração de tabelas do Tabelin.IA.
Analise a imagem fornecida e extraia APENAS a tabela presente.
Retorne um JSON com o seguinte formato EXATO:
{
  "headers": ["col1", "col2", ...],
  "rows": [["val1", "val2", ...], ...]
}
Regras:
- Celulas vazias devem ser representadas como string vazia "".
- Preserve a ordem das colunas exatamente como aparece na imagem.
- Nao adicione comentarios, texto extra, ou markdown ao redor do JSON.
- Se nao houver tabela detectavel, retorne: {"headers": [], "rows": []}`;

export async function processImageOcr(
  imageBase64: string,
  mimeType: "image/png" | "image/jpeg"
): Promise<{ headers: string[]; rows: string[][] }> {
  if (!process.env.OPENAI_API_KEY) {
    // Fixture para desenvolvimento sem API key
    return {
      headers: ["Nome", "Valor", "Status"],
      rows: [["Alice", "100", "Ativo"], ["Bob", "200", "Inativo"]]
    };
  }

  const openai = createOpenAIClient();
  const model = getOpenAIModel();

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: OCR_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` }
          },
          { type: "text", text: "Extraia a tabela desta imagem." }
        ]
      }
    ],
    response_format: { type: "json_object" }
  });

  const raw = response.choices[0]?.message?.content ?? '{"headers":[],"rows":[]}';
  const parsed = JSON.parse(raw) as { headers?: string[]; rows?: string[][] };
  return {
    headers: parsed.headers ?? [],
    rows: parsed.rows ?? []
  };
}
```

### Padrão 3: Chart Message no ChatPanel (Recharts com "use client")

**O quê:** `ChartMessage` é um Client Component separado que renderiza Recharts com botões de alternância de tipo.

**Por que separado:** `ChatPanel` já é `"use client"` — mas isolar o componente Recharts em `chart-message.tsx` segue o padrão de componentes do projeto.

```typescript
// Source: [ASSUMED] + padrão recharts oficial (github.com/recharts/recharts)
// apps/web/src/features/file-analysis/components/chart-message.tsx
"use client";

import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { CopyButton } from "./copy-button";

export type ChartData = {
  chartType: "bar" | "line" | "pie";
  title: string;
  xKey: string;
  yKey: string;
  rows: Record<string, string | number>[];
};

type ChartType = "bar" | "line" | "pie";

const COLORS = ["var(--primary)", "#0ea5e9", "#f59e0b", "#10b981", "#8b5cf6"];

export function ChartMessage({ data }: { data: ChartData }) {
  const [activeType, setActiveType] = useState<ChartType>(data.chartType);

  // Converte dados para TSV para o CopyButton
  const csvData = [
    [data.xKey, data.yKey].join("\t"),
    ...data.rows.map((r) => [r[data.xKey], r[data.yKey]].join("\t"))
  ].join("\n");

  return (
    <div style={{ marginTop: "8px" }}>
      <p style={{ margin: "0 0 8px", fontSize: "13px", color: "var(--muted)" }}>
        {data.title}
      </p>
      <ResponsiveContainer width="100%" height={220}>
        {activeType === "bar" ? (
          <BarChart data={data.rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={data.xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey={data.yKey} fill="var(--primary)" />
          </BarChart>
        ) : activeType === "line" ? (
          <LineChart data={data.rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={data.xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey={data.yKey} stroke="var(--primary)" dot={false} />
          </LineChart>
        ) : (
          <PieChart>
            <Pie data={data.rows} dataKey={data.yKey} nameKey={data.xKey} cx="50%" cy="50%" outerRadius={80}>
              {data.rows.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        )}
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
        {(["bar", "line", "pie"] as ChartType[]).map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            type="button"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: activeType === type ? "var(--primary)" : "#fff",
              color: activeType === type ? "#fff" : "var(--text)",
              padding: "2px 12px",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            {type === "bar" ? "Barras" : type === "line" ? "Linhas" : "Pizza"}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <CopyButton value={csvData} />
        </div>
      </div>
    </div>
  );
}
```

### Padrão 4: Extensão do useFileChat para charts

**O quê:** Adicionar `"chart"` ao `sendQuickAction` e ao tipo `LocalChatMessage`.

```typescript
// Source: [VERIFIED: codebase] — extensão de use-file-chat.ts existente
// Adicionar ao tipo LocalChatMessage:
export type LocalChatMessage =
  | { role: "user" | "assistant"; type: "text"; content: string }
  | { role: "assistant"; type: "chart"; chartData: ChartData };

// Adicionar prompt de chart:
const CHART_PROMPT =
  "Analise os dados e sugira o tipo de grafico mais adequado (bar, line ou pie). " +
  "Retorne um JSON com: { chartType, title, xKey, yKey, rows } onde rows sao " +
  "os dados do arquivo como array de objetos. Retorne APENAS o JSON, sem markdown.";

// Adicionar ao sendQuickAction:
const sendQuickAction = useCallback(
  (uploadedFileId: string, promptType: "pivot" | "report" | "chart") => {
    const prompt =
      promptType === "pivot" ? PIVOT_PROMPT
      : promptType === "report" ? REPORT_PROMPT
      : CHART_PROMPT;
    void submit(uploadedFileId, prompt);
  },
  [submit]
);
```

**Nota:** O evento `complete` do stream existente retorna `content: string`. Para charts, o AI retornará JSON como string. O hook deve tentar `JSON.parse(event.content)` e, se o resultado tiver `chartType`, criar mensagem tipo `"chart"`. Caso contrário, cria mensagem `"text"` normalmente.

### Padrão 5: Playwright smoke test (extensão do padrão existente)

**O quê:** `smoke.spec.ts` cobre todos os happy paths usando `page.route()` exatamente como os specs existentes.

```typescript
// Source: [VERIFIED: codebase] — padrão de formula.spec.ts e billing.spec.ts
// tests/e2e/smoke.spec.ts
import { expect, test } from "@playwright/test";

// Mock responses para cada ferramenta...
const ocrMockResponse = {
  rows: [["Alice", "100", "Ativo"], ["Bob", "200", "Inativo"]],
  headers: ["Nome", "Valor", "Status"]
};

const chartMockBody = [
  { type: "delta", text: '{"chartType":"bar","title":"Valores por Nome","xKey":"Nome","yKey":"Valor","rows":[{"Nome":"Alice","Valor":100},{"Nome":"Bob","Valor":200}]}' },
  { type: "complete", content: '{"chartType":"bar","title":"Valores por Nome","xKey":"Nome","yKey":"Valor","rows":[{"Nome":"Alice","Valor":100},{"Nome":"Bob","Valor":200}]}' }
].map((e) => JSON.stringify(e)).join("\n");

test("smoke: auth + formula + quota + checkout", async ({ page }) => {
  // ... sign-up, formula generate, quota block, checkout mock
});

test("smoke: OCR image → tabela copiável", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.route("**/api/tools/ocr/process", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ocrMockResponse) });
  });
  // ... navegar para /workspace/ocr, fazer upload de imagem de fixture, verificar tabela + copy buttons
});

test("smoke: chart sugestão e alternância de tipo", async ({ page }) => {
  await page.route("**/api/tools/file-analysis/chat", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/x-ndjson", body: `${chartMockBody}\n` });
  });
  // ... upload planilha de fixture, clicar "Sugerir Gráfico", verificar chart renderizado, alternar Bar/Line/Pie
});
```

### Anti-Patterns a Evitar

- **Recharts em Server Component:** Recharts usa APIs do browser (`window`, `document`) — qualquer tentativa de renderizar no servidor resultará em erro de hidratação. O `ChartMessage` deve ter `"use client"` e jamais ser importado diretamente por um RSC sem wrapper.
- **`response_format: json_object` sem instrução no prompt:** A OpenAI exige que o prompt mencione explicitamente "retorne JSON" para que o `response_format: { type: "json_object" }` funcione corretamente — do contrário, lança erro 400.
- **Enviar imagem acima de 5 MB base64 no body:** Base64 aumenta o tamanho em ~33%. Um arquivo de 5 MB vira ~6.7 MB como string base64. Validar o tamanho da imagem ANTES de converter para base64 (validação no server recebe `content-length` ou valida `imageBase64.length * 0.75`).
- **Tentar stream o resultado do OCR:** OCR é one-shot por decisão (D-03). Não tentar adaptar `buildFileChatStream` para OCR — criar `processImageOcr` como função async simples que retorna diretamente.
- **Armazenar o base64 da imagem no banco:** PRIV-02 proíbe persistência do conteúdo raw. A imagem base64 existe apenas durante o request/response cycle — nunca salvar na coluna `schema` do `UploadedFile` ou nos logs.
- **Passar `chartData` como string em `content` do `ChatMessage` existente:** Extender `LocalChatMessage` para suportar tipo discriminado em vez de tentar parsear JSON de uma mensagem `content: string`.

---

## Don't Hand-Roll

| Problema | Não construir | Usar em vez disso | Por quê |
|----------|--------------|------------------|---------|
| Renderização de gráficos | Componente D3 custom | recharts 3.8.1 | D3 requer gerenciamento manual de SVG, escalas, resize — Recharts encapsula tudo declarativamente |
| Base64 de imagem no browser | FileReader customizado com Promise wrapper | `FileReader.readAsDataURL()` + parse do prefixo data URL | Nativo no browser, sem dependência extra |
| Conversão rows → TSV/CSV | Parser custom | Join simples: `rows.map(r => r.join('\t')).join('\n')` | Tabelas de OCR são arrays de strings planos, sem escapamento necessário para TSV |
| Mock de API nos testes | MSW, nock, interceptores customizados | `page.route()` do Playwright | Já é o padrão no projeto, zero setup adicional |
| Detecção de tipo de gráfico | Heurística hard-coded de colunas | Prompt ao gpt-4o-mini | AI contextualiza melhor do que regras estáticas para datasets variados |

---

## Common Pitfalls

### Pitfall 1: `ResponsiveContainer` com height 0 no Next.js App Router

**O que falha:** `ResponsiveContainer` precisa de um elemento pai com altura definida. Em SSR/hydration, o elemento pai pode ter height 0 antes da hidratação, causando gráfico invisível.
**Por que acontece:** Next.js hidrata o DOM antes de o browser calcular as dimensões do layout.
**Como evitar:** Passar `height={220}` diretamente no `ResponsiveContainer` (não depender de `height="100%"`) e garantir `width="100%"`. Adicionar `minHeight: 220` no wrapper `div`.
**Sinais de alerta:** Gráfico renderiza no servidor mas é invisível no cliente até resize da janela.

### Pitfall 2: `response_format: json_object` com `gpt-4o-mini` e instrução ambígua

**O que falha:** A API lança erro 400 com mensagem "JSON mode requires instructions".
**Por que acontece:** OpenAI exige que o prompt do system ou user mencione explicitamente "JSON" quando `response_format: { type: "json_object" }` é usado.
**Como evitar:** O `OCR_SYSTEM_PROMPT` acima já inclui "Retorne um JSON com o seguinte formato EXATO" — manter essa instrução explícita. Nunca remover a palavra "JSON" do prompt ao usar json_object mode.
**Sinais de alerta:** `400 Bad Request` com body `"type": "invalid_request_error"`.

### Pitfall 3: `page.route()` não intercepta requisições server-side no App Router

**O que falha:** `page.route()` intercepta apenas requisições do browser (client-side fetch). Requisições feitas no RSC durante SSR passam pelo Node.js do servidor, não pelo browser — `page.route()` não as captura.
**Por que acontece:** Playwright intercepta na camada de rede do browser, não no processo Node.js do Next.js.
**Como evitar:** As rotas de OCR e chart (`/api/tools/ocr/process`, `/api/tools/file-analysis/chat`) são chamadas pelo browser (Client Components), não por RSCs — `page.route()` funciona corretamente para elas. A única chamada server-side que pode precisar de atenção é a rota de upload se o response for usado em SSR — mas no projeto atual todas as chamadas de tools são client-side via hooks.
**Sinais de alerta:** Mock `page.route()` configurado mas request não é interceptado.

### Pitfall 4: Base64 de imagem JPEG com prefixo data URL incorreto

**O que falha:** OpenAI retorna erro 400 se o `url` tiver prefixo `data:image/jpg;base64,...` (JPEG usa `image/jpeg`, não `image/jpg`).
**Por que acontece:** MIME type `image/jpg` não é válido — o correto é `image/jpeg`.
**Como evitar:** No schema Zod do OCR, usar `z.enum(["image/png", "image/jpeg"])` e normalizar no client: `file.type === "image/jpg" ? "image/jpeg" : file.type`.
**Sinais de alerta:** Erro 400 com mensagem sobre invalid image format.

### Pitfall 5: Quota para OCR com toolKind diferente do esperado

**O que falha:** `reserveToolUse(user.id, "ocr", "process")` funciona, mas o campo `toolKind` no `UsageLedger` deve ser consistente com o registro em `ToolRequest` para análise posterior.
**Por que acontece:** `reserveToolUse` aceita qualquer string — se o toolKind variar entre chamadas, as métricas ficam fragmentadas.
**Como evitar:** Usar `toolKind: "ocr"` consistentemente em ambas as chamadas: `reserveToolUse(userId, "ocr", "process")` e `recordToolRequest({ toolKind: "ocr", mode: "process", ... })`.

---

## Integração com Codebase Existente — Pontos Críticos

Esta seção documenta o estado atual do código e o delta exato necessário para a Fase 5.

### sidebar.tsx — ativar slot OCR

```typescript
// Estado atual (linha 27):
{ label: "OCR", icon: Image, disabled: true }

// Estado após Fase 5:
{ label: "OCR", icon: Image, href: "/workspace/ocr" }
```

### ChatPanel — adicionar botão "Sugerir Gráfico"

O botão deve aparecer APENAS no estado `"chat"` (já é o estado do ChatPanel), mas o componente atual não tem acesso ao `uiState` — ele é renderizado diretamente pelo `FileAnalysisTool` quando `uiState === "chat"`. Portanto, o botão pode ser adicionado incondicionalmente ao quick-action-row do ChatPanel. [VERIFIED: codebase]

```typescript
// Adicionar após o botão "Relatorio Executivo" no quick-action-row:
<button
  aria-label="Sugerir grafico"
  disabled={streaming || chat.quotaBlocked}
  onClick={() => chat.sendQuickAction(uploadedFileId, "chart")}
  // ... mesmo style dos outros quick-action buttons
  type="button"
>
  Sugerir Grafico
</button>
```

### packages/shared — novos schemas Zod

```typescript
// packages/shared/src/ocr/schema.ts
export const ocrRequestSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(["image/png", "image/jpeg"])
});
export const ocrResponseSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string()))
});
// Tipos:
export type OcrRequest = z.infer<typeof ocrRequestSchema>;
export type OcrResponse = z.infer<typeof ocrResponseSchema>;
```

```typescript
// packages/shared/src/ocr/fixtures.ts
export const OCR_FIXTURE_RESPONSE: OcrResponse = {
  headers: ["Nome", "Valor", "Status"],
  rows: [["Alice", "100", "Ativo"], ["Bob", "200", "Inativo"]]
};
```

O `chatStreamEventSchema` em `file-analysis/schema.ts` precisará de um novo tipo de evento para charts:

```typescript
// Adicionar ao discriminatedUnion existente:
z.object({
  type: z.literal("chart_data"),
  chartType: z.enum(["bar", "line", "pie"]),
  title: z.string(),
  xKey: z.string(),
  yKey: z.string(),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number()])))
})
```

### useImageUpload hook (novo, espelha useFileUpload)

O hook OCR é mais simples: sem `sheetNames`, sem `sheet_selection`, sem `pendingFile`. O fluxo é: selecionar arquivo → converter para base64 → chamar `/api/tools/ocr/process` → receber `{ rows, headers }`.

```typescript
// apps/web/src/features/ocr/hooks/use-image-upload.ts
// Aceita: image/png, image/jpeg (não image/jpg — normalizar)
// Limite: 5 MB (consistente com uploads de planilha)
// Estado: "idle" | "processing" | "complete" | "error"
// Resultado: OcrResponse | null
```

---

## State of the Art

| Abordagem Antiga | Abordagem Atual | Quando Mudou | Impacto |
|-----------------|----------------|-------------|---------|
| OpenAI Vision exigia URL pública temporária (gpt-4-vision-preview) | base64 inline aceito diretamente (gpt-4o-mini, gpt-4o) | ~2024 | Sem necessidade de upload de imagem para storage temporário |
| Recharts v2 — sem suporte a React 18/19 peer dep | Recharts v3 — peer dep explícito React 19 | 2024-2025 | Compatível diretamente com o projeto |
| MSW recomendado para mocks em testes Playwright | `page.route()` nativo Playwright é suficiente para client-side API mocks | Playwright 1.20+ | Sem setup extra de service worker |

**Deprecated/Outdated:**
- `gpt-4-vision-preview`: depreciado, substituído por `gpt-4o` e `gpt-4o-mini` com suporte nativo a visão.
- `next/experimental/testmode`: experimental no Next.js — necessário apenas para mocks server-side em RSCs. Não necessário aqui pois todas as chamadas de tools são client-side.

---

## Assumptions Log

| # | Afirmação | Seção | Risco se Errado |
|---|-----------|-------|----------------|
| A1 | recharts 3.8.1 funciona sem erros de hidratação no Next.js 16.2.6 com React 19.2.6 | Standard Stack | Gráfico pode não renderizar — solução: lazy import com dynamic() |
| A2 | `gpt-4o-mini` via `getOpenAIModel()` suporta visão e `response_format: json_object` | Code Examples | Se `OPENAI_MODEL` apontar para um modelo sem visão, ocorre erro 400 — fixture cobre este caso em dev |
| A3 | `page.route()` intercepta os POSTs para `/api/tools/ocr/process` (Client Component fetch) | Padrão 5 / Playwright | Se OCR fizer fetch do server-side, não será interceptado — mas o hook é client-side por design |
| A4 | recharts não requer registro de pacote adicional (react-is já presente como dep transitiva do React 19) | Standard Stack | Se react-is não estiver instalado, `pnpm add recharts` o instalará automaticamente |
| A5 | `response_format: json_object` está disponível no modelo `gpt-4o-mini` (via OPENAI_MODEL env) | OCR Processor | Se modelo customizado não suportar json_object, usar parsing manual de JSON do texto livre |

---

## Open Questions

1. **OPENAI_MODEL env pode apontar para modelo sem visão?**
   - O que sabemos: `OPENAI_MODEL` é a env usada por todos os tools (`getOpenAIModel()` default: "gpt-5-mini" no openai-client.ts — provavelmente um typo de "gpt-4o-mini")
   - O que é incerto: se em produção `OPENAI_MODEL` puder ser `gpt-3.5-turbo` (sem visão)
   - Recomendação: O `ocr-processor.ts` deve ter um comentário documentando que o modelo configurado DEVE suportar visão. Alternativa: hardcode do modelo para `gpt-4o-mini` no OCR, ignorando `getOpenAIModel()`, já que D-02 especifica `gpt-4o-mini` como modelo obrigatório.

2. **Imagem de fixture para testes Playwright de OCR**
   - O que sabemos: Playwright pode fazer upload de arquivo via `page.setInputFiles()`
   - O que é incerto: se existe uma imagem PNG de fixture no projeto
   - Recomendação: Criar `tests/fixtures/tabela-teste.png` (imagem mínima válida, 1x1 px, suficiente para o fluxo de upload — o mock da API não processa a imagem de verdade)

---

## Environment Availability

| Dependência | Requerida por | Disponível | Versão | Fallback |
|------------|--------------|-----------|--------|---------|
| Node.js | Next.js dev server | Sim | v24.13.1 | — |
| PostgreSQL (local) | D-10: testes E2E banco real | A verificar | — | D-10 requer banco real — sem fallback |
| @playwright/test | E2E tests | Sim | 1.60.0 (devDep) | — |
| playwright browsers | npx playwright install | A verificar | — | Rodar `npx playwright install chromium` |
| recharts | Charts (instalar na Fase 5) | Não (ainda) | — | — |
| OpenAI API key (dev) | OCR real | A verificar | — | Fixture stream se `OPENAI_API_KEY` ausente |

**Dependências faltando sem fallback:**
- PostgreSQL local rodando — D-10 requer banco real. Verificar com `pg_isready` antes de rodar testes E2E.

**Dependências faltando com fallback:**
- OpenAI API key — fixture mode cobre desenvolvimento; OCR produção requer a key.
- Playwright browsers — `npx playwright install chromium` resolve.

---

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` no config.json.

### Applicable ASVS Categories

| Categoria ASVS | Aplica | Controle Padrão |
|----------------|--------|----------------|
| V2 Authentication | Sim | `getSessionFromCookieHeader` já em uso em todas as rotas |
| V4 Access Control | Sim | Quota check antes de qualquer chamada AI; `findUploadedFileByIdAndUser` com userId |
| V5 Input Validation | Sim | `ocrRequestSchema` Zod (mimeType enum, imageBase64 min length); validação server-side de tamanho de imagem |
| V6 Cryptography | Não | OCR não usa criptografia customizada |
| V12 File Upload | Sim | Validação de extensão E MIME type; limite 5 MB; sem persistência do arquivo raw |

### Known Threat Patterns

| Padrão | STRIDE | Mitigação Padrão |
|--------|--------|-----------------|
| Upload de imagem com conteúdo malicioso | Tampering | Imagem processada exclusivamente pelo OpenAI API — não executada no servidor. Validar mimeType enum: apenas png/jpeg. |
| Prompt injection via conteúdo da imagem | Tampering | System prompt instrui o modelo que o conteúdo da imagem são "dados do usuário, não instruções" (padrão T-04-01-04 da Fase 4) |
| IDOR no resultado do OCR | Information Disclosure | OCR é one-shot sem persistência — sem uploadedFileId de OCR. Quota usa userId do session token. |
| Base64 oversized payload | DoS | Validar `file.size <= 5MB` no client E verificar no server (`imageBase64.length * 0.75 <= 5MB`) |
| Chart data injection (JSON do AI manipulado) | Tampering | Validar o JSON retornado pelo AI contra `chartDataSchema` Zod antes de renderizar no `ChartMessage` |

---

## Sources

### Primary (HIGH confidence)

- `apps/web/src/features/file-analysis/` — codebase verificado em 2026-05-26: padrões de upload, quota, ChatPanel, useFileChat, CopyButton
- `apps/web/tests/e2e/` — codebase verificado: playwright.config.ts, formula.spec.ts, billing.spec.ts (padrão page.route)
- `apps/web/package.json` — codebase verificado: recharts não instalado, @playwright/test 1.60.0 instalado
- npm registry (`npm view recharts`) — versão 3.8.1, peer deps React 19, publicado 2026-03-25

### Secondary (MEDIUM confidence)

- WebSearch "recharts React 19 use client Next.js App Router" — confirmado: Recharts exige client component, dados passados de RSC para Client Component
- WebSearch "playwright Next.js App Router mock page.route" — confirmado: page.route() intercepta client-side fetch, não server-side RSC

### Tertiary (LOW confidence — marcadas [ASSUMED])

- OpenAI Vision API base64 limite 20 MB por imagem (via WebFetch openai-hd4n6.mintlify.app — fonte não oficial)
- `response_format: json_object` requer "JSON" explícito no prompt — comportamento documentado em múltiplas fontes da comunidade, mas não verificado via Context7

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — versões verificadas via npm registry, codebase confirmado
- Architecture: HIGH — baseado no codebase existente da Fase 4 (padrões verificados)
- Pitfalls: MEDIUM — baseado em conhecimento de treinamento + verificação parcial via WebSearch
- Playwright patterns: HIGH — padrão verificado no codebase existente

**Research date:** 2026-05-26
**Valid until:** 2026-06-26 (recharts e OpenAI API são estáveis; Playwright muda raramente)

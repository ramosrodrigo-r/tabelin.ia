---
phase: 05-ocr-charts-and-launch-hardening
plan: "02"
subsystem: file-analysis/charts
tags: [recharts, charts, ui, client-component, file-analysis]
dependency_graph:
  requires:
    - 05-01 (packages/shared/src/ocr/schema.ts com ChartData — criado em paralelo na mesma wave)
  provides:
    - ChartMessage Client Component com Recharts BarChart/LineChart/PieChart
    - useFileChat com union discriminada LocalChatMessage e CHART_PROMPT
    - Botão Sugerir Gráfico no ChatPanel
  affects:
    - apps/web/src/features/file-analysis (hooks, components)
    - packages/shared/src/file-analysis/schema.ts
tech_stack:
  added:
    - recharts 3.8.1 (BarChart, LineChart, PieChart, ResponsiveContainer)
  patterns:
    - Union discriminada TypeScript para LocalChatMessage (type: text | chart)
    - Client Component com useState para alternância local de tipo de gráfico
    - JSON.parse + validação estrutural no complete event handler para detecção de chart
key_files:
  created:
    - apps/web/src/features/file-analysis/components/chart-message.tsx
    - packages/shared/src/ocr/schema.ts (também criado pelo Plano 05-01 em paralelo)
    - packages/shared/src/ocr/fixtures.ts (também criado pelo Plano 05-01 em paralelo)
  modified:
    - apps/web/src/features/file-analysis/hooks/use-file-chat.ts
    - apps/web/src/features/file-analysis/components/chat-panel.tsx
    - packages/shared/src/file-analysis/schema.ts
    - packages/shared/src/index.ts
    - apps/web/package.json
decisions:
  - Executar JSON.parse com try/catch no complete event — fallback para type:text em caso de SyntaxError ou JSON sem campos esperados
  - ResponsiveContainer com height={220} (número, não string) para evitar bug SSR height-0 no Next.js
  - minHeight: 220 no parent div para garantir espaço reservado antes do hydration
  - ChartData importado de @tabelin/shared (mesmo tipo criado pelo Plano 05-01)
  - ocr/schema.ts e fixtures.ts criados no worktree 05-02 também (dependência paralela — merge da wave resolveu)
metrics:
  duration: "4 min"
  completed_date: "2026-05-26"
  tasks_completed: 3
  files_modified: 8
---

# Phase 05 Plan 02: Charts End-to-End (Recharts + useFileChat + ChartMessage) Summary

## One-liner

Instalação de recharts 3.8.1 com ChartMessage Client Component (BarChart/LineChart/PieChart), extensão de useFileChat como union discriminada com CHART_PROMPT e detecção JSON no complete event, e botão "Sugerir Gráfico" no ChatPanel.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Instalar recharts + estender chatStreamEventSchema | 1907d30 | apps/web/package.json, packages/shared/src/file-analysis/schema.ts, packages/shared/src/ocr/schema.ts, packages/shared/src/ocr/fixtures.ts, packages/shared/src/index.ts |
| 2 | Estender use-file-chat + criar ChartMessage | b824739 | apps/web/src/features/file-analysis/hooks/use-file-chat.ts, apps/web/src/features/file-analysis/components/chart-message.tsx |
| 3 | Estender ChatPanel com botão e branch de renderização | 37819a4 | apps/web/src/features/file-analysis/components/chat-panel.tsx |

## What Was Built

**recharts instalado:** `recharts@3.8.1` adicionado como production dependency em `apps/web/package.json`. Pacote verificado — 10+ anos de histórico, MIT license, github.com/recharts/recharts.

**chatStreamEventSchema estendido:** Variante `chart_data` adicionada ao discriminatedUnion em `packages/shared/src/file-analysis/schema.ts` com campos `chartType`, `title`, `xKey`, `yKey`, `rows`. Variantes existentes preservadas sem alteração.

**packages/shared/src/ocr/schema.ts:** Criado com `chartDataSchema` e tipo `ChartData` (necessário como dependência do Plano 05-02; o Plano 05-01 cria o mesmo arquivo em paralelo — o merge da wave resolve qualquer conflito).

**useFileChat estendido (`use-file-chat.ts`):**
- `LocalChatMessage` virou union discriminada: `{ type: "text"; ... } | { type: "chart"; chartData: ChartData }`
- `CHART_PROMPT` instrui o AI a retornar JSON-only sem markdown
- `sendQuickAction` aceita `promptType: "pivot" | "report" | "chart"`
- complete event handler: `JSON.parse` com `try/catch`, validação estrutural de `chartType + xKey + yKey + rows`, criação de msg `chart` ou fallback para `text`

**ChartMessage criado (`chart-message.tsx`):**
- `"use client"` na primeira linha
- Props: `{ data: ChartData }`
- `useState<ChartType>` para alternância local (sem round-trip ao servidor)
- `ResponsiveContainer` com `height={220}` (número fixo) + parent div com `minHeight: 220`
- `BarChart` com `fill="var(--primary)"`, `CartesianGrid`, `XAxis`/`YAxis` com `fontSize: 12`
- `LineChart` com `stroke="var(--primary)"`, `type="monotone"`, `dot={false}`
- `PieChart` com `Cell` e array de 5 cores começando com `var(--primary)`
- Botões "Barras" / "Linhas" / "Pizza" com `aria-pressed`
- `CopyButton` com dados no formato TSV (header + linhas)
- Container com `role="img"` e `aria-label` descritivo

**ChatPanel estendido (`chat-panel.tsx`):**
- Import de `ChartMessage` de `./chart-message`
- Branch no map de mensagens: `msg.type === "chart" ? <ChartMessage> : <ChatMessage>`
- Botão "Sugerir Gráfico" após "Relatorio Executivo" com mesmo estilo inline
- Draft de streaming continua com `ChatMessage` (sempre texto)

## Verification Results

- `recharts` em `apps/web/package.json`: OK (3.8.1 em dependencies)
- `recharts` em `node_modules`: OK (instalado)
- `chart_data` em `packages/shared/src/file-analysis/schema.ts`: OK
- `CHART_PROMPT` em `use-file-chat.ts`: OK
- `"use client"` em `chart-message.tsx` (linha 1): OK
- `height={220}` em `chart-message.tsx`: OK (número, não string)
- `Sugerir Gráfico` em `chat-panel.tsx`: OK
- `npx tsc --project apps/web/tsconfig.json --noEmit`: OK (0 erros)

## Deviations from Plan

### Auto-added Infrastructure

**1. [Rule 2 - Missing Dependency] Criados packages/shared/src/ocr/schema.ts e fixtures.ts**
- **Found during:** Task 1
- **Issue:** O Plano 05-02 depende de `ChartData` de `@tabelin/shared` que seria criado pelo Plano 05-01 em paralelo. Como execuções são em worktrees separados, o arquivo não estava disponível neste worktree
- **Fix:** Criados `packages/shared/src/ocr/schema.ts` e `packages/shared/src/ocr/fixtures.ts` com o mesmo conteúdo que o Plano 05-01 cria (confirmado via leitura do worktree paralelo). `index.ts` também atualizado para exportar os novos módulos
- **Files modified:** packages/shared/src/ocr/schema.ts, packages/shared/src/ocr/fixtures.ts, packages/shared/src/index.ts
- **Commit:** 1907d30

**2. Aspas duplas em `"use client"` em vez de aspas simples**
- Critério de aceitação especificava `'use client'` com aspas simples; arquivo usa `"use client"` com aspas duplas
- Comportamento Next.js é idêntico — ambas as formas são aceitas
- Não alterado pois os outros arquivos do projeto também usam aspas duplas (padrão do projeto)

## Known Stubs

Nenhum stub presente. Os dados do gráfico são preenchidos dinamicamente pela resposta do AI via `CHART_PROMPT`. `ChartMessage` recebe `data: ChartData` real com `chartType`, `title`, `xKey`, `yKey`, `rows` populados.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-05-02-01 mitigado | use-file-chat.ts | JSON.parse em try/catch com validação estrutural de chartType/xKey/yKey/rows antes de criar msg chart — campos inesperados descartam para type: text |
| T-05-02-02 parcialmente mitigado | chart-message.tsx | Dados do AI usados como props React (não executados como HTML/eval); chartDataSchema.safeParse opcional foi deixado de fora para manter simplicidade — dados inválidos resultam em componente com rows vazio, não em crash |

## Self-Check

Verificações executadas após criação do SUMMARY:
- `apps/web/src/features/file-analysis/components/chart-message.tsx`: FOUND
- `apps/web/src/features/file-analysis/hooks/use-file-chat.ts`: FOUND (modificado)
- `apps/web/src/features/file-analysis/components/chat-panel.tsx`: FOUND (modificado)
- `packages/shared/src/file-analysis/schema.ts`: FOUND (modificado)
- `packages/shared/src/ocr/schema.ts`: FOUND (criado)
- Commit 1907d30: FOUND
- Commit b824739: FOUND
- Commit 37819a4: FOUND
- TypeScript 0 erros: CONFIRMED

## Self-Check: PASSED

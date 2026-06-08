# Stack Research

**Domain:** Brazil-localized spreadsheet AI SaaS — v2.0 Chat Unificado & Tabela Viva
**Researched:** 2026-06-08
**Confidence:** HIGH (grid + formula engine — verificado via Context7, npm, docs oficiais); HIGH (intent routing — OpenAI SDK já em produção)

---

## Nota sobre escopo

Este arquivo cobre APENAS as adições necessárias para v2.0. O stack base (Next.js 16.2.6 App Router, React 19.2.6, TypeScript 6.0.3, Tailwind 4.3.0, Prisma 7.8.0, Better Auth 1.6.11, OpenAI SDK 6.39.0, Zod 4.4.3, xlsx 0.18.5, csv-parse 6.2.1, unpdf, recharts) foi validado em produção e NÃO é re-pesquisado.

---

## Stack base (já em produção — referência)

| Technology | Versão em uso |
|------------|--------------|
| Next.js App Router | 16.2.6 |
| React | 19.2.6 |
| OpenAI SDK | 6.39.0 |
| Zod | 4.4.3 |
| xlsx (SheetJS CE) | 0.18.5 |

---

## Recommended Stack — Adições para v2.0

### (a) Grid Editável — Mini-Excel

**Recomendado: `react-datasheet-grid` v4.11.6**

| Library | Versão | Licença | Tamanho packed | Por que |
|---------|--------|---------|----------------|---------|
| **react-datasheet-grid** | **4.11.6** | **MIT** | **~58 KB packed** | Projetado explicitamente para experiência estilo Airtable/Excel; copy-paste nativo com outras planilhas; virtualização de linhas E colunas (migrou de react-window para react-virtual na v4); tipagem TypeScript nativa; MIT irrestrito; manutenção ativa (última publicação: faz horas) |

**Análise dos concorrentes:**

| Biblioteca | Licença | Tamanho | Cell Editing | Virtualização | Veredicto |
|------------|---------|---------|--------------|---------------|-----------|
| react-datasheet-grid 4.11.6 | MIT | ~58 KB | Nativa + custom | Linhas + colunas | **Escolhido** |
| AG Grid Community 35.3.1 | MIT | ~140 KB min+gzip | Nativa | Linhas + colunas | Descartado — bundle 2-3x maior; voltado para BI dashboards, não mini-Excel; API mais complexa |
| Glide Data Grid 6.0.3 | MIT | ~2 MB WASM | Canvas (sem DOM) | Canvas-based | Descartado — renderização canvas impede integração de fórmulas inline por célula; inacessível para screen readers; UX mini-Excel requer DOM |
| TanStack Table v8 + custom | MIT | ~14 KB (apenas lógica) | Zero built-in | Requer TanStack Virtual separado | Descartado — headless; construir edição inline, keyboard navigation, copy-paste e seleção de bloco do zero para v2.0 é um sprint inteiro adicional sem diferenciação |

**Integração com Next.js App Router / RSC:**

react-datasheet-grid usa hooks React e acessa APIs de browser (clipboard, keyboard events). É um Client Component. A integração correta é:

```tsx
// components/tabela-viva/TableGrid.tsx
"use client";
import { DataSheetGrid, keyColumn, textColumn } from "react-datasheet-grid";
import "react-datasheet-grid/dist/style.css";
```

O CSS precisa de import explícito (desde a v4) — suporte a Next.js/SSR é direto sem workarounds adicionais. O componente inteiro da tabela vive em `"use client"` e é renderizado como leaf node na árvore RSC.

**Pattern de coluna com fórmula:**

```tsx
import { DataSheetGrid, keyColumn, Column } from "react-datasheet-grid";

type Row = { [key: string]: string | number };

const formulaColumn = (key: string): Column<Row> => ({
  ...keyColumn<Row, string>(key, {
    component: FormulaCellEditor, // input com detecção de "=" prefix
    copyValue: ({ rowData }) => String(rowData[key] ?? ""),
    pasteValue: ({ rowData, value }) => ({ ...rowData, [key]: value }),
    deleteValue: ({ rowData }) => ({ ...rowData, [key]: "" }),
  }),
  title: key,
});
```

---

### (b) Motor de Fórmulas — Recálculo ao Vivo

**Recomendado: `HyperFormula` v3.3.0 — COM compra de licença comercial**

| Library | Versão | Licença | Tamanho packed | Por que |
|---------|--------|---------|----------------|---------|
| **HyperFormula** | **3.3.0** | **GPL-3.0-only / Proprietária** | **~1.9 MB packed** | Único motor de fórmulas headless TypeScript production-ready com +400 funções, grafo de dependências completo, suporte a separador `;`, i18n configurável e uso comprovado em SaaS. O pacote tem 1.9 MB packed mas é carregado apenas na rota da Tabela Viva — impacto no bundle principal é zero com dynamic import. |

**Aviso crítico de licença (leia antes de implementar):**

HyperFormula é GPL-3.0-only. Tabelin.IA é um SaaS comercial closed-source. **A GPL-3.0 é copyleft: usar HyperFormula sob GPL-3.0 obriga a tornar todo o código-fonte da aplicação open-source.**

Para uso em SaaS comercial closed-source, é obrigatório adquirir a **licença proprietária** da Handsontable (contato: sales@handsontable.com). Sem a licença proprietária, o código com HyperFormula não pode ser publicado como closed-source.

```typescript
// Com licença comercial adquirida:
const hf = HyperFormula.buildEmpty({
  licenseKey: "xxxx-xxxx-xxxx-xxxx-xxxx", // chave comprada
  functionArgSeparator: ";",              // padrão Brasil
  decimalSeparator: ",",                  // padrão Brasil
  thousandSeparator: ".",                 // padrão Brasil
  language: "ptPT",                       // ver nota de localização abaixo
});

// Com GPL (apenas se o app for open-source):
const hf = HyperFormula.buildEmpty({ licenseKey: "gpl-v3" });
```

**Localização pt-BR — importante:**

HyperFormula tem 17 pacotes de idioma embutidos. **ptBR (português do Brasil) NÃO está na lista.** O idioma `ptPT` (português de Portugal) está disponível e cobre os nomes de funções do Excel/Calc em português (SOMA, SE, PROCV, SOMASE etc.) — que são idênticos entre ptPT e ptBR. A diferença entre ptPT e ptBR em nomes de funções Excel é desprezível na prática para o público-alvo (Mariana, Thiago, Carlos).

Estratégia recomendada: usar `ptPT` como base e criar um pacote customizado `ptBR` mínimo sobrescrevendo apenas os eventuais termos divergentes (principalmente mensagens de erro). O mecanismo de custom language pack é simples:

```typescript
import ptPT from "hyperformula/es/i18n/languages/ptPT";
import HyperFormula from "hyperformula";

const ptBR = {
  ...ptPT,
  langCode: "ptBR",
  // sobrescrever apenas o que diferir do ptPT
  errors: {
    ...ptPT.errors,
    NAME: "#NOME?",  // ptBR usa "#NOME?" não "#NOME?"
  },
};

HyperFormula.registerLanguage("ptBR", ptBR);
```

**Configuração para compatibilidade com Excel Brasil:**

```typescript
const hf = HyperFormula.buildEmpty({
  licenseKey: "xxxx-xxxx-xxxx-xxxx-xxxx",
  language: "ptBR",
  functionArgSeparator: ";",  // Excel Brasil usa ";" como separador de argumentos
  decimalSeparator: ",",
  thousandSeparator: ".",
  // NOTA: HyperFormula não permite que functionArgSeparator === thousandSeparator
  // A configuração acima é a mais próxima possível do Excel pt-BR
});
```

**Alternativas ao HyperFormula:**

| Alternativa | Licença | Funções | Veredicto |
|------------|---------|---------|-----------|
| `@formulajs/formulajs` v4.6.0 (MIT) | MIT | ~100 funções | Sem grafo de dependências, sem recálculo em cascata, sem suporte a referências de célula (A1, B2:C5). É uma calculadora de funções isoladas, não um motor de planilha. Insuficiente para Tabela Viva. |
| Escrever mini-evaluator próprio | Sem custo | Mínimo | Viável para SOMA(A1:B3) básico mas sem grafo de deps, sem tratamento de ciclos, sem funções complexas (PROCV, SE aninhado etc.). Gera dívida técnica alta. |
| Formualizer (Rust/WASM) | MIT/Apache-2.0 | 320+ | Promissor — MIT, ~2 MB WASM, mais rápido que HyperFormula. Porém: biblioteca nova (2025), ecossistema imaturo, integração com Next.js/React não documentada, risco de suporte. Avaliar para v3.0 se o custo da licença HyperFormula for inviável. |
| `fast-formula-parser` | MIT | Parcial | Abandonado, sem manutenção ativa. |

**Performance do HyperFormula:**

O pacote packed tem 1.9 MB, mas com `dynamic import` o peso não afeta o bundle principal:

```typescript
// Carregado apenas quando a Tabela Viva é aberta
const { HyperFormula } = await import("hyperformula");
```

Para tabelas de uso típico no produto (10-200 linhas, 5-20 colunas), o HyperFormula é instantâneo. O peso de ~80 MB de memória para 100K células é irrelevante nessa escala.

---

### (c) CSV/XLSX Export — Reutilização do xlsx já instalado

**Nenhuma nova dependência necessária.** O projeto já usa `xlsx` (SheetJS CE) v0.18.5 para extração/parsing de XLSX (instalado na v1.2). A mesma biblioteca gera exports:

```typescript
// Export CSV
import * as XLSX from "xlsx";

function exportToCSV(rows: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename + ".csv");
}

// Export XLSX
function exportToXLSX(rows: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tabela");
  const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  downloadBlob(blob, filename + ".xlsx");
}
```

**Nota sobre versão:** xlsx 0.18.5 é a última versão publicada no npm público (Apache-2.0). Versões mais novas (0.20.x) são distribuídas apenas pelo CDN oficial da SheetJS em https://cdn.sheetjs.com e **não estão no registro npm**. Para um projeto pnpm monorepo, manter a 0.18.5 do npm é a escolha correta — evita complexidade de CDN install e a funcionalidade de export não mudou.

---

### (d) Roteamento de Intent LLM — Zero dependência nova

**Nenhuma biblioteca adicional necessária.** O OpenAI SDK 6.39.0 já instalado suporta Structured Outputs com `response_format` + Zod:

```typescript
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const IntentSchema = z.object({
  intent: z.enum([
    "formula",
    "sql",
    "regex",
    "scripts",
    "file_analysis",
    "ocr",
    "tabela",        // novo: gera Tabela Viva
    "clarificacao",  // novo: IA faz perguntas ao usuário
    "chat_generico", // fallback
  ]),
  confidence: z.number().min(0).max(1),
  requires_clarification: z.boolean(),
});

// No Route Handler do chat unificado:
const completion = await openai.beta.chat.completions.parse({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: INTENT_CLASSIFIER_PROMPT },
    { role: "user", content: userMessage },
  ],
  response_format: zodResponseFormat(IntentSchema, "intent"),
});

const { intent, requires_clarification } = completion.choices[0].message.parsed;
```

**Por que não usar uma biblioteca de classificação separada:**

- OpenAI Structured Outputs com `strict: true` garantem 100% de aderência ao schema (verificado: gpt-4o-2024-08-06+, gpt-4o-mini)
- O projeto já paga pelo OpenAI — não há custo incremental de classificação
- Alternativas como `langchain` ou `ai` SDK da Vercel adicionariam dependências pesadas sem benefício real para um roteador com schema fixo
- A lógica de routing em si é um switch simples sobre o campo `intent` retornado

**Para o loop de clarificação multi-turn**, o mesmo padrão de threads existente (ConversationExchange) é reutilizado com `toolKind: "tabela"`. A IA retorna `requires_clarification: true` até ter especificação completa, então o frontend inicia a geração da tabela.

---

## Dependências de produção a instalar (apenas novas)

| Library | Versão | Instalar com |
|---------|--------|-------------|
| react-datasheet-grid | ^4.11.6 | `pnpm add react-datasheet-grid --filter web` |
| hyperformula | ^3.3.0 | `pnpm add hyperformula --filter web` |

**Licença a contratar separadamente (não é npm):**
- HyperFormula proprietary license — contato: sales@handsontable.com antes do deploy em produção

**Nenhuma dependência de desenvolvimento nova necessária.**

---

## Sem dependências novas (confirmado)

| Capacidade | Por quê não precisa de nova dep |
|------------|-------------------------------|
| CSV/XLSX export | `xlsx` 0.18.5 já instalado — `XLSX.write()` cobre os dois formatos |
| Intent classification | OpenAI SDK + Zod + `zodResponseFormat` já instalados |
| Multi-turn clarification loop | Modelo ConversationExchange já existe, reusa com `toolKind: "tabela"` |
| Streaming de resposta do chat | Hooks de streaming existentes reusados |
| Attach files na Tabela Viva | Pipeline de extração de v1.2 reusado sem modificação |

---

## O que NÃO adicionar

| Evitar | Por que | Alternativa correta |
|--------|---------|-------------------|
| **AG Grid Community** | Bundle 2-3x maior (~140 KB min+gzip vs ~58 KB packed do DSG); API voltada para BI dashboards, não para mini-Excel; `react-datasheet-grid` é mais especializado para este caso de uso | `react-datasheet-grid` |
| **Glide Data Grid** | Rendering canvas: impossibilita edição inline DOM, fórmulas em célula, acessibilidade nativa e integração com HyperFormula por célula | `react-datasheet-grid` |
| **TanStack Table + custom cell editing** | Headless — construir keyboard nav, copy-paste, seleção de bloco e edição inline do zero consome 1-2 sprints sem diferenciação de produto | `react-datasheet-grid` |
| **@formulajs/formulajs** sozinho | Sem grafo de dependências, sem referências de célula, sem recálculo em cascata — não é um motor de planilha | `hyperformula` |
| **fast-formula-parser** | Abandonado, sem manutenção ativa | `hyperformula` |
| **LangChain / Vercel AI SDK** | Overhead de 300-600 KB+ para um roteador com schema fixo que o OpenAI SDK já resolve com `zodResponseFormat` | OpenAI SDK existente + Zod |
| **HyperFormula sob GPL** | Tabelin.IA é closed-source comercial — GPL obriga open-sourcing de todo o código | Comprar licença proprietária HyperFormula |
| **Tesseract.js** | Já descartado em v1.2; sem mudança | OpenAI Vision já em produção |
| **xlsx 0.20.x via CDN** | Não disponível no npm; instala de CDN proprietário — incompatível com pnpm lockfile | Manter `xlsx` 0.18.5 do npm |

---

## Compatibilidade de versões

| Package | Compatível com | Notas |
|---------|----------------|-------|
| react-datasheet-grid 4.11.6 | React 19.2.6 | Testado com React 18+; React 19 é suportado |
| react-datasheet-grid 4.11.6 | Next.js 16 App Router | Requer `"use client"` no componente pai; CSS import explícito necessário |
| hyperformula 3.3.0 | TypeScript 6.0.3 | Tipos nativos incluídos; sem @types separado |
| hyperformula 3.3.0 | Next.js 16 App Router | Requer `dynamic import` para separação de bundle; não pode ser usado em RSC |
| hyperformula 3.3.0 | react-datasheet-grid 4.11.6 | Nenhum overlap; HF processa fórmulas; DSG renderiza células — integração via callbacks `onChange` |
| xlsx 0.18.5 (existente) | react-datasheet-grid 4.11.6 | Export direto de `value[][]` do grid via `XLSX.utils.aoa_to_sheet` |

---

## Padrão de integração HyperFormula + react-datasheet-grid

```typescript
// hooks/useTableFormulas.ts
"use client";
import { useEffect, useRef, useState } from "react";
import type HyperFormulaType from "hyperformula";

export function useTableFormulas(initialData: string[][]) {
  const hfRef = useRef<HyperFormulaType | null>(null);
  const [computed, setComputed] = useState<(string | number)[][]>(initialData);

  useEffect(() => {
    // dynamic import: HyperFormula não carrega no bundle principal
    import("hyperformula").then(({ HyperFormula, ptBR }) => {
      HyperFormula.registerLanguage("ptBR", ptBR);
      hfRef.current = HyperFormula.buildFromArray(initialData, {
        licenseKey: process.env.NEXT_PUBLIC_HYPERFORMULA_LICENSE!,
        language: "ptBR",
        functionArgSeparator: ";",
        decimalSeparator: ",",
        thousandSeparator: ".",
      });
      recalcAll();
    });
    return () => hfRef.current?.destroy();
  }, []);

  function onCellChange(row: number, col: number, value: string) {
    hfRef.current?.setCellContents({ row, col, sheet: 0 }, [[value]]);
    recalcAll();
  }

  function recalcAll() {
    if (!hfRef.current) return;
    const rows = hfRef.current.getSheetDimensions(0);
    const result = [];
    for (let r = 0; r < rows.height; r++) {
      const row = [];
      for (let c = 0; c < rows.width; c++) {
        row.push(hfRef.current.getCellValue({ row: r, col: c, sheet: 0 }));
      }
      result.push(row);
    }
    setComputed(result);
  }

  return { computed, onCellChange };
}
```

---

## Instalação

```bash
# A partir da raiz do monorepo
pnpm add react-datasheet-grid --filter web
pnpm add hyperformula --filter web
```

---

## Sources

- Context7 `/nick-keller/react-datasheet-grid` — copy-paste, virtualização, keyColumn pattern, v4 changelog (migração react-virtual, CSS explícito, Next.js compat) — HIGH confidence
- Context7 `/websites/ag-grid_react-data-grid` — Community MIT, bundle com AllCommunityModule, Next.js integration — HIGH confidence
- Context7 `/handsontable/hyperformula` — licença GPL-3.0/proprietária, separadores, dependency graph, language pack API — HIGH confidence
- Context7 `/websites/hyperformula_handsontable` — ptBR não existe, ptPT disponível, custom language pack API — HIGH confidence
- https://github.com/handsontable/hyperformula/tree/master/src/i18n/languages — Lista definitiva dos 17 idiomas; `ptBR` ausente, `ptPT` presente — HIGH confidence (verificado diretamente)
- https://hyperformula.handsontable.com/docs/guide/licensing.html — GPL-3.0 apenas para open-source; proprietary license para closed-source SaaS — HIGH confidence
- npm show react-datasheet-grid / hyperformula / ag-grid-community — versões atuais e licenças — HIGH confidence (verificado ao vivo)
- https://bundlephobia.com/package/react-datasheet-grid@4.11.5 — bundle size reference — MEDIUM confidence (não carregou métricas mas npm pack confirmou ~58 KB)
- https://docs.bswen.com/blog/2026-03-04-formualizer-vs-hyperformula-comparison/ — Formualizer como alternativa MIT; HyperFormula GPL copyleft risk — MEDIUM confidence
- https://openai.com/index/introducing-structured-outputs-in-the-api/ — `zodResponseFormat`, strict: true, 100% schema adherence — HIGH confidence
- apps/web/package.json (lido diretamente) — versões em produção: openai 6.39.0, xlsx 0.18.5, zod 4.4.3 — HIGH confidence

---
*Stack research para: Tabelin.IA v2.0 Chat Unificado & Tabela Viva*
*Pesquisado: 2026-06-08*

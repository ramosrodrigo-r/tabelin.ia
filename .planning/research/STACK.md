# Stack Research

**Domain:** Brazil-localized spreadsheet AI SaaS — v1.2 Anexos Universais
**Researched:** 2026-06-03
**Confidence:** HIGH (stack existente), HIGH (PDF/upload additions — verificado em docs oficiais e Context7)

---

## Nota sobre escopo

Este arquivo descreve o stack para a milestone v1.2 Anexos Universais. O stack base (Next.js, React, TypeScript, Tailwind, Prisma, Better Auth, OpenAI SDK, Mercado Pago, Zod) foi validado em produção no v1.1 e não é re-pesquisado aqui. Apenas adições e alterações necessárias para suporte a anexos multi-formato são detalhadas.

---

## Stack base (já em produção — não alterar)

| Technology | Version em uso | Status |
|------------|---------------|--------|
| Next.js App Router | 16.2.6 | Estável em produção |
| React | 19.2.6 | Estável em produção |
| TypeScript | 6.0.3 | Estável em produção |
| Tailwind CSS | 4.3.0 | Estável em produção |
| Prisma ORM | 7.8.0 | Estável em produção |
| Better Auth | 1.6.11 | Estável em produção |
| OpenAI SDK | 6.39.0 | Estável em produção |
| Zod | 4.4.3 | Estável em produção |
| xlsx | 0.18.5 | Em uso no file-analysis upload |
| csv-parse | 6.2.1 | Em uso no file-parser |

---

## Adições necessárias para v1.2

### Biblioteca central: Extração de PDF

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| **unpdf** | **1.6.2** | Extrair texto de PDFs digitais (text-based) | Única biblioteca com ESM nativo, TypeScript-first, compatível com Next.js Route Handlers, bundle otimizado para serverless. pdf-parse falha em ambientes sem filesystem real. pdfjs-dist tem bundle de +2 MB. Mantida ativamente (último release: abril 2026). |

**Integração unpdf no fluxo:**
```typescript
import { extractText } from "unpdf";

const buffer = await file.arrayBuffer();
const { text, totalPages } = await extractText(new Uint8Array(buffer), { mergePages: true });

// Verificação de PDF escaneado: texto vazio ou muito curto por página
const isScanned = !text || (text.length / totalPages) < 50;
```

**Decisão sobre PDF escaneado:** Se `isScanned === true`, a estratégia é reutilizar o Vision OCR já existente em `processImageOcr`. O PDF é um documento de imagens — não existe rota diferente que justifique uma nova dependência pesada (Tesseract etc.). O Route Handler converte as páginas para imagem via `unpdf` + `@napi-rs/canvas` (opcional; só se renderização de página for necessária) e envia para o OpenAI Vision, exatamente como já funciona para PNG/JPEG.

> **Alternativa descartada:** Tesseract.js — bundle de ~31 MB, latência alta, desnecessário quando já há Vision OCR em produção.

---

### Suporte nativo a PDF na OpenAI API

**Descoberta importante:** A OpenAI suporta PDF nativo via Chat Completions API desde março 2025.

| Capability | Status | Como usar |
|------------|--------|-----------|
| Enviar PDF como base64 direto no messages[] | Disponível em gpt-4o, gpt-4o-mini | `type: "file"` com `data: "data:application/pdf;base64,..."` |
| Extração automática de texto + imagens de página | Suportado | A API extrai ambos e injeta no contexto do modelo |
| Scanned PDFs | Parcialmente | A API extrai page images e processa via vision, mas pode falhar em PDFs muito complexos |
| Limite por arquivo | 50 MB | Bem acima do nosso cap de 5 MB |

**Estratégia recomendada: extração local primeiro, OpenAI como fallback para scanned.**

Razão: extrair texto localmente com `unpdf` é gratuito, rápido e não gasta tokens. Enviar o PDF diretamente para o OpenAI extrai texto + imagens mas consome tokens de visão por página. Para o nosso caso de uso (texto extraído é injetado no prompt do tool selecionado), a extração local é suficiente para PDFs digitais.

```
Fluxo de decisão:
1. unpdf → extractText()
2. Se texto adequado (>50 chars/pág) → injeta como texto no system prompt do tool
3. Se texto escasso (PDF escaneado) → converte primeira(s) página(s) em imagem → processImageOcr existente
4. Se PDF > limite seguro de páginas → retorna erro 422 com mensagem orientativa
```

---

### Upload via Route Handler (sem nova dependência)

O padrão `request.formData()` já está em uso em `file-analysis/upload/route.ts` e funciona nativamente no Next.js App Router para multipart form-data. Nenhuma biblioteca adicional (multer, busboy, formidable) é necessária.

**Configuração next.config necessária:**

O `proxyClientMaxBodySize` aplica-se apenas quando o módulo experimental `proxy` está ativo. Para Route Handlers sem proxy, o Next.js App Router não impõe limite de body por padrão além do que o Node.js HTTP server impõe (~1 GB). O nosso cap de 5 MB é aplicado em código antes de qualquer parse pesado — padrão já adotado no upload existente.

Para Server Actions (se usadas no futuro para upload), configurar:
```javascript
// next.config.js — apenas se Server Actions forem usadas para upload
experimental: {
  serverActions: { bodySizeLimit: "6mb" }
}
```

**Conclusão:** Para Route Handlers, a validação de 5 MB já presente no código existente é suficiente. Nenhuma configuração extra em `next.config.js` é necessária para o padrão atual.

---

### TXT: leitura sem dependência nova

Arquivos `.txt` são lidos diretamente via `file.text()` (Web Streams API) no Route Handler. Sem biblioteca adicional.

---

## Stack completo de adições para v1.2

### Dependências de produção a instalar

| Library | Version | Instalar com |
|---------|---------|-------------|
| unpdf | ^1.6.2 | `npm install unpdf` |

**Nenhuma outra dependência de produção é necessária.** CSV/XLSX já têm parsers em produção. PNG/JPEG já têm Vision OCR. TXT é nativo.

### Sem dependências de desenvolvimento novas

O setup de testes (Vitest, Playwright) e de tipagem já cobre os padrões necessários.

---

## Padrão de integração com parsers existentes

### Rota única de extração: `extractAttachmentContent()`

Criar uma única função server-side que unifique os parsers por tipo MIME. Ela é chamada pelo Route Handler universal de attachment antes de injetar o conteúdo no thread.

```typescript
// src/server/attachments/extract-content.ts
async function extractAttachmentContent(file: File): Promise<string> {
  const mime = detectMime(file); // verifica extensão + MIME type

  switch (mime) {
    case "csv":
      return parseFileToText(buffer, "csv");       // parser existente
    case "xlsx":
      return parseFileToText(buffer, "xlsx");      // parser existente
    case "png":
    case "jpeg":
      return await processImageOcr(base64, mime);  // OCR existente → retorna TSV texto
    case "pdf":
      return await extractPdfContent(buffer);      // NOVO: unpdf → text ou OCR fallback
    case "txt":
      return await file.text();                    // nativo
  }
}
```

**Ponto de integração com a conversa:**  
O conteúdo extraído é persistido como uma troca especial no thread do tool (toolKind + userId), marcada com `role: "system"` ou como primeiro `user` turn com prefixo `[Documento anexado]`. Follow-ups da mesma conversa reutilizam o texto persistido sem re-extrair o arquivo.

---

## O que NÃO usar

| Evitar | Por quê | Usar em vez disso |
|--------|---------|-------------------|
| **Tesseract.js** | Bundle de ~31 MB, lento, desnecessário — Vision OCR já existe | `processImageOcr` existente para PDFs escaneados |
| **pdf-parse** (npm original) | Usa `fs.readFileSync` internamente — falha em ambientes serverless/Edge sem filesystem real | `unpdf` |
| **pdfjs-dist** diretamente | Bundle de +2 MB gzipped; API de baixo nível (transform matrices, operator lists); overhead injustificado para extração simples de texto | `unpdf` (que usa pdfjs internamente com build serverless) |
| **Multer / Busboy / Formidable** | Não necessários — `request.formData()` nativo do Next.js App Router funciona sem eles | `request.formData()` nativo |
| **OpenAI Files API (upload persistente)** | Adiciona latência de round-trip para cada PDF, cria estado remoto difícil de auditar, tem custo de armazenamento | Processamento local + base64 inline quando preciso |
| **Server Actions para upload** | bodySizeLimit padrão de 1 MB causa problemas com arquivos maiores; requer configuração extra | Route Handler `POST /api/tools/attachment/extract` |
| **Bibliotecas de OCR baseadas em Rust/WASM** | Incompatíveis com o runtime Node.js padrão do Next.js sem configuração complexa | OpenAI Vision via `processImageOcr` |

---

## Compatibilidade de versões

| Package | Compatível com | Notas |
|---------|----------------|-------|
| unpdf 1.6.2 | Node.js 20+ | Requer Node 20+; nosso ambiente Next.js 16 já roda em Node 20+ |
| unpdf 1.6.2 | TypeScript 5+ | Tipos nativos incluídos; sem @types separado necessário |
| unpdf 1.6.2 | Next.js 16 App Router | ESM nativo; sem import dinâmico especial necessário |
| unpdf 1.6.2 | OpenAI SDK 6.x | Sem overlap — unpdf extrai texto, OpenAI SDK recebe texto extraído |

---

## Alternativas consideradas

| Recomendado | Alternativa | Quando usar a alternativa |
|-------------|-------------|--------------------------|
| unpdf | pdf-parse | Apenas em ambientes Node.js puros com filesystem garantido (não serverless) |
| unpdf | pdfjs-dist direto | Quando precisar de renderização de páginas como imagens, não apenas texto |
| Extração local + OpenAI Vision fallback | Enviar PDF diretamente para OpenAI API | Quando simplicidade é prioridade máxima e custo de tokens não é preocupação |
| Route Handler nativo formData() | Multer/Busboy | Somente se precisar de streaming de upload para object storage externo (S3 etc.) |

---

## Instalação (apenas o novo)

```bash
# A partir da raiz do monorepo
npm install unpdf --workspace apps/web
```

---

## Sources

- https://github.com/unjs/unpdf — unpdf v1.6.2 (release abril 2026), API extractText(), suporte Node.js/serverless/ESM
- https://www.pkgpulse.com/blog/unpdf-vs-pdf-parse-vs-pdfjs-dist-pdf-parsing-extraction-nodejs-2026 — Comparação das três principais libs PDF para Node.js (fev 2026); benchmark de bundle size e falhas conhecidas
- https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025 — Survey de 7 libs; recomenda unpdf para TypeScript + Next.js
- https://developers.openai.com/api/docs/guides/file-inputs — OpenAI suporte nativo a PDF em Chat Completions (gpt-4o); formato de mensagem com base64
- https://community.openai.com/t/direct-pdf-file-input-now-supported-in-the-api/1146647 — Anúncio suporte PDF (março 2025); limitações com PDFs escaneados multi-coluna
- https://nextjs.org/docs/app/api-reference/file-conventions/route — Next.js Route Handler: `request.formData()` nativo, sem bodySizeLimit em Route Handlers sem proxy
- https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize — proxyClientMaxBodySize aplica-se apenas quando proxy experimental está ativo; default 10 MB; não afeta Route Handlers simples
- apps/web/src/app/api/tools/file-analysis/upload/route.ts — Padrão atual de upload com formData nativo; validação 5 MB em código; sem multer/busboy

---
*Stack research para: Tabelin.IA v1.2 Anexos Universais*
*Pesquisado: 2026-06-03*

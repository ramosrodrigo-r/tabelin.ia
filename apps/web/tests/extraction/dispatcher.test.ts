import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Helpers para criar buffers de teste (reutilizados de security-extractors.test.ts)
// ---------------------------------------------------------------------------

/**
 * Bytes mínimos de um PNG real (1×1 px, transparente).
 * Assinatura PNG: 89 50 4E 47 0D 0A 1A 0A
 */
function makePngBytes(): Uint8Array {
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/**
 * Bytes mínimos de um JPEG real (1×1 px vermelho).
 * Assinatura JPEG: FF D8 FF
 */
function makeJpegBytes(): Uint8Array {
  const base64 =
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUEB/8QAIhAAAQMEAgMAAAAAAAAAAAAAAQIDBAUREiExBhP/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AmaXFQ2nZT3nB7dh7FGOiI0OtEbpF1XRXQAD/2Q==";
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/**
 * Bytes de um PDF real com texto ASCII longo (>50 chars).
 */
function makePdfBytes(): Uint8Array {
  const textContent =
    "This PDF file contains text layer data that is long enough for extraction tests to pass.";
  const streamBody = `BT /F1 12 Tf 100 700 Td (${textContent}) Tj ET`;
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamBody.length} >>
stream
${streamBody}
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000055 00000 n
0000000112 00000 n
0000000274 00000 n
0000000353 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
450
%%EOF`;
  return new Uint8Array(Buffer.from(pdfContent, "utf-8"));
}

/**
 * Bytes de um XLSX real (gerado via xlsx lib) — uma aba simples.
 */
function makeXlsxBytes(
  sheets: { name: string; rows: Record<string, unknown>[] }[] = [
    { name: "Sheet1", rows: [{ col1: "valor", col2: 42 }] },
  ]
): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Uint8Array(buf);
}

/**
 * Buffer Node.js de um XLSX real.
 */
function makeXlsxBuffer(
  sheets: { name: string; rows: Record<string, unknown>[] }[] = [
    { name: "Sheet1", rows: [{ col1: "valor", col2: 42 }] },
  ]
): Buffer {
  const bytes = makeXlsxBytes(sheets);
  return Buffer.from(bytes);
}

/**
 * Bytes de texto puro CSV (sem magic bytes).
 */
function makeCsvBuffer(content = "nome,idade\nAlice,30\nBob,25"): Buffer {
  return Buffer.from(content, "utf-8");
}

/**
 * Buffer de texto TXT.
 */
function makeTxtBuffer(content = "conteúdo de texto simples"): Buffer {
  return Buffer.from(content, "utf-8");
}

/**
 * Bytes de um GIF (formato não suportado).
 * Assinatura GIF: 47 49 46 38
 */
function makeGifBuffer(): Buffer {
  const base64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  return Buffer.from(base64, "base64");
}

/**
 * Cria um XLSX ZIP-bomb (excede MAX_ENTRIES = 1000 entradas).
 */
async function makeZipBombBuffer(): Promise<Buffer> {
  const { strToU8, zipSync } = await import("fflate");
  const files: Record<string, Uint8Array> = {};
  for (let i = 0; i <= 1000; i++) {
    files[`file${i}.txt`] = strToU8("x");
  }
  const zipped = zipSync(files);
  return Buffer.from(zipped);
}

// ---------------------------------------------------------------------------
// Testes do dispatcher (EXT-05 / SEC-02)
// ---------------------------------------------------------------------------

describe("dispatcher — extractContent (EXT-05)", () => {
  // EXT-01: CSV real → { ok: true } com schema + amostra
  it("CSV real → { ok: true } com schema e amostra de linhas", async () => {
    const { extractContent } = await import("../../src/server/extraction/dispatcher");
    const buf = makeCsvBuffer("produto,quantidade,preco\nNotebook,2,1500\nMouse,5,50");
    const result = await extractContent(buf, "dados.csv");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain("Amostra de linhas:");
  });

  // EXT-01/D-05: XLSX real multi-aba → texto com "## Aba:" para cada aba
  it("XLSX multi-aba → texto com ## Aba: para cada aba", async () => {
    const { extractContent } = await import("../../src/server/extraction/dispatcher");
    const buf = makeXlsxBuffer([
      { name: "Vendas", rows: [{ produto: "A", qtd: 1 }] },
      { name: "Clientes", rows: [{ nome: "João", cidade: "SP" }] },
    ]);
    const result = await extractContent(buf, "relatorio.xlsx");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain("## Aba: Vendas");
    expect(result.text).toContain("## Aba: Clientes");
  });

  // EXT-02: imagem PNG (fixture-mode sem OPENAI_API_KEY) → { ok: true } com tabela Markdown
  it("PNG → { ok: true } com tabela Markdown (fixture-mode)", async () => {
    const savedKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const { extractContent } = await import("../../src/server/extraction/dispatcher");
      const pngBytes = makePngBytes();
      const buf = Buffer.from(pngBytes);
      const result = await extractContent(buf, "imagem.png");

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.text).toMatch(/\|/);
    } finally {
      if (savedKey !== undefined) process.env.OPENAI_API_KEY = savedKey;
    }
  });

  // EXT-02: imagem JPEG (fixture-mode)
  it("JPEG → { ok: true } com tabela Markdown (fixture-mode)", async () => {
    const savedKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const { extractContent } = await import("../../src/server/extraction/dispatcher");
      const jpegBytes = makeJpegBytes();
      const buf = Buffer.from(jpegBytes);
      const result = await extractContent(buf, "foto.jpg");

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.text).toMatch(/\|/);
    } finally {
      if (savedKey !== undefined) process.env.OPENAI_API_KEY = savedKey;
    }
  });

  // EXT-04: TXT → { ok: true, text } direto
  it("TXT → { ok: true } com o conteúdo de texto", async () => {
    const { extractContent } = await import("../../src/server/extraction/dispatcher");
    const content = "Este é um arquivo de texto simples com conteúdo.";
    const buf = makeTxtBuffer(content);
    const result = await extractContent(buf, "notas.txt");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toBe(content);
  });

  // SEC-02 (T-09-04-02): XLSX com excesso de entradas → { ok: false, code: "ZIP_BOMB" }
  it("SEC-02: XLSX malicioso (ZIP_BOMB) → { ok: false, code: 'ZIP_BOMB' } sem parsear", async () => {
    const { extractContent } = await import("../../src/server/extraction/dispatcher");
    const buf = await makeZipBombBuffer();
    const result = await extractContent(buf, "malicioso.xlsx");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("ZIP_BOMB");
  });

  // SEC-02 / T-09-04-01 (D-10): binário com magic bytes de PNG mas nome ".txt"
  // → roteado por tipo DETECTADO (imagem), não pela extensão declarada
  it("SEC-02/D-10: PNG com nome .txt → roteado por magic bytes como imagem (não como texto)", async () => {
    const savedKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const { extractContent } = await import("../../src/server/extraction/dispatcher");
      const pngBytes = makePngBytes();
      const buf = Buffer.from(pngBytes);
      // Nome declarado diz .txt — deve ser ignorado para binários
      const result = await extractContent(buf, "disfarce.txt");

      // Deve ter sido tratado como imagem (fixture → ok:true com tabela Markdown)
      // Em vez de tentar decodificar como TXT (o que retornaria texto lixo ou ok:true com bytes)
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // Tabela Markdown de imagem → tem pipes
      expect(result.text).toMatch(/\|/);
    } finally {
      if (savedKey !== undefined) process.env.OPENAI_API_KEY = savedKey;
    }
  });

  // Formato não suportado (GIF) → UNSUPPORTED_TYPE
  it("GIF (não suportado) → { ok: false, code: 'UNSUPPORTED_TYPE' }", async () => {
    const { extractContent } = await import("../../src/server/extraction/dispatcher");
    const buf = makeGifBuffer();
    const result = await extractContent(buf, "animacao.gif");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UNSUPPORTED_TYPE");
  });

  // Texto sem extensão suportada → UNSUPPORTED_TYPE
  it("texto sem extensão CSV/TXT → { ok: false, code: 'UNSUPPORTED_TYPE' }", async () => {
    const { extractContent } = await import("../../src/server/extraction/dispatcher");
    const buf = Buffer.from("conteúdo qualquer", "utf-8");
    const result = await extractContent(buf, "arquivo.dat");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UNSUPPORTED_TYPE");
  });

  // Guard ZIP_BOMB é chamado ANTES do parse — extensão jpg com magic bytes xlsx não chega a parsear
  it("guard ZIP_BOMB curto-circuita antes de qualquer parse XLSX", async () => {
    const { extractContent } = await import("../../src/server/extraction/dispatcher");
    const buf = await makeZipBombBuffer();
    // Mesmo com nome .xlsx explícito, o guard deve ser aplicado
    const result = await extractContent(buf, "bomba.xlsx");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("ZIP_BOMB");
  });
});

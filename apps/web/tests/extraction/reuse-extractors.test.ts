import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { MAX_ROWS_PER_SHEET, extractCsvXlsx } from "../../src/server/extraction/csv-xlsx-extractor";
import { extractImage } from "../../src/server/extraction/image-extractor";
import { extractTxt } from "../../src/server/extraction/txt-extractor";

// ---------------------------------------------------------------------------
// Helpers para criar buffers de teste
// ---------------------------------------------------------------------------

function makeCsvBuffer(rows: string[]): ArrayBuffer {
  const text = rows.join("\n");
  return Buffer.from(text, "utf-8").buffer as ArrayBuffer;
}

function makeXlsxBuffer(sheets: { name: string; rows: Record<string, unknown>[] }[]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return buf;
}

function makeXlsxBufferWithManyRows(sheetName: string, count: number): ArrayBuffer {
  const rows = Array.from({ length: count }, (_, i) => ({ id: i + 1, valor: i * 10 }));
  return makeXlsxBuffer([{ name: sheetName, rows }]);
}

function makeImageBuffer(): Buffer {
  // Buffer mínimo — fixture-mode acionado quando OPENAI_API_KEY ausente
  return Buffer.from("fake-image-data");
}

// ---------------------------------------------------------------------------
// Task 1: CSV/XLSX extractor
// ---------------------------------------------------------------------------

describe("csv-xlsx — extrator", () => {
  it("CSV simples retorna { ok: true } com campos esperados", async () => {
    const csv = makeCsvBuffer(["nome,idade", "Alice,30", "Bob,25"]);
    const result = await extractCsvXlsx(csv, "csv", "test.csv");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.text).toContain("Arquivo:");
    expect(result.text).toContain("Colunas");
    expect(result.text).toContain("Amostra de linhas:");
  });

  it("CSV amostra contém até 10 linhas", async () => {
    const header = "idx";
    const dataRows = Array.from({ length: 15 }, (_, i) => String(i + 1));
    const csv = makeCsvBuffer([header, ...dataRows]);
    const result = await extractCsvXlsx(csv, "csv", "big.csv");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // O bloco de amostra não deve ter mais de 10 linhas de dados
    const sampleBlock = result.text.split("Amostra de linhas:")[1] ?? "";
    const dataLineCount = sampleBlock
      .split("\n")
      .filter((l) => l.trim().startsWith("|") && !l.includes("idx")).length;
    expect(dataLineCount).toBeLessThanOrEqual(10);
  });

  it("XLSX 2 abas contém rótulo ## Aba: para cada aba", async () => {
    const buf = makeXlsxBuffer([
      { name: "Vendas", rows: [{ produto: "A", qtd: 1 }] },
      { name: "Clientes", rows: [{ nome: "João", cidade: "SP" }] }
    ]);
    const result = await extractCsvXlsx(buf, "xlsx", "multi.xlsx");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.text).toContain("## Aba: Vendas");
    expect(result.text).toContain("## Aba: Clientes");
  });

  it("XLSX multi-aba — cada bloco contém seu schema", async () => {
    const buf = makeXlsxBuffer([
      { name: "Sheet1", rows: [{ colA: 1 }, { colA: 2 }] },
      { name: "Sheet2", rows: [{ colB: "x" }] }
    ]);
    const result = await extractCsvXlsx(buf, "xlsx", "multi2.xlsx");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.text).toContain("colA");
    expect(result.text).toContain("colB");
  });

  it("cap D-06: aba com rowCount > MAX_ROWS_PER_SHEET → contagem reportada === MAX_ROWS_PER_SHEET", async () => {
    const totalRows = 500; // bem acima de 200
    const buf = makeXlsxBufferWithManyRows("Grande", totalRows);
    const result = await extractCsvXlsx(buf, "xlsx", "grande.xlsx");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // A contagem efetiva reportada deve ser MAX_ROWS_PER_SHEET (200), não 500
    expect(result.text).toContain(String(MAX_ROWS_PER_SHEET));
    // O valor total bruto não deve aparecer como "500"
    expect(result.text).not.toContain("500");
  });

  it("CSV vazio (sem colunas) → { ok: false, code: EMPTY_EXTRACTION }", async () => {
    const csv = makeCsvBuffer([""]);
    const result = await extractCsvXlsx(csv, "csv", "empty.csv");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("EMPTY_EXTRACTION");
  });

  it("XLSX vazio (sem colunas) → { ok: false, code: EMPTY_EXTRACTION }", async () => {
    const buf = makeXlsxBuffer([{ name: "Sheet1", rows: [] }]);
    const result = await extractCsvXlsx(buf, "xlsx", "empty.xlsx");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("EMPTY_EXTRACTION");
  });
});

// ---------------------------------------------------------------------------
// Task 2: Image OCR extractor
// ---------------------------------------------------------------------------

describe("image/ocr — extrator", () => {
  it("imagem sem OPENAI_API_KEY → fixture-mode → { ok: true } com tabela Markdown", async () => {
    // Garante que OPENAI_API_KEY está ausente no ambiente de teste
    const savedKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const buf = makeImageBuffer();
      const result = await extractImage(buf, "image/png");

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // Tabela Markdown tem pipes e separador ---
      expect(result.text).toMatch(/\|/);
      expect(result.text).toMatch(/---/);
    } finally {
      if (savedKey !== undefined) process.env.OPENAI_API_KEY = savedKey;
    }
  });

  it("headers vazio → { ok: false, code: EMPTY_EXTRACTION }", async () => {
    // Mockar processImageOcr para retornar tabela vazia
    // O extrator deve lidar com { headers: [], rows: [] }
    const { extractImageFromOcrResult } = await import("../../src/server/extraction/image-extractor");

    const result = extractImageFromOcrResult({ headers: [], rows: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("EMPTY_EXTRACTION");
  });

  it("mapeamento de mimeType — image/jpeg não quebra a assinatura", async () => {
    const savedKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const buf = makeImageBuffer();
      const result = await extractImage(buf, "image/jpeg");
      // Fixture-mode retorna sucesso independente do mimeType
      expect(result.ok).toBe(true);
    } finally {
      if (savedKey !== undefined) process.env.OPENAI_API_KEY = savedKey;
    }
  });
});

// ---------------------------------------------------------------------------
// Task 3: TXT extractor
// ---------------------------------------------------------------------------

describe("txt — extrator", () => {
  it("buffer UTF-8 com texto retorna { ok: true, text } com o conteúdo", async () => {
    const text = "olá mundo";
    const buf = Buffer.from(text, "utf-8").buffer as ArrayBuffer;
    const result = extractTxt(buf);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toBe(text);
  });

  it("buffer vazio → { ok: false, code: EMPTY_EXTRACTION }", async () => {
    const buf = Buffer.from("", "utf-8").buffer as ArrayBuffer;
    const result = extractTxt(buf);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("EMPTY_EXTRACTION");
  });

  it("buffer só whitespace → { ok: false, code: EMPTY_EXTRACTION }", async () => {
    const buf = Buffer.from("   \n\t  ", "utf-8").buffer as ArrayBuffer;
    const result = extractTxt(buf);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("EMPTY_EXTRACTION");
  });
});

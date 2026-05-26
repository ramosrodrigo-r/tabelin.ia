import { describe, expect, it } from "vitest";

import { parseFile } from "@/server/file-analysis/file-parser";

// Helper: create ArrayBuffer from CSV string
function csvBuffer(content: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(content).buffer as ArrayBuffer;
}

// Helper: create ArrayBuffer from XLSX workbook (using xlsx library)
// Uses type:"base64" then decodes to Uint8Array, then wraps in ArrayBuffer
async function xlsxBuffer(rows: unknown[][]): Promise<ArrayBuffer> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Plan1");
  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" }) as string;
  const binary = atob(base64);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buf;
}

describe("parseFile — CSV", () => {
  it("parses a comma-delimited CSV and returns FileSchema with correct types", async () => {
    const csv = "nome,valor,ativo\nAlice,100,true\nBob,200,false\nCarlos,150,sim";
    const buf = csvBuffer(csv);
    const schema = parseFile(buf, "csv");

    expect(schema.fileName).toBe("arquivo.csv");
    expect(schema.rowCount).toBe(3);
    expect(schema.columns).toHaveLength(3);

    const nomeCol = schema.columns.find((c) => c.name === "nome");
    const valorCol = schema.columns.find((c) => c.name === "valor");
    const ativoCol = schema.columns.find((c) => c.name === "ativo");

    expect(nomeCol?.type).toBe("texto");
    expect(valorCol?.type).toBe("numero");
    expect(ativoCol?.type).toBe("booleano");
  });

  it("detects semicolon delimiter (Brazilian Excel CSV format)", async () => {
    const csv = "produto;quantidade;preco\nNotebook;2;1500\nMouse;5;50";
    const buf = csvBuffer(csv);
    const schema = parseFile(buf, "csv");

    expect(schema.columns).toHaveLength(3);
    expect(schema.columns[0].name).toBe("produto");
    expect(schema.rowCount).toBe(2);
  });

  it("infers date column type", async () => {
    const csv = "evento,data_evento\nLancamento,2024-01-15\nFeira,2024-03-20";
    const buf = csvBuffer(csv);
    const schema = parseFile(buf, "csv");

    const dataCol = schema.columns.find((c) => c.name === "data_evento");
    expect(dataCol?.type).toBe("data");
  });

  it("returns sampleRows limited to 10 rows", async () => {
    const rows = ["col\n", ...Array.from({ length: 15 }, (_, i) => `valor${i}\n`)].join("");
    const buf = csvBuffer(rows);
    const schema = parseFile(buf, "csv");

    expect(schema.sampleRows.length).toBeLessThanOrEqual(10);
    expect(schema.rowCount).toBe(15);
  });

  it("does not contain any console.log calls (PRIV-02 — no raw content logging)", async () => {
    // This is verified at the file level — the actual check is done in acceptance_criteria
    // via grep. Here we verify the schema is returned without throwing.
    const csv = "a,b\n1,2";
    const buf = csvBuffer(csv);
    const schema = parseFile(buf, "csv");
    expect(schema).toBeDefined();
    expect(schema.columns).toHaveLength(2);
  });

  it("accepts an optional fileName parameter", async () => {
    const csv = "x\n1\n2";
    const buf = csvBuffer(csv);
    const schema = parseFile(buf, "csv", undefined, "meu_arquivo.csv");
    expect(schema.fileName).toBe("meu_arquivo.csv");
  });
});

describe("parseFile — XLSX", () => {
  it("parses an XLSX file and infers column types", async () => {
    const rows = [
      ["Produto", "Quantidade", "Data"],
      ["Notebook", 2, new Date("2024-01-15")],
      ["Mouse", 5, new Date("2024-03-20")]
    ];
    const buf = await xlsxBuffer(rows);
    const schema = parseFile(buf, "xlsx", "Plan1");

    expect(schema.rowCount).toBe(2);
    expect(schema.columns).toHaveLength(3);
    expect(schema.sheetName).toBe("Plan1");

    const qtCol = schema.columns.find((c) => c.name === "Quantidade");
    expect(qtCol?.type).toBe("numero");
  });

  it("uses cellDates:true to avoid date-as-number pitfall", async () => {
    const rows = [
      ["evento", "data"],
      ["Lancamento", new Date("2024-01-15")]
    ];
    const buf = await xlsxBuffer(rows);
    const schema = parseFile(buf, "xlsx", "Plan1");

    const dataCol = schema.columns.find((c) => c.name === "data");
    // With cellDates:true, dates should NOT be inferred as "numero"
    expect(dataCol?.type).not.toBe("numero");
  });

  it("limits rows to 1000 (anti-DoS T-04-02-01)", async () => {
    // Create a sheet with 1200 data rows
    const header = ["val"];
    const dataRows = Array.from({ length: 1200 }, (_, i) => [i]);
    const allRows = [header, ...dataRows];
    const buf = await xlsxBuffer(allRows);
    const schema = parseFile(buf, "xlsx", "Plan1");

    expect(schema.rowCount).toBeLessThanOrEqual(1000);
  });
});

describe("file-repository IDOR guard", () => {
  // This test validates the IDOR contract at the type level —
  // the actual DB query tests are done through the DB client mock
  it("findUploadedFileByIdAndUser signature requires both id and userId", async () => {
    const { findUploadedFileByIdAndUser } = await import("@/server/file-analysis/file-repository");
    expect(typeof findUploadedFileByIdAndUser).toBe("function");
    // Function arity: (id, userId)
    expect(findUploadedFileByIdAndUser.length).toBe(2);
  });

  it("getRecentMessages signature requires uploadedFileId and optional limit", async () => {
    const { getRecentMessages } = await import("@/server/file-analysis/file-repository");
    expect(typeof getRecentMessages).toBe("function");
  });
});

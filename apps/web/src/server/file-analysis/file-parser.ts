import "server-only";

import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

import type { FileSchema } from "@tabelin/shared";

// Maximum rows to parse from XLSX — anti-DoS (T-04-02-01)
const MAX_ROWS = 1000;

/**
 * Detect CSV delimiter by counting occurrences of ',' vs ';' in the first line.
 * Brazilian Excel exports commonly use ';' as the separator.
 */
function detectDelimiter(text: string): "," | ";" {
  const firstLine = text.split("\n")[0] ?? "";
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

/**
 * Infer the column type from a sample of values.
 * Order: booleano → numero → data → texto (fallback).
 */
function inferType(
  samples: unknown[]
): "numero" | "data" | "booleano" | "texto" {
  const nonNull = samples.filter(
    (v) => v !== null && v !== undefined && String(v).trim() !== ""
  );
  if (nonNull.length === 0) return "texto";

  // Booleano: exact match on canonical boolean strings
  const boolValues = new Set(["true", "false", "sim", "nao", "s", "n", "1", "0"]);
  if (nonNull.every((v) => boolValues.has(String(v).toLowerCase().trim()))) {
    return "booleano";
  }

  // Date object check (from XLSX cellDates:true)
  if (nonNull.every((v) => v instanceof Date)) {
    return "data";
  }

  // Numero: every value parses to a non-NaN float
  if (
    nonNull.every((v) => {
      const str = String(v).trim().replace(",", ".");
      return str.length > 0 && !isNaN(parseFloat(str)) && isFinite(Number(str));
    })
  ) {
    return "numero";
  }

  // Data: string length > 5 and parses as a date
  if (
    nonNull.every((v) => {
      const s = String(v).trim();
      return s.length > 5 && !isNaN(Date.parse(s));
    })
  ) {
    return "data";
  }

  return "texto";
}

/**
 * Extract a FileSchema from an array of row objects.
 * sampleRows limited to 10; type inference uses up to 50 rows per column.
 */
function extractSchema(
  rows: Record<string, unknown>[],
  fileName: string,
  sheetName?: string
): FileSchema {
  if (rows.length === 0) {
    return { columns: [], sampleRows: [], rowCount: 0, sheetName, fileName };
  }

  const headers = Object.keys(rows[0]);
  const sampleRows = rows.slice(0, 10);
  const inferRows = rows.slice(0, 50);

  const columns = headers.map((name) => ({
    name,
    type: inferType(inferRows.map((r) => r[name])),
    sampleValues: sampleRows.map((r) => r[name])
  }));

  return { columns, sampleRows, rowCount: rows.length, sheetName, fileName };
}

/**
 * Parse a file buffer (ArrayBuffer) and return a FileSchema.
 * The raw buffer is never stored — it is consumed in this call and discarded.
 * Raw buffer is not logged — no content disclosure (PRIV-02 / T-04-01-02).
 *
 * @param buffer - The raw file bytes as ArrayBuffer
 * @param mimeType - "csv" or "xlsx"
 * @param sheetName - (XLSX only) which sheet to parse; defaults to first sheet
 * @param fileName - optional; used in the returned schema (defaults to "arquivo.csv" or "arquivo.xlsx")
 */
export function parseFile(
  buffer: ArrayBuffer,
  mimeType: "csv" | "xlsx",
  sheetName?: string,
  fileName?: string
): FileSchema {
  if (mimeType === "xlsx") {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const targetSheet = sheetName ?? workbook.SheetNames[0];
    const ws = workbook.Sheets[targetSheet ?? ""];

    if (!ws) {
      return {
        columns: [],
        sampleRows: [],
        rowCount: 0,
        sheetName: targetSheet,
        fileName: fileName ?? "arquivo.xlsx"
      };
    }

    const allRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: null
    });
    // Anti-DoS: limit to MAX_ROWS rows (T-04-02-01)
    const rows = allRows.slice(0, MAX_ROWS);

    return extractSchema(rows, fileName ?? "arquivo.xlsx", targetSheet);
  }

  // CSV path
  const text = new TextDecoder("utf-8").decode(buffer);
  const delimiter = detectDelimiter(text);

  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter
  }) as Record<string, unknown>[];

  return extractSchema(rows, fileName ?? "arquivo.csv");
}

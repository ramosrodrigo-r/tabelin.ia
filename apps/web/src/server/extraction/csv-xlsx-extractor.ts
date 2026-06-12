import "server-only";

import * as XLSX from "xlsx";

import type { FileSchema } from "@tabelin/shared";

import { parseFile } from "../file-analysis/file-parser";
import type { ExtractionResult } from "./types";

/**
 * Cap de linhas efetivas por aba serializada no output (D-06 / anti-DoS).
 * Clampeia o `rowCount` reportado no texto para evitar tokens ilimitados
 * quando XLSX tem muitas abas (D-05) com muitas linhas cada.
 */
export const MAX_ROWS_PER_SHEET = 200;

function formatSchemaForPrompt(schema: FileSchema): string {
  const colLines = schema.columns
    .map((c) => {
      const examples = (c.sampleValues as unknown[])
        .slice(0, 3)
        .map((v) => (v instanceof Date ? v.toISOString() : String(v ?? "")))
        .join(", ");
      return `  - ${c.name} (${c.type}): exemplos: ${examples}`;
    })
    .join("\n");

  return `Arquivo: ${schema.fileName}
Aba: ${schema.sheetName ?? "N/A"}
Total de linhas: ${schema.rowCount}
Colunas (${schema.columns.length}):
${colLines}`;
}

/**
 * Serializa as sampleRows do schema como bloco Markdown legível (D-02).
 * Usa schema.sampleRows já fatiado a 10 por extractSchema.
 */
function sampleRowsToBlock(schema: FileSchema): string {
  const headers = schema.columns.map((c) => c.name);
  const lines = schema.sampleRows.slice(0, 10).map((row) =>
    headers
      .map((h) => {
        const v = row[h];
        return v instanceof Date ? (v as Date).toISOString() : String(v ?? "");
      })
      .join(" | ")
  );
  return [
    "Amostra de linhas:",
    `  | ${headers.join(" | ")} |`,
    ...lines.map((l) => `  | ${l} |`)
  ].join("\n");
}

/**
 * Serializa um FileSchema de uma aba com o cap D-06 aplicado à contagem
 * efetiva reportada (não ao bloco de amostra, que já é ≤10).
 */
function serializeSheet(schema: FileSchema): string {
  const effectiveRowCount = Math.min(schema.rowCount, MAX_ROWS_PER_SHEET);
  // Clonar schema com rowCount clampado para que formatSchemaForPrompt
  // reporte a contagem efetiva e não o total bruto.
  const cappedSchema: FileSchema = { ...schema, rowCount: effectiveRowCount };

  return formatSchemaForPrompt(cappedSchema) + "\n" + sampleRowsToBlock(schema);
}

/**
 * Extrai conteúdo de um arquivo CSV ou XLSX para texto plano.
 *
 * CSV: schema + ~10 linhas de amostra (D-01/D-02).
 * XLSX: itera todas as abas com rótulo "## Aba: <nome>" (D-05) e serializa
 *       cada aba com cap de MAX_ROWS_PER_SHEET=200 linhas efetivas (D-06).
 *
 * Retorna EMPTY_EXTRACTION se o arquivo não tiver nenhuma coluna.
 */
export async function extractCsvXlsx(
  buffer: ArrayBuffer,
  mimeType: "csv" | "xlsx",
  fileName: string
): Promise<ExtractionResult> {
  try {
    if (mimeType === "csv") {
      const schema = parseFile(buffer, "csv", undefined, fileName);

      if (schema.columns.length === 0) {
        return {
          ok: false,
          code: "EMPTY_EXTRACTION",
          message: "O arquivo CSV não contém colunas ou dados."
        };
      }

      const text = serializeSheet(schema);
      return { ok: true, text };
    }

    // XLSX: enumerar abas via XLSX.read e iterar cada uma
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetNames = workbook.SheetNames;

    const blocks: string[] = [];

    for (const sheetName of sheetNames) {
      const schema = parseFile(buffer, "xlsx", sheetName, fileName);
      if (schema.columns.length > 0) {
        blocks.push(`## Aba: ${sheetName}\n${serializeSheet(schema)}`);
      }
    }

    if (blocks.length === 0) {
      return {
        ok: false,
        code: "EMPTY_EXTRACTION",
        message: "O arquivo XLSX não contém abas com dados."
      };
    }

    return { ok: true, text: blocks.join("\n\n") };
  } catch {
    return {
      ok: false,
      code: "EMPTY_EXTRACTION",
      message: "Não foi possível processar o arquivo."
    };
  }
}

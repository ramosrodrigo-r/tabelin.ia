import "server-only";

import { processImageOcr } from "../ai/ocr-processor";
import type { ExtractionResult } from "./types";

/**
 * Serializa resultado OCR { headers, rows } como tabela Markdown (D-03).
 */
function ocrToMarkdown(r: { headers: string[]; rows: string[][] }): string {
  const head = `| ${r.headers.join(" | ")} |`;
  const sep = `| ${r.headers.map(() => "---").join(" | ")} |`;
  const body = r.rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  return [head, sep, body].filter(Boolean).join("\n");
}

/**
 * Converte resultado OCR em ExtractionResult.
 * Exportado para permitir testes unitários sem chamar processImageOcr.
 */
export function extractImageFromOcrResult(result: {
  headers: string[];
  rows: string[][];
}): ExtractionResult {
  if (result.headers.length === 0) {
    return {
      ok: false,
      code: "EMPTY_EXTRACTION",
      message: "A imagem não contém tabela identificável."
    };
  }

  return { ok: true, text: ocrToMarkdown(result) };
}

/**
 * Extrai tabela de uma imagem PNG/JPEG via OCR.
 *
 * Converte o buffer para base64 (Pitfall 4) e repassa a processImageOcr.
 * O fixture-mode é herdado automaticamente quando OPENAI_API_KEY está ausente.
 * Nenhum byte raw é logado (PRIV-02).
 */
export async function extractImage(
  buffer: Buffer | ArrayBuffer,
  mimeType: "image/png" | "image/jpeg"
): Promise<ExtractionResult> {
  try {
    const base64 = Buffer.isBuffer(buffer)
      ? buffer.toString("base64")
      : Buffer.from(buffer).toString("base64");

    const ocrResult = await processImageOcr(base64, mimeType);
    return extractImageFromOcrResult(ocrResult);
  } catch {
    return {
      ok: false,
      code: "EMPTY_EXTRACTION",
      message: "Não foi possível processar a imagem."
    };
  }
}

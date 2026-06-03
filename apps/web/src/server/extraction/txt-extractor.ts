import "server-only";

import type { ExtractionResult } from "./types";

/**
 * Extrai texto de um arquivo TXT via TextDecoder UTF-8 (D-04).
 * Retorna o conteúdo direto sem reformatação tabular.
 * Buffer vazio ou só whitespace → EMPTY_EXTRACTION.
 */
export function extractTxt(buffer: ArrayBuffer): ExtractionResult {
  const text = new TextDecoder("utf-8").decode(buffer);

  if (text.trim().length === 0) {
    return {
      ok: false,
      code: "EMPTY_EXTRACTION",
      message: "O arquivo TXT está vazio ou contém apenas espaços."
    };
  }

  return { ok: true, text };
}

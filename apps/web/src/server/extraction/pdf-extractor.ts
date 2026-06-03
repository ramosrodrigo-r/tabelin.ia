import "server-only";

import { extractText, getDocumentProxy } from "unpdf";

import type { ExtractionResult } from "./types";

/**
 * EXT-03/EXT-06/D-12: Extrator de PDF via unpdf (PDF.js serverless).
 *
 * Assumption A1: unpdf retorna string vazia/curta para PDF escaneado — não lança.
 * Se lançar, o catch cobre como EMPTY_EXTRACTION (comportamento real registrado no SUMMARY).
 *
 * Heurística D-12: text.trim().length < 50 → SCANNED_PDF (sem fallback automático — EXT-06).
 * PRIV-02: catch sem logar conteúdo raw.
 */

/** Limiar da heurística D-12 para PDF escaneado */
const SCANNED_TEXT_THRESHOLD = 50;

/**
 * Extrai texto de um PDF em Uint8Array via unpdf.
 *
 * @param bytes - Conteúdo PDF como Uint8Array
 * @returns ExtractionResult — ok:true com texto, ou ok:false com código SCANNED_PDF | EMPTY_EXTRACTION
 */
export async function extractPdf(bytes: Uint8Array): Promise<ExtractionResult> {
  try {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });

    // D-12/EXT-06: heurística de PDF escaneado — sem fallback automático
    if (text.trim().length < SCANNED_TEXT_THRESHOLD) {
      return {
        ok: false,
        code: "SCANNED_PDF",
        message:
          "Este PDF parece ser escaneado (sem texto selecionável). Use o tool de OCR para extrair a tabela da imagem.",
      };
    }

    return { ok: true, text };
  } catch {
    // PRIV-02: nunca logar conteúdo raw do arquivo
    return {
      ok: false,
      code: "EMPTY_EXTRACTION",
      message: "Não foi possível extrair conteúdo legível deste PDF.",
    };
  }
}

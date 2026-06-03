import "server-only";

import { extractCsvXlsx } from "./csv-xlsx-extractor";
import { extractImage } from "./image-extractor";
import { extractPdf } from "./pdf-extractor";
import { extractTxt } from "./txt-extractor";
import type { ExtractionResult } from "./types";
import { detectFileType } from "./byte-validation";
import { guardXlsxZip } from "./zip-guard";

/**
 * EXT-05/D-08: Dispatcher único de extração de conteúdo de arquivo.
 *
 * Ponto de entrada canônico para todas as rotas da Phase 10.
 * Centraliza as conversões de buffer (Pitfall 6) e aplica a ordem
 * de segurança correta: magic bytes → guard anti-ZIP-bomb → parse.
 *
 * Fluxo de decisão:
 *   1. Detecta tipo por magic bytes (byte-validation.ts / D-10)
 *   2. Para binários: roteia pelo tipo DETECTADO (extensão declarada ignorada)
 *      - xlsx: guarda contra ZIP-bomb ANTES do parse (SEC-02 / D-11)
 *      - png/jpg: extrai via OCR
 *      - pdf: extrai texto via unpdf
 *      - outros binários: UNSUPPORTED_TYPE
 *   3. Para "text" (sem magic bytes): roteia por extensão de `declaredName`
 *      - .csv → extractCsvXlsx
 *      - .txt → extractTxt
 *      - outro → UNSUPPORTED_TYPE
 *
 * Conversões de buffer centralizadas aqui (Pitfall 6):
 *   - Uint8Array: para detectFileType / guardXlsxZip
 *   - ArrayBuffer: para extractCsvXlsx / extractTxt
 *   - Buffer: para extractImage (que converte a base64 internamente)
 *
 * @param buffer - Conteúdo do arquivo como Node Buffer
 * @param declaredName - Nome declarado pelo cliente (usado apenas para branch "text")
 * @returns Promise<ExtractionResult> — sempre tipado, mensagens de erro em pt-BR
 */
export async function extractContent(
  buffer: Buffer,
  declaredName: string
): Promise<ExtractionResult> {
  // Conversões centralizadas (Pitfall 6)
  const bytes: Uint8Array = new Uint8Array(buffer);
  // Cópia explícita do ArrayBuffer para garantir isolamento do pool Node.js/jsdom.
  // Usar buffer.buffer.slice() pode retornar o pool compartilhado com byteOffset incorreto
  // em ambientes que não copiam o buffer (jsdom, Node.js Buffer pool).
  const arrayBuffer: ArrayBuffer = new ArrayBuffer(buffer.length);
  new Uint8Array(arrayBuffer).set(buffer);

  // 1. Detecção de tipo por magic bytes (D-10/SEC-02)
  const fileType = await detectFileType(bytes);

  // 2. Roteamento para binários (tipo DETECTADO sobrepõe extensão declarada)
  if (fileType.kind !== "text" && fileType.kind !== "unsupported") {
    switch (fileType.kind) {
      case "pdf":
        return extractPdf(bytes);

      case "png":
        return extractImage(buffer, "image/png");

      case "jpg":
        return extractImage(buffer, "image/jpeg");

      case "xlsx": {
        // SEC-02/D-11: guard anti-ZIP-bomb OBRIGATÓRIO antes do parse
        const guardResult = guardXlsxZip(bytes);
        if (!guardResult.ok) {
          return guardResult; // ZIP_BOMB — curto-circuita sem parsear
        }
        return extractCsvXlsx(arrayBuffer, "xlsx", declaredName);
      }
    }
  }

  // 3. Tipo não suportado (binário com assinatura desconhecida)
  if (fileType.kind === "unsupported") {
    return {
      ok: false,
      code: "UNSUPPORTED_TYPE",
      message:
        "Formato de arquivo não suportado. Use CSV, XLSX, PNG, JPEG, PDF ou TXT.",
    };
  }

  // 4. Sem magic bytes ("text") → decisão por extensão declarada
  const ext = declaredName.toLowerCase().split(".").pop() ?? "";

  if (ext === "csv") {
    return extractCsvXlsx(arrayBuffer, "csv", declaredName);
  }

  if (ext === "txt") {
    return extractTxt(arrayBuffer);
  }

  // Extensão não suportada no modo texto
  return {
    ok: false,
    code: "UNSUPPORTED_TYPE",
    message:
      "Formato de arquivo não suportado. Use CSV, XLSX, PNG, JPEG, PDF ou TXT.",
  };
}

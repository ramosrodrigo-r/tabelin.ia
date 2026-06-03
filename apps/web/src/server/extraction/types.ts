import "server-only";

/**
 * Contrato de erro tipado para o sistema de extração de documentos (D-09).
 * Todos os extratores e o dispatcher retornam ExtractionResult.
 * Mensagens de erro (campo `message`) são sempre em pt-BR e acionáveis.
 */

export type ExtractionErrorCode =
  | "SCANNED_PDF"
  | "INVALID_BYTES"
  | "ZIP_BOMB"
  | "EMPTY_EXTRACTION"
  | "UNSUPPORTED_TYPE"
  | "FILE_TOO_LARGE";

export type ExtractionError = {
  ok: false;
  code: ExtractionErrorCode;
  message: string; // pt-BR, acionável (D-09)
};

export type ExtractionSuccess = {
  ok: true;
  text: string;
};

export type ExtractionResult = ExtractionSuccess | ExtractionError;

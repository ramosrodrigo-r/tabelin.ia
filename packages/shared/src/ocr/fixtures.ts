import type { OcrResponse } from "./schema";

export const OCR_FIXTURE_RESPONSE: OcrResponse = {
  headers: ["Nome", "Valor", "Status"],
  rows: [
    ["Alice", "100", "Ativo"],
    ["Bob", "200", "Inativo"]
  ]
};

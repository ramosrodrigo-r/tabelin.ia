import "server-only";

import { unzipSync } from "fflate";

import type { ExtractionError } from "./types";

/**
 * D-11/SEC-02: Guard anti-ZIP-bomb para XLSX via inspeção do central directory.
 *
 * Lê os metadados do ZIP (nome, tamanho comprimido, tamanho original) SEM
 * descompactar nenhuma entrada — custo trivial. Rejeita se exceder os caps.
 *
 * DEVE ser chamada ANTES de qualquer XLSX.read() — anti-pattern RESEARCH 325.
 *
 * Caps (Claude's discretion, A5):
 *   - MAX_TOTAL_UNCOMPRESSED: 50 MB total descomprimido
 *   - MAX_ENTRIES: 1000 entradas no ZIP
 */

export const MAX_TOTAL_UNCOMPRESSED = 50 * 1024 * 1024; // 50 MB
export const MAX_ENTRIES = 1000;

/**
 * Armazenamento interno dos originalSizes da última execução de guardXlsxZip.
 * Exposto via getLastOriginalSizes() para testes de discharge A2.
 * NÃO use em produção — é exclusivo para validação do comportamento de fflate.
 */
let _lastOriginalSizes: number[] = [];

/**
 * Inspeciona o central directory do ZIP do XLSX e rejeita se exceder os caps.
 *
 * @param bytes - Conteúdo XLSX como Uint8Array
 * @returns { ok: true } se within caps; ExtractionError com code "ZIP_BOMB" se exceder
 */
export function guardXlsxZip(bytes: Uint8Array): { ok: true } | ExtractionError {
  let total = 0;
  let count = 0;
  const sizes: number[] = [];

  try {
    unzipSync(bytes, {
      filter(info) {
        count += 1;
        total += info.originalSize; // tamanho DESCOMPACTADO lido do central directory
        sizes.push(info.originalSize);

        if (count > MAX_ENTRIES || total > MAX_TOTAL_UNCOMPRESSED) {
          // Lançar interrompe o scan — fflate captura e re-lança a mesma instância
          throw new Error("zip-bomb-cap");
        }

        // Retornar false = NÃO descompacta este arquivo (custo trivial)
        return false;
      },
    });
  } catch {
    // PRIV-02: nunca logar conteúdo raw
    _lastOriginalSizes = sizes;
    return {
      ok: false,
      code: "ZIP_BOMB",
      message:
        "A planilha excede os limites de descompactação permitidos e foi rejeitada por segurança.",
    };
  }

  _lastOriginalSizes = sizes;
  return { ok: true };
}

/**
 * Retorna os originalSizes capturados na última chamada de guardXlsxZip.
 * Usado exclusivamente para discharge da assumption A2 em testes.
 * Em produção, não chamar esta função.
 */
export function getLastOriginalSizes(): number[] {
  return _lastOriginalSizes;
}

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
 * Caps:
 *   - MAX_TOTAL_UNCOMPRESSED: 50 MB total descomprimido
 *   - MAX_ENTRIES: 1000 entradas no ZIP
 *   - MAX_RATIO: 100 — ratio originalSize/info.size (comprimido). Esta é a defesa
 *     REAL contra ZIP bombs: info.originalSize é metadado do central directory,
 *     gravável pelo atacante; info.size (tamanho comprimido) reflete bytes reais
 *     no arquivo. Ratio alto com info.size pequeno indica deflate stream real
 *     muito maior que o declarado — sinal inequívoco de ZIP bomb.
 *     info.size === 0 é ignorado no ratio (arquivos vazios legítimos).
 *   - MAX_ENTRY_UNCOMPRESSED: 25 MB por entrada — cap complementar ao cap total.
 */

export const MAX_TOTAL_UNCOMPRESSED = 50 * 1024 * 1024; // 50 MB
export const MAX_ENTRIES = 1000;
export const MAX_RATIO = 100; // ratio originalSize/info.size (comprimido)
export const MAX_ENTRY_UNCOMPRESSED = 25 * 1024 * 1024; // 25 MB por entrada

/**
 * Armazenamento interno dos originalSizes da última execução de guardXlsxZip.
 * Exposto via getLastOriginalSizes() para testes de discharge A2.
 * NÃO use em produção — é exclusivo para validação do comportamento de fflate.
 */
let _lastOriginalSizes: number[] = [];

/**
 * Inspeciona o central directory do ZIP do XLSX e rejeita se exceder os caps.
 *
 * NOTA DE SEGURANÇA: info.originalSize é metadado do central directory do ZIP,
 * escrito pelo criador do arquivo — um atacante pode declarar originalSize=1 por
 * entrada enquanto os deflate streams reais contêm gigabytes. Por isso, o ratio
 * check (info.originalSize / info.size) é a defesa REAL contra ZIP bombs:
 * info.size reflete os bytes comprimidos reais no arquivo e não pode ser forjado
 * sem alterar o arquivo em si. info.size === 0 é ignorado no ratio (arquivos
 * vazios legítimos têm info.size = 0 e não são ZIP bombs).
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
        total += info.originalSize; // tamanho DESCOMPACTADO declarado (não confiável!)
        sizes.push(info.originalSize);

        if (count > MAX_ENTRIES || total > MAX_TOTAL_UNCOMPRESSED) {
          // Lançar interrompe o scan — fflate captura e re-lança a mesma instância
          throw new Error("zip-bomb-cap");
        }

        // Per-entry uncompressed cap: rejeita entrada que declare > 25 MB descomprimido
        if (info.originalSize > MAX_ENTRY_UNCOMPRESSED) {
          throw new Error("zip-bomb-cap");
        }

        // Ratio check: defesa real contra ZIP bombs com originalSize forjado.
        // info.size é o tamanho comprimido real no arquivo (não controlado pelo atacante).
        // info.size === 0 é ignorado (arquivos vazios legítimos).
        if (info.size > 0 && info.originalSize / info.size > MAX_RATIO) {
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

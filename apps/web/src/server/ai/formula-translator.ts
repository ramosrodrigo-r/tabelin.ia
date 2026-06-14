import "server-only";

import { PT_BR_TO_EN } from "@tabelin/shared";

/**
 * Tradutor de fórmulas EN <-> pt-BR para o protocolo de mutação chat->grade.
 *
 * A IA (OpenAI Structured Outputs) recebe e devolve fórmulas em inglês com
 * separador de argumento `,` (o dialeto nativo do modelo e do `@formulajs`).
 * A grade viva, porém, espera fórmulas pt-BR com separador `;` (LOC-01). Este
 * módulo faz a ponte nos dois sentidos:
 *
 *  - `translateEnToPtBr`: saída do modelo -> grade (SUM -> SOMA, `,` -> `;`).
 *  - `translatePtBrToEn`: entrada do usuário -> modelo (normalização).
 *
 * A troca de separador é feita de forma segura: vírgulas/ponto-e-vírgulas dentro
 * de literais de string entre aspas duplas são preservados, e a troca só ocorre
 * dentro de parênteses (nível > 0), nunca em texto solto.
 */

/** Mapa invertido EN -> pt-BR derivado de PT_BR_TO_EN (fonte da verdade única). */
const EN_TO_PT_BR: Record<string, string> = Object.entries(PT_BR_TO_EN).reduce(
  (acc, [br, en]) => {
    // Primeira ocorrência vence: aliases pt-BR (CONT_SE, CONTSE) compartilham o
    // mesmo EN (COUNTIF); manter o primeiro mapeado garante a forma canônica.
    if (!(en in acc)) {
      acc[en] = br;
    }
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Substitui nomes de funções (token seguido de `(`) usando o dicionário dado.
 * O casamento é case-insensitive e a substituição usa a forma canônica do mapa.
 * Identificadores não mapeados são preservados intactos.
 */
function replaceFunctionNames(
  formula: string,
  dictionary: Record<string, string>
): string {
  // Permite letras acentuadas (MÉDIA, NÚM_CARACT) e o ponto de CONT.SE.
  return formula.replace(
    /([A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9._]*)\s*\(/g,
    (match, name: string, offset: number, full: string) => {
      // Não traduzir se estiver dentro de uma string literal entre aspas duplas.
      if (isInsideString(full, offset)) return match;

      const canonical = dictionary[name.toUpperCase()];
      if (!canonical) return match;

      // Preserva qualquer espaço entre o nome e o `(`.
      const suffix = match.slice(name.length);
      return canonical + suffix;
    }
  );
}

/** Verifica se a posição `index` cai dentro de um literal de string ("..."). */
function isInsideString(text: string, index: number): boolean {
  let inString = false;
  for (let i = 0; i < index; i += 1) {
    if (text[i] === '"') inString = !inString;
  }
  return inString;
}

/**
 * Troca separadores de argumento mantendo strings e profundidade de parênteses.
 * `from` só é trocado por `to` quando está fora de aspas e dentro de `(`.
 */
function swapSeparators(formula: string, from: string, to: string): string {
  let result = "";
  let inString = false;
  let depth = 0;

  for (const char of formula) {
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (!inString) {
      if (char === "(") depth += 1;
      else if (char === ")") depth = Math.max(0, depth - 1);

      if (char === from && depth > 0) {
        result += to;
        continue;
      }
    }

    result += char;
  }

  return result;
}

/**
 * Traduz uma fórmula do inglês (separador `,`) para pt-BR (separador `;`).
 * Ex.: `=SUM(A1, B1)` -> `=SOMA(A1; B1)`.
 */
export function translateEnToPtBr(formula: string): string {
  if (!formula) return formula;
  const withNames = replaceFunctionNames(formula, EN_TO_PT_BR);
  return swapSeparators(withNames, ",", ";");
}

/**
 * Traduz uma fórmula do pt-BR (separador `;`) para inglês (separador `,`).
 * Ex.: `=SOMA(A1; B1)` -> `=SUM(A1, B1)`. Útil para normalizar entradas do
 * usuário antes de enviá-las ao modelo.
 */
export function translatePtBrToEn(formula: string): string {
  if (!formula) return formula;
  const withNames = replaceFunctionNames(formula, PT_BR_TO_EN);
  return swapSeparators(withNames, ";", ",");
}

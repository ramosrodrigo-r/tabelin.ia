// packages/shared/src/table/formula-locale.ts
// Pure data + types — no framework dependencies, safe to import in both browser and Node.

/**
 * Mapa de nomes de funções pt-BR → EN para uso no mini motor de fórmulas.
 * Cobertura: ~30 funções core validadas contra @formulajs/formulajs 4.6.0.
 * Inclui aliases com ponto, underscore e sem separador para CONT.SE.
 */
export const PT_BR_TO_EN: Record<string, string> = {
  // Matemáticas
  SOMA: "SUM",
  SOMASE: "SUMIF",
  SOMASES: "SUMIFS",
  MÉDIA: "AVERAGE",
  MÉDIASE: "AVERAGEIF",
  MÁXIMO: "MAX",
  MÍNIMO: "MIN",
  ABS: "ABS",
  ARRED: "ROUND",
  MOD: "MOD",
  RAIZ: "SQRT",
  POTÊNCIA: "POWER",
  // Lógica
  SE: "IF",
  E: "AND",
  OU: "OR",
  NÃO: "NOT",
  // Contagem
  CONT: "COUNT",
  CONTA: "COUNTA",
  "CONT.SE": "COUNTIF",   // alias com ponto — regex /^=([A-Z][A-Z0-9._]*)\(/i captura o ponto
  CONT_SE: "COUNTIF",     // alias sem ponto (underscore)
  CONTSE: "COUNTIF",      // alias sem ponto e sem underscore
  // Busca
  PROCV: "VLOOKUP",
  PROCH: "HLOOKUP",
  ÍNDICE: "INDEX",
  CORRESP: "MATCH",
  // Texto
  CONCATENAR: "CONCATENATE",
  TEXTO: "TEXT",
  ESQUERDA: "LEFT",
  DIREITA: "RIGHT",
  NÚM_CARACT: "LEN",
  // Data
  HOJE: "TODAY",
  AGORA: "NOW",
  ANO: "YEAR",
  MÊS: "MONTH",
  DIA: "DAY",
};

/**
 * Tipo utilitário representando todas as chaves do mapa PT_BR_TO_EN.
 */
export type FormulaBRFunctionName = keyof typeof PT_BR_TO_EN;

/**
 * Traduz um nome de função pt-BR para o equivalente em inglês.
 * Case-insensitive: "procv", "PROCV" e "Procv" são equivalentes.
 * Retorna null para funções não mapeadas.
 */
export function translateFunctionName(brName: string): string | null {
  if (!brName) return null;
  const upper = brName.toUpperCase();
  return PT_BR_TO_EN[upper] ?? null;
}

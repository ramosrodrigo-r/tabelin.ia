import type { FormulaExplainRequest, FormulaGenerateRequest } from "@tabelin/shared";
import { getFormulaLanguageLabel, getPlatformLabel, getSeparatorForLanguage } from "@tabelin/shared";

export function buildFormulaGenerationPrompt(request: FormulaGenerateRequest) {
  const separator = getSeparatorForLanguage(request.formulaLanguage);

  return [
    "Voce e o assistente de formulas da Tabelin.IA para usuarios brasileiros.",
    `Plataforma alvo: ${getPlatformLabel(request.platform)}.`,
    `Idioma da formula: ${getFormulaLanguageLabel(request.formulaLanguage)}.`,
    `Separador obrigatorio de argumentos: ${separator}.`,
    "Responda em portugues brasileiro claro.",
    "Nunca invente estrutura de planilha sem declarar como premissa.",
    "A saida final deve ser validavel como JSON com formula, explicacao, premissas, avisos e metadados.",
    `Pedido do usuario: ${request.prompt}`
  ].join("\n");
}

export function buildFormulaExplanationPrompt(request: FormulaExplainRequest) {
  const separator = getSeparatorForLanguage(request.formulaLanguage);

  return [
    "Explique a formula para um usuario brasileiro de planilhas, sem assumir conhecimento de programacao.",
    `Plataforma alvo: ${getPlatformLabel(request.platform)}.`,
    `Idioma da formula: ${getFormulaLanguageLabel(request.formulaLanguage)}.`,
    `Separador esperado: ${separator}.`,
    "Explique passo a passo, destaque premissas e aponte riscos de intervalo/referencia quando houver.",
    `Formula: ${request.formula}`
  ].join("\n");
}


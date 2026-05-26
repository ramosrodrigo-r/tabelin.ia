import type { RegexExplainResponse, RegexGenerateResponse } from "./schema";

export const REGEX_GENERATE_FIXTURES: RegexGenerateResponse[] = [
  {
    kind: "regex_generate",
    pattern: "^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$",
    explanation: "Valida um CPF no formato com pontos e traço: 000.000.000-00.",
    examples: ["123.456.789-09", "000.000.000-00"],
    assumptions: ["O CPF já está formatado com pontos e traço antes da validação."],
    warnings: [],
    metadata: { mode: "generate", providerModel: "fixture" }
  }
];

export const REGEX_EXPLAIN_FIXTURES: RegexExplainResponse[] = [
  {
    kind: "regex_explain",
    pattern: "^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$",
    steps: [
      "^ ancora no início da string.",
      "\\d{3} casa exatamente 3 dígitos numéricos.",
      "\\. casa um ponto literal (escapado).",
      "\\d{3} repete o grupo de 3 dígitos.",
      "\\. outro ponto literal.",
      "\\d{3} terceiro grupo de 3 dígitos.",
      "- casa o traço literal.",
      "\\d{2} casa exatamente 2 dígitos (dígito verificador).",
      "$ ancora no fim da string."
    ],
    assumptions: [],
    warnings: [],
    metadata: { mode: "explain", providerModel: "fixture" }
  }
];

import type { FormulaGenerateResponse } from "./schema";

export const FORMULA_FIXTURES: FormulaGenerateResponse[] = [
  {
    kind: "formula",
    formula: '=SE(A2>0;"Ativo";"Revisar")',
    explanation: "Verifica se A2 e maior que zero e retorna um status operacional.",
    assumptions: ["A coluna A contem valores numericos."],
    warnings: [],
    metadata: {
      mode: "generate",
      platform: "excel",
      formulaLanguage: "pt-BR",
      separator: ";",
      providerModel: "fixture"
    }
  },
  {
    kind: "formula",
    formula: "=PROCV(E2;A:B;2;FALSO)",
    explanation: "Busca o valor de E2 na primeira coluna do intervalo A:B e retorna a segunda coluna.",
    assumptions: ["A chave procurada esta na primeira coluna do intervalo."],
    warnings: ["Confirme se a tabela de busca nao possui chaves duplicadas."],
    metadata: {
      mode: "generate",
      platform: "excel",
      formulaLanguage: "pt-BR",
      separator: ";",
      providerModel: "fixture"
    }
  },
  {
    kind: "formula",
    formula: '=SOMASE(C:C;"Pago";B:B)',
    explanation: "Soma os valores da coluna B quando a coluna C esta marcada como Pago.",
    assumptions: ["A coluna B contem valores a somar.", "A coluna C contem o status do pagamento."],
    warnings: [],
    metadata: {
      mode: "generate",
      platform: "excel",
      formulaLanguage: "pt-BR",
      separator: ";",
      providerModel: "fixture"
    }
  },
  {
    kind: "formula",
    formula: '=SOMASES(D:D;B:B;">="&DATA(2026;1;1);C:C;"Marketing")',
    explanation: "Soma despesas financeiras do centro Marketing a partir de 01/01/2026.",
    assumptions: ["A coluna D contem valores financeiros.", "A coluna B contem datas.", "A coluna C contem centros de custo."],
    warnings: ["Confirme se as datas estao armazenadas como data, nao texto."],
    metadata: {
      mode: "generate",
      platform: "excel",
      formulaLanguage: "pt-BR",
      separator: ";",
      providerModel: "fixture"
    }
  }
];


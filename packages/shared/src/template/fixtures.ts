import type { TemplateGenerateResponse } from "./schema";

export const TEMPLATE_FIXTURES: TemplateGenerateResponse[] = [
  {
    kind: "template",
    output:
      "# Controle de Gastos Mensais\n\n| Data | Categoria | Descricao | Valor (R$) | Tipo |\n|------|-----------|-----------|------------|------|\n| 01/01/2025 | Alimentacao | Supermercado | 350,00 | Saida |\n\n**Total do mes:** =SOMA(D2:D100)\n**Total por categoria:** =SOMASE(B:B;\"Alimentacao\";D:D)",
    explanation:
      "Template de controle de gastos com colunas de data, categoria, descrição, valor e tipo. Inclui fórmulas de total mensal e subtotal por categoria no estilo Excel pt-BR.",
    assumptions: [
      "Usa separador de ponto-e-vírgula para fórmulas pt-BR.",
      "Valores em reais (R$) com vírgula decimal."
    ],
    warnings: [],
    metadata: { mode: "generate", providerModel: "fixture" }
  }
];

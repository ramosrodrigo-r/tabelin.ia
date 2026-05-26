import type { ScriptGenerateResponse } from "./schema";

export const SCRIPT_FIXTURES: ScriptGenerateResponse[] = [
  {
    kind: "script",
    code: 'Sub CopiarDados()\n  Sheets("Vendas").Range("A:D").Copy Destination:=Sheets("Relatorio").Range("A1")\nEnd Sub',
    explanation:
      "Copia o intervalo A:D da aba Vendas para a aba Relatorio a partir da celula A1.",
    assumptions: ["As abas Vendas e Relatorio existem na pasta de trabalho."],
    warnings: [],
    isDestructive: false,
    metadata: { mode: "generate", scriptType: "vba", isDestructive: false, providerModel: "fixture" }
  },
  {
    kind: "script",
    code: 'function calcularTotal() {\n  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();\n  const dados = sheet.getRange("B2:B100").getValues();\n  const total = dados.reduce((acc, row) => acc + (row[0] || 0), 0);\n  sheet.getRange("B101").setValue(total);\n}',
    explanation:
      "Calcula a soma de todos os valores da coluna B e escreve o resultado em B101.",
    assumptions: [
      "A planilha ativa contém valores numéricos na coluna B, linhas 2 a 100."
    ],
    warnings: [],
    isDestructive: false,
    metadata: {
      mode: "generate",
      scriptType: "apps_script",
      isDestructive: false,
      providerModel: "fixture"
    }
  }
];

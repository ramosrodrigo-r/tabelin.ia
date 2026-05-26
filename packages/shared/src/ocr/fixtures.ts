import type { ChartData, OcrResponse } from "./schema";

export const ocrResponseFixture: OcrResponse = {
  headers: ["Produto", "Vendas", "Receita"],
  rows: [
    ["Widget A", "120", "R$ 2.400,00"],
    ["Widget B", "85", "R$ 1.700,00"],
    ["Widget C", "200", "R$ 4.000,00"]
  ]
};

export const chartDataFixture: ChartData = {
  chartType: "bar",
  title: "Vendas por Produto",
  xKey: "Produto",
  yKey: "Vendas",
  rows: [
    { Produto: "Widget A", Vendas: 120 },
    { Produto: "Widget B", Vendas: 85 },
    { Produto: "Widget C", Vendas: 200 }
  ]
};

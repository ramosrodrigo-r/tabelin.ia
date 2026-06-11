import type { TableSpecPayload } from "@tabelin/shared";

/**
 * Planilha-amostra estática do painel principal da tela única (D-04).
 *
 * Sem persistência (D-06) — reaproveita a fixture pt-BR "Controle de Gastos"
 * já usada em `apps/web/src/server/ai/table-clarifier.ts` (modo fixture sem
 * `OPENAI_API_KEY`). Consumida via `<TableGridPanel spec={SAMPLE_SPEC} />`.
 */
export const SAMPLE_SPEC: TableSpecPayload = {
  kind: "table_spec",
  title: "Controle de Gastos",
  columns: [
    { name: "Descrição", type: "text", key: "descricao" },
    { name: "Categoria", type: "text", key: "categoria" },
    { name: "Valor (R$)", type: "currency", key: "valor" },
    { name: "Desconto", type: "currency", key: "desconto" },
    { name: "Total", type: "formula", key: "total", formula: "=SOMA(C{row};-D{row})" },
  ],
  rowCount: 5,
  rows: [
    { descricao: "Aluguel", categoria: "Moradia", valor: 2000, desconto: 100 },
    { descricao: "Supermercado", categoria: "Alimentação", valor: 800, desconto: 50 },
    { descricao: "Internet", categoria: "Serviços", valor: 150, desconto: 0 },
    { descricao: "Academia", categoria: "Saúde", valor: 120, desconto: 20 },
    { descricao: "Netflix", categoria: "Lazer", valor: 55, desconto: 5 },
  ],
  formulaLanguage: "pt-BR",
  separator: ";",
};

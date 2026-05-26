import type { SqlGenerateResponse } from "./schema";

export const SQL_FIXTURES: SqlGenerateResponse[] = [
  {
    kind: "sql",
    query:
      "SELECT cliente_id, COUNT(*) as total_compras\nFROM pedidos\nWHERE data_pedido >= NOW() - INTERVAL '30 days'\nGROUP BY cliente_id\nHAVING COUNT(*) > 3\nORDER BY total_compras DESC;",
    explanation:
      "Lista clientes com mais de 3 compras nos últimos 30 dias, ordenados pelo total de compras.",
    assumptions: [
      "A tabela pedidos existe com colunas cliente_id e data_pedido.",
      "O banco de dados usa PostgreSQL com suporte a INTERVAL."
    ],
    warnings: [],
    isDestructive: false,
    metadata: {
      mode: "generate",
      dialect: "postgresql",
      isDestructive: false,
      providerModel: "fixture"
    }
  }
];

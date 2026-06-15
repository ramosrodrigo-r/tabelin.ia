import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TableSpecPayload } from "@tabelin/shared";

// Mocka APENAS a fronteira de banco (Prisma). O helper de persistência roda
// REAL — guardActiveSpecSize e a propagação de erro são exercitados de verdade,
// sem mock que mascare o comportamento (WR-03/WR-04). A verificação rejeitou a
// abordagem anterior em que a rota mockava o helper para rejeitar artificialmente.
const prismaMocks = vi.hoisted(() => ({
  $transaction: vi.fn(),
  deleteMany: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    $transaction: prismaMocks.$transaction,
    conversationExchange: {
      deleteMany: prismaMocks.deleteMany,
      create: prismaMocks.create,
    },
  },
}));

import { saveActiveSpreadsheetSpec } from "@/server/tools/conversation-repository";

/** Constrói um spec ativo válido com `rowCount` linhas × `colCount` colunas pt-BR. */
function buildSpec(rowCount: number, colCount: number, cellText: string): TableSpecPayload {
  const columns = Array.from({ length: colCount }, (_, i) => ({
    name: `Coluna ${i + 1}`,
    type: "text" as const,
    key: `coluna_${i + 1}`,
  }));
  const rows = Array.from({ length: rowCount }, () => {
    const row: Record<string, string> = {};
    columns.forEach((c) => {
      row[c.key] = cellText;
    });
    return row;
  });
  return {
    kind: "table_spec",
    title: "Planilha grande",
    columns,
    rows,
    rowCount,
    separator: ";",
    formulaLanguage: "pt-BR",
  };
}

describe("saveActiveSpreadsheetSpec (helper real)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Executa o callback da transação com um tx que delega aos mocks.
    prismaMocks.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        conversationExchange: {
          deleteMany: prismaMocks.deleteMany,
          create: prismaMocks.create,
        },
      }),
    );
    prismaMocks.deleteMany.mockResolvedValue({ count: 0 });
    prismaMocks.create.mockResolvedValue({ id: "row-1" });
  });

  it("persiste um spec no máximo do schema (200×26 pt-BR) sem placeholder de truncamento", async () => {
    // Conteúdo pt-BR realista por célula (acentos contam mais bytes UTF-8).
    const spec = buildSpec(200, 26, "Descrição com acentuação çãõé");

    await expect(saveActiveSpreadsheetSpec("user-1", spec)).resolves.toBeUndefined();

    expect(prismaMocks.create).toHaveBeenCalledTimes(1);
    const payload = prismaMocks.create.mock.calls[0]![0].data.assistantPayload as TableSpecPayload;
    // O spec é persistido INTACTO — nada de { truncated: true }.
    expect(payload).not.toHaveProperty("truncated");
    expect(payload.columns).toHaveLength(26);
    expect(payload.rows).toHaveLength(200);
  });

  it("rejeita (lança) um spec ativo acima do teto em vez de gravar placeholder", async () => {
    // Estoura MAX_ACTIVE_SPEC_BYTES (512 KB) com conteúdo grande por célula.
    const huge = "x".repeat(5_000);
    const spec = buildSpec(200, 26, huge);

    await expect(saveActiveSpreadsheetSpec("user-1", spec)).rejects.toThrow();
    // Oversize é rejeitado ANTES de tocar no banco — nenhuma gravação placeholder.
    expect(prismaMocks.create).not.toHaveBeenCalled();
  });

  it("propaga a falha quando a transação Prisma rejeita (não engole o erro)", async () => {
    const spec = buildSpec(1, 1, "ok");
    prismaMocks.$transaction.mockRejectedValueOnce(new Error("db down"));

    await expect(saveActiveSpreadsheetSpec("user-1", spec)).rejects.toThrow("db down");
  });

  it("resolve sem lançar quando a gravação tem sucesso", async () => {
    const spec = buildSpec(3, 2, "Café");

    await expect(saveActiveSpreadsheetSpec("user-1", spec)).resolves.toBeUndefined();
    expect(prismaMocks.deleteMany).toHaveBeenCalledTimes(1);
    expect(prismaMocks.create).toHaveBeenCalledTimes(1);
  });
});

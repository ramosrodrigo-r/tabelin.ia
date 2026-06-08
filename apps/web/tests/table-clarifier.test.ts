import { afterAll, beforeEach, describe, expect, it } from "vitest";

// NOTE: Esses imports falharão com "cannot find module" até o Plan 02 criar os módulos.
// O scaffold existe para garantir que os contratos estejam definidos antes da implementação.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — módulo criado no Plan 02
import { askClarificationQuestion, buildTableSpec } from "../src/server/ai/table-clarifier";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — schema criado no Plan 02
import { tableSpecPayloadSchema } from "@tabelin/shared";

const REAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe("askClarificationQuestion — fixture mode", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterAll(() => {
    if (REAL_OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = REAL_OPENAI_API_KEY;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it("retorna uma string para turnIndex 0 no fixture mode", async () => {
    const result = await askClarificationQuestion({
      prompt: "cria uma tabela de controle de gastos",
      turnIndex: 0,
      collectedSpec: {},
    });

    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("retorna uma string diferente para turnIndex 1 no fixture mode", async () => {
    const result0 = await askClarificationQuestion({
      prompt: "cria uma tabela de controle de gastos",
      turnIndex: 0,
      collectedSpec: {},
    });

    const result1 = await askClarificationQuestion({
      prompt: "cria uma tabela de controle de gastos",
      turnIndex: 1,
      collectedSpec: { columns: ["Data", "Valor", "Categoria"] },
    });

    expect(typeof result1).toBe("string");
    expect(result1.length).toBeGreaterThan(0);
    // Perguntas de turnos diferentes devem ser distintas
    expect(result0).not.toBe(result1);
  });
});

describe("askClarificationQuestion — retorna exatamente uma pergunta", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterAll(() => {
    if (REAL_OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = REAL_OPENAI_API_KEY;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it("o resultado é uma string (não um array)", async () => {
    const result = await askClarificationQuestion({
      prompt: "preciso de uma planilha de vendas",
      turnIndex: 0,
      collectedSpec: {},
    });

    expect(Array.isArray(result)).toBe(false);
    expect(typeof result).toBe("string");
  });

  it("a pergunta não está vazia", async () => {
    const result = await askClarificationQuestion({
      prompt: "preciso de uma planilha de vendas",
      turnIndex: 0,
      collectedSpec: {},
    });

    expect(result.trim().length).toBeGreaterThan(0);
  });
});

describe("buildTableSpec — fixture mode", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterAll(() => {
    if (REAL_OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = REAL_OPENAI_API_KEY;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it("retorna objeto com kind='table_spec' no fixture mode", async () => {
    const result = await buildTableSpec({
      prompt: "cria uma tabela de controle de gastos",
      collectedSpec: {},
    });

    expect(result.kind).toBe("table_spec");
  });

  it("retorna title como string", async () => {
    const result = await buildTableSpec({
      prompt: "cria uma tabela de controle de gastos",
      collectedSpec: {},
    });

    expect(typeof result.title).toBe("string");
    expect(result.title.length).toBeGreaterThan(0);
  });

  it("retorna columns como array com pelo menos 1 elemento", async () => {
    const result = await buildTableSpec({
      prompt: "cria uma tabela de controle de gastos",
      collectedSpec: {},
    });

    expect(Array.isArray(result.columns)).toBe(true);
    expect(result.columns.length).toBeGreaterThanOrEqual(1);
  });

  it("retorna rowCount >= 1", async () => {
    const result = await buildTableSpec({
      prompt: "cria uma tabela de controle de gastos",
      collectedSpec: {},
    });

    expect(result.rowCount).toBeGreaterThanOrEqual(1);
  });
});

describe("buildTableSpec — schema válido", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterAll(() => {
    if (REAL_OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = REAL_OPENAI_API_KEY;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it("o resultado passa em tableSpecPayloadSchema.safeParse (CLAR-01, CLAR-02)", async () => {
    const result = await buildTableSpec({
      prompt: "planilha de controle de estoque com produto e quantidade",
      collectedSpec: { columns: ["Produto", "Quantidade"] },
    });

    const parsed = tableSpecPayloadSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});

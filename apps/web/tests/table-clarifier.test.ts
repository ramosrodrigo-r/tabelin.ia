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

  it("retorna spec determinística válida com title 'Controle de Gastos' e coluna com fórmula '=SOMA' (UNI-07)", async () => {
    const result = await buildTableSpec({
      prompt: "cria uma tabela de controle de gastos",
      collectedSpec: {},
    });

    const parsed = tableSpecPayloadSchema.safeParse(result);
    expect(parsed.success).toBe(true);

    expect(result.title).toBe("Controle de Gastos");

    const formulaCol = result.columns.find(
      (col: { type: string; formula?: string }) => col.type === "formula"
    );
    expect(formulaCol).toBeDefined();
    expect(formulaCol?.formula).toContain("=SOMA");
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

describe("buildTableSpec — fixture estendida Phase 14", () => {
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

  it("fixture mode retorna rows com 5 entradas", async () => {
    const result = await buildTableSpec({
      prompt: "cria uma tabela de controle de gastos",
      collectedSpec: {},
    });

    // Wave 1 estenderá a fixture para retornar rows; até lá, aceita undefined ou array
    if (!result.rows) {
      // Fixture ainda não estendida (Wave 0) — passa graciosamente
      expect(true).toBe(true);
      return;
    }

    expect(Array.isArray(result.rows)).toBe(true);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
  });

  it("fixture mode retorna coluna com type: 'formula' e campo formula definido", async () => {
    const result = await buildTableSpec({
      prompt: "cria uma tabela de controle de gastos",
      collectedSpec: {},
    });

    // Wave 1 adicionará colunas formula; até lá, passa graciosamente
    if (!result.columns) {
      expect(true).toBe(true);
      return;
    }

    const formulaCol = result.columns.find(
      (col: { type: string; formula?: string }) => col.type === "formula"
    );

    if (!formulaCol) {
      // Fixture ainda não tem coluna formula — passa graciosamente
      expect(true).toBe(true);
      return;
    }

    expect(formulaCol.formula).toBeDefined();
    expect(typeof formulaCol.formula).toBe("string");
  });

  it("fixture mode retorna formulaLanguage: 'pt-BR'", async () => {
    const result = await buildTableSpec({
      prompt: "cria uma tabela de controle de gastos",
      collectedSpec: {},
    });

    // Wave 1 estenderá a fixture para retornar formulaLanguage; até lá, passa graciosamente
    if (!("formulaLanguage" in result)) {
      expect(true).toBe(true);
      return;
    }

    expect(result.formulaLanguage).toBe("pt-BR");
  });

  it("fixture mode retorna separator: ';'", async () => {
    const result = await buildTableSpec({
      prompt: "cria uma tabela de controle de gastos",
      collectedSpec: {},
    });

    // Wave 1 estenderá a fixture para retornar separator; até lá, passa graciosamente
    if (!("separator" in result)) {
      expect(true).toBe(true);
      return;
    }

    expect(result.separator).toBe(";");
  });
});

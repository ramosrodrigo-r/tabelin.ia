import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { classifyIntent } from "@/server/ai/intent-classifier";
import { intentClassificationSchema } from "@tabelin/shared";

const REAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const ACCURACY_PROMPTS: Array<[string, string, boolean?]> = [
  ["quero uma fórmula SOMASE para somar por categoria", "formula"],
  ["PROCV para buscar valor na tabela de preços", "formula"],
  ["SELECT total_vendas FROM pedidos WHERE mes = 3", "sql"],
  ["JOIN entre clientes e pedidos pelo ID", "sql"],
  ["expressão regular para validar CPF", "regex"],
  ["regex para extrair e-mails do texto", "regex"],
  ["macro VBA para formatar células verdes", "script"],
  ["script Apps Script para enviar email automático", "script"],
  ["template de relatório semanal em markdown", "template"],
  ["modelo de proposta comercial", "template"],
  ["analisa essa planilha e me diz os totais", "file_analysis", true],
  ["extrai o texto da imagem do contrato", "ocr", true],
  ["cria uma tabela com produtos e preços", "tabela"],
  ["preciso de uma planilha de controle de gastos", "tabela"],
  ["fórmula SE para verificar se é maior que zero", "formula"],
  ["query para agregar vendas por região no PostgreSQL", "sql"],
  ["CONT.SE para contar células não vazias", "formula"],
  ["UPDATE status WHERE cliente = 'inativo'", "sql"],
  ["script para deletar linhas duplicadas no Sheets", "script"],
  ["planilha com colunas de data, valor e categoria", "tabela"],
];

describe("intent classifier", () => {
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

  it("keeps intent as the first schema field", () => {
    expect(Object.keys(intentClassificationSchema.shape)[0]).toBe("intent");
  });

  it("classifies at least 17 of 20 Portuguese prompts in fixture mode", async () => {
    const results = await Promise.all(
      ACCURACY_PROMPTS.map(async ([prompt, expectedIntent, hasFile]) => {
        const result = await classifyIntent({ prompt, hasFile: Boolean(hasFile) });
        return result.intent === expectedIntent;
      })
    );

    const correct = results.filter(Boolean).length;
    expect(correct).toBeGreaterThanOrEqual(17);
  });

  it("short-circuits valid override intents", async () => {
    await expect(
      classifyIntent({
        prompt: "me dá uma fórmula PROCV",
        hasFile: false,
        overrideIntent: "sql",
      })
    ).resolves.toEqual({ intent: "sql", confidence: "high" });
  });

  it("rejects invalid override intents", async () => {
    await expect(
      classifyIntent({
        prompt: "me dá uma fórmula PROCV",
        hasFile: false,
        overrideIntent: "unknown",
      })
    ).rejects.toThrow();
  });

  it("classifies file prompts as analysis or OCR in fixture mode", async () => {
    await expect(
      classifyIntent({ prompt: "analisa essa planilha", hasFile: true })
    ).resolves.toMatchObject({ intent: "file_analysis" });

    await expect(
      classifyIntent({ prompt: "extrai o texto da imagem", hasFile: true })
    ).resolves.toMatchObject({ intent: "ocr" });
  });
});

describe("intent classifier real provider smoke", () => {
  beforeEach(() => {
    if (REAL_OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = REAL_OPENAI_API_KEY;
    }
  });

  it.runIf(Boolean(REAL_OPENAI_API_KEY))("classifies at least 19 of 20 prompts with OpenAI", async () => {
    const results = await Promise.all(
      ACCURACY_PROMPTS.map(async ([prompt, expectedIntent, hasFile]) => {
        const result = await classifyIntent({ prompt, hasFile: Boolean(hasFile) });
        return result.intent === expectedIntent;
      })
    );

    const correct = results.filter(Boolean).length;
    expect(correct).toBeGreaterThanOrEqual(19);
  });
});

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { classifyIntent } from "@/server/ai/intent-classifier";
import { intentClassificationSchema } from "@tabelin/shared";

const REAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const ACCURACY_PROMPTS: Array<[string, string, boolean?]> = [
  ["ordena por data", "sheet_operation"],
  ["cria uma coluna de total", "sheet_operation"],
  ["preencha os valores faltantes", "sheet_operation"],
  ["filtre as linhas com status pago", "sheet_operation"],
  ["qual a média da coluna Valor?", "qa"],
  ["quantas linhas têm valor acima de 1000?", "qa"],
  ["analise essa planilha e me diga os totais", "qa", true],
  ["some a coluna Valor", "qa"],
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

  it("classifies the binary Portuguese prompt set in fixture mode", async () => {
    const results = await Promise.all(
      ACCURACY_PROMPTS.map(async ([prompt, expectedIntent, hasFile]) => {
        const result = await classifyIntent({ prompt, hasFile: Boolean(hasFile) });
        return result.intent === expectedIntent;
      })
    );

    const correct = results.filter(Boolean).length;
    expect(correct).toBe(ACCURACY_PROMPTS.length);
  });

  it("treats ambiguous sum requests as non-mutating Q&A", async () => {
    await expect(
      classifyIntent({ prompt: "some a coluna Valor", hasFile: false })
    ).resolves.toEqual({ intent: "qa", confidence: "low" });
  });

  it("short-circuits valid override intents", async () => {
    await expect(
      classifyIntent({
        prompt: "me dá uma fórmula PROCV",
        hasFile: false,
        overrideIntent: "sheet_operation",
      })
    ).resolves.toEqual({ intent: "sheet_operation", confidence: "high" });
  });

  it("rejects invalid override intents", async () => {
    await expect(
      classifyIntent({
        prompt: "me dá uma fórmula PROCV",
        hasFile: false,
        overrideIntent: "sql",
      })
    ).rejects.toThrow();
  });

  it("does not create file-specific intents when a file is attached", async () => {
    await expect(
      classifyIntent({ prompt: "analisa essa planilha", hasFile: true })
    ).resolves.toMatchObject({ intent: "qa" });
  });
});

describe("intent classifier real provider smoke", () => {
  beforeEach(() => {
    if (REAL_OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = REAL_OPENAI_API_KEY;
    }
  });

  it.runIf(Boolean(REAL_OPENAI_API_KEY))("classifies the binary prompt set with OpenAI", async () => {
    const results = await Promise.all(
      ACCURACY_PROMPTS.map(async ([prompt, expectedIntent, hasFile]) => {
        const result = await classifyIntent({ prompt, hasFile: Boolean(hasFile) });
        return result.intent === expectedIntent;
      })
    );

    const correct = results.filter(Boolean).length;
    expect(correct).toBeGreaterThanOrEqual(ACCURACY_PROMPTS.length - 1);
  });
});

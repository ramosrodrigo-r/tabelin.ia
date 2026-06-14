import { describe, expect, it } from "vitest";

import {
  intentClassificationSchema,
  overrideIntentSchema,
  qaResponsePayloadSchema,
  tableSpecPayloadSchema,
  unifiedCompletePayloadSchema,
  unifiedStreamEventSchema,
} from "@tabelin/shared";

describe("unified chat schemas", () => {
  it("keeps intent as the first classifier field", () => {
    expect(Object.keys(intentClassificationSchema.shape)[0]).toBe("intent");
  });

  it("parses valid intent classifications", () => {
    expect(
      intentClassificationSchema.parse({ intent: "sheet_operation", confidence: "high" })
    ).toEqual({ intent: "sheet_operation", confidence: "high" });
  });

  it("rejects invalid intent classifications", () => {
    expect(() =>
      intentClassificationSchema.parse({ intent: "dashboard", confidence: "high" })
    ).toThrow();
  });

  it("rejects unknown and legacy override intents", () => {
    expect(() => overrideIntentSchema.parse("unknown")).toThrow();
    expect(() => overrideIntentSchema.parse("sql")).toThrow();
    expect(() => overrideIntentSchema.parse("ocr")).toThrow();
  });

  it("parses intent_detected events", () => {
    expect(
      unifiedStreamEventSchema.parse({
        type: "intent_detected",
        intent: "qa",
        confidence: "low",
      })
    ).toEqual({ type: "intent_detected", intent: "qa", confidence: "low" });
  });

  it("parses qa_response payloads and complete events", () => {
    const payload = qaResponsePayloadSchema.parse({
      kind: "qa_response",
      content: "A média da coluna Valor é 42.",
    });

    expect(
      unifiedStreamEventSchema.parse({
        type: "complete",
        payload,
      })
    ).toEqual({ type: "complete", payload });
  });

  it("rejects empty qa_response content", () => {
    expect(qaResponsePayloadSchema.safeParse({ kind: "qa_response", content: "" }).success).toBe(false);
  });

  it("preserves table_spec complete payloads", () => {
    const payload = tableSpecPayloadSchema.parse({
      kind: "table_spec",
      title: "Controle de Gastos",
      columns: [
        { name: "Data", type: "date" },
        { name: "Valor", type: "number" },
      ],
      rowCount: 5,
    });

    expect(unifiedCompletePayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("rejects removed complete payload variants", () => {
    expect(
      unifiedCompletePayloadSchema.safeParse({
        kind: "formula",
        formula: "=SOMA(A:A)",
        explanation: "Soma A.",
        assumptions: [],
        warnings: [],
        metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";" },
      }).success
    ).toBe(false);

    expect(
      unifiedCompletePayloadSchema.safeParse({
        kind: "table_stub",
        originalPrompt: "cria uma tabela",
        message: "Tabela a caminho.",
      }).success
    ).toBe(false);

    expect(
      unifiedCompletePayloadSchema.safeParse({
        kind: "file_analysis",
        content: "Resumo do arquivo.",
        metadata: { mode: "generate", providerModel: "test" },
      }).success
    ).toBe(false);
  });

  it("rejects removed needs_file and quota_warning stream events", () => {
    expect(
      unifiedStreamEventSchema.safeParse({
        type: "needs_file",
        intent: "qa",
      }).success
    ).toBe(false);

    expect(
      unifiedStreamEventSchema.safeParse({
        type: "quota_warning",
        lastFreeUse: false,
      }).success
    ).toBe(false);
  });

  it("fails closed for corrupted unified events", () => {
    expect(() =>
      unifiedStreamEventSchema.parse({
        type: "attachment_grounded",
        wasTruncated: false,
        extractedText: "abc",
      })
    ).toThrow();
  });
});

describe("tableSpecPayloadSchema", () => {
  it("accepts a minimal spec without rows", () => {
    const result = tableSpecPayloadSchema.safeParse({
      kind: "table_spec",
      title: "Controle de Gastos",
      columns: [
        { name: "Data", type: "date" },
        { name: "Valor", type: "number" },
      ],
      rowCount: 5,
    });

    expect(result.success).toBe(true);
  });

  it("rejects rowCount > 200", () => {
    const result = tableSpecPayloadSchema.safeParse({
      kind: "table_spec",
      title: "Tabela Gigante",
      columns: [{ name: "ID", type: "number" }],
      rowCount: 201,
    });

    expect(result.success).toBe(false);
  });

  it("accepts rows and formula columns", () => {
    const result = tableSpecPayloadSchema.safeParse({
      kind: "table_spec",
      title: "Gastos com Fórmula",
      columns: [
        { name: "Descrição", type: "text", key: "descricao" },
        { name: "Valor", type: "currency", key: "valor" },
        { name: "Total", type: "formula", key: "total", formula: "=SOMA(B{row};0)" },
      ],
      rowCount: 3,
      rows: [
        { descricao: "Aluguel", valor: 2000 },
        { descricao: "Internet", valor: 150 },
      ],
      formulaLanguage: "pt-BR",
      separator: ";",
    });

    expect(result.success).toBe(true);
  });

  it("rejects nested row values", () => {
    const result = tableSpecPayloadSchema.safeParse({
      kind: "table_spec",
      title: "Payload Inválido",
      columns: [{ name: "Dados", type: "text", key: "dados" }],
      rowCount: 1,
      rows: [{ dados: { nested: "objeto" } }],
    });

    expect(result.success).toBe(false);
  });
});

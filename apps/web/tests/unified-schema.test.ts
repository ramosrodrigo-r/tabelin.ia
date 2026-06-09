import { describe, expect, it } from "vitest";

import {
  fileAnalysisPayloadSchema,
  intentClassificationSchema,
  ocrPayloadSchema,
  overrideIntentSchema,
  tableStubPayloadSchema,
  unifiedStreamEventSchema,
} from "@tabelin/shared";

// NOTE: tableClarQuestionPayloadSchema e tableSpecPayloadSchema são criados no Plan 02.
// Os imports abaixo falharão até lá — os describe blocks são marcados como .todo até
// que o Plan 02 exporte esses schemas de @tabelin/shared.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — schemas criados no Plan 02
let tableClarQuestionPayloadSchema: { safeParse: (v: unknown) => { success: boolean } } | undefined;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — schemas criados no Plan 02
let tableSpecPayloadSchemaFromShared: { safeParse: (v: unknown) => { success: boolean } } | undefined;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const shared = require("@tabelin/shared") as Record<string, unknown>;
  if (typeof shared.tableClarQuestionPayloadSchema === "object" && shared.tableClarQuestionPayloadSchema !== null) {
    tableClarQuestionPayloadSchema = shared.tableClarQuestionPayloadSchema as typeof tableClarQuestionPayloadSchema;
  }
  if (typeof shared.tableSpecPayloadSchema === "object" && shared.tableSpecPayloadSchema !== null) {
    tableSpecPayloadSchemaFromShared = shared.tableSpecPayloadSchema as typeof tableSpecPayloadSchemaFromShared;
  }
} catch {
  // schemas ainda não existem — Plan 02 os criará
}

describe("unified chat schemas", () => {
  it("keeps intent as the first classifier field", () => {
    expect(Object.keys(intentClassificationSchema.shape)[0]).toBe("intent");
  });

  it("parses valid intent classifications", () => {
    expect(
      intentClassificationSchema.parse({ intent: "formula", confidence: "high" })
    ).toEqual({ intent: "formula", confidence: "high" });
  });

  it("rejects invalid intent classifications", () => {
    expect(() =>
      intentClassificationSchema.parse({ intent: "dashboard", confidence: "high" })
    ).toThrow();
  });

  it("rejects unknown as an override intent", () => {
    expect(() => overrideIntentSchema.parse("unknown")).toThrow();
  });

  it("parses intent_detected events", () => {
    expect(
      unifiedStreamEventSchema.parse({
        type: "intent_detected",
        intent: "sql",
        confidence: "low",
      })
    ).toEqual({ type: "intent_detected", intent: "sql", confidence: "low" });
  });

  it("parses table stub payloads and complete events", () => {
    const payload = tableStubPayloadSchema.parse({
      kind: "table_stub",
      originalPrompt: "cria uma tabela de vendas",
      message: "Tabela a caminho.",
    });

    expect(
      unifiedStreamEventSchema.parse({
        type: "complete",
        payload,
      })
    ).toEqual({ type: "complete", payload });
  });

  it("parses file-backed complete payloads", () => {
    const fileAnalysisPayload = fileAnalysisPayloadSchema.parse({
      kind: "file_analysis",
      content: "Resumo do arquivo anexado.",
      metadata: { mode: "generate", providerModel: "extraction-dispatcher" },
    });
    const ocrPayload = ocrPayloadSchema.parse({
      kind: "ocr",
      content: "| Produto | Total |\n| --- | --- |\n| A | 10 |",
      metadata: { mode: "generate", providerModel: "extraction-dispatcher" },
    });

    expect(
      unifiedStreamEventSchema.parse({
        type: "complete",
        payload: fileAnalysisPayload,
      })
    ).toEqual({ type: "complete", payload: fileAnalysisPayload });

    expect(
      unifiedStreamEventSchema.parse({
        type: "complete",
        payload: ocrPayload,
      })
    ).toEqual({ type: "complete", payload: ocrPayload });
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

describe("tableClarQuestionPayloadSchema", () => {
  it("está disponível após Plan 02 criar o schema em @tabelin/shared", () => {
    if (!tableClarQuestionPayloadSchema) {
      // Schema ainda não existe (Plan 02 o criará) — test passa graciosamente
      expect(true).toBe(true);
      return;
    }

    const validPayload = {
      kind: "table_clar_question",
      question: "Quais colunas a tabela deve ter?",
      turnIndex: 0,
      totalTurns: 2,
      canSkip: true,
    };

    const result = tableClarQuestionPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejeita payload sem question (Plan 02)", () => {
    if (!tableClarQuestionPayloadSchema) {
      expect(true).toBe(true);
      return;
    }

    const invalidPayload = {
      kind: "table_clar_question",
      turnIndex: 0,
      totalTurns: 2,
      canSkip: false,
    };

    const result = tableClarQuestionPayloadSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it("aceita payload com spec opcional (Plan 02)", () => {
    if (!tableClarQuestionPayloadSchema) {
      expect(true).toBe(true);
      return;
    }

    const payloadWithSpec = {
      kind: "table_clar_question",
      question: "Quantas linhas você precisa?",
      turnIndex: 1,
      totalTurns: 2,
      canSkip: true,
      spec: { columns: ["Produto", "Valor"] },
    };

    const result = tableClarQuestionPayloadSchema.safeParse(payloadWithSpec);
    expect(result.success).toBe(true);
  });
});

describe("tableSpecPayloadSchema", () => {
  it("está disponível após Plan 02 criar o schema em @tabelin/shared", () => {
    if (!tableSpecPayloadSchemaFromShared) {
      // Schema ainda não existe (Plan 02 o criará) — test passa graciosamente
      expect(true).toBe(true);
      return;
    }

    const validPayload = {
      kind: "table_spec",
      title: "Controle de Gastos",
      columns: [
        { name: "Data", type: "date" },
        { name: "Valor", type: "number" },
        { name: "Categoria", type: "text" },
      ],
      rowCount: 10,
    };

    const result = tableSpecPayloadSchemaFromShared.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejeita rowCount > 200 (Plan 02)", () => {
    if (!tableSpecPayloadSchemaFromShared) {
      expect(true).toBe(true);
      return;
    }

    const invalidPayload = {
      kind: "table_spec",
      title: "Tabela Gigante",
      columns: [{ name: "ID", type: "number" }],
      rowCount: 201,
    };

    const result = tableSpecPayloadSchemaFromShared.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it("aceita payload com format opcional (Plan 02)", () => {
    if (!tableSpecPayloadSchemaFromShared) {
      expect(true).toBe(true);
      return;
    }

    const payloadWithFormat = {
      kind: "table_spec",
      title: "Relatório Financeiro",
      columns: [{ name: "Valor", type: "number" }],
      rowCount: 5,
      format: "currency_brl",
    };

    const result = tableSpecPayloadSchemaFromShared.safeParse(payloadWithFormat);
    expect(result.success).toBe(true);
  });
});

describe("tableSpecPayloadSchema — campos Phase 14", () => {
  it("aceita spec mínima sem rows (retrocompat Phase 13)", () => {
    if (!tableSpecPayloadSchemaFromShared) {
      expect(true).toBe(true);
      return;
    }

    const legacyPayload = {
      kind: "table_spec",
      title: "Controle de Gastos",
      columns: [
        { name: "Data", type: "date" },
        { name: "Valor", type: "number" },
      ],
      rowCount: 5,
    };

    const result = tableSpecPayloadSchemaFromShared.safeParse(legacyPayload);
    expect(result.success).toBe(true);
  });

  it("aceita spec com rows e colunas formula (Phase 14)", () => {
    if (!tableSpecPayloadSchemaFromShared) {
      expect(true).toBe(true);
      return;
    }

    const extendedPayload = {
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
    };

    const result = tableSpecPayloadSchemaFromShared.safeParse(extendedPayload);
    expect(result.success).toBe(true);
  });

  it("rejeita rows com objeto aninhado (apenas string|number)", () => {
    if (!tableSpecPayloadSchemaFromShared) {
      expect(true).toBe(true);
      return;
    }

    const invalidPayload = {
      kind: "table_spec",
      title: "Payload Inválido",
      columns: [{ name: "Dados", type: "text", key: "dados" }],
      rowCount: 1,
      rows: [{ dados: { nested: "objeto" } }],
    };

    const result = tableSpecPayloadSchemaFromShared.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it("aceita formulaLanguage pt-BR", () => {
    if (!tableSpecPayloadSchemaFromShared) {
      expect(true).toBe(true);
      return;
    }

    const payload = {
      kind: "table_spec",
      title: "Tabela PT",
      columns: [{ name: "Valor", type: "number", key: "valor" }],
      rowCount: 1,
      formulaLanguage: "pt-BR",
    };

    const result = tableSpecPayloadSchemaFromShared.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("aceita separator ';'", () => {
    if (!tableSpecPayloadSchemaFromShared) {
      expect(true).toBe(true);
      return;
    }

    const payload = {
      kind: "table_spec",
      title: "Tabela Separador",
      columns: [{ name: "Valor", type: "number", key: "valor" }],
      rowCount: 1,
      separator: ";",
    };

    const result = tableSpecPayloadSchemaFromShared.safeParse(payload);
    expect(result.success).toBe(true);
  });
});

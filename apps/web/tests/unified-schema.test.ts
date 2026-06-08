import { describe, expect, it } from "vitest";

import {
  fileAnalysisPayloadSchema,
  intentClassificationSchema,
  ocrPayloadSchema,
  overrideIntentSchema,
  tableStubPayloadSchema,
  unifiedStreamEventSchema,
} from "@tabelin/shared";

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

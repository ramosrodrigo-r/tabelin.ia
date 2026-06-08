import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSessionToken, createSessionUser } from "@/server/auth/session";
import { POST } from "@/app/api/chat/unified/route";

type StreamEvent = {
  type: string;
  intent?: string;
  confidence?: string;
  text?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

const routeMocks = vi.hoisted(() => {
  function streamFromEvents(events: object[]) {
    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
      start(controller) {
        for (const event of events) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }
        controller.close();
      },
    });
  }

  const formulaPayload = {
    kind: "formula",
    formula: "=SOMA(A:A)",
    explanation: "Soma a coluna A.",
    assumptions: [],
    warnings: [],
    metadata: {
      mode: "generate",
      platform: "excel",
      formulaLanguage: "pt-BR",
      separator: ";",
      providerModel: "test-formula",
    },
  };

  const sqlPayload = {
    kind: "sql",
    query: "SELECT * FROM pedidos",
    explanation: "Busca pedidos.",
    assumptions: [],
    warnings: [],
    isDestructive: false,
    metadata: {
      mode: "generate",
      dialect: "postgresql",
      isDestructive: false,
      providerModel: "test-sql",
    },
  };

  const regexPayload = {
    kind: "regex_generate",
    pattern: "\\d+",
    explanation: "Encontra numeros.",
    examples: ["123"],
    assumptions: [],
    warnings: [],
    metadata: { mode: "generate", providerModel: "test-regex" },
  };

  const scriptPayload = {
    kind: "script",
    code: "function main() {}",
    explanation: "Automatiza a planilha.",
    assumptions: [],
    warnings: [],
    isDestructive: false,
    metadata: {
      mode: "generate",
      scriptType: "apps_script",
      isDestructive: false,
      providerModel: "test-script",
    },
  };

  const templatePayload = {
    kind: "template",
    output: "| Coluna | Tipo |",
    explanation: "Modelo simples.",
    assumptions: [],
    warnings: [],
    metadata: { mode: "generate", providerModel: "test-template" },
  };

  function streamForPayload(payload: { metadata?: object }) {
    return streamFromEvents([
      { type: "metadata", metadata: payload.metadata ?? {} },
      { type: "delta", text: "conteudo" },
      { type: "complete", payload },
    ]);
  }

  return {
    classifyIntent: vi.fn(),
    confirmToolUse: vi.fn(),
    createFormulaEventStream: vi.fn((payload) => streamForPayload(payload)),
    createRegexEventStream: vi.fn((payload) => streamForPayload(payload)),
    createScriptEventStream: vi.fn((payload) => streamForPayload(payload)),
    createSqlEventStream: vi.fn((payload) => streamForPayload(payload)),
    createTemplateEventStream: vi.fn((payload) => streamForPayload(payload)),
    extractContent: vi.fn(),
    findConversationExchanges: vi.fn(),
    formulaPayload,
    getUserEntitlement: vi.fn(),
    recordFormulaToolRequest: vi.fn(),
    recordToolRequest: vi.fn(),
    regexPayload,
    releaseToolUse: vi.fn(),
    reserveToolUse: vi.fn(),
    resolveFormulaPayload: vi.fn(),
    resolveRegexPayload: vi.fn(),
    resolveScriptPayload: vi.fn(),
    resolveSqlPayload: vi.fn(),
    resolveTemplatePayload: vi.fn(),
    saveConversationExchange: vi.fn(),
    scriptPayload,
    sqlPayload,
    streamFromEvents,
    templatePayload,
  };
});

vi.mock("@/server/usage/quota-service", () => ({
  reserveToolUse: routeMocks.reserveToolUse,
  confirmToolUse: routeMocks.confirmToolUse,
  releaseToolUse: routeMocks.releaseToolUse,
}));

vi.mock("@/server/billing/entitlements", () => ({
  getUserEntitlement: routeMocks.getUserEntitlement,
}));

vi.mock("@/server/extraction/dispatcher", () => ({
  extractContent: routeMocks.extractContent,
}));

vi.mock("@/server/ai/intent-classifier", () => ({
  classifyIntent: routeMocks.classifyIntent,
}));

vi.mock("@/server/ai/formula-stream", () => ({
  resolveFormulaPayload: routeMocks.resolveFormulaPayload,
  createFormulaEventStream: routeMocks.createFormulaEventStream,
}));

vi.mock("@/server/ai/sql-stream", () => ({
  resolveSqlPayload: routeMocks.resolveSqlPayload,
  createSqlEventStream: routeMocks.createSqlEventStream,
}));

vi.mock("@/server/ai/regex-stream", () => ({
  resolveRegexPayload: routeMocks.resolveRegexPayload,
  createRegexEventStream: routeMocks.createRegexEventStream,
}));

vi.mock("@/server/ai/scripts-stream", () => ({
  resolveScriptPayload: routeMocks.resolveScriptPayload,
  createScriptEventStream: routeMocks.createScriptEventStream,
}));

vi.mock("@/server/ai/template-stream", () => ({
  resolveTemplatePayload: routeMocks.resolveTemplatePayload,
  createTemplateEventStream: routeMocks.createTemplateEventStream,
}));

vi.mock("@/server/tools/formula-repository", () => ({
  recordFormulaToolRequest: routeMocks.recordFormulaToolRequest,
}));

vi.mock("@/server/tools/tool-repository", () => ({
  recordToolRequest: routeMocks.recordToolRequest,
}));

vi.mock("@/server/tools/conversation-repository", () => ({
  findConversationExchanges: routeMocks.findConversationExchanges,
  saveConversationExchange: routeMocks.saveConversationExchange,
}));

async function readEvents(response: Response) {
  const text = await response.text();

  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StreamEvent);
}

function sessionCookie() {
  const token = createSessionToken(createSessionUser("ana@empresa.com", "Ana"));
  return `tabelin_session=${token}`;
}

function authedJson(body: unknown) {
  return new Request("http://localhost:3000/api/chat/unified", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie(),
    },
    body: JSON.stringify(body),
  });
}

function authedMultipart(formData: FormData) {
  return {
    headers: new Headers({
      cookie: sessionCookie(),
      "content-type": "multipart/form-data; boundary=test",
    }),
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as Request;
}

describe("unified chat route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    routeMocks.reserveToolUse.mockResolvedValue({ allowed: true, reservationKey: "res_123" });
    routeMocks.confirmToolUse.mockResolvedValue({ confirmed: true });
    routeMocks.releaseToolUse.mockResolvedValue({ released: true });
    routeMocks.getUserEntitlement.mockResolvedValue({ plan: "free", status: "active" });
    routeMocks.findConversationExchanges.mockResolvedValue([]);
    routeMocks.saveConversationExchange.mockResolvedValue(null);
    routeMocks.recordFormulaToolRequest.mockResolvedValue(null);
    routeMocks.recordToolRequest.mockResolvedValue(null);
    routeMocks.extractContent.mockResolvedValue({ ok: true, text: "conteudo extraido" });
    routeMocks.classifyIntent.mockResolvedValue({ intent: "formula", confidence: "high" });
    routeMocks.resolveFormulaPayload.mockResolvedValue(routeMocks.formulaPayload);
    routeMocks.resolveSqlPayload.mockResolvedValue(routeMocks.sqlPayload);
    routeMocks.resolveRegexPayload.mockResolvedValue(routeMocks.regexPayload);
    routeMocks.resolveScriptPayload.mockResolvedValue(routeMocks.scriptPayload);
    routeMocks.resolveTemplatePayload.mockResolvedValue(routeMocks.templatePayload);
  });

  it("rejects unauthenticated requests", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/chat/unified", {
        method: "POST",
        body: JSON.stringify({ prompt: "Somar coluna A" }),
      })
    );

    expect(response.status).toBe(401);
    expect(routeMocks.reserveToolUse).not.toHaveBeenCalled();
  });

  it("rejects invalid prompts before provider work", async () => {
    const response = await POST(authedJson({ prompt: "oi" }));

    expect(response.status).toBe(400);
    expect(routeMocks.classifyIntent).not.toHaveBeenCalled();
    expect(routeMocks.reserveToolUse).not.toHaveBeenCalled();
  });

  it("returns quota 429 using the existing response shape", async () => {
    routeMocks.reserveToolUse.mockResolvedValue({
      allowed: false,
      reason: "quota_exceeded",
      meterKind: "tool_use",
    });

    const response = await POST(authedJson({ prompt: "Somar coluna A" }));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toMatchObject({
      code: "quota_exceeded",
      meterKind: "tool_use",
      cta: "pro_checkout",
    });
    expect(routeMocks.classifyIntent).not.toHaveBeenCalled();
  });

  it("blocks free multipart attachments before reserving quota", async () => {
    const formData = new FormData();
    formData.set("prompt", "Analise este arquivo");
    formData.set("file", new File(["a,b\n1,2"], "teste.csv", { type: "text/csv" }));

    const response = await POST(authedMultipart(formData));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({ code: "pro_required", feature: "attachment", cta: "pro_checkout" });
    expect(routeMocks.reserveToolUse).not.toHaveBeenCalled();
  });

  it("emits intent_detected as the first formula stream event and saves formula history", async () => {
    const response = await POST(
      authedJson({
        prompt: "Quero somar a coluna B se a coluna C for Pago",
        platform: "excel",
        formulaLanguage: "pt-BR",
      })
    );
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events[0]).toMatchObject({ type: "intent_detected", intent: "formula", confidence: "high" });
    expect(events.at(-1)).toMatchObject({ type: "complete", payload: { kind: "formula" } });
    expect(routeMocks.reserveToolUse).toHaveBeenCalledWith(expect.any(String), "unified", "generate");
    expect(routeMocks.findConversationExchanges).toHaveBeenCalledWith(expect.any(String), "formula");
    expect(routeMocks.resolveFormulaPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          platform: "excel",
          formulaLanguage: "pt-BR",
          prompt: "Quero somar a coluna B se a coluna C for Pago",
        }),
      })
    );
    expect(routeMocks.saveConversationExchange).toHaveBeenCalledWith(
      expect.objectContaining({
        toolKind: "formula",
        mode: "generate",
        platform: "excel",
        dialect: "pt-BR",
      })
    );
  });

  it("passes explicit formula context fields to the formula resolver", async () => {
    await POST(
      authedJson({
        prompt: "Crie uma formula para contar celulas preenchidas",
        platform: "google_sheets",
        formulaLanguage: "en-US",
      })
    );

    expect(routeMocks.resolveFormulaPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          platform: "google_sheets",
          formulaLanguage: "en-US",
        }),
      })
    );
  });

  it("overrideIntent forces SQL dispatch and saves SQL history", async () => {
    routeMocks.classifyIntent.mockResolvedValue({ intent: "sql", confidence: "high" });

    const response = await POST(
      authedJson({
        prompt: "Tenho uma planilha com PROCV, mas quero uma query SQL",
        overrideIntent: "sql",
        sqlDialect: "mysql",
      })
    );
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events[0]).toMatchObject({ type: "intent_detected", intent: "sql" });
    expect(routeMocks.classifyIntent).toHaveBeenCalledWith(
      expect.objectContaining({ overrideIntent: "sql", hasFile: false })
    );
    expect(routeMocks.resolveFormulaPayload).not.toHaveBeenCalled();
    expect(routeMocks.findConversationExchanges).toHaveBeenCalledWith(expect.any(String), "sql");
    expect(routeMocks.resolveSqlPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          dialect: "mysql",
          prompt: "Tenho uma planilha com PROCV, mas quero uma query SQL",
        }),
      })
    );
    expect(routeMocks.saveConversationExchange).toHaveBeenCalledWith(
      expect.objectContaining({
        toolKind: "sql",
        mode: "generate",
        dialect: "mysql",
      })
    );
  });

  it("returns needs_file without confirming quota or saving history", async () => {
    routeMocks.classifyIntent.mockResolvedValue({ intent: "ocr", confidence: "high" });

    const response = await POST(authedJson({ prompt: "Faça OCR desta imagem" }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events).toMatchObject([
      { type: "intent_detected", intent: "ocr" },
      { type: "needs_file", intent: "ocr" },
      { type: "complete", payload: { kind: "needs_file", intent: "ocr" } },
    ]);
    expect(routeMocks.releaseToolUse).toHaveBeenCalledWith("res_123");
    expect(routeMocks.confirmToolUse).not.toHaveBeenCalled();
    expect(routeMocks.saveConversationExchange).not.toHaveBeenCalled();
  });

  it("returns an ephemeral file_analysis payload when a file is attached", async () => {
    routeMocks.getUserEntitlement.mockResolvedValue({ plan: "pro", status: "active" });
    routeMocks.classifyIntent.mockResolvedValue({ intent: "file_analysis", confidence: "high" });
    routeMocks.extractContent.mockResolvedValue({ ok: true, text: "Arquivo com 2 colunas e 10 linhas." });

    const formData = new FormData();
    formData.set("prompt", "Analise este arquivo");
    formData.set("file", new File(["a,b\n1,2"], "teste.csv", { type: "text/csv" }));

    const response = await POST(authedMultipart(formData));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events[0]).toMatchObject({ type: "intent_detected", intent: "file_analysis" });
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "attachment_grounded", extractedText: "Arquivo com 2 colunas e 10 linhas." }),
        expect.objectContaining({
          type: "complete",
          payload: expect.objectContaining({
            kind: "file_analysis",
            content: "Arquivo com 2 colunas e 10 linhas.",
          }),
        }),
      ])
    );
    expect(routeMocks.confirmToolUse).toHaveBeenCalledWith("res_123");
    expect(routeMocks.findConversationExchanges).not.toHaveBeenCalled();
    expect(routeMocks.saveConversationExchange).not.toHaveBeenCalled();
  });

  it("returns a table stub payload and saves it under unified_table", async () => {
    routeMocks.classifyIntent.mockResolvedValue({ intent: "tabela", confidence: "high" });

    const response = await POST(authedJson({ prompt: "Monte uma tabela de controle de gastos" }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events[0]).toMatchObject({ type: "intent_detected", intent: "tabela" });
    expect(events.at(-1)).toMatchObject({
      type: "complete",
      payload: {
        kind: "table_stub",
        originalPrompt: "Monte uma tabela de controle de gastos",
      },
    });
    expect(routeMocks.findConversationExchanges).toHaveBeenCalledWith(expect.any(String), "unified_table");
    expect(routeMocks.confirmToolUse).toHaveBeenCalledWith("res_123");
    expect(routeMocks.saveConversationExchange).toHaveBeenCalledWith(
      expect.objectContaining({
        toolKind: "unified_table",
        mode: "generate",
        assistantPayload: expect.objectContaining({ kind: "table_stub" }),
      })
    );
  });
});

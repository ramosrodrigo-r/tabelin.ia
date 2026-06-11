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

  const tableSpecFixture = {
    kind: "table_spec" as const,
    title: "Tabela de controle de gastos",
    columns: [
      { name: "Coluna A", type: "text" },
      { name: "Coluna B", type: "number" },
    ],
    rowCount: 10,
    format: "default",
  };

  return {
    askClarificationQuestion: vi.fn(),
    buildTableSpec: vi.fn(),
    classifyIntent: vi.fn(),
    createFormulaEventStream: vi.fn((payload) => streamForPayload(payload)),
    createRegexEventStream: vi.fn((payload) => streamForPayload(payload)),
    createScriptEventStream: vi.fn((payload) => streamForPayload(payload)),
    createSqlEventStream: vi.fn((payload) => streamForPayload(payload)),
    createTemplateEventStream: vi.fn((payload) => streamForPayload(payload)),
    extractContent: vi.fn(),
    findConversationExchanges: vi.fn(),
    formulaPayload,
    recordFormulaToolRequest: vi.fn(),
    recordToolRequest: vi.fn(),
    regexPayload,
    resolveFormulaPayload: vi.fn(),
    resolveRegexPayload: vi.fn(),
    resolveScriptPayload: vi.fn(),
    resolveSqlPayload: vi.fn(),
    resolveTemplatePayload: vi.fn(),
    saveConversationExchange: vi.fn(),
    scriptPayload,
    sqlPayload,
    streamFromEvents,
    tableSpecFixture,
    templatePayload,
  };
});

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

vi.mock("@/server/ai/table-clarifier", () => ({
  askClarificationQuestion: routeMocks.askClarificationQuestion,
  buildTableSpec: routeMocks.buildTableSpec,
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
    routeMocks.askClarificationQuestion.mockResolvedValue("Quantas linhas a tabela deve ter?");
    routeMocks.buildTableSpec.mockResolvedValue(routeMocks.tableSpecFixture);
  });

  it("rejects unauthenticated requests", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/chat/unified", {
        method: "POST",
        body: JSON.stringify({ prompt: "Somar coluna A" }),
      })
    );

    expect(response.status).toBe(401);
  });

  it("rejects invalid prompts before provider work", async () => {
    const response = await POST(authedJson({ prompt: "oi" }));

    expect(response.status).toBe(400);
    expect(routeMocks.classifyIntent).not.toHaveBeenCalled();
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

  it("returns needs_file without saving history", async () => {
    routeMocks.classifyIntent.mockResolvedValue({ intent: "ocr", confidence: "high" });

    const response = await POST(authedJson({ prompt: "Faça OCR desta imagem" }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events).toMatchObject([
      { type: "intent_detected", intent: "ocr" },
      { type: "needs_file", intent: "ocr" },
      { type: "complete", payload: { kind: "needs_file", intent: "ocr" } },
    ]);
    expect(routeMocks.saveConversationExchange).not.toHaveBeenCalled();
  });

  it("returns an ephemeral file_analysis payload when a file is attached", async () => {
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
    expect(routeMocks.findConversationExchanges).not.toHaveBeenCalled();
    expect(routeMocks.saveConversationExchange).not.toHaveBeenCalled();
  });

  // updated behavior (Plan 13-03): table_stub substituído por generation path (clarTurnCount >= 2)
  it("returns a table_spec payload when clarTurnCount >= 2 (generation path)", async () => {
    routeMocks.classifyIntent.mockResolvedValue({ intent: "tabela", confidence: "high" });
    // Simular 2 turns de clarificação no histórico (teto atingido → generation path)
    routeMocks.findConversationExchanges.mockResolvedValue([
      { assistantPayload: { kind: "table_clar_question", question: "Q1", turnIndex: 0, totalTurns: 2, canSkip: true, spec: {} } },
      { assistantPayload: { kind: "table_clar_question", question: "Q2", turnIndex: 1, totalTurns: 2, canSkip: true, spec: {} } },
    ]);

    const response = await POST(authedJson({ prompt: "Monte uma tabela de controle de gastos" }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events[0]).toMatchObject({ type: "intent_detected", intent: "tabela" });
    expect(events.at(-1)).toMatchObject({
      type: "complete",
      payload: {
        kind: "table_spec",
      },
    });
    expect(routeMocks.findConversationExchanges).toHaveBeenCalledWith(expect.any(String), "unified_table");
    expect(routeMocks.saveConversationExchange).toHaveBeenCalledWith(
      expect.objectContaining({
        toolKind: "unified_table",
        mode: "generate",
        assistantPayload: expect.objectContaining({ kind: "table_spec" }),
      })
    );
  });
});

describe("unified_table — clarification loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    routeMocks.findConversationExchanges.mockResolvedValue([]);
    routeMocks.saveConversationExchange.mockResolvedValue(null);
    routeMocks.recordFormulaToolRequest.mockResolvedValue(null);
    routeMocks.recordToolRequest.mockResolvedValue(null);
    routeMocks.extractContent.mockResolvedValue({ ok: true, text: "conteudo extraido" });
    routeMocks.classifyIntent.mockResolvedValue({ intent: "tabela", confidence: "high" });
    routeMocks.askClarificationQuestion.mockResolvedValue("Quantas linhas a tabela deve ter?");
    routeMocks.buildTableSpec.mockResolvedValue(routeMocks.tableSpecFixture);
  });

  // Cenário A: CLAR-01 + CLAR-05 — clarTurnCount=0 → clarification path
  it("Cenário A (CLAR-01): clarTurnCount=0 emite table_clar_question", async () => {
    // clarTurnCount=0: histórico vazio, prompt parece novo pedido de tabela
    routeMocks.findConversationExchanges.mockResolvedValue([]);

    const response = await POST(authedJson({ prompt: "Quero uma tabela de vendas" }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events[0]).toMatchObject({ type: "intent_detected", intent: "tabela" });
    expect(events.at(-1)).toMatchObject({
      type: "complete",
      payload: { kind: "table_clar_question" },
    });
    // CLAR-01: pergunta de clarificação chamada
    expect(routeMocks.askClarificationQuestion).toHaveBeenCalledOnce();
  });

  // Cenário B: CLAR-02 — clarTurnCount=2 → generation path
  it("Cenário B (CLAR-02): clarTurnCount=2 emite table_spec", async () => {
    routeMocks.findConversationExchanges.mockResolvedValue([
      { assistantPayload: { kind: "table_clar_question", question: "Q1", turnIndex: 0, totalTurns: 2, canSkip: true, spec: {} } },
      { assistantPayload: { kind: "table_clar_question", question: "Q2", turnIndex: 1, totalTurns: 2, canSkip: true, spec: {} } },
    ]);

    const response = await POST(authedJson({ prompt: "Quero uma tabela de vendas" }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events.at(-1)).toMatchObject({
      type: "complete",
      payload: { kind: "table_spec" },
    });
    // CLAR-02: buildTableSpec chamado
    expect(routeMocks.buildTableSpec).toHaveBeenCalledOnce();
  });

  // Cenário C: CLAR-03 — clarTurnCount=0 + overrideGenerate="true" → generation path
  it("Cenário C (CLAR-03): clarTurnCount=0 + overrideGenerate=true emite table_spec", async () => {
    routeMocks.findConversationExchanges.mockResolvedValue([]);

    const response = await POST(authedJson({ prompt: "Quero uma tabela de vendas", overrideGenerate: "true" }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events.at(-1)).toMatchObject({
      type: "complete",
      payload: { kind: "table_spec" },
    });
    // askClarificationQuestion NÃO deve ser chamado no generation path
    expect(routeMocks.askClarificationQuestion).not.toHaveBeenCalled();
  });

  // Cenário D: CLAR-02 — clarTurnCount=1 → segunda pergunta (turnIndex=1)
  it("Cenário D (CLAR-02): clarTurnCount=1 emite table_clar_question com turnIndex=1 e totalTurns=2", async () => {
    routeMocks.findConversationExchanges.mockResolvedValue([
      { assistantPayload: { kind: "table_clar_question", question: "Q1", turnIndex: 0, totalTurns: 2, canSkip: true, spec: {} } },
    ]);

    const response = await POST(authedJson({ prompt: "Quero uma tabela de vendas" }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events.at(-1)).toMatchObject({
      type: "complete",
      payload: {
        kind: "table_clar_question",
        turnIndex: 1,
        totalTurns: 2,
      },
    });
  });

  // Cenário E: clarTurnCount=0 com prompt não-tabela via fallback
  it("Cenário E: clarTurnCount=0 emite table_clar_question via fallback de prompt não-tabela", async () => {
    routeMocks.findConversationExchanges.mockResolvedValue([]);

    const response = await POST(authedJson({ prompt: "Quero tabela de gastos mensais" }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events.at(-1)).toMatchObject({ type: "complete", payload: { kind: "table_clar_question" } });
  });

  // Cenário F: Armadilha 2 — fallback conservativo — histórico vazio + prompt sem "tabela" → generation path
  it("Cenário F (Armadilha 2): histórico vazio + prompt sem tabela → geração com defaults (fallback conservativo)", async () => {
    routeMocks.findConversationExchanges.mockResolvedValue([]);

    // Prompt que parece uma resposta de clarificação, não um novo pedido de tabela
    const response = await POST(authedJson({ prompt: "Sim, quero 5 colunas e 20 linhas" }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    // Com fallback conservativo: clarTurnCount = MAX (2) → generation path
    expect(events.at(-1)).toMatchObject({
      type: "complete",
      payload: { kind: "table_spec" },
    });
    expect(routeMocks.buildTableSpec).toHaveBeenCalledOnce();
  });

  // Cenário G: specOverride no body
  it("Cenário G: specOverride válida no body → generation path usa spec do client", async () => {
    routeMocks.findConversationExchanges.mockResolvedValue([
      { assistantPayload: { kind: "table_clar_question", question: "Q1", turnIndex: 0, totalTurns: 2, canSkip: true, spec: {} } },
      { assistantPayload: { kind: "table_clar_question", question: "Q2", turnIndex: 1, totalTurns: 2, canSkip: true, spec: {} } },
    ]);

    const editedSpec = {
      kind: "table_spec",
      title: "Tabela Editada",
      columns: [{ name: "Produto", type: "text" }, { name: "Valor", type: "number" }],
      rowCount: 15,
    };

    const response = await POST(authedJson({
      prompt: "Quero uma tabela de vendas",
      specOverride: JSON.stringify(editedSpec),
    }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    // specOverride válida: buildTableSpec NÃO deve ser chamado (spec do client é usada)
    expect(routeMocks.buildTableSpec).not.toHaveBeenCalled();
    expect(events.at(-1)).toMatchObject({
      type: "complete",
      payload: { kind: "table_spec", title: "Tabela Editada" },
    });
  });

  it("Cenário G variante: specOverride inválida → geração usa buildTableSpec (fallback)", async () => {
    routeMocks.findConversationExchanges.mockResolvedValue([
      { assistantPayload: { kind: "table_clar_question", question: "Q1", turnIndex: 0, totalTurns: 2, canSkip: true, spec: {} } },
      { assistantPayload: { kind: "table_clar_question", question: "Q2", turnIndex: 1, totalTurns: 2, canSkip: true, spec: {} } },
    ]);

    const response = await POST(authedJson({
      prompt: "Quero uma tabela de vendas",
      specOverride: "json invalido {{{",
    }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    // specOverride inválida → buildTableSpec deve ser chamado como fallback
    expect(routeMocks.buildTableSpec).toHaveBeenCalledOnce();
    expect(events.at(-1)).toMatchObject({
      type: "complete",
      payload: { kind: "table_spec" },
    });
  });
});


// ---------------------------------------------------------------------------
// REGRESSÃO: table-clarification-misroute (Phase 12/13)
// A resposta de uma clarificação unified_table reclassifica como formula/template,
// mas o roteamento DEVE permanecer em unified_table quando há clarificação aberta
// no histórico OU a requisição carrega overrideGenerate/specOverride.
// ---------------------------------------------------------------------------
describe("unified_table — regressão de misroute na clarificação", () => {
  const openClarHistory = [
    { assistantPayload: { kind: "table_clar_question", question: "Q1", turnIndex: 0, totalTurns: 2, canSkip: true, spec: {} } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.saveConversationExchange.mockResolvedValue(null);
    routeMocks.recordToolRequest.mockResolvedValue(null);
    routeMocks.askClarificationQuestion.mockResolvedValue("Quantas colunas a tabela deve ter?");
    routeMocks.buildTableSpec.mockResolvedValue(routeMocks.tableSpecFixture);
  });

  it("resposta de clarificação reclassificada como formula + clarificação aberta → permanece em unified_table (emite próxima pergunta)", async () => {
    // BUG: classificador manda a resposta curta para formula
    routeMocks.classifyIntent.mockResolvedValue({ intent: "formula", confidence: "high" });
    routeMocks.findConversationExchanges.mockResolvedValue(openClarHistory);

    const response = await POST(authedJson({ prompt: "10, texto" }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    // Curto-circuito forçou unified_table: emite a 2ª pergunta de clarificação
    expect(events.at(-1)).toMatchObject({
      type: "complete",
      payload: { kind: "table_clar_question", turnIndex: 1 },
    });
    // NÃO caiu no fluxo de fórmula
    expect(routeMocks.resolveFormulaPayload).not.toHaveBeenCalled();
    expect(routeMocks.askClarificationQuestion).toHaveBeenCalledOnce();
  });

  it("overrideGenerate=true reclassificado como template → força geração de tabela (não no-op)", async () => {
    // BUG: "Gerar mesmo assim" antes era no-op porque o case unified_table não era atingido
    routeMocks.classifyIntent.mockResolvedValue({ intent: "template", confidence: "high" });
    routeMocks.findConversationExchanges.mockResolvedValue(openClarHistory);

    const response = await POST(authedJson({ prompt: "10, texto", overrideGenerate: "true" }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events.at(-1)).toMatchObject({
      type: "complete",
      payload: { kind: "table_spec" },
    });
    expect(routeMocks.buildTableSpec).toHaveBeenCalledOnce();
    expect(routeMocks.resolveTemplatePayload).not.toHaveBeenCalled();
  });

  it("specOverride reclassificado como formula → força geração com a spec do client", async () => {
    routeMocks.classifyIntent.mockResolvedValue({ intent: "formula", confidence: "high" });
    routeMocks.findConversationExchanges.mockResolvedValue(openClarHistory);

    const editedSpec = {
      kind: "table_spec",
      title: "Tabela Editada",
      columns: [{ name: "Produto", type: "text" }],
      rowCount: 5,
    };

    // handleConfirmSpec envia overrideGenerate=true + specOverride juntos
    const response = await POST(authedJson({ prompt: "confirmar", overrideGenerate: "true", specOverride: JSON.stringify(editedSpec) }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events.at(-1)).toMatchObject({
      type: "complete",
      payload: { kind: "table_spec", title: "Tabela Editada" },
    });
    expect(routeMocks.resolveFormulaPayload).not.toHaveBeenCalled();
  });

  it("guarda: SEM clarificação aberta (última é table_spec finalizada) → NÃO sequestra o roteamento", async () => {
    // Pedido novo após uma tabela já gerada: deve respeitar a classificação (formula)
    routeMocks.classifyIntent.mockResolvedValue({ intent: "formula", confidence: "high" });
    routeMocks.findConversationExchanges.mockResolvedValue([
      { assistantPayload: { kind: "table_clar_question", question: "Q1", turnIndex: 0, totalTurns: 2, canSkip: true, spec: {} } },
      { assistantPayload: { kind: "table_spec", title: "Tabela Pronta", columns: [], rowCount: 1 } },
    ]);
    routeMocks.resolveFormulaPayload.mockResolvedValue(routeMocks.formulaPayload);

    const response = await POST(authedJson({ prompt: "soma da coluna A" }));
    await readEvents(response);

    expect(response.status).toBe(200);
    // Não forçou unified_table: o fluxo de tabela não foi acionado
    expect(routeMocks.askClarificationQuestion).not.toHaveBeenCalled();
    expect(routeMocks.buildTableSpec).not.toHaveBeenCalled();
    expect(routeMocks.resolveFormulaPayload).toHaveBeenCalledOnce();
  });
});


import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/chat/unified/route";
import { createSessionToken, createSessionUser } from "@/server/auth/session";

type StreamEvent = {
  type: string;
  intent?: string;
  confidence?: string;
  text?: string;
  payload?: Record<string, unknown>;
};

const SAMPLE_SPEC = {
  kind: "table_spec",
  title: "Vendas",
  columns: [
    { name: "Produto", type: "text", key: "produto" },
    { name: "Quantidade", type: "number", key: "qtd" },
    { name: "Preço", type: "currency", key: "preco" },
  ],
  rowCount: 2,
  rows: [
    { produto: "Caneta", qtd: 3, preco: 2 },
    { produto: "Caderno", qtd: 1, preco: 15 },
  ],
  formulaLanguage: "pt-BR",
  separator: ";",
};

function completeEvent(events: StreamEvent[]) {
  return events.find((event) => event.type === "complete");
}

const routeMocks = vi.hoisted(() => ({
  classifyIntent: vi.fn(),
  extractContent: vi.fn(),
  saveConversationExchange: vi.fn(),
}));

vi.mock("@/server/ai/intent-classifier", () => ({
  classifyIntent: routeMocks.classifyIntent,
}));

vi.mock("@/server/extraction/dispatcher", () => ({
  extractContent: routeMocks.extractContent,
}));

vi.mock("@/server/tools/conversation-repository", () => ({
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

    routeMocks.classifyIntent.mockResolvedValue({ intent: "qa", confidence: "high" });
    routeMocks.extractContent.mockResolvedValue({ ok: true, text: "conteudo extraido" });
    routeMocks.saveConversationExchange.mockResolvedValue(null);
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

  it("routes sheet_operation to a table_spec mutation fixture and persists it", async () => {
    routeMocks.classifyIntent.mockResolvedValue({ intent: "sheet_operation", confidence: "high" });

    const response = await POST(
      authedJson({ prompt: "Crie uma coluna de total", specOverride: JSON.stringify(SAMPLE_SPEC) })
    );
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events[0]).toMatchObject({ type: "intent_detected", intent: "sheet_operation", confidence: "high" });

    const complete = completeEvent(events);
    expect(complete?.payload).toMatchObject({ kind: "table_spec", title: "Vendas" });

    // A fixture acrescenta a coluna "Total IA" com fórmula já em pt-BR/`;`.
    const columns = (complete?.payload?.columns ?? []) as { name: string; formula?: string }[];
    const totalColumn = columns.find((c) => c.name === "Total IA");
    expect(totalColumn).toBeDefined();
    expect(totalColumn?.formula).toContain("SOMA(");
    expect(totalColumn?.formula).toContain(";");
    expect(totalColumn?.formula).not.toContain(",");

    expect(routeMocks.saveConversationExchange).toHaveBeenCalledWith(
      expect.objectContaining({
        toolKind: "sheet_operation",
        mode: "generate",
        userPrompt: "Crie uma coluna de total",
        assistantPayload: expect.objectContaining({ kind: "table_spec" }),
      })
    );
  });

  it("feeds the sheet context to a qa fixture answer mentioning the columns", async () => {
    routeMocks.classifyIntent.mockResolvedValue({ intent: "qa", confidence: "high" });

    const response = await POST(
      authedJson({ prompt: "Qual o total de vendas?", specOverride: JSON.stringify(SAMPLE_SPEC) })
    );
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    const complete = completeEvent(events);
    expect(complete?.payload).toMatchObject({ kind: "qa_response" });
    expect(String(complete?.payload?.content)).toContain("Vendas");
    expect(routeMocks.saveConversationExchange).toHaveBeenCalledWith(
      expect.objectContaining({ toolKind: "qa", assistantPayload: expect.objectContaining({ kind: "qa_response" }) })
    );
  });

  it("rejects a malformed specOverride before provider work", async () => {
    const response = await POST(
      authedJson({ prompt: "Crie uma coluna", specOverride: JSON.stringify({ kind: "table_spec", columns: [] }) })
    );

    expect(response.status).toBe(400);
    expect(routeMocks.classifyIntent).not.toHaveBeenCalled();
  });

  it("routes qa and grounds an attached file without file-specific intents", async () => {
    routeMocks.classifyIntent.mockResolvedValue({ intent: "qa", confidence: "high" });
    routeMocks.extractContent.mockResolvedValue({ ok: true, text: "Arquivo com 2 colunas e 10 linhas." });

    const formData = new FormData();
    formData.set("prompt", "Analise este arquivo");
    formData.set("file", new File(["a,b\n1,2"], "teste.csv", { type: "text/csv" }));

    const response = await POST(authedMultipart(formData));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events[0]).toMatchObject({ type: "intent_detected", intent: "qa", confidence: "high" });
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "attachment_grounded",
          extractedText: "Arquivo com 2 colunas e 10 linhas.",
        }),
        expect.objectContaining({
          type: "complete",
          payload: expect.objectContaining({ kind: "qa_response" }),
        }),
      ])
    );
    expect(routeMocks.saveConversationExchange).toHaveBeenCalledWith(
      expect.objectContaining({
        toolKind: "qa",
        attachmentContext: "Arquivo com 2 colunas e 10 linhas.",
      })
    );
  });

  it("rejects legacy override intents before provider work", async () => {
    const response = await POST(authedJson({ prompt: "Quero SQL", overrideIntent: "sql" }));

    expect(response.status).toBe(400);
    expect(routeMocks.classifyIntent).not.toHaveBeenCalled();
  });
});

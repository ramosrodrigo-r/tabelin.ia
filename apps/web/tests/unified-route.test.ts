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

const routeMocks = vi.hoisted(() => ({
  classifyIntent: vi.fn(),
  extractContent: vi.fn(),
}));

vi.mock("@/server/ai/intent-classifier", () => ({
  classifyIntent: routeMocks.classifyIntent,
}));

vi.mock("@/server/extraction/dispatcher", () => ({
  extractContent: routeMocks.extractContent,
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

    routeMocks.classifyIntent.mockResolvedValue({ intent: "formula", confidence: "high" });
    routeMocks.extractContent.mockResolvedValue({ ok: true, text: "conteudo extraido" });
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

  it("returns a temporary unsupported payload for removed tool intents", async () => {
    const response = await POST(authedJson({ prompt: "Quero somar a coluna B" }));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events[0]).toMatchObject({ type: "intent_detected", intent: "formula", confidence: "high" });
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "delta", text: expect.stringContaining("modo antigo") }),
        expect.objectContaining({
          type: "complete",
          payload: expect.objectContaining({ kind: "table_stub" }),
        }),
      ])
    );
  });

  it("grounds an attached file without using file_analysis or ocr payloads", async () => {
    routeMocks.classifyIntent.mockResolvedValue({ intent: "file_analysis", confidence: "high" });
    routeMocks.extractContent.mockResolvedValue({ ok: true, text: "Arquivo com 2 colunas e 10 linhas." });

    const formData = new FormData();
    formData.set("prompt", "Analise este arquivo");
    formData.set("file", new File(["a,b\n1,2"], "teste.csv", { type: "text/csv" }));

    const response = await POST(authedMultipart(formData));
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "attachment_grounded",
          extractedText: "Arquivo com 2 colunas e 10 linhas.",
        }),
        expect.objectContaining({
          type: "complete",
          payload: expect.objectContaining({ kind: "table_stub" }),
        }),
      ])
    );
  });
});

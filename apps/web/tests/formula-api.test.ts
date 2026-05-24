import { describe, expect, it } from "vitest";

import { createSessionToken, createSessionUser } from "@/server/auth/session";
import { POST as explainPost } from "@/app/api/tools/formula/explain/route";
import { POST as generatePost } from "@/app/api/tools/formula/generate/route";

async function readEvents(response: Response) {
  const text = await response.text();

  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { type: string; payload?: unknown; metadata?: unknown });
}

function authedRequest(path: string, body: unknown) {
  const token = createSessionToken(createSessionUser("ana@empresa.com", "Ana"));

  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `tabelin_session=${token}`
    },
    body: JSON.stringify(body)
  });
}

describe("formula API routes", () => {
  it("rejects unauthenticated generation requests", async () => {
    const response = await generatePost(
      new Request("http://localhost:3000/api/tools/formula/generate", {
        method: "POST",
        body: JSON.stringify({})
      })
    );

    expect(response.status).toBe(401);
  });

  it("rejects invalid platform and language before provider work", async () => {
    const response = await generatePost(authedRequest("/api/tools/formula/generate", { prompt: "Somar pagos" }));

    expect(response.status).toBe(400);
  });

  it("streams metadata and validated formula completion", async () => {
    const response = await generatePost(
      authedRequest("/api/tools/formula/generate", {
        platform: "excel",
        formulaLanguage: "pt-BR",
        prompt: "Quero somar a coluna B se a coluna C for Pago"
      })
    );
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events[0]).toMatchObject({ type: "metadata" });
    expect(events.at(-1)).toMatchObject({
      type: "complete",
      payload: {
        kind: "formula",
        formula: '=SOMASE(C:C;"Pago";B:B)'
      }
    });
  });

  it("streams a pt-BR explanation payload", async () => {
    const response = await explainPost(
      authedRequest("/api/tools/formula/explain", {
        platform: "excel",
        formulaLanguage: "pt-BR",
        formula: '=SOMASE(C:C;"Pago";B:B)'
      })
    );
    const events = await readEvents(response);

    expect(response.status).toBe(200);
    expect(events.at(-1)).toMatchObject({
      type: "complete",
      payload: {
        kind: "explanation"
      }
    });
  });
});


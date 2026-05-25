import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSessionToken, createSessionUser } from "@/server/auth/session";
import { POST as explainPost } from "@/app/api/tools/formula/explain/route";
import { POST as generatePost } from "@/app/api/tools/formula/generate/route";

const quotaMocks = vi.hoisted(() => ({
  reserveToolUse: vi.fn(),
  confirmToolUse: vi.fn(),
  releaseToolUse: vi.fn()
}));

vi.mock("@/server/usage/quota-service", () => quotaMocks);

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
  beforeEach(() => {
    vi.clearAllMocks();
    quotaMocks.reserveToolUse.mockResolvedValue({ allowed: true, reservationKey: "res_123" });
    quotaMocks.confirmToolUse.mockResolvedValue({ confirmed: true });
    quotaMocks.releaseToolUse.mockResolvedValue({ released: true });
  });

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

  it("reserves quota before AI work for generation", async () => {
    await generatePost(
      authedRequest("/api/tools/formula/generate", {
        platform: "excel",
        formulaLanguage: "pt-BR",
        prompt: "Somar coluna A"
      })
    );

    expect(quotaMocks.reserveToolUse).toHaveBeenCalledWith(expect.any(String), "formula", "generate");
    expect(quotaMocks.confirmToolUse).toHaveBeenCalledWith("res_123");
  });

  it("reserves quota before AI work for explanation", async () => {
    await explainPost(
      authedRequest("/api/tools/formula/explain", {
        platform: "excel",
        formulaLanguage: "pt-BR",
        formula: "=SOMA(A:A)"
      })
    );

    expect(quotaMocks.reserveToolUse).toHaveBeenCalledWith(expect.any(String), "formula", "explain");
    expect(quotaMocks.confirmToolUse).toHaveBeenCalledWith("res_123");
  });

  it("blocks generation when quota is exceeded", async () => {
    quotaMocks.reserveToolUse.mockResolvedValue({
      allowed: false,
      reason: "quota_exceeded",
      meterKind: "tool_use"
    });

    const response = await generatePost(
      authedRequest("/api/tools/formula/generate", {
        platform: "excel",
        formulaLanguage: "pt-BR",
        prompt: "Somar coluna A"
      })
    );

    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json.code).toBe("quota_exceeded");
    expect(json.meterKind).toBe("tool_use");
    expect(json.cta).toBe("pro_checkout");
    expect(quotaMocks.confirmToolUse).not.toHaveBeenCalled();
  });
});


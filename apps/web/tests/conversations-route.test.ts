import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSessionToken, createSessionUser } from "@/server/auth/session";
import { DELETE as deleteToolConversation } from "@/app/api/conversations/[tool]/route";
import {
  ALL_UNIFIED_TOOL_KINDS,
  DELETE as deleteUnifiedConversation,
} from "@/app/api/conversations/unified/route";

const conversationMocks = vi.hoisted(() => ({
  deleteConversationExchanges: vi.fn(),
}));

vi.mock("@/server/tools/conversation-repository", () => ({
  deleteConversationExchanges: conversationMocks.deleteConversationExchanges,
}));

function authedRequest() {
  const token = createSessionToken(createSessionUser("ana@empresa.com", "Ana"));

  return new Request("http://localhost:3000/api/conversations/unified", {
    method: "DELETE",
    headers: {
      cookie: `tabelin_session=${token}`,
    },
  });
}

function anonRequest() {
  return new Request("http://localhost:3000/api/conversations/unified", {
    method: "DELETE",
  });
}

describe("conversation delete routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conversationMocks.deleteConversationExchanges.mockResolvedValue({ count: 1 });
  });

  it("rejects unauthenticated unified deletes", async () => {
    const response = await deleteUnifiedConversation(anonRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Autenticacao obrigatoria." });
    expect(conversationMocks.deleteConversationExchanges).not.toHaveBeenCalled();
  });

  it("deletes all unified tool histories for the authenticated user", async () => {
    const response = await deleteUnifiedConversation(authedRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(ALL_UNIFIED_TOOL_KINDS).toEqual([
      "sheet_operation",
      "qa",
      "formula",
      "sql",
      "regex",
      "script",
      "template",
      "unified_table",
    ]);
    expect(conversationMocks.deleteConversationExchanges).toHaveBeenCalledTimes(8);

    for (const kind of ALL_UNIFIED_TOOL_KINDS) {
      expect(conversationMocks.deleteConversationExchanges).toHaveBeenCalledWith(expect.any(String), kind);
    }
  });

  it("keeps existing formula delete working", async () => {
    const response = await deleteToolConversation(authedRequest(), {
      params: Promise.resolve({ tool: "formula" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(conversationMocks.deleteConversationExchanges).toHaveBeenCalledWith(expect.any(String), "formula");
  });

  it("deletes new binary tool histories directly", async () => {
    const response = await deleteToolConversation(authedRequest(), {
      params: Promise.resolve({ tool: "sheet_operation" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(conversationMocks.deleteConversationExchanges).toHaveBeenCalledWith(
      expect.any(String),
      "sheet_operation"
    );
  });

  it("rejects invalid existing tool kinds", async () => {
    const response = await deleteToolConversation(authedRequest(), {
      params: Promise.resolve({ tool: "dashboard" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Tool invalido." });
    expect(conversationMocks.deleteConversationExchanges).not.toHaveBeenCalled();
  });
});

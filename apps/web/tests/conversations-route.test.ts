import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSessionToken, createSessionUser } from "@/server/auth/session";
import {
  ALL_UNIFIED_TOOL_KINDS,
  DELETE as deleteUnifiedConversation,
} from "@/app/api/conversations/unified/route";

const conversationMocks = vi.hoisted(() => ({
  deleteConversationExchanges: vi.fn(),
}));

vi.mock("@/server/tools/conversation-repository", () => ({
  ALL_PERSISTED_TOOL_KINDS: ["sheet_operation", "qa", "unified_table"] as const,
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

  it("deletes every persisted unified tool history for the authenticated user", async () => {
    const response = await deleteUnifiedConversation(authedRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    // Apenas os kinds que a v3.0 efetivamente persiste — sem capacidades removidas.
    expect(ALL_UNIFIED_TOOL_KINDS).toEqual(["sheet_operation", "qa", "unified_table"]);
    expect(conversationMocks.deleteConversationExchanges).toHaveBeenCalledTimes(3);

    for (const kind of ALL_UNIFIED_TOOL_KINDS) {
      expect(conversationMocks.deleteConversationExchanges).toHaveBeenCalledWith(
        expect.any(String),
        kind,
      );
    }
  });
});

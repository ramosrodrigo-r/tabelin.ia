import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TableSpecPayload } from "@tabelin/shared";

const repositoryMocks = vi.hoisted(() => ({
  saveActiveSpreadsheetSpec: vi.fn(),
}));

const sessionMocks = vi.hoisted(() => ({
  getSessionFromCookieHeader: vi.fn(),
}));

vi.mock("@/server/tools/conversation-repository", () => ({
  saveActiveSpreadsheetSpec: repositoryMocks.saveActiveSpreadsheetSpec,
}));

vi.mock("@/server/auth/session", () => ({
  getSessionFromCookieHeader: sessionMocks.getSessionFromCookieHeader,
}));

import { POST } from "@/app/api/workspace/state/route";

const validSpec: TableSpecPayload = {
  kind: "table_spec",
  title: "Orçamento",
  columns: [{ name: "Item", type: "text", key: "item" }],
  rows: [{ item: "Café" }],
  rowCount: 1,
  separator: ";",
  formulaLanguage: "pt-BR",
};

function sessionCookie() {
  sessionMocks.getSessionFromCookieHeader.mockResolvedValue({
    id: "user_1",
    email: "ana@empresa.com",
    name: "Ana",
  });

  return "tabelin_session=fake";
}

function jsonRequest(body: unknown, opts: { authed: boolean }) {
  return new Request("http://localhost:3000/api/workspace/state", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(opts.authed ? { cookie: sessionCookie() } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("workspace state route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMocks.saveActiveSpreadsheetSpec.mockResolvedValue(undefined);
  });

  it("rejeita requisições não autenticadas", async () => {
    const response = await POST(jsonRequest(validSpec, { authed: false }));
    expect(response.status).toBe(401);
    expect(repositoryMocks.saveActiveSpreadsheetSpec).not.toHaveBeenCalled();
  });

  it("rejeita corpo JSON malformado", async () => {
    const response = await POST(jsonRequest("{not json", { authed: true }));
    expect(response.status).toBe(400);
    expect(repositoryMocks.saveActiveSpreadsheetSpec).not.toHaveBeenCalled();
  });

  it("rejeita payload que não passa no schema", async () => {
    const response = await POST(jsonRequest({ kind: "table_spec" }, { authed: true }));
    expect(response.status).toBe(422);
    expect(repositoryMocks.saveActiveSpreadsheetSpec).not.toHaveBeenCalled();
  });

  it("persiste spec válido e retorna 200", async () => {
    const response = await POST(jsonRequest(validSpec, { authed: true }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(repositoryMocks.saveActiveSpreadsheetSpec).toHaveBeenCalledTimes(1);
    expect(repositoryMocks.saveActiveSpreadsheetSpec).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ kind: "table_spec", title: "Orçamento" }),
    );
  });

  it("retorna 500 quando a persistência rejeita (WR-03)", async () => {
    // O helper real PROPAGA falhas (oversize ou erro de banco); aqui mockamos a
    // rejeição que o helper de fato produz — a cobertura do modo de falha real
    // (guardActiveSpecSize lança, transação rejeita) vive em
    // conversation-repository-active-spec.test.ts contra o helper sem mock.
    repositoryMocks.saveActiveSpreadsheetSpec.mockRejectedValueOnce(new Error("db down"));
    const response = await POST(jsonRequest(validSpec, { authed: true }));
    expect(response.status).toBe(500);
    const json = await response.json();
    // Não vaza detalhe interno na resposta e não retorna { ok: true }.
    expect(json).not.toHaveProperty("ok");
  });

  it("rejeita spec com colunas de key colidente antes de persistir (CR-02)", async () => {
    const colliding = {
      kind: "table_spec",
      title: "Duplicada",
      // Duas colunas "Total" sem key explícita → mesma key derivada.
      columns: [
        { name: "Total", type: "text" },
        { name: "Total", type: "number" },
      ],
      rows: [{ total: "a" }],
      rowCount: 1,
      separator: ";",
      formulaLanguage: "pt-BR",
    };
    const response = await POST(jsonRequest(colliding, { authed: true }));
    expect(response.status).toBe(422);
    expect(repositoryMocks.saveActiveSpreadsheetSpec).not.toHaveBeenCalled();
  });
});

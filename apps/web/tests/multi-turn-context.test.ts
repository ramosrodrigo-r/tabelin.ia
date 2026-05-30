/**
 * Testes de integração — leitura de histórico por toolKind + isolamento por tool (MULTI-03)
 *
 * Verifica que cada route handler:
 *   1. Chama findConversationExchanges com (user.id, toolKind_correto) exatamente uma vez.
 *   2. Usa o toolKind literal exato que corresponde ao saveConversationExchange existente
 *      (em especial: scripts usa "script" SINGULAR — regressão MULTI-03).
 *   3. Responde 200 quando o histórico está vazio (skip-on-error D-09).
 *   4. Mantém isolamento: sql e scripts recebem toolKinds distintos ("sql" vs "script").
 *
 * Padrão: espelha formula-api.test.ts (vi.hoisted, vi.mock, authedRequest, readEvents NDJSON).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSessionToken, createSessionUser } from "@/server/auth/session";
import { POST as sqlPost } from "@/app/api/tools/sql/generate/route";
import { POST as regexPost } from "@/app/api/tools/regex/generate/route";
import { POST as scriptsPost } from "@/app/api/tools/scripts/generate/route";
import { POST as templatePost } from "@/app/api/tools/template/generate/route";

// ---------------------------------------------------------------------------
// Mocks — hoisted para garantir que substituem os módulos antes dos imports
// ---------------------------------------------------------------------------

const quotaMocks = vi.hoisted(() => ({
  reserveToolUse: vi.fn(),
  confirmToolUse: vi.fn(),
  releaseToolUse: vi.fn()
}));

vi.mock("@/server/usage/quota-service", () => quotaMocks);

const repoMocks = vi.hoisted(() => ({
  findConversationExchanges: vi.fn(),
  saveConversationExchange: vi.fn(),
  deleteConversationExchanges: vi.fn()
}));

vi.mock("@/server/tools/conversation-repository", () => repoMocks);

const entitlementMocks = vi.hoisted(() => ({
  getUserEntitlement: vi.fn()
}));

vi.mock("@/server/billing/entitlements", () => entitlementMocks);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readEvents(response: Response) {
  const text = await response.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { type: string; payload?: unknown; metadata?: unknown });
}

function authedRequest(path: string, body: unknown) {
  const token = createSessionToken(createSessionUser("usuario@empresa.com.br", "Usuario Teste"));
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `tabelin_session=${token}`
    },
    body: JSON.stringify(body)
  });
}

// ---------------------------------------------------------------------------
// Setup global de mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Quota: sempre permitir
  quotaMocks.reserveToolUse.mockResolvedValue({
    allowed: true,
    reservationKey: "res_test_123",
    lastFreeUse: false
  });
  quotaMocks.confirmToolUse.mockResolvedValue({ confirmed: true });
  quotaMocks.releaseToolUse.mockResolvedValue({ released: true });

  // Repositório: histórico vazio por padrão (D-09 — skip-on-error)
  repoMocks.findConversationExchanges.mockResolvedValue([]);
  repoMocks.saveConversationExchange.mockResolvedValue(null);

  // Entitlement: Pro por padrão (necessário para template)
  entitlementMocks.getUserEntitlement.mockResolvedValue({ plan: "pro", status: "active" });
});

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("multi-turn: leitura de histórico por toolKind", () => {
  it("sql/generate chama findConversationExchanges com toolKind 'sql'", async () => {
    const response = await sqlPost(
      authedRequest("/api/tools/sql/generate", {
        dialect: "postgresql",
        prompt: "Listar todos os clientes ativos"
      })
    );

    expect(response.status).toBe(200);
    expect(repoMocks.findConversationExchanges).toHaveBeenCalledTimes(1);
    expect(repoMocks.findConversationExchanges).toHaveBeenCalledWith(
      expect.any(String),
      "sql"
    );
  });

  it("regex/generate chama findConversationExchanges com toolKind 'regex'", async () => {
    const response = await regexPost(
      authedRequest("/api/tools/regex/generate", {
        prompt: "Capturar emails brasileiros"
      })
    );

    expect(response.status).toBe(200);
    expect(repoMocks.findConversationExchanges).toHaveBeenCalledTimes(1);
    expect(repoMocks.findConversationExchanges).toHaveBeenCalledWith(
      expect.any(String),
      "regex"
    );
  });

  it("scripts/generate chama findConversationExchanges com toolKind 'script' (SINGULAR — regressão MULTI-03)", async () => {
    const response = await scriptsPost(
      authedRequest("/api/tools/scripts/generate", {
        scriptType: "vba",
        prompt: "Formatar planilha de vendas automaticamente"
      })
    );

    expect(response.status).toBe(200);
    expect(repoMocks.findConversationExchanges).toHaveBeenCalledTimes(1);
    // CRÍTICO: "script" SINGULAR — deve bater com o saveConversationExchange existente
    expect(repoMocks.findConversationExchanges).toHaveBeenCalledWith(
      expect.any(String),
      "script"
    );
    // Garantir que não usa plural "scripts" (que quebraria o isolamento silenciosamente)
    expect(repoMocks.findConversationExchanges).not.toHaveBeenCalledWith(
      expect.any(String),
      "scripts"
    );
  });

  it("template/generate chama findConversationExchanges com toolKind 'template'", async () => {
    const response = await templatePost(
      authedRequest("/api/tools/template/generate", {
        prompt: "Planilha de controle financeiro mensal"
      })
    );

    expect(response.status).toBe(200);
    expect(repoMocks.findConversationExchanges).toHaveBeenCalledTimes(1);
    expect(repoMocks.findConversationExchanges).toHaveBeenCalledWith(
      expect.any(String),
      "template"
    );
  });
});

describe("multi-turn: isolamento por tool (MULTI-03)", () => {
  it("sql e scripts recebem toolKinds distintos — threads não se cruzam", async () => {
    // Chamar sql
    await sqlPost(
      authedRequest("/api/tools/sql/generate", {
        dialect: "postgresql",
        prompt: "Contar registros por status"
      })
    );

    const sqlCall = repoMocks.findConversationExchanges.mock.calls[0];

    vi.clearAllMocks();
    quotaMocks.reserveToolUse.mockResolvedValue({ allowed: true, reservationKey: "res_2", lastFreeUse: false });
    quotaMocks.confirmToolUse.mockResolvedValue({ confirmed: true });
    repoMocks.findConversationExchanges.mockResolvedValue([]);
    repoMocks.saveConversationExchange.mockResolvedValue(null);

    // Chamar scripts
    await scriptsPost(
      authedRequest("/api/tools/scripts/generate", {
        scriptType: "apps_script",
        prompt: "Enviar email ao salvar planilha"
      })
    );

    const scriptCall = repoMocks.findConversationExchanges.mock.calls[0];

    // Isolamento: toolKinds distintos
    expect(sqlCall[1]).toBe("sql");
    expect(scriptCall[1]).toBe("script");
    expect(sqlCall[1]).not.toBe(scriptCall[1]);
  });

  it("cada tool filtra apenas seu próprio thread (toolKind por route é literal fixo)", async () => {
    // Verificar que sql usa "sql", não "script" nem "regex"
    await sqlPost(
      authedRequest("/api/tools/sql/generate", {
        dialect: "mysql",
        prompt: "Mostrar top 10 produtos vendidos"
      })
    );

    expect(repoMocks.findConversationExchanges).toHaveBeenCalledWith(
      expect.any(String),
      "sql"
    );
    expect(repoMocks.findConversationExchanges).not.toHaveBeenCalledWith(
      expect.any(String),
      "script"
    );
    expect(repoMocks.findConversationExchanges).not.toHaveBeenCalledWith(
      expect.any(String),
      "regex"
    );
    expect(repoMocks.findConversationExchanges).not.toHaveBeenCalledWith(
      expect.any(String),
      "template"
    );
  });
});

describe("multi-turn: fluxo não quebra com histórico vazio (D-09)", () => {
  it("sql/generate responde 200 quando findConversationExchanges retorna []", async () => {
    repoMocks.findConversationExchanges.mockResolvedValue([]);

    const response = await sqlPost(
      authedRequest("/api/tools/sql/generate", {
        dialect: "postgresql",
        prompt: "Somar total de pedidos"
      })
    );

    expect(response.status).toBe(200);
    const events = await readEvents(response);
    expect(events.at(-1)).toMatchObject({ type: "complete" });
  });

  it("scripts/generate responde 200 quando findConversationExchanges retorna []", async () => {
    repoMocks.findConversationExchanges.mockResolvedValue([]);

    const response = await scriptsPost(
      authedRequest("/api/tools/scripts/generate", {
        scriptType: "vba",
        prompt: "Limpar células vazias"
      })
    );

    expect(response.status).toBe(200);
    const events = await readEvents(response);
    expect(events.at(-1)).toMatchObject({ type: "complete" });
  });

  it("regex/generate responde 200 quando findConversationExchanges retorna []", async () => {
    repoMocks.findConversationExchanges.mockResolvedValue([]);

    const response = await regexPost(
      authedRequest("/api/tools/regex/generate", {
        prompt: "Validar CPF brasileiro"
      })
    );

    expect(response.status).toBe(200);
    const events = await readEvents(response);
    expect(events.at(-1)).toMatchObject({ type: "complete" });
  });

  it("template/generate responde 200 quando findConversationExchanges retorna []", async () => {
    repoMocks.findConversationExchanges.mockResolvedValue([]);

    const response = await templatePost(
      authedRequest("/api/tools/template/generate", {
        prompt: "Planilha de controle de estoque"
      })
    );

    expect(response.status).toBe(200);
    const events = await readEvents(response);
    expect(events.at(-1)).toMatchObject({ type: "complete" });
  });
});

describe("multi-turn: Pro gate do template (T-08-10)", () => {
  it("template/generate retorna 403 para usuário não-Pro antes de qualquer leitura de histórico", async () => {
    entitlementMocks.getUserEntitlement.mockResolvedValue({ plan: "free", status: "active" });

    const response = await templatePost(
      authedRequest("/api/tools/template/generate", {
        prompt: "Planilha de controle de horas"
      })
    );

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.code).toBe("pro_required");

    // Pro gate deve parar antes de ler o histórico
    expect(repoMocks.findConversationExchanges).not.toHaveBeenCalled();
  });
});

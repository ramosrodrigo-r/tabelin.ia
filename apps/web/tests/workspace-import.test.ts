import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/workspace/import/route";

const sessionMocks = vi.hoisted(() => ({
  getSessionFromCookieHeader: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({
  getSessionFromCookieHeader: sessionMocks.getSessionFromCookieHeader,
}));

function sessionCookie() {
  sessionMocks.getSessionFromCookieHeader.mockResolvedValue({
    id: "user_1",
    email: "ana@empresa.com",
    name: "Ana",
  });

  return "tabelin_session=fake";
}

function unauthedRequest(formData: FormData) {
  return {
    headers: new Headers({
      "content-type": "multipart/form-data; boundary=test",
    }),
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as Request;
}

function authedRequest(formData: FormData) {
  return {
    headers: new Headers({
      cookie: sessionCookie(),
      "content-type": "multipart/form-data; boundary=test",
    }),
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as Request;
}

describe("workspace import route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejeita requisições não autenticadas", async () => {
    const formData = new FormData();
    const response = await POST(unauthedRequest(formData));
    expect(response.status).toBe(401);
  });

  it("rejeita requisições sem arquivo", async () => {
    const formData = new FormData();
    const response = await POST(authedRequest(formData));
    expect(response.status).toBe(400);
  });

  it("rejeita arquivos maiores que o limite de 5 MB", async () => {
    const formData = new FormData();
    const largeFile = new File([new Uint8Array(6 * 1024 * 1024)], "large.csv", { type: "text/csv" });
    formData.set("file", largeFile);

    const response = await POST(authedRequest(formData));
    expect(response.status).toBe(413);
  });

  it("rejeita formatos de arquivo não suportados", async () => {
    const formData = new FormData();
    // Cria um buffer de texto puro que não começa com magic bytes conhecidos,
    // mas com extensão de imagem para forçar a detecção de tipo binário inválido.
    const fileBytes = new TextEncoder().encode("invalid magic bytes");
    const file = new File([fileBytes], "tabela.png", { type: "image/png" });
    formData.set("file", file);

    const response = await POST(authedRequest(formData));
    expect(response.status).toBe(422);
  });

  it("realiza o parse de um CSV válido com sucesso", async () => {
    const formData = new FormData();
    const csvContent = "descricao,valor,categoria\nAluguel,2000,Moradia\nInternet,150,Servicos";
    const fileBytes = new TextEncoder().encode(csvContent);
    const file = new File([fileBytes], "despesas.csv", { type: "text/csv" });
    formData.set("file", file);

    const response = await POST(authedRequest(formData));
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json).toMatchObject({
      kind: "table_spec",
      title: "Despesas",
      rowCount: 2,
    });
    expect(json.columns).toEqual([
      { name: "descricao", type: "text", key: "descricao" },
      { name: "valor", type: "number", key: "valor" },
      { name: "categoria", type: "text", key: "categoria" },
    ]);
    expect(json.rows).toEqual([
      { descricao: "Aluguel", valor: 2000, categoria: "Moradia" },
      { descricao: "Internet", valor: 150, categoria: "Servicos" },
    ]);
  });

  it("trunca linhas acima de 200 e colunas acima de 26", async () => {
    const formData = new FormData();
    
    // 30 colunas
    const headers = Array.from({ length: 30 }, (_, i) => `Col_${i}`).join(",");
    // 210 linhas
    const row = Array.from({ length: 30 }, () => "1").join(",");
    const csvContent = [headers, ...Array.from({ length: 210 }, () => row)].join("\n");
    
    const fileBytes = new TextEncoder().encode(csvContent);
    const file = new File([fileBytes], "limites.csv", { type: "text/csv" });
    formData.set("file", file);

    const response = await POST(authedRequest(formData));
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.columns.length).toBe(26);
    expect(json.rows.length).toBe(200);
    expect(json.rowCount).toBe(200);
  });
});

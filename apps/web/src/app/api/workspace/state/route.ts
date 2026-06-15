import { NextResponse } from "next/server";
import { tableSpecPayloadSchema } from "@tabelin/shared";

import { getSessionFromCookieHeader } from "@/server/auth/session";
import { saveActiveSpreadsheetSpec } from "@/server/tools/conversation-repository";

/**
 * Persiste o estado atual da planilha viva do usuário (D-01/D-02).
 *
 * Auto-save debancado disparado pelo WorkspaceStateProvider. Valida sessão e
 * payload (tableSpecPayloadSchema) antes de delegar a gravação ao repositório,
 * que mantém exatamente uma planilha ativa por usuário.
 */
export async function POST(request: Request) {
  const user = await getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsed = tableSpecPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Estado da planilha inválido." }, { status: 422 });
  }

  try {
    await saveActiveSpreadsheetSpec(user.id, parsed.data);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Falha ao persistir estado da planilha", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

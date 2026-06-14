import { NextResponse } from "next/server";

import { getSessionFromCookieHeader } from "@/server/auth/session";
import { deleteConversationExchanges } from "@/server/tools/conversation-repository";

const VALID_TOOL_KINDS = [
  "sheet_operation",
  "qa",
  "formula",
  "sql",
  "regex",
  "script",
  "template",
  "unified_table",
] as const;
type ToolKind = (typeof VALID_TOOL_KINDS)[number];

function isValidToolKind(value: string): value is ToolKind {
  return VALID_TOOL_KINDS.includes(value as ToolKind);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tool: string }> },
) {
  try {
    const user = getSessionFromCookieHeader(request.headers.get("cookie"));

    if (!user) {
      return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
    }

    const { tool: toolKind } = await params;

    if (!isValidToolKind(toolKind)) {
      return NextResponse.json({ error: "Tool invalido." }, { status: 400 });
    }

    await deleteConversationExchanges(user.id, toolKind);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

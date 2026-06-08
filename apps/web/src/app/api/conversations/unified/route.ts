import { NextResponse } from "next/server";

import { getSessionFromCookieHeader } from "@/server/auth/session";
import { deleteConversationExchanges } from "@/server/tools/conversation-repository";

export const ALL_UNIFIED_TOOL_KINDS = ["formula", "sql", "regex", "script", "template", "unified_table"] as const;

export async function DELETE(request: Request) {
  try {
    const user = getSessionFromCookieHeader(request.headers.get("cookie"));

    if (!user) {
      return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
    }

    for (const kind of ALL_UNIFIED_TOOL_KINDS) {
      await deleteConversationExchanges(user.id, kind);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

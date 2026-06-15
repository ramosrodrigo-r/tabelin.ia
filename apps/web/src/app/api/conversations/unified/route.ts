import { NextResponse } from "next/server";

import { getSessionFromCookieHeader } from "@/server/auth/session";
import {
  ALL_PERSISTED_TOOL_KINDS,
  deleteConversationExchanges,
} from "@/server/tools/conversation-repository";

export const ALL_UNIFIED_TOOL_KINDS = ALL_PERSISTED_TOOL_KINDS;

export async function DELETE(request: Request) {
  try {
    const user = await getSessionFromCookieHeader(request.headers.get("cookie"));

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

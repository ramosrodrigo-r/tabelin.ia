import { NextResponse } from "next/server";

import { formulaExplainRequestSchema } from "@tabelin/shared";

import { createFormulaEventStream, resolveFormulaPayload } from "@/server/ai/formula-stream";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { recordFormulaToolRequest } from "@/server/tools/formula-repository";

export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));

  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  const startedAt = performance.now();
  const body = await request.json().catch(() => null);
  const parsed = formulaExplainRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido de explicacao invalido.", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const payload = await resolveFormulaPayload({ mode: "explain", request: parsed.data });
    await recordFormulaToolRequest({
      userId: user.id,
      metadata: payload.metadata,
      status: "success",
      latencyMs: Math.round(performance.now() - startedAt)
    });

    return new Response(createFormulaEventStream(payload), {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "Nao consegui validar a resposta." }, { status: 502 });
  }
}


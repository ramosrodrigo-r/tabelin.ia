import { NextResponse } from "next/server";

import { formulaGenerateRequestSchema } from "@tabelin/shared";

import { createFormulaEventStream, resolveFormulaPayload } from "@/server/ai/formula-stream";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { recordFormulaToolRequest } from "@/server/tools/formula-repository";
import { reserveToolUse, confirmToolUse, releaseToolUse } from "@/server/usage/quota-service";

export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));

  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  const startedAt = performance.now();
  const body = await request.json().catch(() => null);
  const parsed = formulaGenerateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido de formula invalido.", issues: parsed.error.issues }, { status: 400 });
  }

  const quotaCheck = await reserveToolUse(user.id, "formula", "generate");

  if (!quotaCheck.allowed) {
    return NextResponse.json(
      {
        code: "quota_exceeded",
        meterKind: quotaCheck.meterKind,
        cta: "pro_checkout"
      },
      { status: 429 }
    );
  }

  try {
    const payload = await resolveFormulaPayload({ mode: "generate", request: parsed.data });
    await confirmToolUse(quotaCheck.reservationKey);
    await recordFormulaToolRequest({
      userId: user.id,
      metadata: payload.metadata,
      status: "success",
      latencyMs: Math.round(performance.now() - startedAt)
    });

    return new Response(createFormulaEventStream(payload, quotaCheck.lastFreeUse), {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  } catch {
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ error: "Nao consegui validar a resposta." }, { status: 502 });
  }
}


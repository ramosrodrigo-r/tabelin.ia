import { NextResponse } from "next/server";

import { scriptGenerateRequestSchema } from "@tabelin/shared";

import { createScriptEventStream, resolveScriptPayload } from "@/server/ai/scripts-stream";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { recordToolRequest } from "@/server/tools/tool-repository";
import { confirmToolUse, releaseToolUse, reserveToolUse } from "@/server/usage/quota-service";
import { findConversationExchanges, saveConversationExchange } from "@/server/tools/conversation-repository";

export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  const startedAt = performance.now();
  const body = await request.json().catch(() => null);
  const parsed = scriptGenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido de script invalido.", issues: parsed.error.issues }, { status: 400 });
  }

  const quotaCheck = await reserveToolUse(user.id, "script", "generate");
  if (!quotaCheck.allowed) {
    return NextResponse.json({ code: "quota_exceeded", meterKind: quotaCheck.meterKind, cta: "pro_checkout" }, { status: 429 });
  }

  try {
    // Phase 8: ler histórico multi-turn — toolKind "script" SINGULAR (bate com o save existente — MULTI-03)
    const history = await findConversationExchanges(user.id, "script");
    const payload = await resolveScriptPayload({ request: parsed.data, history });
    await confirmToolUse(quotaCheck.reservationKey);
    await recordToolRequest({
      userId: user.id,
      toolKind: "script",
      mode: "generate",
      dialect: parsed.data.scriptType,
      status: "success",
      latencyMs: Math.round(performance.now() - startedAt),
      providerModel: payload.metadata.providerModel
    });
    // NOVO — Phase 6
    await saveConversationExchange({
      userId: user.id,
      toolKind: "script",
      mode: "generate",
      dialect: parsed.data.scriptType,
      userPrompt: parsed.data.prompt,
      assistantPayload: payload
    });
    return new Response(createScriptEventStream(payload, quotaCheck.lastFreeUse), {
      headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" }
    });
  } catch (err) {
    console.error("tool generate failed", { toolKind: "script", err });
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ error: "Nao consegui validar a resposta." }, { status: 502 });
  }
}

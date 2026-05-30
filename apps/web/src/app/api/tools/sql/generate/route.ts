import { NextResponse } from "next/server";

import { sqlGenerateRequestSchema } from "@tabelin/shared";

import { createSqlEventStream, resolveSqlPayload } from "@/server/ai/sql-stream";
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
  const parsed = sqlGenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido de SQL invalido.", issues: parsed.error.issues }, { status: 400 });
  }

  const quotaCheck = await reserveToolUse(user.id, "sql", "generate");
  if (!quotaCheck.allowed) {
    return NextResponse.json({ code: "quota_exceeded", meterKind: quotaCheck.meterKind, cta: "pro_checkout" }, { status: 429 });
  }

  try {
    // Phase 8: ler histórico multi-turn (skip-on-error embutido no repository — D-09)
    const history = await findConversationExchanges(user.id, "sql");
    const payload = await resolveSqlPayload({ request: parsed.data, history });
    await confirmToolUse(quotaCheck.reservationKey);
    await recordToolRequest({
      userId: user.id,
      toolKind: "sql",
      mode: "generate",
      dialect: parsed.data.dialect,
      status: "success",
      latencyMs: Math.round(performance.now() - startedAt),
      providerModel: payload.metadata.providerModel
    });
    // NOVO — Phase 6
    await saveConversationExchange({
      userId: user.id,
      toolKind: "sql",
      mode: "generate",
      dialect: parsed.data.dialect,
      userPrompt: parsed.data.prompt,
      assistantPayload: payload
    });
    return new Response(createSqlEventStream(payload, quotaCheck.lastFreeUse), {
      headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" }
    });
  } catch (err) {
    console.error("tool generate failed", { toolKind: "sql", err });
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ error: "Nao consegui validar a resposta." }, { status: 502 });
  }
}

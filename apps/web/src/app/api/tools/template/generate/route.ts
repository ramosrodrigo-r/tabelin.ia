import { NextResponse } from "next/server";

import { templateGenerateRequestSchema } from "@tabelin/shared";

import { createTemplateEventStream, resolveTemplatePayload } from "@/server/ai/template-stream";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { getUserEntitlement } from "@/server/billing/entitlements";
import { recordToolRequest } from "@/server/tools/tool-repository";
import { confirmToolUse, releaseToolUse, reserveToolUse } from "@/server/usage/quota-service";

export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  // Pro gate: verificar entitlement ANTES de reservar quota
  const entitlement = await getUserEntitlement(user.id);
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";
  if (!isPro) {
    return NextResponse.json({ code: "pro_required", cta: "pro_checkout" }, { status: 403 });
  }

  const startedAt = performance.now();
  const body = await request.json().catch(() => null);
  const parsed = templateGenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido de template invalido.", issues: parsed.error.issues }, { status: 400 });
  }

  const quotaCheck = await reserveToolUse(user.id, "template", "generate");
  if (!quotaCheck.allowed) {
    return NextResponse.json({ code: "quota_exceeded", meterKind: quotaCheck.meterKind, cta: "pro_checkout" }, { status: 429 });
  }

  try {
    const payload = await resolveTemplatePayload({ request: parsed.data });
    await confirmToolUse(quotaCheck.reservationKey);
    await recordToolRequest({
      userId: user.id,
      toolKind: "template",
      mode: "generate",
      status: "success",
      latencyMs: Math.round(performance.now() - startedAt),
      providerModel: payload.metadata.providerModel
    });
    return new Response(createTemplateEventStream(payload, quotaCheck.lastFreeUse), {
      headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" }
    });
  } catch {
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ error: "Nao consegui validar a resposta." }, { status: 502 });
  }
}

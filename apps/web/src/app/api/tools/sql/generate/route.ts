import { NextResponse } from "next/server";

import { sqlGenerateRequestSchema } from "@tabelin/shared";

import { createSqlEventStream, resolveSqlPayload } from "@/server/ai/sql-stream";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { getUserEntitlement } from "@/server/billing/entitlements";
import { extractContent } from "@/server/extraction/dispatcher";
import { recordToolRequest } from "@/server/tools/tool-repository";
import { confirmToolUse, releaseToolUse, reserveToolUse } from "@/server/usage/quota-service";
import { findConversationExchanges, saveConversationExchange } from "@/server/tools/conversation-repository";

export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  // Detectar Content-Type e parsear body (multipart ou JSON — backward-compat)
  const contentType = request.headers.get("content-type") ?? "";
  let body: unknown;
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    body = {
      dialect: formData.get("dialect"),
      prompt: formData.get("prompt")
    };
    file = formData.get("file") as File | null;
  } else {
    body = await request.json().catch(() => null);
  }

  const startedAt = performance.now();
  const parsed = sqlGenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido de SQL invalido.", issues: parsed.error.issues }, { status: 400 });
  }

  // Pro-gate condicional: apenas quando há arquivo anexado
  const hasFile = contentType.includes("multipart/form-data") && file !== null;
  if (hasFile) {
    const entitlement = await getUserEntitlement(user.id);
    const isPro = entitlement.plan === "pro" && entitlement.status === "active";
    if (!isPro) {
      return NextResponse.json(
        { code: "pro_required", feature: "attachment", cta: "pro_checkout" },
        { status: 403 }
      );
    }
  }

  const quotaCheck = await reserveToolUse(user.id, "sql", "generate");
  if (!quotaCheck.allowed) {
    return NextResponse.json({ code: "quota_exceeded", meterKind: quotaCheck.meterKind, cta: "pro_checkout" }, { status: 429 });
  }

  try {
    // Extração de arquivo (se hasFile) — dentro do try para que o catch libere a reserva
    let attachmentContext: string | undefined;
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        await releaseToolUse(quotaCheck.reservationKey);
        return NextResponse.json({ code: "FILE_TOO_LARGE", message: "Arquivo excede 5 MB." }, { status: 413 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await extractContent(buffer, file.name);
      if (!result.ok) {
        await releaseToolUse(quotaCheck.reservationKey);
        return NextResponse.json({ code: result.code, message: result.message }, { status: 422 });
      }
      attachmentContext = result.text;
    }

    // Phase 8: ler histórico multi-turn (skip-on-error embutido no repository — D-09)
    const history = await findConversationExchanges(user.id, "sql");
    const payload = await resolveSqlPayload({ request: parsed.data, history, attachmentContext });
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
    // NOVO — Phase 6 + attachmentContext (Phase 10)
    await saveConversationExchange({
      userId: user.id,
      toolKind: "sql",
      mode: "generate",
      dialect: parsed.data.dialect,
      userPrompt: parsed.data.prompt,
      assistantPayload: payload,
      attachmentContext
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

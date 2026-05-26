import { NextResponse } from "next/server";

import { ocrRequestSchema } from "@tabelin/shared";

import { processImageOcr } from "@/server/ai/ocr-processor";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { confirmToolUse, releaseToolUse, reserveToolUse } from "@/server/usage/quota-service";

export async function POST(request: Request) {
  // T-05-01-05: autenticacao obrigatoria — 401 antes de qualquer processamento
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  // T-05-01-01: validacao de mimeType como z.enum — rejeita 400 para MIME nao-listado
  const parsed = ocrRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Pedido invalido.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { imageBase64, mimeType } = parsed.data;

  // T-05-01-02: validacao server-side de tamanho — 413 antes de chamar OpenAI
  if (imageBase64.length * 0.75 > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Imagem excede o limite de 5 MB. Envie uma imagem menor." },
      { status: 413 }
    );
  }

  // Quota: reserveToolUse impede abuso por usuario
  const quotaCheck = await reserveToolUse(user.id, "ocr", "process");
  if (!quotaCheck.allowed) {
    return NextResponse.json(
      { code: "quota_exceeded", meterKind: quotaCheck.meterKind, cta: "pro_checkout" },
      { status: 429 }
    );
  }

  try {
    const result = await processImageOcr(imageBase64, mimeType);

    await confirmToolUse(quotaCheck.reservationKey);

    return NextResponse.json({ headers: result.headers, rows: result.rows }, { status: 200 });
  } catch {
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json(
      { error: "Nao foi possivel processar a imagem." },
      { status: 502 }
    );
  }
}

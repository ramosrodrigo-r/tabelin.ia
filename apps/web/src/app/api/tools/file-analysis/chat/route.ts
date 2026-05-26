import { NextResponse } from "next/server";

import { chatRequestSchema } from "@tabelin/shared";

import { buildFileChatStream } from "@/server/ai/file-chat-stream";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import {
  findUploadedFileByIdAndUser,
  getRecentMessages,
  appendChatMessages,
  updateLastChatAt
} from "@/server/file-analysis/file-repository";
import { confirmToolUse, releaseToolUse, reserveToolUse } from "@/server/usage/quota-service";

export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido invalido.", issues: parsed.error.issues }, { status: 400 });
  }

  // T-04-01-01: IDOR guard — sempre incluir userId do usuario autenticado
  const uploadedFile = await findUploadedFileByIdAndUser(parsed.data.uploadedFileId, user.id);
  if (!uploadedFile) {
    return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });
  }

  const quotaCheck = await reserveToolUse(user.id, "file-chat", "chat");
  if (!quotaCheck.allowed) {
    return NextResponse.json(
      { code: "quota_exceeded", meterKind: quotaCheck.meterKind, cta: "pro_checkout" },
      { status: 429 }
    );
  }

  try {
    // D-08: janela deslizante de 10 mensagens
    const history = await getRecentMessages(uploadedFile.id, 10);

    const stream = buildFileChatStream(
      uploadedFile.schema as import("@tabelin/shared").FileSchema,
      history,
      parsed.data.message,
      quotaCheck.lastFreeUse
    );

    await confirmToolUse(quotaCheck.reservationKey);

    // Persist user + assistant messages after stream is created
    // Note: appendChatMessages and updateLastChatAt called fire-and-forget
    // to not delay stream response; errors are swallowed by repository layer
    void appendChatMessages(uploadedFile.id, [
      { role: "user", content: parsed.data.message }
    ]);
    void updateLastChatAt(uploadedFile.id, user.id);

    return new Response(stream, {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  } catch {
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ error: "Nao foi possivel processar a mensagem." }, { status: 502 });
  }
}

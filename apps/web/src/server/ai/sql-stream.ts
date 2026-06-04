import "server-only";

import type { ConversationExchange } from "@prisma/client";

import {
  type SqlGenerateRequest,
  type SqlGenerateResponse,
  type SqlStreamEvent,
  SQL_FIXTURES,
  sqlGenerateResponseSchema
} from "@tabelin/shared";

import { classifyDestructive } from "./destructive-classifier";
import { buildToolContextMessages, buildMultiTurnSystemPrompt } from "./context-messages";
import { getOpenAIModel } from "./openai-client";

export async function resolveSqlPayload(input: {
  request: SqlGenerateRequest;
  history?: ConversationExchange[];
  attachmentContext?: string;
}): Promise<SqlGenerateResponse> {
  const { request } = input;

  if (!process.env.OPENAI_API_KEY) {
    const fixture = SQL_FIXTURES.find((f) => f.metadata.dialect === request.dialect) ?? SQL_FIXTURES[0];
    const isDestructive = classifyDestructive(fixture.query, "sql");
    return sqlGenerateResponseSchema.parse({
      ...fixture,
      isDestructive,
      metadata: { ...fixture.metadata, dialect: request.dialect, isDestructive, providerModel: "deterministic-fixture" }
    });
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI();

  const completion = await client.chat.completions.create({
    model: getOpenAIModel(),
    messages: buildToolContextMessages(
      "sql",
      input.history ?? [],
      buildMultiTurnSystemPrompt(
        `Voce e um especialista em SQL. Gere uma consulta ${request.dialect.toUpperCase()} em resposta ao pedido em portugues. Responda APENAS com JSON valido: {"query": "...SQL completo...", "explanation": "...explicacao em portugues...", "assumptions": ["..."], "warnings": [], "isDestructive": false}`,
        input.history?.length ?? 0
      ),
      request.prompt,
      input.attachmentContext
    ),
    response_format: { type: "json_object" }
  });

  const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  const query = String(raw.query ?? "");

  const isDestructiveByPattern = classifyDestructive(query, "sql");
  const isDestructive = Boolean(raw.isDestructive) || isDestructiveByPattern;

  return sqlGenerateResponseSchema.parse({
    kind: "sql",
    query,
    explanation: String(raw.explanation ?? ""),
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    isDestructive,
    metadata: {
      mode: "generate",
      dialect: request.dialect,
      isDestructive,
      providerModel: getOpenAIModel()
    }
  });
}

function splitSqlForStreaming(payload: SqlGenerateResponse): string[] {
  return [payload.query, "\n", payload.explanation];
}

export function createSqlEventStream(payload: SqlGenerateResponse, lastFreeUse?: boolean) {
  const encoder = new TextEncoder();
  const events: SqlStreamEvent[] = [
    { type: "metadata", metadata: payload.metadata },
    ...payload.warnings.map((warning): SqlStreamEvent => ({ type: "warning", warning })),
    ...(lastFreeUse ? [{ type: "quota_warning" as const, lastFreeUse: true }] : []),
    ...splitSqlForStreaming(payload).map((text): SqlStreamEvent => ({ type: "delta", text })),
    { type: "complete", payload }
  ];

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      controller.close();
    }
  });
}

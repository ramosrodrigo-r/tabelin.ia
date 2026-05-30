import "server-only";

import type { ConversationExchange } from "@prisma/client";

import {
  type ScriptGenerateRequest,
  type ScriptGenerateResponse,
  type ScriptStreamEvent,
  SCRIPT_FIXTURES,
  scriptGenerateResponseSchema
} from "@tabelin/shared";

import { classifyDestructive } from "./destructive-classifier";
import { buildToolContextMessages, truncateHistory } from "./context-messages";
import { getOpenAIModel } from "./openai-client";

export async function resolveScriptPayload(input: {
  request: ScriptGenerateRequest;
  history?: ConversationExchange[];
}): Promise<ScriptGenerateResponse> {
  const { request } = input;

  // Sem OPENAI_API_KEY: retornar fixture determinística correspondente ao scriptType
  if (!process.env.OPENAI_API_KEY) {
    const fixture = SCRIPT_FIXTURES.find((f) => f.metadata.scriptType === request.scriptType) ?? SCRIPT_FIXTURES[0];
    const isDestructive = classifyDestructive(fixture.code, "script");
    return scriptGenerateResponseSchema.parse({
      ...fixture,
      isDestructive,
      metadata: { ...fixture.metadata, scriptType: request.scriptType, isDestructive, providerModel: "deterministic-fixture" }
    });
  }

  // Com OPENAI_API_KEY: construir prompt e chamar AI
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI();

  const scriptTypeLabels: Record<string, string> = {
    vba: "VBA para Microsoft Excel",
    apps_script: "Google Apps Script para Google Sheets",
    airtable_script: "Airtable Scripting para Airtable"
  };

  const completion = await client.chat.completions.create({
    model: getOpenAIModel(),
    messages: buildToolContextMessages(
      "script",
      truncateHistory(input.history ?? []),
      `Voce e um especialista em automacao de planilhas. Gere ${scriptTypeLabels[request.scriptType] ?? request.scriptType} em resposta ao pedido em portugues do usuario. Responda APENAS com JSON valido no formato: {"code": "...codigo completo...", "explanation": "...explicacao em portugues...", "assumptions": ["..."], "warnings": [], "isDestructive": false}`,
      request.prompt
    ),
    response_format: { type: "json_object" }
  });

  const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  const code = String(raw.code ?? "");

  // Classificador determinístico como fallback/validação do campo isDestructive do AI
  const isDestructiveByPattern = classifyDestructive(code, "script");
  const isDestructive = Boolean(raw.isDestructive) || isDestructiveByPattern;

  return scriptGenerateResponseSchema.parse({
    kind: "script",
    code,
    explanation: String(raw.explanation ?? ""),
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    isDestructive,
    metadata: {
      mode: "generate",
      scriptType: request.scriptType,
      isDestructive,
      providerModel: getOpenAIModel()
    }
  });
}

function splitScriptForStreaming(payload: ScriptGenerateResponse): string[] {
  return [payload.code, "\n", payload.explanation];
}

export function createScriptEventStream(payload: ScriptGenerateResponse, lastFreeUse?: boolean) {
  const encoder = new TextEncoder();
  const events: ScriptStreamEvent[] = [
    { type: "metadata", metadata: payload.metadata },
    ...payload.warnings.map((warning): ScriptStreamEvent => ({ type: "warning", warning })),
    ...(lastFreeUse ? [{ type: "quota_warning" as const, lastFreeUse: true }] : []),
    ...splitScriptForStreaming(payload).map((text): ScriptStreamEvent => ({ type: "delta", text })),
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

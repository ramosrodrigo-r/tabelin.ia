import "server-only";

import type { ConversationExchange } from "@prisma/client";

import {
  type TemplateGenerateRequest,
  type TemplateGenerateResponse,
  type TemplateStreamEvent,
  TEMPLATE_FIXTURES,
  templateGenerateResponseSchema
} from "@tabelin/shared";

import { buildToolContextMessages, buildMultiTurnSystemPrompt } from "./context-messages";
import { getOpenAIModel } from "./openai-client";

export async function resolveTemplatePayload(input: {
  request: TemplateGenerateRequest;
  history?: ConversationExchange[];
}): Promise<TemplateGenerateResponse> {
  const { request } = input;

  if (!process.env.OPENAI_API_KEY) {
    return templateGenerateResponseSchema.parse({
      ...TEMPLATE_FIXTURES[0],
      metadata: { mode: "generate", providerModel: "deterministic-fixture" }
    });
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI();

  const completion = await client.chat.completions.create({
    model: getOpenAIModel(),
    messages: buildToolContextMessages(
      "template",
      input.history ?? [],
      buildMultiTurnSystemPrompt(
        'Voce e um especialista em planilhas Excel pt-BR. Gere um template de planilha estruturado em resposta ao pedido do usuario. Entregue em Markdown formatado com cabecalhos, colunas sugeridas com tipos, e formulas de referencia no estilo Excel pt-BR (separador ponto-e-virgula). Responda APENAS com JSON: {"output": "...markdown completo...", "explanation": "...descricao em portugues...", "assumptions": [], "warnings": []}',
        input.history?.length ?? 0
      ),
      request.prompt
    ),
    response_format: { type: "json_object" }
  });

  const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  return templateGenerateResponseSchema.parse({
    kind: "template",
    output: String(raw.output ?? ""),
    explanation: String(raw.explanation ?? ""),
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    metadata: { mode: "generate", providerModel: getOpenAIModel() }
  });
}

function splitTemplateForStreaming(payload: TemplateGenerateResponse): string[] {
  return [payload.output, "\n", payload.explanation];
}

export function createTemplateEventStream(payload: TemplateGenerateResponse, lastFreeUse?: boolean) {
  const encoder = new TextEncoder();
  const events: TemplateStreamEvent[] = [
    { type: "metadata", metadata: payload.metadata },
    ...payload.warnings.map((warning): TemplateStreamEvent => ({ type: "warning", warning })),
    ...(lastFreeUse ? [{ type: "quota_warning" as const, lastFreeUse: true }] : []),
    ...splitTemplateForStreaming(payload).map((text): TemplateStreamEvent => ({ type: "delta", text })),
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

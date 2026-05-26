import "server-only";

import {
  type RegexCompletePayload,
  type RegexExplainRequest,
  type RegexGenerateRequest,
  type RegexStreamEvent,
  REGEX_EXPLAIN_FIXTURES,
  REGEX_GENERATE_FIXTURES,
  regexCompletePayloadSchema
} from "@tabelin/shared";

import { getOpenAIModel } from "./openai-client";

type RegexModeInput =
  | { mode: "generate"; request: RegexGenerateRequest }
  | { mode: "explain"; request: RegexExplainRequest };

export async function resolveRegexPayload(input: RegexModeInput): Promise<RegexCompletePayload> {
  if (!process.env.OPENAI_API_KEY) {
    if (input.mode === "generate") {
      return regexCompletePayloadSchema.parse({
        ...REGEX_GENERATE_FIXTURES[0],
        metadata: { mode: "generate", providerModel: "deterministic-fixture" }
      });
    }
    return regexCompletePayloadSchema.parse({
      ...REGEX_EXPLAIN_FIXTURES[0],
      pattern: input.request.pattern,
      metadata: { mode: "explain", providerModel: "deterministic-fixture" }
    });
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI();

  if (input.mode === "generate") {
    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      messages: [
        {
          role: "system",
          content: 'Voce e um especialista em expressoes regulares. Gere uma regex em resposta ao pedido em portugues. Responda APENAS com JSON: {"pattern": "...regex...", "explanation": "...explicacao em portugues...", "examples": ["..."], "assumptions": [], "warnings": []}'
        },
        { role: "user", content: input.request.prompt }
      ],
      response_format: { type: "json_object" }
    });

    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    return regexCompletePayloadSchema.parse({
      kind: "regex_generate",
      pattern: String(raw.pattern ?? ""),
      explanation: String(raw.explanation ?? ""),
      examples: Array.isArray(raw.examples) ? raw.examples : [],
      assumptions: Array.isArray(raw.assumptions) ? raw.assumptions : [],
      warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
      metadata: { mode: "generate", providerModel: getOpenAIModel() }
    });
  }

  // mode === "explain"
  const completion = await client.chat.completions.create({
    model: getOpenAIModel(),
    messages: [
      {
        role: "system",
        content: 'Voce e um especialista em expressoes regulares. Explique a regex fornecida passo a passo em portugues. Responda APENAS com JSON: {"steps": ["passo 1", "passo 2", ...], "assumptions": [], "warnings": []}'
      },
      { role: "user", content: `Explique esta regex: ${input.request.pattern}` }
    ],
    response_format: { type: "json_object" }
  });

  const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  return regexCompletePayloadSchema.parse({
    kind: "regex_explain",
    pattern: input.request.pattern,
    steps: Array.isArray(raw.steps) ? raw.steps : ["Nao foi possivel explicar a expressao."],
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    metadata: { mode: "explain", providerModel: getOpenAIModel() }
  });
}

function splitRegexForStreaming(payload: RegexCompletePayload): string[] {
  if (payload.kind === "regex_generate") {
    return [payload.pattern, "\n", payload.explanation];
  }
  return [payload.pattern, "\n", ...payload.steps.map((step, i) => `${i + 1}. ${step}\n`)];
}

export function createRegexEventStream(payload: RegexCompletePayload, lastFreeUse?: boolean) {
  const encoder = new TextEncoder();
  const events: RegexStreamEvent[] = [
    { type: "metadata", metadata: payload.metadata },
    ...payload.warnings.map((warning): RegexStreamEvent => ({ type: "warning", warning })),
    ...(lastFreeUse ? [{ type: "quota_warning" as const, lastFreeUse: true }] : []),
    ...splitRegexForStreaming(payload).map((text): RegexStreamEvent => ({ type: "delta", text })),
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

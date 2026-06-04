import "server-only";

import type { ConversationExchange } from "@prisma/client";

import {
  type FormulaCompletePayload,
  type FormulaExplainRequest,
  type FormulaGenerateRequest,
  type FormulaMetadata,
  type FormulaStreamEvent,
  formulaCompletePayloadSchema,
  getSeparatorForLanguage
} from "@tabelin/shared";

import { buildToolContextMessages, buildMultiTurnSystemPrompt } from "./context-messages";
import { getOpenAIModel } from "./openai-client";

type FormulaModeInput =
  | { mode: "generate"; request: FormulaGenerateRequest; history?: ConversationExchange[]; attachmentContext?: string }
  | { mode: "explain"; request: FormulaExplainRequest };

function metadataFor(input: FormulaModeInput): FormulaMetadata {
  return {
    mode: input.mode,
    platform: input.request.platform,
    formulaLanguage: input.request.formulaLanguage,
    separator: getSeparatorForLanguage(input.request.formulaLanguage),
    providerModel: process.env.OPENAI_API_KEY ? getOpenAIModel() : "deterministic-fixture"
  };
}

export async function resolveFormulaPayload(input: FormulaModeInput): Promise<FormulaCompletePayload> {
  const metadata = metadataFor(input);

  if (input.mode === "explain") {
    return formulaCompletePayloadSchema.parse({
      kind: "explanation",
      formula: input.request.formula,
      steps: [
        "Identifica os criterios usados pela formula.",
        "Aplica os criterios aos intervalos informados.",
        "Retorna o resultado final mantendo o separador escolhido pelo usuario."
      ],
      assumptions: ["A formula colada usa os intervalos da planilha atual."],
      warnings: [],
      metadata
    });
  }

  // Fixture mode: retornar determinístico sem chamar OpenAI (sem OPENAI_API_KEY)
  if (!process.env.OPENAI_API_KEY) {
    const prompt = input.request.prompt.toLowerCase();
    const formula =
      input.request.formulaLanguage === "pt-BR"
        ? prompt.includes("pago")
          ? '=SOMASE(C:C;"Pago";B:B)'
          : '=SE(A2>0;"Ativo";"Revisar")'
        : prompt.includes("paid")
          ? '=SUMIF(C:C,"Paid",B:B)'
          : '=IF(A2>0,"Active","Review")';

    return formulaCompletePayloadSchema.parse({
      kind: "formula",
      formula,
      explanation:
        input.request.formulaLanguage === "pt-BR"
          ? "A formula aplica o criterio informado e retorna um resultado pronto para colar."
          : "The formula applies the requested criterion and returns a copy-ready result.",
      assumptions:
        input.request.formulaLanguage === "pt-BR"
          ? ["A coluna B contem os valores.", "A coluna C contem o status do pagamento."]
          : ["Column B contains values.", "Column C contains payment status."],
      warnings: [],
      metadata
    });
  }

  const { request } = input;

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI();

  const completion = await client.chat.completions.create({
    model: getOpenAIModel(),
    messages: buildToolContextMessages(
      "formula",
      input.history ?? [],
      buildMultiTurnSystemPrompt(
        `Voce e um especialista em formulas de planilhas. Gere uma formula ${request.platform.toUpperCase()} em ${request.formulaLanguage} em resposta ao pedido em portugues. Responda APENAS com JSON valido: {"formula": "=...formula completa...", "explanation": "...explicacao em portugues...", "assumptions": ["..."], "warnings": []}`,
        input.history?.length ?? 0
      ),
      request.prompt,
      input.attachmentContext
    ),
    response_format: { type: "json_object" }
  });

  const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");

  return formulaCompletePayloadSchema.parse({
    kind: "formula",
    formula: String(raw.formula ?? ""),
    explanation: String(raw.explanation ?? ""),
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    metadata
  });
}

function splitForStreaming(payload: FormulaCompletePayload) {
  if (payload.kind === "formula") {
    return [payload.formula, "\n", payload.explanation];
  }

  return [payload.formula, "\n", ...payload.steps.map((step, index) => `${index + 1}. ${step}\n`)];
}

export function createFormulaEventStream(
  payload: FormulaCompletePayload,
  lastFreeUse?: boolean,
  attachmentMeta?: { charCount: number; wasTruncated: boolean; extractedText: string }
) {
  const encoder = new TextEncoder();
  const events: FormulaStreamEvent[] = [
    ...(attachmentMeta ? [{ type: "attachment_grounded" as const, ...attachmentMeta }] : []),
    { type: "metadata", metadata: payload.metadata },
    ...payload.warnings.map((warning): FormulaStreamEvent => ({ type: "warning", warning })),
    ...(lastFreeUse ? [{ type: "quota_warning" as const, lastFreeUse: true }] : []),
    ...splitForStreaming(payload).map((text): FormulaStreamEvent => ({ type: "delta", text })),
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


import { z } from "zod";

import { FORMULA_LANGUAGE_IDS, FORMULA_PLATFORM_IDS, getSeparatorForLanguage } from "./platforms";

export const formulaPlatformSchema = z.enum(FORMULA_PLATFORM_IDS);
export const formulaLanguageSchema = z.enum(FORMULA_LANGUAGE_IDS);
export const formulaModeSchema = z.enum(["generate", "explain"]);

export const formulaRequestBaseSchema = z.object({
  platform: formulaPlatformSchema,
  formulaLanguage: formulaLanguageSchema
});

export const formulaGenerateRequestSchema = formulaRequestBaseSchema
  .extend({
    prompt: z.string().trim().min(3, "Descreva a tarefa da planilha antes de gerar.")
  })
  .superRefine((value, ctx) => {
    const expectedSeparator = getSeparatorForLanguage(value.formulaLanguage);

    if (!expectedSeparator) {
      ctx.addIssue({
        code: "custom",
        message: "Idioma de formula invalido."
      });
    }
  });

export const formulaExplainRequestSchema = formulaRequestBaseSchema.extend({
  formula: z.string().trim().min(2, "Cole uma formula antes de explicar.")
});

export const formulaMetadataSchema = z.object({
  mode: formulaModeSchema,
  platform: formulaPlatformSchema,
  formulaLanguage: formulaLanguageSchema,
  separator: z.enum([";", ","]),
  providerModel: z.string().optional(),
  requestId: z.string().optional()
});

export const formulaGenerateResponseSchema = z.object({
  kind: z.literal("formula"),
  formula: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  assumptions: z.array(z.string().trim().min(1)).default([]),
  warnings: z.array(z.string().trim().min(1)).default([]),
  metadata: formulaMetadataSchema.extend({ mode: z.literal("generate") })
});

export const formulaExplainResponseSchema = z.object({
  kind: z.literal("explanation"),
  formula: z.string().trim().min(1),
  steps: z.array(z.string().trim().min(1)).min(1),
  assumptions: z.array(z.string().trim().min(1)).default([]),
  warnings: z.array(z.string().trim().min(1)).default([]),
  metadata: formulaMetadataSchema.extend({ mode: z.literal("explain") })
});

export const formulaCompletePayloadSchema = z.discriminatedUnion("kind", [
  formulaGenerateResponseSchema,
  formulaExplainResponseSchema
]);

export const formulaStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("metadata"), metadata: formulaMetadataSchema }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("warning"), warning: z.string() }),
  z.object({ type: z.literal("quota_warning"), lastFreeUse: z.boolean() }),
  z.object({ type: z.literal("complete"), payload: formulaCompletePayloadSchema }),
  z.object({ type: z.literal("error"), message: z.string() })
]);

export type FormulaGenerateRequest = z.infer<typeof formulaGenerateRequestSchema>;
export type FormulaExplainRequest = z.infer<typeof formulaExplainRequestSchema>;
export type FormulaMetadata = z.infer<typeof formulaMetadataSchema>;
export type FormulaGenerateResponse = z.infer<typeof formulaGenerateResponseSchema>;
export type FormulaExplainResponse = z.infer<typeof formulaExplainResponseSchema>;
export type FormulaCompletePayload = z.infer<typeof formulaCompletePayloadSchema>;
export type FormulaStreamEvent = z.infer<typeof formulaStreamEventSchema>;


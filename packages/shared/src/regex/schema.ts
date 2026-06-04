import { z } from "zod";

export const regexGenerateRequestSchema = z.object({
  prompt: z.string().trim().min(3, "Descreva o padrao antes de gerar.")
});

export const regexExplainRequestSchema = z.object({
  pattern: z.string().trim().min(1, "Cole uma expressao regular antes de explicar.")
});

export const regexMetadataSchema = z.object({
  mode: z.enum(["generate", "explain"]),
  providerModel: z.string().optional()
});

export const regexGenerateResponseSchema = z.object({
  kind: z.literal("regex_generate"),
  pattern: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  examples: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  metadata: regexMetadataSchema.extend({ mode: z.literal("generate") })
});

export const regexExplainResponseSchema = z.object({
  kind: z.literal("regex_explain"),
  pattern: z.string().trim().min(1),
  steps: z.array(z.string().trim().min(1)).min(1),
  assumptions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  metadata: regexMetadataSchema.extend({ mode: z.literal("explain") })
});

export const regexCompletePayloadSchema = z.discriminatedUnion("kind", [
  regexGenerateResponseSchema,
  regexExplainResponseSchema
]);

export const regexStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("metadata"), metadata: regexMetadataSchema }),
  z.object({ type: z.literal("attachment_grounded"), charCount: z.number().int().nonnegative(), wasTruncated: z.boolean(), extractedText: z.string() }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("warning"), warning: z.string() }),
  z.object({ type: z.literal("quota_warning"), lastFreeUse: z.boolean() }),
  z.object({ type: z.literal("complete"), payload: regexCompletePayloadSchema }),
  z.object({ type: z.literal("error"), message: z.string() })
]);

export type RegexGenerateRequest = z.infer<typeof regexGenerateRequestSchema>;
export type RegexExplainRequest = z.infer<typeof regexExplainRequestSchema>;
export type RegexMetadata = z.infer<typeof regexMetadataSchema>;
export type RegexGenerateResponse = z.infer<typeof regexGenerateResponseSchema>;
export type RegexExplainResponse = z.infer<typeof regexExplainResponseSchema>;
export type RegexCompletePayload = z.infer<typeof regexCompletePayloadSchema>;
export type RegexStreamEvent = z.infer<typeof regexStreamEventSchema>;
export type RegexAttachmentGroundedEvent = Extract<RegexStreamEvent, { type: "attachment_grounded" }>;

import { z } from "zod";

export const templateGenerateRequestSchema = z.object({
  prompt: z.string().trim().min(3, "Descreva o tipo de planilha antes de gerar.")
});

export const templateMetadataSchema = z.object({
  mode: z.literal("generate"),
  providerModel: z.string().optional()
});

export const templateGenerateResponseSchema = z.object({
  kind: z.literal("template"),
  output: z.string().trim().min(1), // Markdown ou CSV copy-ready
  explanation: z.string().trim().min(1),
  assumptions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  metadata: templateMetadataSchema
});

export const templateStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("metadata"), metadata: templateMetadataSchema }),
  z.object({ type: z.literal("attachment_grounded"), charCount: z.number().int().nonnegative(), wasTruncated: z.boolean(), extractedText: z.string() }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("warning"), warning: z.string() }),
  z.object({ type: z.literal("quota_warning"), lastFreeUse: z.boolean() }),
  z.object({ type: z.literal("complete"), payload: templateGenerateResponseSchema }),
  z.object({ type: z.literal("error"), message: z.string() })
]);

export type TemplateGenerateRequest = z.infer<typeof templateGenerateRequestSchema>;
export type TemplateMetadata = z.infer<typeof templateMetadataSchema>;
export type TemplateGenerateResponse = z.infer<typeof templateGenerateResponseSchema>;
export type TemplateStreamEvent = z.infer<typeof templateStreamEventSchema>;
export type TemplateAttachmentGroundedEvent = Extract<TemplateStreamEvent, { type: "attachment_grounded" }>;

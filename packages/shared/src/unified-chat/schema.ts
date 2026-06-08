import { z } from "zod";

import { formulaCompletePayloadSchema } from "../formula/schema";
import { regexCompletePayloadSchema } from "../regex/schema";
import { scriptGenerateResponseSchema } from "../scripts/schema";
import { sqlGenerateResponseSchema } from "../sql/schema";
import { templateGenerateResponseSchema } from "../template/schema";

export const UNIFIED_INTENTS = [
  "formula",
  "sql",
  "regex",
  "script",
  "template",
  "file_analysis",
  "ocr",
  "tabela",
  "unknown",
] as const;

export const OVERRIDE_INTENTS = [
  "formula",
  "sql",
  "regex",
  "script",
  "template",
  "file_analysis",
  "ocr",
  "tabela",
] as const;

export const FILE_DEPENDENT_INTENTS = ["file_analysis", "ocr"] as const;

export const unifiedIntentSchema = z.enum(UNIFIED_INTENTS);
export const overrideIntentSchema = z.enum(OVERRIDE_INTENTS);
export const fileDependentIntentSchema = z.enum(FILE_DEPENDENT_INTENTS);

export const intentClassificationSchema = z.object({
  intent: unifiedIntentSchema,
  confidence: z.enum(["high", "low"]),
});

export const tableStubPayloadSchema = z.object({
  kind: z.literal("table_stub"),
  originalPrompt: z.string().trim().min(1),
  message: z.string().trim().min(1),
});

export const needsFilePayloadSchema = z.object({
  kind: z.literal("needs_file"),
  intent: fileDependentIntentSchema,
});

export const unifiedCompletePayloadSchema = z.union([
  formulaCompletePayloadSchema,
  sqlGenerateResponseSchema,
  regexCompletePayloadSchema,
  scriptGenerateResponseSchema,
  templateGenerateResponseSchema,
  tableStubPayloadSchema,
  needsFilePayloadSchema,
]);

export const unifiedStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("intent_detected"),
    intent: unifiedIntentSchema,
    confidence: z.enum(["high", "low"]),
  }),
  z.object({
    type: z.literal("needs_file"),
    intent: fileDependentIntentSchema,
  }),
  z.object({ type: z.literal("metadata"), metadata: z.unknown() }),
  z.object({
    type: z.literal("attachment_grounded"),
    charCount: z.number().int().nonnegative(),
    wasTruncated: z.boolean(),
    extractedText: z.string(),
  }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("warning"), warning: z.string() }),
  z.object({ type: z.literal("quota_warning"), lastFreeUse: z.boolean() }),
  z.object({ type: z.literal("complete"), payload: unifiedCompletePayloadSchema }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);

export type UnifiedIntent = z.infer<typeof unifiedIntentSchema>;
export type OverrideIntent = z.infer<typeof overrideIntentSchema>;
export type FileDependentIntent = z.infer<typeof fileDependentIntentSchema>;
export type IntentClassification = z.infer<typeof intentClassificationSchema>;
export type TableStubPayload = z.infer<typeof tableStubPayloadSchema>;
export type NeedsFilePayload = z.infer<typeof needsFilePayloadSchema>;
export type UnifiedCompletePayload = z.infer<typeof unifiedCompletePayloadSchema>;
export type UnifiedStreamEvent = z.infer<typeof unifiedStreamEventSchema>;

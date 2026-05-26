import { z } from "zod";

export const SCRIPT_TYPES = [
  { id: "vba", label: "VBA", highlightLang: "vba" },
  { id: "apps_script", label: "Apps Script", highlightLang: "javascript" },
  { id: "airtable_script", label: "Airtable Script", highlightLang: "javascript" }
] as const;

export const SCRIPT_TYPE_IDS = SCRIPT_TYPES.map((s) => s.id) as [
  "vba",
  "apps_script",
  "airtable_script"
];
export type ScriptType = (typeof SCRIPT_TYPE_IDS)[number];
export const scriptTypeSchema = z.enum(SCRIPT_TYPE_IDS);

export const scriptGenerateRequestSchema = z.object({
  scriptType: scriptTypeSchema,
  prompt: z.string().trim().min(3, "Descreva a automacao antes de gerar.")
});

export const scriptMetadataSchema = z.object({
  mode: z.literal("generate"),
  scriptType: scriptTypeSchema,
  isDestructive: z.boolean().default(false),
  providerModel: z.string().optional()
});

export const scriptGenerateResponseSchema = z.object({
  kind: z.literal("script"),
  code: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  assumptions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  isDestructive: z.boolean().default(false),
  metadata: scriptMetadataSchema
});

export const scriptStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("metadata"), metadata: scriptMetadataSchema }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("warning"), warning: z.string() }),
  z.object({ type: z.literal("quota_warning"), lastFreeUse: z.boolean() }),
  z.object({ type: z.literal("complete"), payload: scriptGenerateResponseSchema }),
  z.object({ type: z.literal("error"), message: z.string() })
]);

export type ScriptGenerateRequest = z.infer<typeof scriptGenerateRequestSchema>;
export type ScriptMetadata = z.infer<typeof scriptMetadataSchema>;
export type ScriptGenerateResponse = z.infer<typeof scriptGenerateResponseSchema>;
export type ScriptStreamEvent = z.infer<typeof scriptStreamEventSchema>;

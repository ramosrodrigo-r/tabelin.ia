import { z } from "zod";

export const UNIFIED_INTENTS = [
  "sheet_operation",
  "qa",
  "unknown",
] as const;

export const OVERRIDE_INTENTS = [
  "sheet_operation",
  "qa",
] as const;

export const unifiedIntentSchema = z.enum(UNIFIED_INTENTS);
export const overrideIntentSchema = z.enum(OVERRIDE_INTENTS);

export const intentClassificationSchema = z.object({
  intent: unifiedIntentSchema,
  confidence: z.enum(["high", "low"]),
});

export const tableColumnSchema = z.object({
  name: z.string(),
  type: z.enum(["text", "number", "date", "currency", "formula"]),
  key: z.string().optional(),
  formula: z.string().optional(),
  width: z.number().optional(),
});

/**
 * Normalização canônica de key de coluna (CR-02). Compartilhada entre o schema
 * (validação de unicidade) e o provider de estado da planilha (seedToGridState),
 * para que escrita e validação derivem EXATAMENTE a mesma key — sem drift que
 * permita uma colisão escapar de um dos lados.
 */
export function deriveColumnKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}

export const tableSpecPayloadSchema = z
  .object({
    kind: z.literal("table_spec"),
    title: z.string(),
    // WR-03: .min(1).max(26) — alinha com o limite de UI e bloqueia payloads LLM adversariais
    columns: z.array(tableColumnSchema).min(1).max(26),
    rowCount: z.number().int().min(1).max(200),
    format: z.string().optional(),
    // Campos novos — opcionais para retrocompatibilidade com Phase 13 (D-01):
    // WR-02: .max(200) — alinha com o guard de addRow e bloqueia payloads LLM adversariais
    rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).max(200).optional(),
    formulaLanguage: z.enum(["pt-BR", "en"]).optional(),
    separator: z.enum([";", ","]).optional(),
  })
  // CR-02: rejeita colunas cuja key efetiva colide. A key efetiva é `column.key`
  // quando presente, senão a key derivada por deriveColumnKey (mesma normalização
  // de seedToGridState). Duas colunas com a mesma key efetiva sobrescreveriam uma
  // à outra no round-trip de persistência — a primeira linha de defesa é a dedupe
  // na escrita (seedToGridState), mas o schema bloqueia o caso explícito.
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.columns.forEach((column, index) => {
      const effectiveKey = column.key ?? deriveColumnKey(column.name);
      if (seen.has(effectiveKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["columns", index, "key"],
          message: "Colunas com chave duplicada não são permitidas.",
        });
        return;
      }
      seen.add(effectiveKey);
    });
  });

export const qaResponsePayloadSchema = z.object({
  kind: z.literal("qa_response"),
  content: z.string().trim().min(1),
});

export const unifiedCompletePayloadSchema = z.union([
  tableSpecPayloadSchema,
  qaResponsePayloadSchema,
]);

// WR-02: metadata do stream tem forma conhecida ({ mode, providerModel }).
// Tipar explicitamente evita asserções não verificadas a jusante e permite
// validar payloads mal-formados via safeParse em vez de cast cego.
export const unifiedChatStreamMetadataSchema = z.object({
  mode: z.string(),
  providerModel: z.string(),
});

export const unifiedStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("intent_detected"),
    intent: unifiedIntentSchema,
    confidence: z.enum(["high", "low"]),
  }),
  z.object({ type: z.literal("metadata"), metadata: unifiedChatStreamMetadataSchema }),
  z.object({
    type: z.literal("attachment_grounded"),
    charCount: z.number().int().nonnegative(),
    wasTruncated: z.boolean(),
    extractedText: z.string(),
  }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("warning"), warning: z.string() }),
  z.object({ type: z.literal("complete"), payload: unifiedCompletePayloadSchema }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);

export type UnifiedIntent = z.infer<typeof unifiedIntentSchema>;
export type OverrideIntent = z.infer<typeof overrideIntentSchema>;
export type IntentClassification = z.infer<typeof intentClassificationSchema>;
export type TableColumn = z.infer<typeof tableColumnSchema>;
export type TableSpecPayload = z.infer<typeof tableSpecPayloadSchema>;
export type QaResponsePayload = z.infer<typeof qaResponsePayloadSchema>;
export type UnifiedCompletePayload = z.infer<typeof unifiedCompletePayloadSchema>;
export type UnifiedChatStreamMetadata = z.infer<typeof unifiedChatStreamMetadataSchema>;
export type UnifiedStreamEvent = z.infer<typeof unifiedStreamEventSchema>;

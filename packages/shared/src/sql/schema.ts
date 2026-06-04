import { z } from "zod";

export const SQL_DIALECTS = [
  { id: "postgresql", label: "PostgreSQL" },
  { id: "mysql", label: "MySQL" },
  { id: "sqlserver", label: "SQL Server" },
  { id: "oracle", label: "Oracle" },
  { id: "bigquery", label: "BigQuery" }
] as const;

export const SQL_DIALECT_IDS = SQL_DIALECTS.map((d) => d.id) as [
  "postgresql",
  "mysql",
  "sqlserver",
  "oracle",
  "bigquery"
];
export type SqlDialect = (typeof SQL_DIALECT_IDS)[number];
export const sqlDialectSchema = z.enum(SQL_DIALECT_IDS);

export const sqlGenerateRequestSchema = z.object({
  dialect: sqlDialectSchema,
  prompt: z.string().trim().min(3, "Descreva a consulta antes de gerar.")
});

export const sqlMetadataSchema = z.object({
  mode: z.literal("generate"),
  dialect: sqlDialectSchema,
  isDestructive: z.boolean().default(false),
  providerModel: z.string().optional()
});

export const sqlGenerateResponseSchema = z.object({
  kind: z.literal("sql"),
  query: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  assumptions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  isDestructive: z.boolean().default(false),
  metadata: sqlMetadataSchema
});

export const sqlStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("metadata"), metadata: sqlMetadataSchema }),
  z.object({ type: z.literal("attachment_grounded"), charCount: z.number().int().nonnegative(), wasTruncated: z.boolean(), extractedText: z.string() }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("warning"), warning: z.string() }),
  z.object({ type: z.literal("quota_warning"), lastFreeUse: z.boolean() }),
  z.object({ type: z.literal("complete"), payload: sqlGenerateResponseSchema }),
  z.object({ type: z.literal("error"), message: z.string() })
]);

export type SqlGenerateRequest = z.infer<typeof sqlGenerateRequestSchema>;
export type SqlMetadata = z.infer<typeof sqlMetadataSchema>;
export type SqlGenerateResponse = z.infer<typeof sqlGenerateResponseSchema>;
export type SqlStreamEvent = z.infer<typeof sqlStreamEventSchema>;
export type SqlAttachmentGroundedEvent = Extract<SqlStreamEvent, { type: "attachment_grounded" }>;

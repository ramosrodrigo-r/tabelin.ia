import { z } from "zod";

export const fileSchemaColumnSchema = z.object({
  name: z.string(),
  type: z.enum(["numero", "data", "booleano", "texto"]),
  sampleValues: z.array(z.unknown())
});

export const fileSchemaSchema = z.object({
  columns: z.array(fileSchemaColumnSchema),
  sampleRows: z.array(z.record(z.string(), z.unknown())),
  rowCount: z.number(),
  sheetName: z.string().optional(),
  fileName: z.string()
});

export const uploadResponseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("sheet_selection"),
    sheetNames: z.array(z.string())
  }),
  z.object({
    type: z.literal("upload_complete"),
    uploadedFileId: z.string(),
    schema: fileSchemaSchema
  })
]);

export const chatRequestSchema = z.object({
  uploadedFileId: z.string().min(1),
  message: z.string().trim().min(1)
});

export const chatStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("quota_warning"), lastFreeUse: z.boolean() }),
  z.object({ type: z.literal("complete"), content: z.string() }),
  z.object({ type: z.literal("error"), message: z.string() }),
  z.object({
    type: z.literal("chart_data"),
    chartType: z.enum(["bar", "line", "pie"]),
    title: z.string(),
    xKey: z.string(),
    yKey: z.string(),
    rows: z.array(z.record(z.string(), z.union([z.string(), z.number()])))
  })
]);

export const chartDataSchema = z.object({
  chartType: z.enum(["bar", "line", "pie"]),
  title: z.string(),
  xKey: z.string(),
  yKey: z.string(),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number()])))
});

export type FileSchemaColumn = z.infer<typeof fileSchemaColumnSchema>;
export type FileSchema = z.infer<typeof fileSchemaSchema>;
export type UploadResponse = z.infer<typeof uploadResponseSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;
export type ChartData = z.infer<typeof chartDataSchema>;

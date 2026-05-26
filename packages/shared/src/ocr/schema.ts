import { z } from "zod";

export const ocrRequestSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(["image/png", "image/jpeg"])
});

export const ocrResponseSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string()))
});

export const chartDataSchema = z.object({
  chartType: z.enum(["bar", "line", "pie"]),
  title: z.string(),
  xKey: z.string(),
  yKey: z.string(),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number()])))
});

export type OcrRequest = z.infer<typeof ocrRequestSchema>;
export type OcrResponse = z.infer<typeof ocrResponseSchema>;
export type ChartData = z.infer<typeof chartDataSchema>;

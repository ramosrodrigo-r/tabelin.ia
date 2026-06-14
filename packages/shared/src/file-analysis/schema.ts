import { z } from "zod";

// Schema do arquivo tabular extraído de um CSV/XLSX anexado. Preservado após a
// remoção do tool File Analysis (Phase 18): a extração genérica de planilha
// (csv-xlsx-extractor.ts / file-parser.ts) que aterra anexos no chat unificado
// continua dependendo de FileSchema. Os schemas de upload/chat/chart do tool
// removido foram excluídos junto com fixtures.ts.

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

export type FileSchemaColumn = z.infer<typeof fileSchemaColumnSchema>;
export type FileSchema = z.infer<typeof fileSchemaSchema>;

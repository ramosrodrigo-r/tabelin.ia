import type { FormulaMetadata } from "@tabelin/shared";

import { prisma } from "@/server/db/client";

export type ToolRequestStatus = "success" | "failure";

export async function recordFormulaToolRequest(input: {
  userId: string;
  metadata: FormulaMetadata;
  status: ToolRequestStatus;
  latencyMs?: number;
}) {
  try {
    return await prisma.toolRequest.create({
      data: {
        userId: input.userId,
        toolKind: "formula",
        mode: input.metadata.mode,
        platform: input.metadata.platform,
        formulaLanguage: input.metadata.formulaLanguage,
        separator: input.metadata.separator,
        status: input.status,
        latencyMs: input.latencyMs,
        providerModel: input.metadata.providerModel
      }
    });
  } catch {
    console.warn("Formula metadata persistence skipped.");
    return null;
  }
}

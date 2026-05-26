import { prisma } from "@/server/db/client";

export type GenericToolRequestStatus = "success" | "failure";

export async function recordToolRequest(input: {
  userId: string;
  toolKind: string;
  mode: string;
  dialect?: string; // scriptType, sqlDialect, etc.
  status: GenericToolRequestStatus;
  latencyMs?: number;
  providerModel?: string;
}) {
  try {
    return await prisma.toolRequest.create({
      data: {
        userId: input.userId,
        toolKind: input.toolKind,
        mode: input.mode,
        platform: input.dialect ?? "",
        formulaLanguage: null, // null para tools não-formula (campo agora String?)
        separator: null, // idem
        status: input.status,
        latencyMs: input.latencyMs,
        providerModel: input.providerModel
      }
    });
  } catch {
    console.warn("Tool request persistence skipped.");
    return null;
  }
}

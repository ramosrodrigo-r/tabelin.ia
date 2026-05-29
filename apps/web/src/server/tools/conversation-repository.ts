import { prisma } from "@/server/db/client";

export async function saveConversationExchange(input: {
  userId: string;
  toolKind: string;
  mode: string;
  platform?: string;
  dialect?: string;
  userPrompt: string;
  assistantPayload: unknown;
}) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const count = await tx.conversationExchange.count({
          where: { userId: input.userId, toolKind: input.toolKind },
        });

        if (count >= 50) {
          const toDelete = await tx.conversationExchange.findMany({
            where: { userId: input.userId, toolKind: input.toolKind },
            orderBy: { createdAt: "asc" },
            take: count - 49,
            select: { id: true },
          });
          await tx.conversationExchange.deleteMany({
            where: { id: { in: toDelete.map((r) => r.id) } },
          });
        }

        return tx.conversationExchange.create({
          data: {
            userId: input.userId,
            toolKind: input.toolKind,
            mode: input.mode,
            platform: input.platform ?? null,
            dialect: input.dialect ?? null,
            userPrompt: input.userPrompt,
            assistantPayload: input.assistantPayload as object,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (err) {
    console.warn("ConversationExchange persistence skipped.", err);
    return null;
  }
}

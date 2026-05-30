import { GENERATE_MODE } from "@/server/ai/context-messages";
import { prisma } from "@/server/db/client";

const MAX_PAYLOAD_BYTES = 32 * 1024; // 32 KB per row

/**
 * Teto de linhas lido do banco por (userId, toolKind).
 *
 * Limita o read independentemente do prune de 50 linhas do write-path (WR-01):
 * o prune roda numa transação Serializable que engole erros e pode ser pulado
 * (transação falha, inserts manuais/backfill). Sem este `take`, o read carregaria
 * todas as linhas em memória a cada generate antes de truncateHistory descartar
 * tudo menos as mais recentes. Alinhado com MAX_EXCHANGES (context-messages.ts).
 */
const READ_LIMIT = 10;

function guardPayloadSize(payload: unknown): object {
  // Valida a forma antes de serializar (WR-02): JSON.stringify(undefined)
  // retorna o valor `undefined` (não string), então `.length` lançaria
  // TypeError; e um scalar (string/number/null) persistido numa coluna Json
  // seria rejeitado depois por serializeAssistant. Fail-closed para placeholder.
  if (typeof payload !== "object" || payload === null) {
    return { kind: "unknown", truncated: true };
  }
  const json = JSON.stringify(payload);
  if (json.length > MAX_PAYLOAD_BYTES) {
    const p = payload as Record<string, unknown>;
    return { kind: p["kind"] ?? "unknown", truncated: true };
  }
  return payload;
}

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
            assistantPayload: guardPayloadSize(input.assistantPayload),
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

export async function findConversationExchanges(userId: string, toolKind: string) {
  try {
    // Filtra por mode no read boundary (WR-01): READ_LIMIT conta só as linhas
    // que serão de fato usadas. Sem o filtro aqui, linhas `explain` recentes
    // (mesma partição toolKind) consumiriam a janela de 10 e starvavam o
    // contexto `generate` que buildToolContextMessages monta. O índice
    // @@index([userId, toolKind, createdAt]) cobre o filtro; `mode` é um
    // predicado residual de baixa cardinalidade.
    //
    // Bound o read independentemente do prune do write-path: pega as
    // READ_LIMIT linhas mais recentes (desc) e restaura ordem cronológica asc
    // para buildToolContextMessages, que espera history ordenado por createdAt asc.
    const rows = await prisma.conversationExchange.findMany({
      where: { userId, toolKind, mode: GENERATE_MODE },
      orderBy: { createdAt: "desc" },
      take: READ_LIMIT,
    });
    return rows.reverse();
  } catch (err) {
    console.warn("ConversationExchange read skipped.", err);
    return [];
  }
}

export async function deleteConversationExchanges(userId: string, toolKind: string) {
  try {
    return await prisma.conversationExchange.deleteMany({
      where: { userId, toolKind },
    });
  } catch (err) {
    console.warn("ConversationExchange delete skipped.", err);
    return null;
  }
}

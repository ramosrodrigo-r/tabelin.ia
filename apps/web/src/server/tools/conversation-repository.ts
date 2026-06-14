import type { ConversationExchange } from "@prisma/client";
import { type TableSpecPayload, tableSpecPayloadSchema } from "@tabelin/shared";

import { GENERATE_MODE } from "@/server/ai/context-messages";
import { prisma } from "@/server/db/client";

/**
 * toolKind canônico do spec ativo da planilha (D-01): exatamente uma linha
 * por usuário, substituída via transaction delete + create. Distinto dos
 * kinds de histórico de chat ("sheet_operation"/"qa").
 */
const ACTIVE_SPEC_TOOL_KIND = "unified_table";

/**
 * mode canônico do spec ativo (D-01). NÃO é GENERATE_MODE: a planilha persistida
 * não deve entrar no histórico multi-turn lido por findConversationExchanges.
 */
const ACTIVE_SPEC_MODE = "active_spec";

/**
 * Kinds do histórico unificado de chat injetados server-side (D-03):
 * apenas operações de planilha e Q&A geram trocas exibíveis no chat.
 */
const UNIFIED_CHAT_TOOL_KINDS = ["sheet_operation", "qa"] as const;

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
  // Mede bytes UTF-8 reais (WR-03): String.length conta code units UTF-16,
  // não bytes. Conteúdo em pt-BR (acentos, ç) e emoji/non-BMP usam mais bytes
  // do que code units, então a checagem por .length deixaria passar linhas
  // acima do teto de 32 KB. Buffer.byteLength reflete o tamanho armazenado.
  if (Buffer.byteLength(json, "utf8") > MAX_PAYLOAD_BYTES) {
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
  attachmentContext?: string;
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
            attachmentContext: input.attachmentContext ?? null,
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

/**
 * Lê o spec da planilha ativa do usuário (D-01). Busca o registro mais recente
 * `unified_table` e valida o payload persistido com tableSpecPayloadSchema —
 * payload malformado (schema drift, escrita parcial) é tratado como ausência
 * de spec (fail-closed) para que o caller caia no SAMPLE_SPEC.
 */
export async function getActiveSpreadsheetSpec(userId: string): Promise<TableSpecPayload | null> {
  try {
    const row = await prisma.conversationExchange.findFirst({
      where: { userId, toolKind: ACTIVE_SPEC_TOOL_KIND },
      orderBy: { createdAt: "desc" },
    });
    if (!row) return null;

    const parsed = tableSpecPayloadSchema.safeParse(row.assistantPayload);
    return parsed.success ? parsed.data : null;
  } catch (err) {
    console.warn("Active spreadsheet spec read skipped.", err);
    return null;
  }
}

/**
 * Persiste o spec da planilha ativa (D-01): mantém exatamente uma linha
 * `unified_table` por usuário, substituindo via transaction delete + create.
 * O payload passa por guardPayloadSize para respeitar o teto de 32 KB/linha.
 */
export async function saveActiveSpreadsheetSpec(
  userId: string,
  spec: TableSpecPayload,
): Promise<void> {
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.conversationExchange.deleteMany({
          where: { userId, toolKind: ACTIVE_SPEC_TOOL_KIND },
        });
        await tx.conversationExchange.create({
          data: {
            userId,
            toolKind: ACTIVE_SPEC_TOOL_KIND,
            mode: ACTIVE_SPEC_MODE,
            platform: null,
            dialect: null,
            userPrompt: "",
            assistantPayload: guardPayloadSize(spec),
            attachmentContext: null,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (err) {
    console.warn("Active spreadsheet spec persistence skipped.", err);
  }
}

/**
 * Lê o histórico unificado de chat do usuário (D-03): trocas com
 * toolKind em ["sheet_operation", "qa"] e mode GENERATE_MODE, ordenadas
 * cronologicamente (createdAt asc) para hidratar o chat server-side.
 */
export async function findUnifiedConversationExchanges(
  userId: string,
): Promise<ConversationExchange[]> {
  try {
    return await prisma.conversationExchange.findMany({
      where: {
        userId,
        toolKind: { in: [...UNIFIED_CHAT_TOOL_KINDS] },
        mode: GENERATE_MODE,
      },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    console.warn("Unified conversation read skipped.", err);
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

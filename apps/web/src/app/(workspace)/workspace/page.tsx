import { UnifiedChatTool } from "@/features/unified-chat/unified-chat-tool";
import { getCachedUser } from "@/server/request-cache";
import { findUnifiedConversationExchanges } from "@/server/tools/conversation-repository";

export default async function WorkspacePage() {
  const user = await getCachedUser();

  // D-02: deslogado renderiza o chat sem histórico (preview travado).
  // Proteção de dados (T-dw3-01): findUnifiedConversationExchanges só é chamada
  // quando há user.id; o caminho deslogado nunca toca em dados do usuário.
  if (!user) {
    return <UnifiedChatTool initialExchanges={[]} />;
  }

  // D-03: hidrata o chat unificado server-side com o histórico persistido,
  // mapeando ConversationExchange[] (Prisma) para o shape PersistedExchange[]
  // esperado pelo UnifiedChatTool. createdAt (Date) e assistantPayload (Json)
  // atravessam a fronteira RSC serializados automaticamente pelo Next.js.
  const exchanges = await findUnifiedConversationExchanges(user.id);
  const initialExchanges = exchanges.map((exchange) => ({
    id: exchange.id,
    userPrompt: exchange.userPrompt,
    assistantPayload: exchange.assistantPayload,
    mode: exchange.mode,
    platform: exchange.platform,
    dialect: exchange.dialect,
    createdAt: exchange.createdAt,
  }));

  return <UnifiedChatTool initialExchanges={initialExchanges} />;
}

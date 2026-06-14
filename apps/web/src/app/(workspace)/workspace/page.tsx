import { redirect } from "next/navigation";

import { UnifiedChatTool } from "@/features/unified-chat/unified-chat-tool";
import { getCachedUser } from "@/server/request-cache";
import { findUnifiedConversationExchanges } from "@/server/tools/conversation-repository";

export default async function WorkspacePage() {
  const user = await getCachedUser();

  if (!user) {
    redirect("/sign-in");
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

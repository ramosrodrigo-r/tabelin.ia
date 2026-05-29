import { TemplateTool } from "@/features/template/template-tool";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";
import { findConversationExchanges } from "@/server/tools/conversation-repository";

export default async function TemplatesPage() {
  const user = await getCachedUser();
  const entitlement = await getCachedEntitlement(user!.id);
  // D-10: erro de leitura não bloqueia — findConversationExchanges retorna [] em caso de falha
  const initialExchanges = await findConversationExchanges(user!.id, "template");

  return <TemplateTool entitlement={entitlement} initialExchanges={initialExchanges} />;
}

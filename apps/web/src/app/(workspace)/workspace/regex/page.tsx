import { RegexTool } from "@/features/regex/regex-tool";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";
import { findConversationExchanges } from "@/server/tools/conversation-repository";

export default async function RegexPage() {
  const user = await getCachedUser();
  const entitlement = await getCachedEntitlement(user!.id);
  // D-10: erro de leitura não bloqueia — findConversationExchanges retorna [] em caso de falha
  const initialExchanges = await findConversationExchanges(user!.id, "regex");

  return <RegexTool entitlement={entitlement} initialExchanges={initialExchanges} />;
}

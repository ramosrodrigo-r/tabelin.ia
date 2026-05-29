import { SqlTool } from "@/features/sql/sql-tool";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";
import { findConversationExchanges } from "@/server/tools/conversation-repository";

export default async function SqlPage() {
  const user = await getCachedUser();
  const entitlement = await getCachedEntitlement(user!.id);
  // D-10: erro de leitura não bloqueia — findConversationExchanges retorna [] em caso de falha
  const initialExchanges = await findConversationExchanges(user!.id, "sql");

  return <SqlTool entitlement={entitlement} initialExchanges={initialExchanges} />;
}

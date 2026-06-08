import { UnifiedChatTool } from "@/features/unified-chat/unified-chat-tool";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";

export default async function WorkspacePage() {
  const user = await getCachedUser();
  const entitlement = await getCachedEntitlement(user!.id);

  return <UnifiedChatTool entitlement={entitlement} />;
}

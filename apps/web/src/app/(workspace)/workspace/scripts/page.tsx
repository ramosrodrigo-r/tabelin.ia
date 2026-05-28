import { ScriptsTool } from "@/features/scripts/scripts-tool";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";

export default async function ScriptsPage() {
  const user = await getCachedUser();
  const entitlement = await getCachedEntitlement(user!.id);

  return <ScriptsTool entitlement={entitlement} />;
}

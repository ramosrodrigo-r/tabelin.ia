import { SqlTool } from "@/features/sql/sql-tool";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";

export default async function SqlPage() {
  const user = await getCachedUser();
  const entitlement = await getCachedEntitlement(user!.id);

  return <SqlTool entitlement={entitlement} />;
}

import { RegexTool } from "@/features/regex/regex-tool";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";

export default async function RegexPage() {
  const user = await getCachedUser();
  const entitlement = await getCachedEntitlement(user!.id);

  return <RegexTool entitlement={entitlement} />;
}

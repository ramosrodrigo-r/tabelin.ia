import { FormulaTool } from "@/features/formula/formula-tool";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";

export default async function WorkspacePage() {
  const user = await getCachedUser();
  const entitlement = await getCachedEntitlement(user!.id);

  return <FormulaTool entitlement={entitlement} />;
}

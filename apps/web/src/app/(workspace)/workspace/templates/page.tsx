import { TemplateTool } from "@/features/template/template-tool";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";

export default async function TemplatesPage() {
  const user = await getCachedUser();
  const entitlement = await getCachedEntitlement(user!.id);

  return <TemplateTool entitlement={entitlement} />;
}

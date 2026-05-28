import { FileAnalysisTool } from "@/features/file-analysis/file-analysis-tool";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";

export default async function FileAnalysisPage() {
  const user = await getCachedUser();
  const entitlement = await getCachedEntitlement(user!.id);

  return <FileAnalysisTool entitlement={entitlement} />;
}

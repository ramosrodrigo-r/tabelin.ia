import { OcrTool } from "@/features/ocr/ocr-tool";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";

export default async function OcrPage() {
  const user = await getCachedUser();
  const entitlement = await getCachedEntitlement(user!.id);

  return <OcrTool entitlement={entitlement} />;
}

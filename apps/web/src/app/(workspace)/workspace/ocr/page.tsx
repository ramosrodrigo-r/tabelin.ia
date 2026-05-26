import { redirect } from "next/navigation";

import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { OcrTool } from "@/features/ocr/ocr-tool";
import { getCurrentUser } from "@/server/auth/session";
import { getUserEntitlement } from "@/server/billing/entitlements";
import { getSupportLinks } from "@/server/support/support-config";

export default async function OcrPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const entitlement = await getUserEntitlement(user.id);
  const supportLinks = getSupportLinks();

  return (
    <div className="workspace-layout">
      <Sidebar />
      <div className="workspace-main">
        <Topbar user={user} entitlement={entitlement} supportLinks={supportLinks} />
        <main className="workspace-content">
          <section className="workspace-heading">
            <div>
              <h1>OCR — Imagem para Planilha</h1>
              <p>Converta imagens de tabelas em dados copiaveis para Excel ou Sheets.</p>
            </div>
          </section>
          <OcrTool entitlement={entitlement} />
        </main>
      </div>
    </div>
  );
}

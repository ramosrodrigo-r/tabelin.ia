import { redirect } from "next/navigation";

import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { FileAnalysisTool } from "@/features/file-analysis/file-analysis-tool";
import { getCurrentUser } from "@/server/auth/session";
import { getUserEntitlement } from "@/server/billing/entitlements";
import { getSupportLinks } from "@/server/support/support-config";

export default async function FileAnalysisPage() {
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
              <h1>Analise de Arquivo</h1>
              <p>Faca perguntas sobre planilhas enviadas</p>
            </div>
          </section>
          <FileAnalysisTool entitlement={entitlement} />
        </main>
      </div>
    </div>
  );
}

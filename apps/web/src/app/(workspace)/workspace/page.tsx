import { redirect } from "next/navigation";

import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { FormulaTool } from "@/features/formula/formula-tool";
import { getCurrentUser } from "@/server/auth/session";
import { getUserEntitlement } from "@/server/billing/entitlements";
import { getSupportLinks } from "@/server/support/support-config";

export default async function WorkspacePage() {
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
              <h1>Workspace de formulas</h1>
              <p>Descreva a tarefa em portugues e receba uma formula pronta para copiar.</p>
            </div>
          </section>
          <FormulaTool entitlement={entitlement} />
        </main>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";

import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { RegexTool } from "@/features/regex/regex-tool";
import { getCurrentUser } from "@/server/auth/session";
import { getUserEntitlement } from "@/server/billing/entitlements";
import { getSupportLinks } from "@/server/support/support-config";

export default async function RegexPage() {
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
              <h1>Regex</h1>
              <p>Gere e explique expressoes regulares para validacao e limpeza de dados.</p>
            </div>
          </section>
          <RegexTool entitlement={entitlement} />
        </main>
      </div>
    </div>
  );
}

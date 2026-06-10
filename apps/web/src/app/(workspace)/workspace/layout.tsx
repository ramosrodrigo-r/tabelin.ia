import { redirect } from "next/navigation";

import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { getCachedEntitlement, getCachedUser } from "@/server/request-cache";
import { getSupportLinks } from "@/server/support/support-config";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedUser();

  if (!user) {
    redirect("/sign-in");
  }

  const entitlement = await getCachedEntitlement(user.id);
  const supportLinks = getSupportLinks();

  return (
    <WorkspaceShell>
      <div className="workspace-page">
        <Topbar user={user} entitlement={entitlement} supportLinks={supportLinks} />
        <div className="workspace-body">
          <Sidebar />
          <main className="workspace-content">
            <div className="workspace-center">{children}</div>
          </main>
        </div>
      </div>
    </WorkspaceShell>
  );
}

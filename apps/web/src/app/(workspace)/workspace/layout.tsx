import { redirect } from "next/navigation";

import { Topbar } from "@/components/app/topbar";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { WorkspaceSplit } from "@/components/app/workspace-split";
import { TableGridPanel } from "@/features/unified-chat/components/table-grid-panel";
import { getCachedUser } from "@/server/request-cache";
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

  const supportLinks = getSupportLinks();

  return (
    <WorkspaceShell>
      <div className="workspace-page">
        <Topbar user={user} supportLinks={supportLinks} />
        <div className="workspace-body">
          <WorkspaceSplit grid={<TableGridPanel />} chat={children} />
        </div>
      </div>
    </WorkspaceShell>
  );
}

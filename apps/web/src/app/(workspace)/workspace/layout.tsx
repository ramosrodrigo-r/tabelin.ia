import { redirect } from "next/navigation";

import { Topbar } from "@/components/app/topbar";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { WorkspaceSplit } from "@/components/app/workspace-split";
import { TableGridPanel } from "@/features/unified-chat/components/table-grid-panel";
import { SAMPLE_SPEC } from "@/features/unified-chat/lib/sample-spec";
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
          <WorkspaceSplit grid={<TableGridPanel spec={SAMPLE_SPEC} />} chat={children} />
        </div>
      </div>
    </WorkspaceShell>
  );
}

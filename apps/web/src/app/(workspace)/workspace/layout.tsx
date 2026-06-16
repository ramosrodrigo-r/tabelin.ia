import { AuthGate } from "@/components/app/auth-gate";
import { Topbar } from "@/components/app/topbar";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { WorkspaceSplit } from "@/components/app/workspace-split";
import { TableGridPanel } from "@/features/unified-chat/components/table-grid-panel";
import { SAMPLE_SPEC } from "@/features/unified-chat/lib/sample-spec";
import { getCachedUser } from "@/server/request-cache";
import { getSupportLinks } from "@/server/support/support-config";
import { getActiveSpreadsheetSpec } from "@/server/tools/conversation-repository";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedUser();
  const isAuthenticated = Boolean(user);

  const supportLinks = getSupportLinks();

  // D-02: deslogado renderiza a MESMA casca em modo preview travado.
  // Proteção de dados (T-dw3-01): getActiveSpreadsheetSpec só é chamada quando há user.id;
  // o caminho deslogado usa SAMPLE_SPEC (dados-demo) e nunca toca em dados do usuário.
  const initialSpec = user
    ? ((await getActiveSpreadsheetSpec(user.id)) ?? undefined)
    : SAMPLE_SPEC;

  return (
    <WorkspaceShell initialSpec={initialSpec}>
      <div className="workspace-page">
        <Topbar user={user ?? undefined} supportLinks={supportLinks} />
        <AuthGate isAuthenticated={isAuthenticated}>
          <div className="workspace-body">
            <WorkspaceSplit grid={<TableGridPanel />} chat={children} />
          </div>
        </AuthGate>
      </div>
    </WorkspaceShell>
  );
}

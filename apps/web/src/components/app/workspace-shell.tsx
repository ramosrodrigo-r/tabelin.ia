"use client";

import type { TableSpecPayload } from "@tabelin/shared";

import { WorkspaceConversationProvider } from "./workspace-conversation-context";
import { WorkspaceStateProvider } from "./workspace-state-context";

/**
 * Shell client wrapper do workspace layout.
 *
 * Envolve {children} no WorkspaceConversationProvider e WorkspaceStateProvider
 * para que os componentes do workspace compartilhem o estado de conversas e da planilha viva.
 *
 * `initialSpec` (D-03) é o spec ativo carregado server-side pelo WorkspaceLayout;
 * é repassado ao WorkspaceStateProvider para inicialização sem flash.
 */
export function WorkspaceShell({
  children,
  initialSpec,
}: {
  children: React.ReactNode;
  initialSpec?: TableSpecPayload;
}) {
  return (
    <WorkspaceConversationProvider>
      <WorkspaceStateProvider initialSpec={initialSpec}>{children}</WorkspaceStateProvider>
    </WorkspaceConversationProvider>
  );
}

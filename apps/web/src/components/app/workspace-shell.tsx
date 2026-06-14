"use client";

import { WorkspaceConversationProvider } from "./workspace-conversation-context";
import { WorkspaceStateProvider } from "./workspace-state-context";

/**
 * Shell client wrapper do workspace layout.
 *
 * Envolve {children} no WorkspaceConversationProvider e WorkspaceStateProvider
 * para que os componentes do workspace compartilhem o estado de conversas e da planilha viva.
 */
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceConversationProvider>
      <WorkspaceStateProvider>{children}</WorkspaceStateProvider>
    </WorkspaceConversationProvider>
  );
}

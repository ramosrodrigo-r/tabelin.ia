"use client";

import { WorkspaceConversationProvider } from "./workspace-conversation-context";

/**
 * Shell client wrapper do workspace layout.
 *
 * Envolve {children} no WorkspaceConversationProvider para que os tool components
 * (client) possam registrar onNewConversation e o Topbar possa invocá-lo —
 * sem alterar o layout server component nem as pages.
 */
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return <WorkspaceConversationProvider>{children}</WorkspaceConversationProvider>;
}

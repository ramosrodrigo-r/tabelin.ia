"use client";

import { createContext, useCallback, useContext, useRef } from "react";

/**
 * Contexto mínimo para comunicar onNewConversation dos tool components ao Topbar.
 *
 * Estratégia (Tarefa 0, Plano 04):
 * - O layout do workspace é server component — não pode receber callbacks de tool components.
 * - O Topbar é client component e está no layout server; ele lê este contexto.
 * - Os tool components (client) registram handleNewConversation via useRegisterNewConversation.
 * - O Topbar invoca o callback registrado após confirmar o hard delete.
 * - toolKind é derivado internamente pelo Topbar via usePathname — sem alterar layout ou pages.
 */

type WorkspaceConversationContextValue = {
  register: (fn: () => void) => void;
  invoke: () => void;
};

const WorkspaceConversationContext = createContext<WorkspaceConversationContextValue | null>(null);

export function WorkspaceConversationProvider({ children }: { children: React.ReactNode }) {
  const callbackRef = useRef<(() => void) | null>(null);

  const register = useCallback((fn: () => void) => {
    callbackRef.current = fn;
  }, []);

  const invoke = useCallback(() => {
    callbackRef.current?.();
  }, []);

  return (
    <WorkspaceConversationContext value={{ register, invoke }}>
      {children}
    </WorkspaceConversationContext>
  );
}

/** Usado pelos tool components para registrar o handleNewConversation local. */
export function useRegisterNewConversation(fn: () => void) {
  const ctx = useContext(WorkspaceConversationContext);
  // Registra sempre que fn muda (dependência estável via useCallback no tool component)
  if (ctx) {
    ctx.register(fn);
  }
}

/** Usado pelo Topbar para invocar o callback registrado. */
export function useInvokeNewConversation() {
  const ctx = useContext(WorkspaceConversationContext);
  return ctx ? ctx.invoke : null;
}

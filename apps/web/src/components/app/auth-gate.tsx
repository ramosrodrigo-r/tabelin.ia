"use client";

import { AuthGateModal } from "@/components/app/auth-gate-modal";

/**
 * Gate de autenticação (D-02).
 *
 * Autenticado: renderiza apenas {children} (sem overlay).
 *
 * Deslogado: renderiza {children} (a casca de preview com SAMPLE_SPEC) MAIS um
 * overlay fixo que cobre a viewport e captura QUALQUER clique (pointer-events
 * ativos), de modo que nenhuma interação chega ao conteúdo travado. O overlay
 * sempre monta o AuthGateModal — não-dispensável: não há estado de "fechado"
 * (T-dw3-02: o gate é UX; a proteção real é server-side).
 */
export function AuthGate({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean;
  children: React.ReactNode;
}) {
  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <div className="auth-gate-overlay" data-testid="auth-gate-overlay">
        <AuthGateModal />
      </div>
    </>
  );
}

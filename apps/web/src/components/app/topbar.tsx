"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useInvokeNewConversation } from "@/components/app/workspace-conversation-context";
import type { SessionUser } from "@/server/auth/session";
import type { SupportLinks } from "@/server/support/support-config";

export function Topbar({
  user,
  toolKind: toolKindProp,
  onNewConversation: onNewConversationProp,
}: {
  user: SessionUser;
  supportLinks: SupportLinks;
  toolKind?: string;
  onNewConversation?: () => void;
}) {
  const router = useRouter();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showNewConvPopover, setShowNewConvPopover] = useState(false);
  const newConvTriggerRef = useRef<HTMLButtonElement>(null);
  const newConvContainerRef = useRef<HTMLDivElement>(null);

  // toolKind fixo "unified" — única tela após o corte de navegação multi-ferramenta
  const toolKind = toolKindProp ?? "unified";
  const deleteCopy =
    toolKind === "unified"
      ? "Apagar todo o histórico do chat unificado? Esta ação não pode ser desfeita."
      : "Apagar o histórico deste tool? Esta ação não pode ser desfeita.";

  // Invoca o callback registrado pelo tool component ativo via contexto
  const invokeNewConversation = useInvokeNewConversation();
  const onNewConversation = onNewConversationProp ?? invokeNewConversation ?? undefined;

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/sign-in");
  }

  async function handleDeleteHistory() {
    await fetch(`/api/conversations/${toolKind}`, { method: "DELETE" });
    onNewConversation?.();
    setShowNewConvPopover(false);
    newConvTriggerRef.current?.focus();
  }

  useEffect(() => {
    if (!showNewConvPopover) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowNewConvPopover(false);
        newConvTriggerRef.current?.focus();
      }
    }

    function handleMouseDown(e: MouseEvent) {
      if (
        newConvContainerRef.current &&
        !newConvContainerRef.current.contains(e.target as Node)
      ) {
        setShowNewConvPopover(false);
        newConvTriggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [showNewConvPopover]);

  return (
    <header className="topbar">
      <strong className="topbar-brand">Tabelin.IA</strong>
      <div className="topbar-actions">
        {toolKind ? (
          <div className="account-menu-container" ref={newConvContainerRef}>
            <button
              ref={newConvTriggerRef}
              className="ghost-button"
              type="button"
              onClick={() => setShowNewConvPopover(!showNewConvPopover)}
              aria-expanded={showNewConvPopover}
              aria-haspopup="dialog"
            >
              Nova conversa
            </button>
            {showNewConvPopover ? (
              <div
                className="account-menu"
                role="dialog"
                aria-label="Confirmar exclusão do histórico"
              >
                <p style={{ margin: 0, padding: "4px 8px 8px", fontSize: 14 }}>{deleteCopy}</p>
                <div style={{ display: "flex", gap: 8, padding: "0 4px 4px" }}>
                  <button
                    className="ghost-button"
                    type="button"
                    style={{ color: "var(--destructive)", borderColor: "var(--destructive)" }}
                    onClick={handleDeleteHistory}
                  >
                    Apagar histórico
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => setShowNewConvPopover(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <a href="/privacidade" className="ghost-button">
          Privacidade
        </a>
        <div className="account-menu-container">
          <button
            className="ghost-button"
            type="button"
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            aria-expanded={showAccountMenu}
            aria-haspopup="true"
          >
            {user.email}
          </button>
          {showAccountMenu ? (
            <div className="account-menu" role="menu">
              <button className="menu-item" type="button" onClick={signOut} role="menuitem">
                <LogOut aria-hidden size={16} />
                Sair
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

"use client";

import { LogOut, Mail, MessageCircle, Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useInvokeNewConversation } from "@/components/app/workspace-conversation-context";
import type { SessionUser } from "@/server/auth/session";
import type { SupportLinks } from "@/server/support/support-config";
import type { UserEntitlement } from "@tabelin/shared";

/** Deriva o toolKind canônico a partir da URL do workspace atual. */
function useWorkspaceToolKind(): string | undefined {
  const pathname = usePathname();
  if (!pathname) return undefined;
  // Rotas: /workspace (formula), /workspace/sql, /workspace/regex, /workspace/scripts, /workspace/templates
  if (/\/workspace\/sql(\/|$)/.test(pathname)) return "sql";
  if (/\/workspace\/regex(\/|$)/.test(pathname)) return "regex";
  if (/\/workspace\/scripts(\/|$)/.test(pathname)) return "script";
  if (/\/workspace\/templates(\/|$)/.test(pathname)) return "template";
  // Formula é a raiz exata /workspace — NÃO usar prefixo, senão captura
  // /workspace/file-analysis e /workspace/ocr (efêmeros, sem histórico — D-07).
  if (/\/workspace\/?$/.test(pathname)) return "formula";
  return undefined;
}

export function Topbar({
  user,
  entitlement,
  supportLinks,
  toolKind: toolKindProp,
  onNewConversation: onNewConversationProp,
}: {
  user: SessionUser;
  entitlement: UserEntitlement;
  supportLinks: SupportLinks;
  toolKind?: string;
  onNewConversation?: () => void;
}) {
  const router = useRouter();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showNewConvPopover, setShowNewConvPopover] = useState(false);
  const newConvTriggerRef = useRef<HTMLButtonElement>(null);
  const newConvContainerRef = useRef<HTMLDivElement>(null);
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";

  // Deriva toolKind da rota atual — usa prop legada se fornecida (compatibilidade futura)
  const toolKindFromPath = useWorkspaceToolKind();
  const toolKind = toolKindProp ?? toolKindFromPath;

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
        {isPro ? (
          <span className="pro-badge" title="Plano Pro ativo">
            <Sparkles aria-hidden size={14} />
            Pro
          </span>
        ) : null}
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
                <p style={{ margin: 0, padding: "4px 8px 8px", fontSize: 14 }}>
                  Apagar o histórico deste tool? Esta ação não pode ser desfeita.
                </p>
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
              {isPro ? (
                <>
                  <div className="menu-section">
                    <span className="menu-label">Suporte Pro</span>
                    <a href={supportLinks.emailHref} className="menu-item" role="menuitem">
                      <Mail aria-hidden size={16} />
                      Email prioritario
                    </a>
                    {supportLinks.whatsAppHref ? (
                      <a
                        href={supportLinks.whatsAppHref}
                        className="menu-item"
                        target="_blank"
                        rel="noopener noreferrer"
                        role="menuitem"
                      >
                        <MessageCircle aria-hidden size={16} />
                        WhatsApp
                      </a>
                    ) : null}
                  </div>
                  <div className="menu-divider" />
                </>
              ) : null}
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

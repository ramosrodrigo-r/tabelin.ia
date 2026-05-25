"use client";

import { LogOut, Mail, MessageCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { SessionUser } from "@/server/auth/session";
import type { SupportLinks } from "@/server/support/support-config";
import type { UserEntitlement } from "@tabelin/shared";

export function Topbar({
  user,
  entitlement,
  supportLinks,
}: {
  user: SessionUser;
  entitlement: UserEntitlement;
  supportLinks: SupportLinks;
}) {
  const router = useRouter();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/sign-in");
  }

  return (
    <header className="topbar">
      <div className="topbar-title">
        <strong>Formula</strong>
        <span>Saida localizada para Excel, Sheets, Airtable e LibreOffice.</span>
      </div>
      <div className="topbar-actions">
        {isPro ? (
          <span className="pro-badge" title="Plano Pro ativo">
            <Sparkles aria-hidden size={14} />
            Pro
          </span>
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
                      <a href={supportLinks.whatsAppHref} className="menu-item" target="_blank" rel="noopener noreferrer" role="menuitem">
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

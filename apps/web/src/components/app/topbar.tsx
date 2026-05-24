"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import type { SessionUser } from "@/server/auth/session";

export function Topbar({ user }: { user: SessionUser }) {
  const router = useRouter();

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
        <span>{user.email}</span>
        <button className="ghost-button" type="button" onClick={signOut}>
          <LogOut aria-hidden size={16} />
          Sair
        </button>
      </div>
    </header>
  );
}


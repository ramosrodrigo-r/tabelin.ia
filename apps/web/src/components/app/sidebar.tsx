"use client";

import type { LucideIcon } from "lucide-react";
import {
  Braces,
  FileSpreadsheet,
  FileText,
  Image,
  LayoutTemplate,
  Regex,
  ScrollText
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem =
  | { label: string; icon: LucideIcon; href: string; disabled?: never }
  | { label: string; icon: LucideIcon; disabled: true; href?: never };

const navItems: NavItem[] = [
  { label: "Formula", icon: FileSpreadsheet, href: "/workspace" },
  { label: "Scripts", icon: Braces, href: "/workspace/scripts" },
  { label: "SQL", icon: ScrollText, href: "/workspace/sql" },
  { label: "Regex", icon: Regex, href: "/workspace/regex" },
  { label: "Templates", icon: LayoutTemplate, href: "/workspace/templates" },
  { label: "File Analysis", icon: FileText, disabled: true },
  { label: "OCR", icon: Image, disabled: true }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar" aria-label="Ferramentas">
      <div className="sidebar-brand">
        <strong>Tabelin.IA</strong>
        <span>Planilhas, codigo e dados</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <Icon aria-hidden size={18} />
              <span>{item.label}</span>
            </>
          );

          if (item.disabled) {
            return (
              <span
                className="nav-item"
                data-disabled="true"
                key={item.label}
                aria-disabled="true"
              >
                {content}
              </span>
            );
          }

          // Active state dinâmico: exact match para /workspace (Formula),
          // startsWith para sub-rotas das demais ferramentas
          const isActive =
            item.href === "/workspace"
              ? pathname === "/workspace"
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link className="nav-item" data-active={isActive} href={item.href} key={item.label}>
              {content}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

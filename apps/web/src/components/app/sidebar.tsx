import type { LucideIcon } from "lucide-react";
import { Braces, FileSpreadsheet, FileText, Image, Regex, ScrollText } from "lucide-react";
import Link from "next/link";

type NavItem =
  | { label: string; icon: LucideIcon; href: string; active: true; disabled?: never }
  | { label: string; icon: LucideIcon; disabled: true; href?: never; active?: never };

const navItems: NavItem[] = [
  { label: "Formula", icon: FileSpreadsheet, href: "/workspace", active: true },
  { label: "Scripts", icon: Braces, disabled: true },
  { label: "SQL", icon: ScrollText, disabled: true },
  { label: "Regex", icon: Regex, disabled: true },
  { label: "File Analysis", icon: FileText, disabled: true },
  { label: "OCR", icon: Image, disabled: true }
];

export function Sidebar() {
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
              <span className="nav-item" data-disabled="true" key={item.label} aria-disabled="true">
                {content}
              </span>
            );
          }

          return (
            <Link className="nav-item" data-active={item.active} href={item.href} key={item.label}>
              {content}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

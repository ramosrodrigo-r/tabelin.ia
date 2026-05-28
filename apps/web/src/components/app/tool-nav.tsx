"use client";

import {
  Braces,
  FileSpreadsheet,
  FileText,
  Image,
  LayoutTemplate,
  Regex,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tools = [
  { label: "Fórmula", href: "/workspace", icon: FileSpreadsheet },
  { label: "Scripts", href: "/workspace/scripts", icon: Braces },
  { label: "SQL", href: "/workspace/sql", icon: ScrollText },
  { label: "Regex", href: "/workspace/regex", icon: Regex },
  { label: "Análise", href: "/workspace/file-analysis", icon: FileText },
  { label: "OCR", href: "/workspace/ocr", icon: Image },
  { label: "Templates", href: "/workspace/templates", icon: LayoutTemplate },
];

export function ToolNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="tool-nav" aria-label="Ferramentas disponíveis">
      {tools.map(({ label, href, icon: Icon }) => {
        const isActive =
          href === "/workspace"
            ? pathname === "/workspace"
            : pathname === href || pathname.startsWith(href + "/");

        return (
          <Link
            key={href}
            href={href}
            className="tool-pill"
            data-active={isActive}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={13} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

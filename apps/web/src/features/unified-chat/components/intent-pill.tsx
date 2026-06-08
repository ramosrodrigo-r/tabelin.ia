"use client";

import {
  Braces,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Image,
  LayoutTemplate,
  Regex,
  ScrollText,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { OverrideIntent, UnifiedIntent } from "@tabelin/shared";

type IntentOption = {
  intent: OverrideIntent;
  label: string;
  Icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
};

const INTENT_LABELS: Record<UnifiedIntent, string> = {
  formula: "Fórmula",
  sql: "SQL",
  regex: "Regex",
  script: "Script",
  template: "Template",
  file_analysis: "Análise",
  ocr: "OCR",
  tabela: "Tabela",
  unknown: "Fórmula",
};

const INTENT_ICONS: Record<UnifiedIntent, React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>> = {
  formula: FileSpreadsheet,
  sql: ScrollText,
  regex: Regex,
  script: Braces,
  template: LayoutTemplate,
  file_analysis: FileText,
  ocr: Image,
  tabela: LayoutTemplate,
  unknown: FileSpreadsheet,
};

const OVERRIDE_OPTIONS: IntentOption[] = [
  { intent: "formula", label: "Fórmula", Icon: FileSpreadsheet },
  { intent: "sql", label: "SQL", Icon: ScrollText },
  { intent: "regex", label: "Regex", Icon: Regex },
  { intent: "script", label: "Script", Icon: Braces },
  { intent: "file_analysis", label: "Análise", Icon: FileText },
  { intent: "ocr", label: "OCR", Icon: Image },
  { intent: "tabela", label: "Tabela", Icon: LayoutTemplate },
];

export function getIntentLabel(intent: UnifiedIntent | null) {
  return intent ? INTENT_LABELS[intent] : "";
}

export function IntentPill({
  intent,
  corrected = false,
  onOverride,
}: {
  intent: UnifiedIntent | null;
  corrected?: boolean;
  onOverride: (intent: OverrideIntent) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedIntent = intent ?? "unknown";
  const label = getIntentLabel(normalizedIntent);
  const Icon = INTENT_ICONS[normalizedIntent];

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open]);

  return (
    <div className="intent-pill-container" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="tool-pill intent-pill-trigger"
        data-active={corrected ? "true" : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Tipo detectado: ${label}. Clique para corrigir.`}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon size={13} aria-hidden />
        {label} · {corrected ? "corrigido" : "detectado"}
        <ChevronDown size={12} aria-hidden />
      </button>

      {open ? (
        <div className="account-menu intent-pill-menu" role="listbox" aria-label="Mudar o tipo de resposta">
          <div className="menu-section">
            <span className="menu-label">Mudar o tipo de resposta</span>
            <p className="intent-pill-hint">Refaz a geração com a ferramenta escolhida.</p>
            {OVERRIDE_OPTIONS.map(({ intent: optionIntent, label: optionLabel, Icon: OptionIcon }) => (
              <button
                key={optionIntent}
                type="button"
                role="option"
                aria-selected={optionIntent === normalizedIntent}
                className="menu-item"
                data-active={optionIntent === normalizedIntent ? "true" : undefined}
                onClick={() => {
                  setOpen(false);
                  onOverride(optionIntent);
                  triggerRef.current?.focus();
                }}
              >
                <OptionIcon size={16} aria-hidden />
                {optionLabel}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

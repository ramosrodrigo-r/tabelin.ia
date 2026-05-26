"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

export function CopyButton({ value, disabled, label }: { value: string; disabled?: boolean; label?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1800);

    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    if (disabled || !value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(true);
  }

  const copyLabel = label ?? "Copiar";

  return (
    <button
      aria-label={copied ? "Copiado!" : copyLabel}
      className="copy-button"
      disabled={disabled || !value}
      onClick={copy}
      title={copied ? "Copiado!" : copyLabel}
      type="button"
    >
      {copied ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} />}
      <span>{copied ? "Copiado!" : copyLabel}</span>
    </button>
  );
}

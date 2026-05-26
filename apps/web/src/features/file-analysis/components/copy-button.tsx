"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

export function CopyButton({ value, disabled }: { value: string; disabled?: boolean }) {
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

  return (
    <button
      aria-label={copied ? "Copiado" : "Copiar resultado"}
      className="copy-button"
      disabled={disabled || !value}
      onClick={copy}
      title={copied ? "Copiado" : "Copiar resultado"}
      type="button"
    >
      {copied ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} />}
      <span>{copied ? "Copiado" : "Copiar"}</span>
    </button>
  );
}

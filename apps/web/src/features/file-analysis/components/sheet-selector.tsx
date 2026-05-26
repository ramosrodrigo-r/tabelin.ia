"use client";

import { useState } from "react";

type Props = {
  sheetNames: string[];
  onSelect: (sheet: string) => void;
  onConfirm: () => void;
};

export function SheetSelector({ sheetNames, onSelect, onConfirm }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(name: string) {
    setSelected(name);
    onSelect(name);
  }

  return (
    <div className="tool-panel">
      <h2>Escolher aba</h2>
      <p
        style={{ fontSize: "14px", color: "var(--muted)", margin: "0 0 12px" }}
      >
        Arquivo com multiplas abas — escolha qual analisar
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
        {sheetNames.map((name) => (
          <button
            aria-pressed={selected === name}
            className="segment-button"
            key={name}
            onClick={() => handleSelect(name)}
            type="button"
            style={{
              border:
                selected === name
                  ? "1px solid var(--primary)"
                  : "1px solid var(--border)",
              borderRadius: "6px",
              background: "#fff",
              padding: "4px 12px",
              fontSize: "14px",
              color: selected === name ? "var(--primary)" : "var(--text)",
              fontWeight: selected === name ? 650 : 400,
              cursor: "pointer"
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <button
        className="primary-button"
        disabled={!selected}
        onClick={onConfirm}
        type="button"
        style={{ width: "100%" }}
      >
        Confirmar aba
      </button>
    </div>
  );
}

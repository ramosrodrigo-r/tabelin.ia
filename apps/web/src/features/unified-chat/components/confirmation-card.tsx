"use client";

import { useState } from "react";

// Tipo local temporário — substituído por import de @tabelin/shared no Plan 02
type TableSpecPayload = {
  kind: "table_spec";
  title: string;
  columns: Array<{ name: string; type: string }>;
  rowCount: number;
  format?: string;
};

export function ConfirmationCard({
  payload,
  onConfirm,
}: {
  payload: TableSpecPayload;
  onConfirm: (spec: TableSpecPayload) => void;
}) {
  const [editedSpec, setEditedSpec] = useState(payload);

  function handleConfirm() {
    onConfirm(editedSpec);
  }

  return (
    <div className="assistant-card" aria-label="Confirmar especificação da tabela">
      <div className="output-header">
        <h2>Confirme os detalhes da tabela</h2>
      </div>
      <div className="output-box" data-status="complete">
        <p>
          <strong>Título:</strong> {editedSpec.title}
        </p>
        <ul aria-label="Colunas da tabela">
          {editedSpec.columns.map((col, index) => (
            <li key={index}>
              {col.name} ({col.type})
            </li>
          ))}
        </ul>
        <p>
          <strong>Linhas:</strong> {editedSpec.rowCount}
        </p>
        <button
          className="ghost-button"
          type="button"
          onClick={handleConfirm}
        >
          Confirmar e Gerar
        </button>
      </div>
    </div>
  );
}

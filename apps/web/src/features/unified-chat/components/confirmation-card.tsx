"use client";

import { useState } from "react";

import type { TableSpecPayload } from "@tabelin/shared";

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

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditedSpec((current) => ({ ...current, title: e.target.value }));
  }

  function handleColumnNameChange(index: number, name: string) {
    setEditedSpec((current) => ({
      ...current,
      columns: current.columns.map((col, i) => (i === index ? { ...col, name } : col)),
    }));
  }

  function handleRowCountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 200) {
      setEditedSpec((current) => ({ ...current, rowCount: value }));
    }
  }

  return (
    <div className="assistant-card" aria-label="Confirmar especificação da tabela">
      <div className="output-header">
        <h2>Confirme os detalhes da tabela</h2>
      </div>
      <div className="output-box" data-status="complete">
        <div>
          <label htmlFor="confirmation-title">
            <strong>Título:</strong>
          </label>
          <input
            id="confirmation-title"
            type="text"
            value={editedSpec.title}
            onChange={handleTitleChange}
            aria-label="Título da tabela"
          />
        </div>
        <div>
          <strong>Colunas:</strong>
          <ul aria-label="Colunas da tabela">
            {editedSpec.columns.map((col, index) => (
              <li key={index}>
                <input
                  type="text"
                  value={col.name}
                  onChange={(e) => handleColumnNameChange(index, e.target.value)}
                  aria-label={`Nome da coluna ${index + 1}`}
                />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label htmlFor="confirmation-rowcount">
            <strong>Linhas:</strong>
          </label>
          <input
            id="confirmation-rowcount"
            type="number"
            min="1"
            max="200"
            value={editedSpec.rowCount}
            onChange={handleRowCountChange}
            aria-label="Número de linhas da tabela"
          />
        </div>
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

"use client";

import { FileText, X } from "lucide-react";

export function AttachmentChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const sizeLabel =
    file.size > 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

  return (
    <div
      className="attachment-chip"
      role="status"
      aria-label={`Arquivo anexado: ${file.name}, ${sizeLabel}`}
    >
      <FileText size={14} aria-hidden />
      <span className="attachment-chip-name">{file.name}</span>
      <span className="attachment-chip-size">{sizeLabel}</span>
      <button
        type="button"
        aria-label="Remover arquivo"
        className="attachment-chip-remove"
        onClick={onRemove}
      >
        <X size={12} aria-hidden />
      </button>
    </div>
  );
}

"use client";

import { Paperclip } from "lucide-react";
import { useRef } from "react";

export const SUPPORTED_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "application/pdf",
  "text/plain",
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validateFile(file: File): string | null {
  const isExtFallback = file.name.endsWith(".csv") || file.name.endsWith(".xlsx");
  if (!SUPPORTED_TYPES.includes(file.type) && !isExtFallback) {
    return "Tipo não suportado. Use CSV, XLSX, PNG, JPEG, PDF ou TXT.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Arquivo muito grande. O limite é 5 MB.";
  }
  return null;
}

export function AttachmentButton({
  isPro,
  onFileSelect,
  disabled,
}: {
  isPro: boolean;
  onFileSelect: (f: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isPro) {
    return (
      <button
        type="button"
        className="attachment-btn"
        disabled
        title="Recurso exclusivo Pro"
        aria-label="Anexar arquivo (exclusivo Pro)"
      >
        <Paperclip size={16} aria-hidden />
      </button>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.png,.jpeg,.jpg,.pdf,.txt"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.target.value = ""; // reset para re-selecionar mesmo arquivo (Pitfall 5)
        }}
      />
      <button
        type="button"
        className="attachment-btn"
        disabled={disabled}
        aria-label="Anexar arquivo"
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip size={16} aria-hidden />
      </button>
    </>
  );
}

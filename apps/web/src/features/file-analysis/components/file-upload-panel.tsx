"use client";

import { FileSpreadsheet, X } from "lucide-react";
import { useRef, useState } from "react";

type Props = {
  onUpload: (file: File, sheetName?: string) => void;
  uploading: boolean;
  error: string;
  activeFile?: boolean;
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadPanel({ onUpload, uploading, error, activeFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState("");
  const [showReplaceWarning, setShowReplaceWarning] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const displayError = localError || error;

  function handleFile(file: File) {
    setLocalError("");
    if (activeFile) {
      setPendingFile(file);
      setShowReplaceWarning(true);
      return;
    }
    setSelectedFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  function clearFile() {
    setSelectedFile(null);
    setLocalError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function submitUpload() {
    if (!selectedFile) return;
    // Client-side size validation before sending
    if (selectedFile.size > 5 * 1024 * 1024) {
      setLocalError("Arquivo excede o limite de 5 MB. Reduza o tamanho e tente novamente.");
      return;
    }
    onUpload(selectedFile);
  }

  function confirmReplace() {
    if (pendingFile) {
      setSelectedFile(pendingFile);
      setPendingFile(null);
      setShowReplaceWarning(false);
    }
  }

  function cancelReplace() {
    setPendingFile(null);
    setShowReplaceWarning(false);
  }

  return (
    <div className="tool-panel">
      <h2>Enviar planilha</h2>

      {showReplaceWarning ? (
        <div
          style={{
            borderLeft: "3px solid var(--warning)",
            background: "#fff7ed",
            borderRadius: "0 6px 6px 0",
            padding: "12px 16px",
            marginBottom: "16px"
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: "14px" }}>
            Novo arquivo substitui o atual e inicia uma nova conversa.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="primary-button"
              onClick={confirmReplace}
              type="button"
              style={{ fontSize: "13px", padding: "4px 12px", minHeight: "32px" }}
            >
              Continuar
            </button>
            <button
              className="ghost-button"
              onClick={cancelReplace}
              type="button"
              style={{ fontSize: "13px", padding: "4px 12px", minHeight: "32px" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {/* Drop zone */}
      <div
        aria-label="Area de upload — arraste um arquivo ou pressione Enter para selecionar"
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        onClick={() => { if (!uploading) inputRef.current?.click(); }}
        role="button"
        tabIndex={0}
        style={{
          border: dragOver
            ? "1px solid rgb(11 107 87 / 40%)"
            : "1px dashed var(--border)",
          borderRadius: "6px",
          background: dragOver ? "rgb(11 107 87 / 4%)" : "#fbfcfd",
          minHeight: "120px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          cursor: uploading ? "default" : "pointer",
          padding: "16px"
        }}
      >
        <FileSpreadsheet
          aria-hidden
          size={32}
          style={{ color: "var(--muted)" }}
        />
        <span style={{ fontSize: "14px", color: "var(--muted)", textAlign: "center" }}>
          {uploading
            ? "Enviando..."
            : "Arraste um arquivo ou clique para selecionar"}
        </span>
        {!uploading ? (
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            .csv ou .xlsx — maximo 5 MB
          </span>
        ) : null}
      </div>

      <input
        accept=".csv,.xlsx"
        onChange={handleInputChange}
        ref={inputRef}
        style={{ display: "none" }}
        type="file"
      />

      {/* Selected file chip */}
      {selectedFile && !uploading ? (
        <div
          style={{
            marginTop: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "6px 10px",
            fontSize: "13px"
          }}
        >
          <span
            style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {selectedFile.name}
          </span>
          <span style={{ color: "var(--muted)", flexShrink: 0 }}>
            ({formatSize(selectedFile.size)})
          </span>
          <button
            aria-label="Remover arquivo selecionado"
            onClick={(e) => {
              e.stopPropagation();
              clearFile();
            }}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              padding: "2px",
              color: "var(--muted)",
              display: "flex"
            }}
            type="button"
          >
            <X aria-hidden size={14} />
          </button>
        </div>
      ) : null}

      {displayError ? (
        <div className="form-error" style={{ marginTop: "8px" }}>
          {displayError}
        </div>
      ) : null}

      <button
        className="primary-button"
        disabled={!selectedFile || uploading}
        onClick={submitUpload}
        style={{ marginTop: "12px", width: "100%" }}
        type="button"
      >
        {uploading ? "Enviando..." : "Enviar arquivo"}
      </button>
    </div>
  );
}

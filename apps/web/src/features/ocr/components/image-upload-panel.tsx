"use client";

import { Image as ImageIcon, X } from "lucide-react";
import { useRef, useState } from "react";

type Props = {
  onUpload: (file: File) => void;
  processing: boolean;
  error: string;
  quotaBlocked: boolean;
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageUploadPanel({ onUpload, processing, error, quotaBlocked }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState("");

  const displayError = localError || error;

  function handleFile(file: File) {
    setLocalError("");
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
    if (selectedFile.size > 5 * 1024 * 1024) {
      setLocalError("Arquivo excede o limite de 5 MB. Reduza o tamanho e tente novamente.");
      return;
    }
    onUpload(selectedFile);
  }

  return (
    <div className="tool-panel">
      <h2>Enviar imagem</h2>

      <p style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "16px" }}>
        Envie uma imagem PNG ou JPEG com uma tabela e ela sera convertida em planilha copiavel.
      </p>

      {/* Drop zone */}
      <div
        aria-label="Area de upload — arraste uma imagem ou pressione Enter para selecionar"
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        onClick={() => { if (!processing) inputRef.current?.click(); }}
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
          cursor: processing ? "default" : "pointer",
          padding: "16px",
          outline: "none"
        }}
      >
        <ImageIcon
          aria-hidden
          size={32}
          style={{ color: "var(--muted)" }}
        />
        <span style={{ fontSize: "14px", color: "var(--muted)", textAlign: "center" }}>
          {processing
            ? "Processando..."
            : "Arraste uma imagem ou clique para selecionar"}
        </span>
        {!processing ? (
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            PNG, JPEG — maximo 5 MB
          </span>
        ) : null}
      </div>

      <input
        accept=".png,.jpg,.jpeg"
        onChange={handleInputChange}
        ref={inputRef}
        style={{ display: "none" }}
        type="file"
      />

      {/* Selected file chip */}
      {selectedFile && !processing ? (
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
            aria-label="Remover imagem selecionada"
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

      {/* Quota exceeded banner */}
      {quotaBlocked ? (
        <div
          style={{
            marginTop: "12px",
            borderLeft: "3px solid var(--warning)",
            background: "#fff7ed",
            borderRadius: "0 6px 6px 0",
            padding: "12px 16px",
            fontSize: "14px"
          }}
        >
          <p style={{ margin: "0 0 8px" }}>
            Voce atingiu o limite gratuito de usos.
          </p>
          <a
            href="/planos"
            style={{
              color: "var(--primary)",
              fontWeight: 600,
              textDecoration: "none"
            }}
          >
            Fazer upgrade para Pro &rarr;
          </a>
        </div>
      ) : null}

      {displayError ? (
        <div className="form-error" style={{ marginTop: "8px" }}>
          {displayError}
        </div>
      ) : null}

      <button
        className="primary-button"
        disabled={!selectedFile || processing}
        onClick={submitUpload}
        style={{ marginTop: "12px", width: "100%" }}
        type="button"
      >
        {processing ? "Processando..." : "Enviar imagem"}
      </button>
    </div>
  );
}

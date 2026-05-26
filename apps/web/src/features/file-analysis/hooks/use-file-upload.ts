"use client";

import { type FileSchema } from "@tabelin/shared";
import { useCallback, useState } from "react";

export type FileUploadStatus =
  | "idle"
  | "uploading"
  | "sheet_selection"
  | "complete"
  | "error";

export function useFileUpload() {
  const [status, setStatus] = useState<FileUploadStatus>("idle");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [schema, setSchema] = useState<FileSchema | null>(null);
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const upload = useCallback(async (file: File, sheetName?: string) => {
    setStatus("uploading");
    setError("");

    // Client-side validation before sending
    if (file.size > 5 * 1024 * 1024) {
      setStatus("error");
      setError("Arquivo excede o limite de 5 MB. Reduza o tamanho e tente novamente.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (sheetName) {
      formData.append("sheetName", sheetName);
    }

    // Do NOT set Content-Type manually — browser sets the correct boundary for multipart
    const response = await fetch("/api/tools/file-analysis/upload", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      if (response.status === 413) {
        setStatus("error");
        setError("Arquivo excede o limite de 5 MB. Reduza o tamanho e tente novamente.");
        return;
      }
      if (response.status === 415) {
        setStatus("error");
        setError("Formato invalido. Use arquivos .csv ou .xlsx.");
        return;
      }
      const errData = await response.json().catch(() => ({})) as Record<string, unknown>;
      setStatus("error");
      setError(typeof errData.error === "string" ? errData.error : "Nao foi possivel processar o arquivo.");
      return;
    }

    const data = await response.json() as Record<string, unknown>;

    if (data.type === "sheet_selection") {
      setStatus("sheet_selection");
      setSheetNames(data.sheetNames as string[]);
      setPendingFile(file);
      return;
    }

    if (data.type === "upload_complete") {
      setStatus("complete");
      setUploadedFileId(data.uploadedFileId as string);
      setSchema(data.schema as FileSchema);
      setPendingFile(null);
      return;
    }

    setStatus("error");
    setError("Resposta inesperada do servidor.");
  }, []);

  const selectSheet = useCallback(
    (sheetName: string) => {
      if (pendingFile) {
        void upload(pendingFile, sheetName);
      }
    },
    [pendingFile, upload]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setSheetNames([]);
    setUploadedFileId(null);
    setSchema(null);
    setError("");
    setPendingFile(null);
  }, []);

  return {
    status,
    sheetNames,
    uploadedFileId,
    schema,
    error,
    upload,
    selectSheet,
    reset
  };
}

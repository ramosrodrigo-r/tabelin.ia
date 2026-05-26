"use client";

import type { OcrResponse } from "@tabelin/shared";
import { useCallback, useState } from "react";

export type ImageUploadStatus = "idle" | "processing" | "complete" | "error";

export function useImageUpload() {
  const [status, setStatus] = useState<ImageUploadStatus>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<OcrResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [quotaBlocked, setQuotaBlocked] = useState(false);

  const upload = useCallback(async (file: File) => {
    setError("");
    setQuotaBlocked(false);

    // Validacao de tamanho antes de enviar
    if (file.size > 5 * 1024 * 1024) {
      setStatus("error");
      setError("Arquivo excede o limite de 5 MB. Reduza o tamanho e tente novamente.");
      return;
    }

    // Normalizacao e validacao de mimeType
    let mimeType = file.type;
    if (mimeType === "image/jpg") {
      mimeType = "image/jpeg";
    }

    if (mimeType !== "image/png" && mimeType !== "image/jpeg") {
      setStatus("error");
      setError("Formato invalido. Envie uma imagem PNG ou JPEG.");
      return;
    }

    setSelectedFile(file);
    setStatus("processing");

    // Converter para base64 via FileReader
    const imageBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Extrair a parte apos a virgula: "data:image/png;base64,<base64data>"
        const base64 = dataUrl.split(",")[1] ?? "";
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
      reader.readAsDataURL(file);
    });

    const response = await fetch("/api/tools/ocr/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType })
    });

    if (!response.ok) {
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
        if (errorData.code === "quota_exceeded") {
          setQuotaBlocked(true);
          setStatus("error");
          setError("");
          return;
        }
      }
      if (response.status === 413) {
        setStatus("error");
        setError("Imagem excede o limite de 5 MB. Envie uma imagem menor.");
        return;
      }
      const errData = await response.json().catch(() => ({})) as Record<string, unknown>;
      setStatus("error");
      setError(
        typeof errData.error === "string"
          ? errData.error
          : "Nao foi possivel processar a imagem."
      );
      return;
    }

    const data = await response.json() as OcrResponse;
    setResult(data);
    setStatus("complete");
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError("");
    setResult(null);
    setSelectedFile(null);
    setQuotaBlocked(false);
  }, []);

  return {
    status,
    error,
    result,
    selectedFile,
    quotaBlocked,
    upload,
    reset
  };
}

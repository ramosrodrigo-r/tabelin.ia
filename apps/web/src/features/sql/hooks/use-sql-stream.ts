"use client";

import {
  type SqlGenerateResponse,
  type SqlMetadata,
  sqlStreamEventSchema
} from "@tabelin/shared";
import { useCallback, useState } from "react";
import type { SqlDialect } from "@tabelin/shared";

export type SqlStreamStatus = "idle" | "loading" | "streaming" | "complete" | "error";

export type SubmitSqlInput = {
  dialect: SqlDialect;
  text: string;
  file?: File;
};

export function useSqlStream() {
  const [status, setStatus] = useState<SqlStreamStatus>("idle");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<SqlGenerateResponse | null>(null);
  const [metadata, setMetadata] = useState<SqlMetadata | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [lastFreeUse, setLastFreeUse] = useState(false);
  const [attachmentStatus, setAttachmentStatus] = useState<"uploading" | "extracting" | null>(null);
  const [attachmentMeta, setAttachmentMeta] = useState<{
    charCount: number;
    wasTruncated: boolean;
    extractedText: string;
  } | null>(null);

  const submit = useCallback(async (input: SubmitSqlInput) => {
    setStatus("loading");
    setDraft("");
    setResult(null);
    setMetadata(null);
    setWarnings([]);
    setError("");
    setQuotaBlocked(false);
    setLastFreeUse(false);
    setAttachmentStatus(null);
    setAttachmentMeta(null);

    let body: BodyInit;
    let headers: HeadersInit = {};

    if (input.file) {
      setAttachmentStatus("uploading");
      const fd = new FormData();
      fd.append("prompt", input.text);
      fd.append("dialect", input.dialect);
      fd.append("file", input.file);
      body = fd;
      // NÃO setar Content-Type — browser define boundary automaticamente
    } else {
      body = JSON.stringify({ dialect: input.dialect, prompt: input.text });
      headers = { "content-type": "application/json" };
    }

    const response = await fetch("/api/tools/sql/generate", { method: "POST", headers, body });

    if (!response.ok) {
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code === "pro_required" && errorData.feature === "attachment") {
          setStatus("error");
          setAttachmentStatus(null);
          setError("Recurso exclusivo Pro. Assine o plano Pro para enviar documentos.");
          return;
        }
      }

      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code === "quota_exceeded") {
          setStatus("idle");
          setQuotaBlocked(true);
          setError("");
          return;
        }
      }

      setStatus("error");
      setError("Nao consegui validar a resposta. Ajuste o pedido e tente novamente.");
      return;
    }

    if (!response.body) {
      setStatus("error");
      setError("Nao consegui validar a resposta. Ajuste o pedido e tente novamente.");
      return;
    }

    if (input.file) {
      setAttachmentStatus("extracting");
    }

    setStatus("streaming");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = sqlStreamEventSchema.parse(JSON.parse(line));

        if (event.type === "attachment_grounded") {
          setAttachmentMeta({
            charCount: event.charCount,
            wasTruncated: event.wasTruncated,
            extractedText: event.extractedText,
          });
          setAttachmentStatus(null);
        }

        if (event.type === "metadata") { setMetadata(event.metadata); }
        if (event.type === "warning") { setWarnings((current) => [...current, event.warning]); }
        if (event.type === "quota_warning") { setLastFreeUse(event.lastFreeUse); }
        if (event.type === "delta") {
          setAttachmentStatus(null); // garante reset mesmo se attachment_grounded não vier
          setDraft((current) => `${current}${event.text}`);
        }
        if (event.type === "complete") { setResult(event.payload); setMetadata(event.payload.metadata); setWarnings(event.payload.warnings); setStatus("complete"); }
        if (event.type === "error") { setError(event.message); setStatus("error"); }
      }
    }
  }, []);

  return { status, draft, result, metadata, warnings, error, quotaBlocked, lastFreeUse, attachmentStatus, attachmentMeta, submit };
}

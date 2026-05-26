"use client";

import {
  type TemplateGenerateResponse,
  type TemplateMetadata,
  templateStreamEventSchema
} from "@tabelin/shared";
import { useCallback, useState } from "react";

export type TemplateStreamStatus = "idle" | "loading" | "streaming" | "complete" | "error";

export type SubmitTemplateInput = {
  text: string;
};

export function useTemplateStream() {
  const [status, setStatus] = useState<TemplateStreamStatus>("idle");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<TemplateGenerateResponse | null>(null);
  const [metadata, setMetadata] = useState<TemplateMetadata | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [lastFreeUse, setLastFreeUse] = useState(false);
  const [proBlocked, setProBlocked] = useState(false);

  const submit = useCallback(async (input: SubmitTemplateInput) => {
    setStatus("loading");
    setDraft("");
    setResult(null);
    setMetadata(null);
    setWarnings([]);
    setError("");
    setQuotaBlocked(false);
    setLastFreeUse(false);
    setProBlocked(false);

    const response = await fetch("/api/tools/template/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: input.text })
    });

    if (!response.ok) {
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code === "pro_required") {
          setStatus("idle");
          setProBlocked(true);
          setError("");
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
        const event = templateStreamEventSchema.parse(JSON.parse(line));
        if (event.type === "metadata") { setMetadata(event.metadata); }
        if (event.type === "warning") { setWarnings((current) => [...current, event.warning]); }
        if (event.type === "quota_warning") { setLastFreeUse(event.lastFreeUse); }
        if (event.type === "delta") { setDraft((current) => `${current}${event.text}`); }
        if (event.type === "complete") { setResult(event.payload); setMetadata(event.payload.metadata); setWarnings(event.payload.warnings); setStatus("complete"); }
        if (event.type === "error") { setError(event.message); setStatus("error"); }
      }
    }
  }, []);

  return { status, draft, result, metadata, warnings, error, quotaBlocked, lastFreeUse, proBlocked, submit };
}

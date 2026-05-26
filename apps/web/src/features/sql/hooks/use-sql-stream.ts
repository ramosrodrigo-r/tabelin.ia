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

  const submit = useCallback(async (input: SubmitSqlInput) => {
    setStatus("loading");
    setDraft("");
    setResult(null);
    setMetadata(null);
    setWarnings([]);
    setError("");
    setQuotaBlocked(false);
    setLastFreeUse(false);

    const response = await fetch("/api/tools/sql/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dialect: input.dialect, prompt: input.text })
    });

    if (!response.ok) {
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
        const event = sqlStreamEventSchema.parse(JSON.parse(line));
        if (event.type === "metadata") { setMetadata(event.metadata); }
        if (event.type === "warning") { setWarnings((current) => [...current, event.warning]); }
        if (event.type === "quota_warning") { setLastFreeUse(event.lastFreeUse); }
        if (event.type === "delta") { setDraft((current) => `${current}${event.text}`); }
        if (event.type === "complete") { setResult(event.payload); setMetadata(event.payload.metadata); setWarnings(event.payload.warnings); setStatus("complete"); }
        if (event.type === "error") { setError(event.message); setStatus("error"); }
      }
    }
  }, []);

  return { status, draft, result, metadata, warnings, error, quotaBlocked, lastFreeUse, submit };
}

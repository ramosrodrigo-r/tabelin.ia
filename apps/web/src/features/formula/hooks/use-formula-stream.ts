"use client";

import {
  type FormulaCompletePayload,
  type FormulaLanguage,
  type FormulaMetadata,
  type FormulaPlatform,
  formulaStreamEventSchema
} from "@tabelin/shared";
import { useCallback, useState } from "react";

export type FormulaMode = "generate" | "explain";
export type FormulaStreamStatus = "idle" | "loading" | "streaming" | "complete" | "error";

export type SubmitFormulaInput = {
  mode: FormulaMode;
  platform: FormulaPlatform;
  formulaLanguage: FormulaLanguage;
  text: string;
};

export function useFormulaStream() {
  const [status, setStatus] = useState<FormulaStreamStatus>("idle");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<FormulaCompletePayload | null>(null);
  const [metadata, setMetadata] = useState<FormulaMetadata | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [lastFreeUse, setLastFreeUse] = useState(false);

  const submit = useCallback(async (input: SubmitFormulaInput) => {
    setStatus("loading");
    setDraft("");
    setResult(null);
    setMetadata(null);
    setWarnings([]);
    setError("");
    setQuotaBlocked(false);
    setLastFreeUse(false);

    const endpoint = input.mode === "generate" ? "/api/tools/formula/generate" : "/api/tools/formula/explain";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        input.mode === "generate"
          ? {
              platform: input.platform,
              formulaLanguage: input.formulaLanguage,
              prompt: input.text
            }
          : {
              platform: input.platform,
              formulaLanguage: input.formulaLanguage,
              formula: input.text
            }
      )
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

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        const event = formulaStreamEventSchema.parse(JSON.parse(line));

        if (event.type === "metadata") {
          setMetadata(event.metadata);
        }

        if (event.type === "warning") {
          setWarnings((current) => [...current, event.warning]);
        }

        if (event.type === "quota_warning") {
          setLastFreeUse(event.lastFreeUse);
        }

        if (event.type === "delta") {
          setDraft((current) => `${current}${event.text}`);
        }

        if (event.type === "complete") {
          setResult(event.payload);
          setMetadata(event.payload.metadata);
          setWarnings(event.payload.warnings);
          setStatus("complete");
        }

        if (event.type === "error") {
          setError(event.message);
          setStatus("error");
        }
      }
    }
  }, []);

  return {
    status,
    draft,
    result,
    metadata,
    warnings,
    error,
    quotaBlocked,
    lastFreeUse,
    submit
  };
}


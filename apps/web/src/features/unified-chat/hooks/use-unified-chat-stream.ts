"use client";

import {
  type FormulaLanguage,
  type FormulaPlatform,
  type OverrideIntent,
  type ScriptType,
  type SqlDialect,
  type UnifiedCompletePayload,
  type UnifiedIntent,
  unifiedStreamEventSchema,
} from "@tabelin/shared";
import { useCallback, useState } from "react";

export type UnifiedChatStreamStatus = "idle" | "loading" | "streaming" | "complete" | "error";

export type UnifiedAttachmentMeta = {
  charCount: number;
  wasTruncated: boolean;
  extractedText: string;
};

export type SubmitUnifiedChatInput = {
  prompt: string;
  file?: File;
  overrideIntent?: OverrideIntent;
  platform: FormulaPlatform;
  formulaLanguage: FormulaLanguage;
  separator: ";" | ",";
  sqlDialect: SqlDialect;
  scriptType: ScriptType;
  lastIntent?: UnifiedIntent | null;
  overrideGenerate?: boolean;
  specOverride?: string;
};

export function useUnifiedChatStream() {
  const [status, setStatus] = useState<UnifiedChatStreamStatus>("idle");
  const [intent, setIntent] = useState<UnifiedIntent | null>(null);
  const [confidence, setConfidence] = useState<"high" | "low" | null>(null);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<UnifiedCompletePayload | null>(null);
  const [metadata, setMetadata] = useState<unknown | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [attachmentStatus, setAttachmentStatus] = useState<"uploading" | "extracting" | null>(null);
  const [attachmentMeta, setAttachmentMeta] = useState<UnifiedAttachmentMeta | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setIntent(null);
    setConfidence(null);
    setDraft("");
    setResult(null);
    setMetadata(null);
    setWarnings([]);
    setError("");
    setAttachmentStatus(null);
    setAttachmentMeta(null);
  }, []);

  const submit = useCallback(async (input: SubmitUnifiedChatInput) => {
    setStatus("loading");
    setIntent(null);
    setConfidence(null);
    setDraft("");
    setResult(null);
    setMetadata(null);
    setWarnings([]);
    setError("");
    setAttachmentStatus(null);
    setAttachmentMeta(null);

    let body: BodyInit;
    let headers: HeadersInit = {};

    if (input.file) {
      setAttachmentStatus("uploading");
      const fd = new FormData();
      fd.append("prompt", input.prompt);
      fd.append("platform", input.platform);
      fd.append("formulaLanguage", input.formulaLanguage);
      fd.append("separator", input.separator);
      fd.append("sqlDialect", input.sqlDialect);
      fd.append("scriptType", input.scriptType);
      if (input.overrideIntent) fd.append("overrideIntent", input.overrideIntent);
      if (input.lastIntent) fd.append("lastIntent", input.lastIntent);
      if (input.overrideGenerate) fd.append("overrideGenerate", "true");
      if (input.specOverride) fd.append("specOverride", input.specOverride);
      fd.append("file", input.file);
      body = fd;
    } else {
      body = JSON.stringify({
        prompt: input.prompt,
        platform: input.platform,
        formulaLanguage: input.formulaLanguage,
        separator: input.separator,
        sqlDialect: input.sqlDialect,
        scriptType: input.scriptType,
        overrideIntent: input.overrideIntent,
        lastIntent: input.lastIntent,
        overrideGenerate: input.overrideGenerate ? "true" : undefined,
        specOverride: input.specOverride,
      });
      headers = { "content-type": "application/json" };
    }

    const response = await fetch("/api/chat/unified", { method: "POST", headers, body });

    if (!response.ok) {
      if (response.status === 413 || response.status === 422) {
        const errorData = await response.json().catch(() => ({}));
        setError(
          typeof errorData.message === "string" && errorData.message
            ? errorData.message
            : "Nao consegui processar o documento anexado. Verifique o arquivo e tente novamente.",
        );
        setAttachmentStatus(null);
        setStatus("error");
        return;
      }

      setError("Não consegui processar o pedido. Tente reescrever ou enviar de novo.");
      setAttachmentStatus(null);
      setStatus("error");
      return;
    }

    if (!response.body) {
      setError("Não consegui processar o pedido. Tente reescrever ou enviar de novo.");
      setStatus("error");
      return;
    }

    if (input.file) {
      setAttachmentStatus("extracting");
    }

    setStatus("streaming");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    async function handleLine(line: string) {
      if (!line.trim()) return;

      let event;
      try {
        event = unifiedStreamEventSchema.parse(JSON.parse(line));
      } catch {
        setError("Resposta corrompida. Tente novamente.");
        setAttachmentStatus(null);
        setStatus("error");
        return;
      }

      if (event.type === "intent_detected") {
        setIntent(event.intent);
        setConfidence(event.confidence);
      }

      if (event.type === "attachment_grounded") {
        setAttachmentMeta({
          charCount: event.charCount,
          wasTruncated: event.wasTruncated,
          extractedText: event.extractedText,
        });
        setAttachmentStatus(null);
      }

      if (event.type === "metadata") {
        setMetadata(event.metadata);
      }

      if (event.type === "warning") {
        setWarnings((current) => [...current, event.warning]);
      }

      if (event.type === "delta") {
        setAttachmentStatus(null);
        setDraft((current) => `${current}${event.text}`);
      }

      if (event.type === "complete") {
        setResult(event.payload);
        if ("metadata" in event.payload) {
          setMetadata(event.payload.metadata);
        }
        setAttachmentStatus(null);
        setStatus("complete");
      }

      if (event.type === "error") {
        setError(event.message);
        setStatus("error");
      }
    }

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        await handleLine(line);
      }
    }

    if (buffer.trim()) {
      await handleLine(buffer);
    }
  }, []);

  return {
    status,
    intent,
    confidence,
    draft,
    result,
    metadata,
    warnings,
    error,
    attachmentStatus,
    attachmentMeta,
    submit,
    reset,
  };
}

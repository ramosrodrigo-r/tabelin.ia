"use client";

import {
  type OverrideIntent,
  type UnifiedChatStreamMetadata,
  type UnifiedCompletePayload,
  type UnifiedIntent,
  unifiedChatStreamMetadataSchema,
  unifiedStreamEventSchema,
} from "@tabelin/shared";
import { useCallback, useState } from "react";

import { useWorkspaceState } from "@/components/app/workspace-state-context";

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
  lastIntent?: UnifiedIntent | null;
};

// Re-export do tipo canônico definido no schema do shared (WR-02). Mantém a
// API pública deste hook estável enquanto a forma passa a ser derivada do
// schema validado em runtime.
export type { UnifiedChatStreamMetadata };

export function useUnifiedChatStream() {
  const [status, setStatus] = useState<UnifiedChatStreamStatus>("idle");
  const [intent, setIntent] = useState<UnifiedIntent | null>(null);
  const [confidence, setConfidence] = useState<"high" | "low" | null>(null);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<UnifiedCompletePayload | null>(null);
  const [metadata, setMetadata] = useState<UnifiedChatStreamMetadata | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [attachmentStatus, setAttachmentStatus] = useState<"uploading" | "extracting" | null>(null);
  const [attachmentMeta, setAttachmentMeta] = useState<UnifiedAttachmentMeta | null>(null);
  const workspaceState = useWorkspaceState();

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

    // Estado atual da planilha viva serializado para o BFF aplicar a mutação sobre ele.
    const specOverride = JSON.stringify(workspaceState.spec);

    if (input.file) {
      setAttachmentStatus("uploading");
      const fd = new FormData();
      fd.append("prompt", input.prompt);
      if (input.overrideIntent) fd.append("overrideIntent", input.overrideIntent);
      if (input.lastIntent) fd.append("lastIntent", input.lastIntent);
      fd.append("specOverride", specOverride);
      fd.append("file", input.file);
      body = fd;
    } else {
      body = JSON.stringify({
        prompt: input.prompt,
        overrideIntent: input.overrideIntent,
        lastIntent: input.lastIntent,
        specOverride: workspaceState.spec,
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

    let finalPayload: UnifiedCompletePayload | null = null;
    let finalMetadata: UnifiedChatStreamMetadata | null = null;
    let finalError: string | null = null;
    let hasCompleteEvent = false;

    async function handleLine(line: string) {
      if (!line.trim()) return;

      let event;
      try {
        event = unifiedStreamEventSchema.parse(JSON.parse(line));
      } catch {
        finalError = "Resposta corrompida. Tente novamente.";
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
        // event.metadata já é UnifiedChatStreamMetadata via unifiedStreamEventSchema.
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
        hasCompleteEvent = true;
        finalPayload = event.payload;
        // WR-02: o payload pode (em variações do protocolo) carregar metadata.
        // Em vez de asserir o tipo cegamente, validamos com safeParse do
        // sub-schema — payloads mal-formados são descartados sem corromper o
        // estado a jusante.
        if (event.payload && typeof event.payload === "object" && "metadata" in event.payload) {
          const parsedMetadata = unifiedChatStreamMetadataSchema.safeParse(
            (event.payload as { metadata: unknown }).metadata,
          );
          if (parsedMetadata.success) {
            finalMetadata = parsedMetadata.data;
          }
        }
      }

      if (event.type === "error") {
        finalError = event.message;
      }
    }

    try {
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

      if (finalError) {
        setError(finalError);
        setAttachmentStatus(null);
        setStatus("error");
      } else if (hasCompleteEvent && finalPayload) {
        setResult(finalPayload);
        if (finalMetadata) {
          setMetadata(finalMetadata);
        }
        setAttachmentStatus(null);
        setStatus("complete");
      } else {
        setError("Resposta incompleta do servidor.");
        setAttachmentStatus(null);
        setStatus("error");
      }
    } catch (err) {
      console.error("error while reading stream", err);
      setError("Falha na conexão com o servidor. Tente novamente.");
      setAttachmentStatus(null);
      setStatus("error");
    }
  }, [workspaceState.spec]);

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

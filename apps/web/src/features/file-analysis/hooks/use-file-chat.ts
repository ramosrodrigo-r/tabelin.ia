"use client";

import { chatStreamEventSchema } from "@tabelin/shared";
import { useCallback, useState } from "react";

export type ChatStatus = "idle" | "loading" | "streaming" | "complete" | "error";

export type LocalChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const PIVOT_PROMPT =
  "Gere um resumo no estilo tabela pivot dos dados. Use Markdown com tabelas e agregacoes relevantes (totais, medias, contagens por categoria).";

const REPORT_PROMPT =
  "Gere um relatorio executivo dos dados. Use Markdown com titulos, metricas chave, tendencias e insights principais em portugues.";

export function useFileChat() {
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState("");
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [lastFreeUse, setLastFreeUse] = useState(false);

  const submit = useCallback(async (uploadedFileId: string, message: string) => {
    setStatus("loading");
    setDraft("");
    setError("");
    setLastFreeUse(false);

    // Optimistic user message
    setMessages((prev) => [...prev, { role: "user", content: message }]);

    const response = await fetch("/api/tools/file-analysis/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uploadedFileId, message })
    });

    if (!response.ok) {
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
        if (errorData.code === "quota_exceeded") {
          setStatus("idle");
          setQuotaBlocked(true);
          setError("");
          return;
        }
      }
      setStatus("error");
      setError("Nao foi possivel gerar a resposta. Ajuste a pergunta e tente novamente.");
      return;
    }

    if (!response.body) {
      setStatus("error");
      setError("Nao foi possivel gerar a resposta. Ajuste a pergunta e tente novamente.");
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
        const event = chatStreamEventSchema.parse(JSON.parse(line));
        if (event.type === "delta") {
          setDraft((current) => `${current}${event.text}`);
        }
        if (event.type === "quota_warning") {
          setLastFreeUse(event.lastFreeUse);
        }
        if (event.type === "complete") {
          setMessages((prev) => [...prev, { role: "assistant", content: event.content }]);
          setDraft("");
          setStatus("complete");
        }
        if (event.type === "error") {
          setError(event.message);
          setStatus("error");
        }
      }
    }
  }, []);

  const sendQuickAction = useCallback(
    (uploadedFileId: string, promptType: "pivot" | "report") => {
      const prompt = promptType === "pivot" ? PIVOT_PROMPT : REPORT_PROMPT;
      void submit(uploadedFileId, prompt);
    },
    [submit]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setDraft("");
    setStatus("idle");
    setError("");
    setQuotaBlocked(false);
    setLastFreeUse(false);
  }, []);

  return {
    messages,
    draft,
    status,
    error,
    quotaBlocked,
    lastFreeUse,
    submit,
    sendQuickAction,
    reset
  };
}

"use client";

import { chatStreamEventSchema, chartDataSchema, type ChartData } from "@tabelin/shared";
import { useCallback, useState } from "react";

export type ChatStatus = "idle" | "loading" | "streaming" | "complete" | "error";

export type LocalChatMessage =
  | { role: "user" | "assistant"; type: "text"; content: string }
  | { role: "assistant"; type: "chart"; chartData: ChartData };

const PIVOT_PROMPT =
  "Gere um resumo no estilo tabela pivot dos dados. Use Markdown com tabelas e agregacoes relevantes (totais, medias, contagens por categoria).";

const REPORT_PROMPT =
  "Gere um relatorio executivo dos dados. Use Markdown com titulos, metricas chave, tendencias e insights principais em portugues.";

const CHART_PROMPT =
  "Analise os dados e retorne APENAS um objeto JSON (sem markdown, sem texto extra, sem codigo) com os campos: chartType (\"bar\", \"line\" ou \"pie\"), title (string descritiva do grafico), xKey (nome da coluna para eixo X), yKey (nome da coluna numerica para eixo Y), rows (array de objetos com os dados). Exemplo: {\"chartType\":\"bar\",\"title\":\"Vendas por Produto\",\"xKey\":\"Produto\",\"yKey\":\"Vendas\",\"rows\":[{\"Produto\":\"A\",\"Vendas\":100}]}";

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
    setMessages((prev) => [...prev, { role: "user", type: "text", content: message }]);

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

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let rawObj: unknown;
          try { rawObj = JSON.parse(line); } catch { continue; }
          const parsed = chatStreamEventSchema.safeParse(rawObj);
          if (!parsed.success) continue;
          const event = parsed.data;
          if (event.type === "delta") {
            setDraft((current) => `${current}${event.text}`);
          }
          if (event.type === "quota_warning") {
            setLastFreeUse(event.lastFreeUse);
          }
          if (event.type === "complete") {
            // Tentar detectar JSON de grafico na resposta do AI
            let chartPlaced = false;
            try {
              const parsedObj = JSON.parse(event.content) as Record<string, unknown>;
              const chartValidation = chartDataSchema.safeParse(parsedObj);
              if (chartValidation.success) {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", type: "chart", chartData: chartValidation.data }
                ]);
                chartPlaced = true;
              }
            } catch {
              // SyntaxError no parse — tratar como mensagem de texto normal
            }
            if (!chartPlaced) {
              setMessages((prev) => [
                ...prev,
                { role: "assistant", type: "text", content: event.content }
              ]);
            }
            setDraft("");
            setStatus("complete");
          }
          if (event.type === "error") {
            setError(event.message);
            setStatus("error");
          }
        }
      }
    } catch {
      setStatus("error");
      setError("Nao foi possivel gerar a resposta. Tente novamente.");
    } finally {
      reader.cancel().catch(() => undefined);
    }
  }, []);

  const sendQuickAction = useCallback(
    (uploadedFileId: string, promptType: "pivot" | "report" | "chart") => {
      let prompt: string;
      if (promptType === "pivot") {
        prompt = PIVOT_PROMPT;
      } else if (promptType === "report") {
        prompt = REPORT_PROMPT;
      } else {
        prompt = CHART_PROMPT;
      }
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

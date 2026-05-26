"use client";

import { CopyButton } from "./copy-button";

type Props = {
  role: "user" | "assistant" | "system";
  content: string;
  isStreaming?: boolean;
};

export function ChatMessage({ role, content, isStreaming }: Props) {
  if (role === "system") {
    return (
      <div
        role="article"
        aria-label="Mensagem do sistema"
        style={{
          borderLeft: "3px solid var(--info)",
          background: "#f8fafc",
          padding: "12px 16px"
        }}
      >
        {content}
      </div>
    );
  }

  if (role === "user") {
    return (
      <div role="article" aria-label="Sua mensagem">
        <p
          style={{
            margin: "0 0 4px",
            fontSize: "12px",
            color: "var(--muted)"
          }}
        >
          Voce
        </p>
        <div
          style={{
            background: "rgb(11 107 87 / 8%)",
            border: "1px solid rgb(11 107 87 / 20%)",
            borderRadius: "6px",
            padding: "12px 16px",
            marginLeft: "auto",
            maxWidth: "80%"
          }}
        >
          <p style={{ margin: 0, fontSize: "14px" }}>{content}</p>
        </div>
      </div>
    );
  }

  // assistant role
  return (
    <div role="article" aria-label="Resposta do Tabelin.IA">
      <p
        style={{
          margin: "0 0 4px",
          fontSize: "12px",
          color: "var(--muted)"
        }}
      >
        Tabelin.IA
      </p>
      <div
        style={{
          position: "relative",
          background: "var(--surface)",
          border: isStreaming
            ? "1px solid rgb(47 111 237 / 40%)"
            : "1px solid var(--border)",
          borderRadius: "6px",
          padding: "12px 16px",
          maxWidth: "90%"
        }}
      >
        {isStreaming ? (
          <p
            aria-live="polite"
            style={{
              margin: "0 0 8px",
              fontSize: "12px",
              color: "var(--muted)"
            }}
          >
            Recebendo resposta...
          </p>
        ) : null}
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontFamily: "inherit",
            margin: 0,
            fontSize: "14px",
            wordBreak: "break-word"
          }}
        >
          {content}
        </pre>
        {!isStreaming ? (
          <div style={{ position: "absolute", top: "8px", right: "8px" }}>
            <CopyButton disabled={isStreaming} value={content} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import type { FileSchema } from "@tabelin/shared";
import { Send } from "lucide-react";
import { useRef, useState } from "react";

import { useFileChat } from "../hooks/use-file-chat";
import { ChatMessage } from "./chat-message";
import { SchemaPreview } from "./schema-preview";

type Props = {
  uploadedFileId: string;
  schema: FileSchema;
  onNewFile: () => void;
};

export function ChatPanel({ uploadedFileId, schema, onNewFile }: Props) {
  const chat = useFileChat();
  const [inputText, setInputText] = useState("");
  const streaming = chat.status === "loading" || chat.status === "streaming";

  function handleSubmit() {
    const trimmed = inputText.trim();
    if (!trimmed || streaming) return;
    setInputText("");
    void chat.submit(uploadedFileId, trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  const prevMessageCount = useRef(chat.messages.length);
  if (chat.messages.length !== prevMessageCount.current) {
    prevMessageCount.current = chat.messages.length;
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  }

  return (
    <div className="file-analysis-layout">
      {/* Chat header with "Novo arquivo" button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px"
        }}
      >
        <h2 style={{ margin: 0, fontSize: "16px" }}>Conversa</h2>
        <button
          className="ghost-button"
          onClick={onNewFile}
          type="button"
          style={{ fontSize: "13px" }}
        >
          Novo arquivo
        </button>
      </div>

      {/* Message list */}
      <div
        aria-live="polite"
        className="chat-message-list"
        ref={listRef}
      >
        {/* Schema preview as system message at top */}
        <SchemaPreview schema={schema} />

        {/* Rendered messages */}
        {chat.messages.map((msg, idx) => (
          <ChatMessage
            content={msg.content}
            isStreaming={false}
            key={idx}
            role={msg.role}
          />
        ))}

        {/* Streaming draft */}
        {streaming && chat.draft ? (
          <ChatMessage
            content={chat.draft}
            isStreaming
            role="assistant"
          />
        ) : null}

        {/* Idle streaming placeholder */}
        {streaming && !chat.draft ? (
          <ChatMessage
            content="Recebendo resposta..."
            isStreaming
            role="assistant"
          />
        ) : null}

        {/* Error state */}
        {chat.status === "error" && chat.error ? (
          <div className="error-block" style={{ padding: "12px 0" }}>
            <p style={{ margin: 0 }}>{chat.error}</p>
          </div>
        ) : null}
      </div>

      {/* Quota blocked banner */}
      {chat.quotaBlocked ? (
        <div
          className="note-block warning"
          style={{ borderRadius: "0 6px 6px 0" }}
        >
          <p style={{ margin: 0, fontSize: "14px" }}>
            Voce atingiu o limite de usos gratuitos. Experimente novamente mais tarde ou assine Pro para acesso ilimitado.
          </p>
        </div>
      ) : null}

      {/* Last free use warning */}
      {chat.lastFreeUse && !chat.quotaBlocked ? (
        <div
          className="note-block warning"
          style={{ borderRadius: "0 6px 6px 0" }}
        >
          <p style={{ margin: 0, fontSize: "14px" }}>
            Este e seu ultimo uso gratuito. Assine Pro para acesso ilimitado.
          </p>
        </div>
      ) : null}

      {/* Input row */}
      <div className="chat-input-row">
        <textarea
          disabled={streaming || chat.quotaBlocked}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Faca uma pergunta sobre os dados..."
          rows={2}
          style={{
            flex: 1,
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "8px 12px",
            resize: "none",
            fontFamily: "inherit",
            fontSize: "14px"
          }}
          value={inputText}
        />
        <button
          className="primary-button"
          disabled={!inputText.trim() || streaming || chat.quotaBlocked}
          onClick={handleSubmit}
          type="button"
        >
          <Send aria-hidden size={16} />
          Enviar
        </button>
      </div>

      {/* Quick action row */}
      <div className="quick-action-row">
        <button
          aria-label="Gerar resumo pivo"
          disabled={streaming || chat.quotaBlocked}
          onClick={() => chat.sendQuickAction(uploadedFileId, "pivot")}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "6px",
            background: "#fff",
            padding: "4px 16px",
            fontSize: "12px",
            fontWeight: 650,
            color: "var(--text)",
            cursor: streaming || chat.quotaBlocked ? "not-allowed" : "pointer",
            opacity: streaming || chat.quotaBlocked ? 0.5 : 1
          }}
          type="button"
        >
          Resumo Pivo
        </button>
        <button
          aria-label="Gerar relatorio executivo"
          disabled={streaming || chat.quotaBlocked}
          onClick={() => chat.sendQuickAction(uploadedFileId, "report")}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "6px",
            background: "#fff",
            padding: "4px 16px",
            fontSize: "12px",
            fontWeight: 650,
            color: "var(--text)",
            cursor: streaming || chat.quotaBlocked ? "not-allowed" : "pointer",
            opacity: streaming || chat.quotaBlocked ? 0.5 : 1
          }}
          type="button"
        >
          Relatorio Executivo
        </button>
      </div>
    </div>
  );
}

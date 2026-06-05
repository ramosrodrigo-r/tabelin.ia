"use client";

import type { RegexCompletePayload, RegexMetadata, UserEntitlement } from "@tabelin/shared";
import { useCallback, useState } from "react";

import { useRegisterNewConversation } from "@/components/app/workspace-conversation-context";
import { validateFile } from "@/components/app/attachment-button";
import { RegexInputPanel } from "./components/regex-input-panel";
import { RegexOutputPanel } from "./components/regex-output-panel";
import { type RegexMode, useRegexStream } from "./hooks/use-regex-stream";

type RegexExchange = {
  id: string;
  userText: string;
  status: "complete" | "error";
  result: RegexCompletePayload | null;
  metadata: RegexMetadata | null;
  warnings: string[];
  error: string;
  attachmentMeta?: { charCount: number; wasTruncated: boolean; extractedText: string } | null;
};

type PersistedExchange = {
  id: string;
  userPrompt: string;
  assistantPayload: unknown;
  mode: string;
  platform: string | null;
  dialect: string | null;
  createdAt: Date;
};

export function RegexTool({
  entitlement,
  initialExchanges = [],
}: {
  entitlement: UserEntitlement;
  initialExchanges?: PersistedExchange[];
}) {
  // D-08: restaurar mode do exchange mais recente
  const lastEx = initialExchanges[initialExchanges.length - 1];

  const [mode, setMode] = useState<RegexMode>((lastEx?.mode as RegexMode) ?? "generate");
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState("");
  // Seed de exchanges com dados do servidor (lazy initializer)
  const [exchanges, setExchanges] = useState<RegexExchange[]>(() =>
    initialExchanges.map((ex) => ({
      id: ex.id,
      userText: ex.userPrompt,
      status: "complete" as const,
      result: (ex.assistantPayload as RegexCompletePayload) ?? null,
      metadata: null,
      warnings: [],
      error: "",
    }))
  );
  const [submittedText, setSubmittedText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const stream = useRegexStream();
  const pending = stream.status === "loading" || stream.status === "streaming";
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";

  function handleFileSelect(file: File) {
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    setPendingFile(file);
  }

  const handleNewConversation = useCallback(() => {
    setExchanges([]);
    setSubmittedText("");
  }, []);

  // Registrar callback no contexto para que o Topbar possa invocar após hard delete
  useRegisterNewConversation(handleNewConversation);

  async function submit() {
    if (!text.trim()) {
      setValidationError(
        mode === "generate"
          ? "Descreva o padrao antes de gerar."
          : "Cole uma expressao regular antes de explicar."
      );
      return;
    }

    if (submittedText && (stream.status === "complete" || stream.status === "error")) {
      setExchanges((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          userText: submittedText,
          status: stream.status as "complete" | "error",
          result: stream.result,
          metadata: stream.metadata,
          warnings: stream.warnings,
          error: stream.error,
          attachmentMeta: stream.attachmentMeta,
        },
      ]);
    }

    const snapshot = text;
    const fileSnapshot = pendingFile;
    setText("");
    setPendingFile(null);
    setFileError(null);
    setSubmittedText(snapshot);
    setValidationError("");
    await stream.submit({ mode, text: snapshot, file: fileSnapshot ?? undefined });
  }

  function handleModeChange(newMode: RegexMode) {
    setMode(newMode);
    setText("");
    setValidationError("");
    if (newMode !== "generate") {
      // CR-01: anexo só existe em modo "generate" — limpar arquivo pendente ao trocar
      setPendingFile(null);
      setFileError(null);
    }
  }

  return (
    <div
      className="tool-chat"
      aria-label="Regex workspace"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!isPro || mode !== "generate") return;
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
      }}
      data-drag-over={dragOver}
    >
      {(exchanges.length > 0 || (submittedText && stream.status !== "idle")) ? (
        <div className="chat-thread">
          {exchanges.map((ex) => (
            <div key={ex.id} className="chat-exchange">
              <div className="user-bubble">{ex.userText}</div>
              <RegexOutputPanel
                status={ex.status}
                draft=""
                result={ex.result}
                metadata={ex.metadata}
                warnings={ex.warnings}
                error={ex.error}
                attachmentMeta={ex.attachmentMeta ?? null}
                onRetry={submit}
              />
            </div>
          ))}

          {submittedText && stream.status !== "idle" ? (
            <div className="chat-exchange">
              <div className="user-bubble">{submittedText}</div>
              <RegexOutputPanel
                status={stream.status}
                draft={stream.draft}
                result={stream.result}
                metadata={stream.metadata}
                warnings={stream.warnings}
                error={stream.error}
                attachmentMeta={stream.attachmentMeta}
                onRetry={submit}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {stream.attachmentStatus === "uploading" ? (
        <p className="privacy-notice" aria-live="polite">Enviando documento...</p>
      ) : null}
      {stream.attachmentStatus === "extracting" ? (
        <p className="privacy-notice" aria-live="polite">Extraindo conteúdo...</p>
      ) : null}

      <RegexInputPanel
        mode={mode}
        text={text}
        validationError={validationError}
        pending={pending}
        isPro={isPro}
        quotaBlocked={stream.quotaBlocked}
        lastFreeUse={stream.lastFreeUse}
        pendingFile={pendingFile}
        fileError={fileError}
        onModeChange={handleModeChange}
        onTextChange={setText}
        onSubmit={submit}
        onFileSelect={handleFileSelect}
        onFileRemove={() => { setPendingFile(null); setFileError(null); }}
      />
    </div>
  );
}

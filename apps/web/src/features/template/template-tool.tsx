"use client";

import type { TemplateGenerateResponse, TemplateMetadata, UserEntitlement } from "@tabelin/shared";
import { useCallback, useState } from "react";

import { useRegisterNewConversation } from "@/components/app/workspace-conversation-context";
import { validateFile } from "@/components/app/attachment-button";
import { TemplateInputPanel } from "./components/template-input-panel";
import { TemplateOutputPanel } from "./components/template-output-panel";
import { useTemplateStream } from "./hooks/use-template-stream";

type TemplateExchange = {
  id: string;
  userText: string;
  status: "complete" | "error";
  result: TemplateGenerateResponse | null;
  metadata: TemplateMetadata | null;
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

export function TemplateTool({
  entitlement,
  initialExchanges = [],
}: {
  entitlement: UserEntitlement;
  initialExchanges?: PersistedExchange[];
}) {
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState("");
  // Seed de exchanges com dados do servidor (lazy initializer)
  // TemplateTool não tem seletores de domínio (mode implícito "generate")
  const [exchanges, setExchanges] = useState<TemplateExchange[]>(() =>
    initialExchanges.map((ex) => ({
      id: ex.id,
      userText: ex.userPrompt,
      status: "complete" as const,
      result: (ex.assistantPayload as TemplateGenerateResponse) ?? null,
      metadata: null,
      warnings: [],
      error: "",
    }))
  );
  const [submittedText, setSubmittedText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const stream = useTemplateStream();
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
      setValidationError("Descreva o tipo de planilha antes de gerar.");
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
    await stream.submit({ text: snapshot, file: fileSnapshot ?? undefined });
  }

  return (
    <div
      className="tool-chat"
      aria-label="Templates workspace"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!isPro) return;
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
              <TemplateOutputPanel
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
              <TemplateOutputPanel
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

      <TemplateInputPanel
        text={text}
        validationError={validationError}
        pending={pending}
        isPro={isPro}
        proBlocked={stream.proBlocked}
        quotaBlocked={stream.quotaBlocked}
        lastFreeUse={stream.lastFreeUse}
        pendingFile={pendingFile}
        fileError={fileError}
        onTextChange={setText}
        onSubmit={submit}
        onFileSelect={handleFileSelect}
        onFileRemove={() => { setPendingFile(null); setFileError(null); }}
      />
    </div>
  );
}

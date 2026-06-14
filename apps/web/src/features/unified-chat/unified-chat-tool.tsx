"use client";

import type {
  OverrideIntent,
  UnifiedCompletePayload,
  UnifiedIntent,
} from "@tabelin/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import { AttachmentButton, validateFile } from "@/components/app/attachment-button";
import { AttachmentChip } from "@/components/app/attachment-chip";
import { ChatInput } from "@/components/app/chat-input";
import { PrivacyNotice } from "@/components/app/privacy-notice";
import { useRegisterNewConversation } from "@/components/app/workspace-conversation-context";
import { useWorkspaceState } from "@/components/app/workspace-state-context";
import { IntentPill } from "./components/intent-pill";
import { RenderDispatcher } from "./components/render-dispatcher";
import {
  type UnifiedAttachmentMeta,
  type UnifiedChatStreamStatus,
  useUnifiedChatStream,
} from "./hooks/use-unified-chat-stream";

type UnifiedExchange = {
  id: string;
  userText: string;
  status: Exclude<UnifiedChatStreamStatus, "idle" | "loading" | "streaming">;
  payload: UnifiedCompletePayload | null;
  intent: UnifiedIntent | null;
  confidence: "high" | "low" | null;
  warnings: string[];
  error: string;
  metadata: unknown | null;
  attachmentMeta: UnifiedAttachmentMeta | null;
  corrected: boolean;
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

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `exchange-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function intentFromPayload(payload: unknown): UnifiedIntent | null {
  if (typeof payload !== "object" || payload === null) return null;
  const kind = (payload as Record<string, unknown>).kind;

  switch (kind) {
    case "table_spec":
      return "sheet_operation";
    case "qa_response":
      return "qa";
    default:
      return null;
  }
}

export function UnifiedChatTool({
  initialExchanges = [],
}: {
  initialExchanges?: PersistedExchange[];
}) {
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [submittedCorrected, setSubmittedCorrected] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [exchanges, setExchanges] = useState<UnifiedExchange[]>(() =>
    initialExchanges.map((exchange) => {
      const payload = exchange.assistantPayload as UnifiedCompletePayload;
      return {
        id: exchange.id,
        userText: exchange.userPrompt,
        status: "complete" as const,
        payload,
        intent: intentFromPayload(payload),
        confidence: "high" as const,
        warnings: [],
        error: "",
        metadata: null,
        attachmentMeta: null,
        corrected: false,
      };
    })
  );

  const workspaceState = useWorkspaceState();
  const stream = useUnifiedChatStream();
  const pending = stream.status === "loading" || stream.status === "streaming";
  const lastSubmitInputRef = useRef<Parameters<typeof stream.submit>[0] | null>(null);
  const appliedResultRef = useRef<UnifiedCompletePayload | null>(null);

  const handleNewConversation = useCallback(() => {
    setExchanges([]);
    setSubmittedText("");
    setSubmittedCorrected(false);
    setText("");
    setPendingFile(null);
    setFileError(null);
    setValidationError("");
    appliedResultRef.current = null;
    stream.reset();
  }, [stream]);

  useRegisterNewConversation(handleNewConversation);

  useEffect(() => {
    if (!submittedText) return;
    const terminalStatus =
      stream.status === "complete" || stream.status === "error" ? stream.status : null;
    if (!terminalStatus) return;

    queueMicrotask(() => {
      setExchanges((current) => [
        ...current,
        {
          id: createId(),
          userText: submittedText,
          status: terminalStatus,
          payload: stream.result,
          intent: stream.intent,
          confidence: stream.confidence,
          warnings: stream.warnings,
          error: stream.error,
          metadata: stream.metadata,
          attachmentMeta: stream.attachmentMeta,
          corrected: submittedCorrected,
        },
      ]);
      setSubmittedText("");
      setSubmittedCorrected(false);
    });
  }, [
    stream.attachmentMeta,
    stream.confidence,
    stream.error,
    stream.intent,
    stream.metadata,
    stream.result,
    stream.status,
    stream.warnings,
    submittedCorrected,
    submittedText,
  ]);

  // Mutação chat→grade: ao concluir um stream cujo payload é table_spec, aplica
  // o novo estado na planilha viva via setSpec (entra no histórico → Ctrl+Z desfaz).
  // O ref deduplica a aplicação para não re-disparar em re-renders subsequentes.
  useEffect(() => {
    if (stream.status !== "complete") return;
    const result = stream.result;
    if (!result || result.kind !== "table_spec") return;
    if (appliedResultRef.current === result) return;

    appliedResultRef.current = result;
    workspaceState.setSpec(result);
  }, [stream.status, stream.result, workspaceState]);

  function handleFileSelect(file: File) {
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    setPendingFile(file);
  }

  async function submitPrompt(
    prompt: string,
    options: {
      file?: File;
      overrideIntent?: OverrideIntent;
      corrected?: boolean;
    } = {}
  ) {
    if (pending) return;

    const trimmed = prompt.trim();
    if (!trimmed) {
      setValidationError("Descreva o que você precisa antes de enviar.");
      return;
    }

    const fileSnapshot = options.file ?? pendingFile ?? undefined;
    setValidationError("");
    setFileError(null);
    setText("");
    setPendingFile(null);
    setSubmittedText(trimmed);
    setSubmittedCorrected(Boolean(options.corrected));
    const resolvedLastIntent =
      [...exchanges].reverse().find((exchange) => exchange.intent && exchange.intent !== "unknown")?.intent ?? null;

    const submitInput = {
      prompt: trimmed,
      file: fileSnapshot,
      overrideIntent: options.overrideIntent,
      lastIntent: resolvedLastIntent,
    };

    lastSubmitInputRef.current = submitInput;
    await stream.submit(submitInput);
  }

  function handleOverride(exchange: UnifiedExchange, overrideIntent: OverrideIntent) {
    setExchanges((current) => current.filter((item) => item.id !== exchange.id));
    void submitPrompt(exchange.userText, {
      overrideIntent,
      corrected: true,
    });
  }

  function handleLiveOverride(overrideIntent: OverrideIntent) {
    if (!submittedText) return;
    void submitPrompt(submittedText, {
      overrideIntent,
      corrected: true,
    });
  }

  function handleRetry(exchange: UnifiedExchange) {
    setExchanges((current) => current.filter((item) => item.id !== exchange.id));
    void submitPrompt(exchange.userText);
  }

  const hasConversation = exchanges.length > 0 || Boolean(submittedText && stream.status !== "idle");

  return (
    <div
      className="tool-chat unified-chat"
      aria-label="Chat unificado"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
      }}
      data-drag-over={dragOver}
    >
      {!hasConversation ? (
        <section className="unified-empty-state" aria-label="Início do chat unificado">
          <h1>O que você quer resolver hoje?</h1>
          <p>
            Escreva um pedido sobre a planilha aberta — ex.: &quot;ordena por data&quot; ou
            &quot;cria uma coluna de total&quot; — ou faça uma pergunta sobre os dados, ex.:
            &quot;qual a média da coluna Valor?&quot;.
          </p>
        </section>
      ) : null}

      {hasConversation ? (
        <div className="chat-thread">
          {exchanges.map((exchange) => (
            <div key={exchange.id} className="chat-exchange">
              <div className="user-bubble">{exchange.userText}</div>
              {exchange.intent ? (
                <IntentPill
                  intent={exchange.intent}
                  corrected={exchange.corrected}
                  onOverride={(intent) => handleOverride(exchange, intent)}
                />
              ) : null}
              <RenderDispatcher
                status={exchange.status}
                draft=""
                payload={exchange.payload}
                metadata={exchange.metadata}
                warnings={exchange.warnings}
                error={exchange.error}
                onRetry={() => handleRetry(exchange)}
              />
            </div>
          ))}

          {submittedText && stream.status !== "idle" ? (
            <div className="chat-exchange">
              <div className="user-bubble">{submittedText}</div>
              {stream.intent ? (
                <IntentPill
                  intent={stream.intent}
                  corrected={submittedCorrected}
                  onOverride={handleLiveOverride}
                />
              ) : null}
              <RenderDispatcher
                status={stream.status}
                draft={stream.draft}
                payload={stream.result}
                metadata={stream.metadata}
                warnings={stream.warnings}
                error={stream.error}
                onRetry={() => void submitPrompt(submittedText)}
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

      <section aria-label="Entrada do chat unificado">
        <ChatInput
          id="unified-chat-text"
          label="Pedido"
          value={text}
          onChange={setText}
          onSubmit={() => void submitPrompt(text)}
          placeholder="Descreva o que você precisa na planilha, ou faça uma pergunta sobre os dados."
          pending={pending}
          submitLabel="Enviar"
          leftAction={
            <AttachmentButton
              isPro={true}
              disabled={pending}
              onFileSelect={handleFileSelect}
            />
          }
        />

        {pendingFile ? (
          <>
            <AttachmentChip file={pendingFile} onRemove={() => { setPendingFile(null); setFileError(null); }} />
            <PrivacyNotice />
          </>
        ) : null}

        {fileError ? <div className="form-error mt-2">{fileError}</div> : null}
        {validationError ? <div className="form-error mt-2">{validationError}</div> : null}
      </section>
    </div>
  );
}

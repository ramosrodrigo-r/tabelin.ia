"use client";

import type {
  FormulaCompletePayload,
  FormulaLanguage,
  FormulaMetadata,
  FormulaPlatform,
  UserEntitlement,
} from "@tabelin/shared";
import { useCallback, useState } from "react";

import { useRegisterNewConversation } from "@/components/app/workspace-conversation-context";
import { validateFile } from "@/components/app/attachment-button";
import { FormulaInputPanel } from "./components/formula-input-panel";
import { FormulaOutputPanel } from "./components/formula-output-panel";
import { type FormulaMode, useFormulaStream } from "./hooks/use-formula-stream";

type FormulaExchange = {
  id: string;
  userText: string;
  status: "complete" | "error";
  result: FormulaCompletePayload | null;
  metadata: FormulaMetadata | null;
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

export function FormulaTool({
  entitlement,
  initialExchanges = [],
}: {
  entitlement: UserEntitlement;
  initialExchanges?: PersistedExchange[];
}) {
  // D-08: restaurar seletores do exchange mais recente
  const lastEx = initialExchanges[initialExchanges.length - 1];

  const [mode, setMode] = useState<FormulaMode>((lastEx?.mode as FormulaMode) ?? "generate");
  const [platform, setPlatform] = useState<FormulaPlatform>((lastEx?.platform as FormulaPlatform) ?? "excel");
  const [formulaLanguage, setFormulaLanguage] = useState<FormulaLanguage>((lastEx?.dialect as FormulaLanguage) ?? "pt-BR");
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState("");
  const [showRevokedNotice, setShowRevokedNotice] = useState(entitlement.recentlyRevoked || false);
  // Seed de exchanges com dados do servidor (lazy initializer)
  const [exchanges, setExchanges] = useState<FormulaExchange[]>(() =>
    initialExchanges.map((ex) => ({
      id: ex.id,
      userText: ex.userPrompt,
      status: "complete" as const,
      result: (ex.assistantPayload as FormulaCompletePayload) ?? null,
      metadata: null,
      warnings: [],
      error: "",
    }))
  );
  const [submittedText, setSubmittedText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const stream = useFormulaStream();
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

  function handleModeChange(newMode: FormulaMode) {
    setMode(newMode);
    if (newMode !== "generate") {
      // CR-01: anexo só existe em modo "generate" — limpar arquivo pendente ao trocar
      setPendingFile(null);
      setFileError(null);
    }
  }

  const handleNewConversation = useCallback(() => {
    setExchanges([]);
    setSubmittedText("");
  }, []);

  // Registrar callback no contexto para que o Topbar possa invocar após hard delete
  useRegisterNewConversation(handleNewConversation);

  async function submit() {
    if (!platform || !formulaLanguage) {
      setValidationError("Escolha a plataforma e o idioma da formula.");
      return;
    }
    if (!text.trim()) {
      setValidationError(
        mode === "generate"
          ? "Descreva a tarefa da planilha antes de gerar."
          : "Cole uma formula antes de explicar."
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
    await stream.submit({ mode, platform, formulaLanguage, text: snapshot, file: fileSnapshot ?? undefined });
  }

  return (
    <div
      className="tool-chat"
      aria-label="Formula workspace"
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
      {showRevokedNotice ? (
        <div className="revoked-notice">
          <p>Seu plano Pro foi cancelado. Voce retornou ao plano gratuito com 4 usos a cada 12 horas.</p>
          <button className="ghost-button" type="button" onClick={() => setShowRevokedNotice(false)}>
            Entendi
          </button>
        </div>
      ) : null}

      {(exchanges.length > 0 || (submittedText && stream.status !== "idle")) ? (
        <div className="chat-thread">
          {exchanges.map((ex) => (
            <div key={ex.id} className="chat-exchange">
              <div className="user-bubble">{ex.userText}</div>
              <FormulaOutputPanel
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
              <FormulaOutputPanel
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

      <FormulaInputPanel
        mode={mode}
        platform={platform}
        formulaLanguage={formulaLanguage}
        text={text}
        validationError={validationError}
        pending={pending}
        isPro={isPro}
        quotaBlocked={stream.quotaBlocked}
        lastFreeUse={stream.lastFreeUse}
        pendingFile={pendingFile}
        fileError={fileError}
        onModeChange={handleModeChange}
        onPlatformChange={setPlatform}
        onLanguageChange={setFormulaLanguage}
        onTextChange={setText}
        onSubmit={submit}
        onFileSelect={handleFileSelect}
        onFileRemove={() => { setPendingFile(null); setFileError(null); }}
      />
    </div>
  );
}

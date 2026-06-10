"use client";

import type {
  FormulaLanguage,
  FormulaPlatform,
  OverrideIntent,
  ScriptType,
  SqlDialect,
  TableSpecPayload,
  UnifiedCompletePayload,
  UnifiedIntent,
  UserEntitlement,
} from "@tabelin/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import { AttachmentButton, validateFile } from "@/components/app/attachment-button";
import { AttachmentChip } from "@/components/app/attachment-chip";
import { ChatInput } from "@/components/app/chat-input";
import { PrivacyNotice } from "@/components/app/privacy-notice";
import { useRegisterNewConversation } from "@/components/app/workspace-conversation-context";
import { IntentPill } from "./components/intent-pill";
import { RenderDispatcher } from "./components/render-dispatcher";
import { SessionContextSelector } from "./components/session-context-selector";
import {
  type UnifiedAttachmentMeta,
  type UnifiedChatStreamStatus,
  useUnifiedChatStream,
} from "./hooks/use-unified-chat-stream";

type UnifiedContext = {
  platform: FormulaPlatform;
  formulaLanguage: FormulaLanguage;
  separator: ";" | ",";
  sqlDialect: SqlDialect;
  scriptType: ScriptType;
};

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
  needsFile: "file_analysis" | "ocr" | null;
  corrected: boolean;
  context: UnifiedContext;
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

function defaultContext(): UnifiedContext {
  return {
    platform: "excel",
    formulaLanguage: "pt-BR",
    separator: ";",
    sqlDialect: "postgresql",
    scriptType: "apps_script",
  };
}

function intentFromPayload(payload: unknown): UnifiedIntent | null {
  if (typeof payload !== "object" || payload === null) return null;
  const kind = (payload as Record<string, unknown>).kind;

  switch (kind) {
    case "formula":
    case "explanation":
      return "formula";
    case "sql":
      return "sql";
    case "regex_generate":
    case "regex_explain":
      return "regex";
    case "script":
      return "script";
    case "template":
      return "template";
    case "file_analysis":
      return "file_analysis";
    case "ocr":
      return "ocr";
    case "table_stub":
    case "table_clar_question":
    case "table_spec":
      return "tabela";
    case "needs_file":
      return ((payload as { intent?: UnifiedIntent }).intent ?? null) as UnifiedIntent | null;
    default:
      return null;
  }
}

export function UnifiedChatTool({
  entitlement,
  initialExchanges = [],
}: {
  entitlement: UserEntitlement;
  initialExchanges?: PersistedExchange[];
}) {
  const [context, setContext] = useState<UnifiedContext>(defaultContext);
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [submittedContext, setSubmittedContext] = useState<UnifiedContext | null>(null);
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
        needsFile: payload?.kind === "needs_file" ? payload.intent : null,
        corrected: false,
        context: {
          ...defaultContext(),
          platform: (exchange.platform as FormulaPlatform) ?? "excel",
          formulaLanguage: (exchange.dialect as FormulaLanguage) ?? "pt-BR",
        },
      };
    })
  );

  const stream = useUnifiedChatStream();
  const pending = stream.status === "loading" || stream.status === "streaming";
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";
  const lastSubmitInputRef = useRef<Parameters<typeof stream.submit>[0] | null>(null);

  const handleNewConversation = useCallback(() => {
    setExchanges([]);
    setSubmittedText("");
    setSubmittedContext(null);
    setSubmittedCorrected(false);
    setText("");
    setPendingFile(null);
    setFileError(null);
    setValidationError("");
    stream.reset();
  }, [stream]);

  useRegisterNewConversation(handleNewConversation);

  useEffect(() => {
    if (!submittedText || !submittedContext) return;
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
          needsFile: stream.needsFile,
          corrected: submittedCorrected,
          context: submittedContext,
        },
      ]);
      setSubmittedText("");
      setSubmittedContext(null);
      setSubmittedCorrected(false);
    });
  }, [
    stream.attachmentMeta,
    stream.confidence,
    stream.error,
    stream.intent,
    stream.metadata,
    stream.needsFile,
    stream.result,
    stream.status,
    stream.warnings,
    submittedContext,
    submittedCorrected,
    submittedText,
  ]);

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
      contextSnapshot?: UnifiedContext;
    } = {}
  ) {
    if (pending || stream.quotaBlocked || stream.proBlocked) return;

    const trimmed = prompt.trim();
    if (!trimmed) {
      setValidationError("Descreva o que você precisa antes de enviar.");
      return;
    }

    const contextSnapshot = options.contextSnapshot ?? context;
    const fileSnapshot = options.file ?? pendingFile ?? undefined;
    setValidationError("");
    setFileError(null);
    setText("");
    setPendingFile(null);
    setSubmittedText(trimmed);
    setSubmittedContext(contextSnapshot);
    setSubmittedCorrected(Boolean(options.corrected));
    const resolvedLastIntent =
      [...exchanges].reverse().find((exchange) => exchange.intent && exchange.intent !== "unknown")?.intent ?? null;

    const submitInput = {
      prompt: trimmed,
      file: fileSnapshot,
      overrideIntent: options.overrideIntent,
      platform: contextSnapshot.platform,
      formulaLanguage: contextSnapshot.formulaLanguage,
      separator: contextSnapshot.separator,
      sqlDialect: contextSnapshot.sqlDialect,
      scriptType: contextSnapshot.scriptType,
      lastIntent: resolvedLastIntent,
    };

    lastSubmitInputRef.current = submitInput;
    await stream.submit(submitInput);
  }

  function handleAnswerClarification(answer: string) {
    const last = lastSubmitInputRef.current;
    if (!last) return;
    void submitPrompt(answer, {
      contextSnapshot: {
        platform: last.platform,
        formulaLanguage: last.formulaLanguage,
        separator: last.separator,
        sqlDialect: last.sqlDialect,
        scriptType: last.scriptType,
      },
    });
  }

  function handleSkipClarification() {
    const last = lastSubmitInputRef.current;
    if (!last) return;
    void stream.submit({ ...last, overrideGenerate: true });
  }

  function handleConfirmSpec(spec: TableSpecPayload) {
    const last = lastSubmitInputRef.current;
    if (!last) return;
    void stream.submit({
      ...last,
      overrideGenerate: true,
      specOverride: JSON.stringify(spec),
    });
  }

  function handleOverride(exchange: UnifiedExchange, overrideIntent: OverrideIntent) {
    setExchanges((current) => current.filter((item) => item.id !== exchange.id));
    void submitPrompt(exchange.userText, {
      overrideIntent,
      corrected: true,
      contextSnapshot: exchange.context,
    });
  }

  function handleLiveOverride(overrideIntent: OverrideIntent) {
    if (!submittedText) return;
    void submitPrompt(submittedText, {
      overrideIntent,
      corrected: true,
      contextSnapshot: submittedContext ?? context,
    });
  }

  function handleRetry(exchange: UnifiedExchange) {
    setExchanges((current) => current.filter((item) => item.id !== exchange.id));
    void submitPrompt(exchange.userText, { contextSnapshot: exchange.context });
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
        if (!isPro) return;
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
      }}
      data-drag-over={dragOver}
    >
      {!hasConversation ? (
        <section className="unified-empty-state" aria-label="Início do chat unificado">
          <h1>O que você quer resolver hoje?</h1>
          <p>
            Escreva seu pedido em português e a IA escolhe a ferramenta certa. Ex.: &quot;me dá
            uma fórmula PROCV&quot; ou &quot;SELECT das vendas de março&quot;. Para análise ou OCR,
            anexe um arquivo com o clipe.
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
                attachmentMeta={exchange.attachmentMeta}
                needsFile={exchange.needsFile}
                onRetry={() => handleRetry(exchange)}
                onAnswer={handleAnswerClarification}
                onSkip={handleSkipClarification}
                onConfirm={handleConfirmSpec}
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
                attachmentMeta={stream.attachmentMeta}
                needsFile={stream.needsFile}
                onRetry={() => void submitPrompt(submittedText, { contextSnapshot: submittedContext ?? context })}
                onAnswer={handleAnswerClarification}
                onSkip={handleSkipClarification}
                onConfirm={handleConfirmSpec}
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
          placeholder="Descreva o que você precisa — fórmula, SQL, regex, script, análise ou tabela."
          pending={pending}
          disabled={stream.quotaBlocked}
          submitLabel="Enviar"
          options={
            <SessionContextSelector
              platform={context.platform}
              formulaLanguage={context.formulaLanguage}
              separator={context.separator}
              sqlDialect={context.sqlDialect}
              onPlatformChange={(platform) => setContext((current) => ({ ...current, platform }))}
              onFormulaLanguageChange={(formulaLanguage) =>
                setContext((current) => ({
                  ...current,
                  formulaLanguage,
                  separator: formulaLanguage === "pt-BR" ? ";" : ",",
                }))
              }
              onSeparatorChange={(separator) => setContext((current) => ({ ...current, separator }))}
              onSqlDialectChange={(sqlDialect) => setContext((current) => ({ ...current, sqlDialect }))}
            />
          }
          leftAction={
            <AttachmentButton
              isPro={isPro}
              disabled={pending || stream.quotaBlocked}
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

        {!isPro && stream.lastFreeUse && !stream.quotaBlocked ? (
          <div className="quota-warning mt-2">
            Este é seu último uso gratuito. Assine Pro para acesso ilimitado.
          </div>
        ) : null}

        {!isPro && stream.quotaBlocked ? (
          <div className="quota-blocked mt-2">
            <p>
              Você atingiu o limite de 4 usos gratuitos. Experimente novamente mais tarde ou assine
              Pro para acesso ilimitado.
            </p>
          </div>
        ) : null}

        {!isPro && stream.proBlocked ? (
          <div className="quota-blocked mt-2">
            <p>Este tipo de resposta exige o plano Pro.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

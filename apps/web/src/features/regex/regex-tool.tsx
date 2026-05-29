"use client";

import type { RegexCompletePayload, RegexMetadata, UserEntitlement } from "@tabelin/shared";
import { useCallback, useState } from "react";

import { useRegisterNewConversation } from "@/components/app/workspace-conversation-context";
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
  const stream = useRegexStream();
  const pending = stream.status === "loading" || stream.status === "streaming";
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";

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
        },
      ]);
    }

    const snapshot = text;
    setText("");
    setSubmittedText(snapshot);
    setValidationError("");
    await stream.submit({ mode, text: snapshot });
  }

  function handleModeChange(newMode: RegexMode) {
    setMode(newMode);
    setText("");
    setValidationError("");
  }

  return (
    <div className="tool-chat" aria-label="Regex workspace">
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
                onRetry={submit}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <RegexInputPanel
        mode={mode}
        text={text}
        validationError={validationError}
        pending={pending}
        isPro={isPro}
        quotaBlocked={stream.quotaBlocked}
        lastFreeUse={stream.lastFreeUse}
        onModeChange={handleModeChange}
        onTextChange={setText}
        onSubmit={submit}
      />
    </div>
  );
}

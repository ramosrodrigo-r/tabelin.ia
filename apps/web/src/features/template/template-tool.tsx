"use client";

import type { TemplateGenerateResponse, TemplateMetadata, UserEntitlement } from "@tabelin/shared";
import { useState } from "react";

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
};

export function TemplateTool({ entitlement }: { entitlement: UserEntitlement }) {
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState("");
  const [exchanges, setExchanges] = useState<TemplateExchange[]>([]);
  const [submittedText, setSubmittedText] = useState("");
  const stream = useTemplateStream();
  const pending = stream.status === "loading" || stream.status === "streaming";
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";

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
        },
      ]);
    }

    const snapshot = text;
    setText("");
    setSubmittedText(snapshot);
    setValidationError("");
    await stream.submit({ text: snapshot });
  }

  return (
    <div className="tool-chat" aria-label="Templates workspace">
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
                onRetry={submit}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <TemplateInputPanel
        text={text}
        validationError={validationError}
        pending={pending}
        isPro={isPro}
        proBlocked={stream.proBlocked}
        quotaBlocked={stream.quotaBlocked}
        lastFreeUse={stream.lastFreeUse}
        onTextChange={setText}
        onSubmit={submit}
      />
    </div>
  );
}

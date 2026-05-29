"use client";

import type { ScriptGenerateResponse, ScriptMetadata, UserEntitlement } from "@tabelin/shared";
import type { ScriptType } from "@tabelin/shared";
import { useState } from "react";

import { ScriptsInputPanel } from "./components/scripts-input-panel";
import { ScriptsOutputPanel } from "./components/scripts-output-panel";
import { useScriptsStream } from "./hooks/use-scripts-stream";

type ScriptExchange = {
  id: string;
  userText: string;
  status: "complete" | "error";
  result: ScriptGenerateResponse | null;
  metadata: ScriptMetadata | null;
  warnings: string[];
  error: string;
};

export function ScriptsTool({ entitlement }: { entitlement: UserEntitlement }) {
  const [scriptType, setScriptType] = useState<ScriptType>("vba");
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState("");
  const [exchanges, setExchanges] = useState<ScriptExchange[]>([]);
  const [submittedText, setSubmittedText] = useState("");
  const stream = useScriptsStream();
  const pending = stream.status === "loading" || stream.status === "streaming";
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";

  async function submit() {
    if (!text.trim()) {
      setValidationError("Descreva a automacao antes de gerar.");
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
    await stream.submit({ scriptType, text: snapshot });
  }

  return (
    <div className="tool-chat" aria-label="Scripts workspace">
      {(exchanges.length > 0 || (submittedText && stream.status !== "idle")) ? (
        <div className="chat-thread">
          {exchanges.map((ex) => (
            <div key={ex.id} className="chat-exchange">
              <div className="user-bubble">{ex.userText}</div>
              <ScriptsOutputPanel
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
              <ScriptsOutputPanel
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

      <ScriptsInputPanel
        scriptType={scriptType}
        text={text}
        validationError={validationError}
        pending={pending}
        isPro={isPro}
        quotaBlocked={stream.quotaBlocked}
        lastFreeUse={stream.lastFreeUse}
        onScriptTypeChange={setScriptType}
        onTextChange={setText}
        onSubmit={submit}
      />
    </div>
  );
}

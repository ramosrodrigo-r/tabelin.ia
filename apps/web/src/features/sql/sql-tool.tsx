"use client";

import type { SqlGenerateResponse, SqlMetadata, UserEntitlement } from "@tabelin/shared";
import type { SqlDialect } from "@tabelin/shared";
import { useCallback, useState } from "react";

import { useRegisterNewConversation } from "@/components/app/workspace-conversation-context";
import { SqlInputPanel } from "./components/sql-input-panel";
import { SqlOutputPanel } from "./components/sql-output-panel";
import { useSqlStream } from "./hooks/use-sql-stream";

type SqlExchange = {
  id: string;
  userText: string;
  status: "complete" | "error";
  result: SqlGenerateResponse | null;
  metadata: SqlMetadata | null;
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

export function SqlTool({
  entitlement,
  initialExchanges = [],
}: {
  entitlement: UserEntitlement;
  initialExchanges?: PersistedExchange[];
}) {
  // D-08: restaurar dialect do exchange mais recente
  const lastEx = initialExchanges[initialExchanges.length - 1];

  const [dialect, setDialect] = useState<SqlDialect>((lastEx?.dialect as SqlDialect) ?? "postgresql");
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState("");
  // Seed de exchanges com dados do servidor (lazy initializer)
  const [exchanges, setExchanges] = useState<SqlExchange[]>(() =>
    initialExchanges.map((ex) => ({
      id: ex.id,
      userText: ex.userPrompt,
      status: "complete" as const,
      result: (ex.assistantPayload as SqlGenerateResponse) ?? null,
      metadata: null,
      warnings: [],
      error: "",
    }))
  );
  const [submittedText, setSubmittedText] = useState("");
  const stream = useSqlStream();
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
      setValidationError("Descreva a consulta antes de gerar.");
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
    await stream.submit({ dialect, text: snapshot });
  }

  return (
    <div className="tool-chat" aria-label="SQL workspace">
      {(exchanges.length > 0 || (submittedText && stream.status !== "idle")) ? (
        <div className="chat-thread">
          {exchanges.map((ex) => (
            <div key={ex.id} className="chat-exchange">
              <div className="user-bubble">{ex.userText}</div>
              <SqlOutputPanel
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
              <SqlOutputPanel
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

      <SqlInputPanel
        dialect={dialect}
        text={text}
        validationError={validationError}
        pending={pending}
        isPro={isPro}
        quotaBlocked={stream.quotaBlocked}
        lastFreeUse={stream.lastFreeUse}
        onDialectChange={setDialect}
        onTextChange={setText}
        onSubmit={submit}
      />
    </div>
  );
}

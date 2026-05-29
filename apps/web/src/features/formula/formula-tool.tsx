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
  const stream = useFormulaStream();
  const pending = stream.status === "loading" || stream.status === "streaming";
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";

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
        },
      ]);
    }

    const snapshot = text;
    setText("");
    setSubmittedText(snapshot);
    setValidationError("");
    await stream.submit({ mode, platform, formulaLanguage, text: snapshot });
  }

  return (
    <div className="tool-chat" aria-label="Formula workspace">
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
                onRetry={submit}
              />
            </div>
          ) : null}
        </div>
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
        onModeChange={setMode}
        onPlatformChange={setPlatform}
        onLanguageChange={setFormulaLanguage}
        onTextChange={setText}
        onSubmit={submit}
      />
    </div>
  );
}

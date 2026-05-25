"use client";

import type { FormulaLanguage, FormulaPlatform, UserEntitlement } from "@tabelin/shared";
import { useState } from "react";

import { FormulaInputPanel } from "./components/formula-input-panel";
import { FormulaOutputPanel } from "./components/formula-output-panel";
import { type FormulaMode, useFormulaStream } from "./hooks/use-formula-stream";

export function FormulaTool({ entitlement }: { entitlement: UserEntitlement }) {
  const [mode, setMode] = useState<FormulaMode>("generate");
  const [platform, setPlatform] = useState<FormulaPlatform>("excel");
  const [formulaLanguage, setFormulaLanguage] = useState<FormulaLanguage>("pt-BR");
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState("");
  const [showRevokedNotice, setShowRevokedNotice] = useState(entitlement.recentlyRevoked || false);
  const stream = useFormulaStream();
  const pending = stream.status === "loading" || stream.status === "streaming";
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";

  async function submit() {
    if (!platform || !formulaLanguage) {
      setValidationError("Escolha a plataforma e o idioma da formula.");
      return;
    }

    if (!text.trim()) {
      setValidationError(mode === "generate" ? "Descreva a tarefa da planilha antes de gerar." : "Cole uma formula antes de explicar.");
      return;
    }

    setValidationError("");
    await stream.submit({
      mode,
      platform,
      formulaLanguage,
      text
    });
  }

  return (
    <>
      {showRevokedNotice ? (
        <div className="revoked-notice">
          <p>Seu plano Pro foi cancelado. Voce retornou ao plano gratuito com 4 usos a cada 12 horas.</p>
          <button className="ghost-button" type="button" onClick={() => setShowRevokedNotice(false)}>
            Entendi
          </button>
        </div>
      ) : null}
      <section className="tool-grid" aria-label="Formula workspace">
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
        <FormulaOutputPanel
          status={stream.status}
          draft={stream.draft}
          result={stream.result}
          metadata={stream.metadata}
          warnings={stream.warnings}
          error={stream.error}
          onRetry={submit}
        />
      </section>
    </>
  );
}


"use client";

import { useState } from "react";
import type { FormulaLanguage, FormulaPlatform } from "@tabelin/shared";
import { FORMULA_LANGUAGES, FORMULA_PLATFORMS } from "@tabelin/shared";

import { ChatInput } from "@/components/app/chat-input";
import type { FormulaMode } from "../hooks/use-formula-stream";

export function FormulaInputPanel({
  mode,
  platform,
  formulaLanguage,
  text,
  validationError,
  pending,
  isPro,
  quotaBlocked,
  lastFreeUse,
  onModeChange,
  onPlatformChange,
  onLanguageChange,
  onTextChange,
  onSubmit,
}: {
  mode: FormulaMode;
  platform: FormulaPlatform;
  formulaLanguage: FormulaLanguage;
  text: string;
  validationError: string;
  pending: boolean;
  isPro: boolean;
  quotaBlocked: boolean;
  lastFreeUse: boolean;
  onModeChange: (mode: FormulaMode) => void;
  onPlatformChange: (platform: FormulaPlatform) => void;
  onLanguageChange: (language: FormulaLanguage) => void;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
}) {
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const submitLabel = pending
    ? "Gerando..."
    : mode === "generate"
      ? "Gerar formula"
      : "Explicar formula";

  const options = (
    <div className="chat-options-row">
      <div className="chat-mode-tabs" role="tablist" aria-label="Modo">
        <button
          role="tab"
          type="button"
          aria-selected={mode === "generate"}
          className="chat-mode-tab"
          onClick={() => onModeChange("generate")}
        >
          Gerar
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={mode === "explain"}
          className="chat-mode-tab"
          onClick={() => onModeChange("explain")}
        >
          Explicar
        </button>
      </div>

      <select
        className="chat-compact-select"
        value={platform}
        aria-label="Plataforma"
        onChange={(e) => onPlatformChange(e.target.value as FormulaPlatform)}
      >
        {FORMULA_PLATFORMS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>

      <div className="chat-lang-toggle" role="group" aria-label="Idioma da formula">
        {FORMULA_LANGUAGES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={formulaLanguage === item.id}
            className="chat-lang-btn"
            onClick={() => onLanguageChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <section aria-label="Entrada da formula">
      <ChatInput
        id="formula-text"
        label={mode === "generate" ? "Pedido" : "Formula"}
        value={text}
        onChange={onTextChange}
        onSubmit={onSubmit}
        placeholder={
          mode === "generate"
            ? "Quero somar a coluna B se a coluna C for Pago"
            : '=SOMASE(C:C;"Pago";B:B)'
        }
        pending={pending}
        disabled={quotaBlocked}
        submitLabel={submitLabel}
        options={options}
      />

      {validationError ? <div className="form-error mt-2">{validationError}</div> : null}

      {!isPro && lastFreeUse && !quotaBlocked ? (
        <div className="quota-warning mt-2">
          Este e seu ultimo uso gratuito. Assine Pro para acesso ilimitado.
        </div>
      ) : null}

      {!isPro && quotaBlocked ? (
        <div className="quota-blocked mt-2">
          <p>
            Voce atingiu o limite de 4 usos gratuitos. Experimente novamente mais tarde ou assine Pro
            para acesso ilimitado.
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={async () => {
              setCheckoutError(null);
              const response = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ cycle: "monthly" }),
              });
              if (response.ok) {
                const data = await response.json();
                window.location.href = data.checkoutUrl;
              } else {
                setCheckoutError("Não foi possível iniciar o checkout. Tente novamente.");
              }
            }}
          >
            Assinar Pro
          </button>
          {checkoutError ? <p className="form-error">{checkoutError}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import type { FormulaLanguage, FormulaPlatform } from "@tabelin/shared";
import { FORMULA_LANGUAGES, FORMULA_PLATFORMS } from "@tabelin/shared";
import { Wand2 } from "lucide-react";

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
  onSubmit
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
  return (
    <section className="tool-panel formula-panel" aria-label="Entrada da formula">
      <div className="mode-tabs" role="tablist" aria-label="Modo">
        <button
          aria-selected={mode === "generate"}
          className="mode-tab"
          onClick={() => onModeChange("generate")}
          role="tab"
          type="button"
        >
          Gerar formula
        </button>
        <button
          aria-selected={mode === "explain"}
          className="mode-tab"
          onClick={() => onModeChange("explain")}
          role="tab"
          type="button"
        >
          Explicar formula
        </button>
      </div>

      <div className="field-stack">
        <div className="field">
          <label htmlFor="formula-platform">Plataforma</label>
          <select
            id="formula-platform"
            value={platform}
            onChange={(event) => onPlatformChange(event.target.value as FormulaPlatform)}
          >
            {FORMULA_PLATFORMS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="segmented-field">
          <legend>Idioma da formula</legend>
          <div className="segmented-control">
            {FORMULA_LANGUAGES.map((item) => (
              <button
                aria-pressed={formulaLanguage === item.id}
                className="segment-button"
                key={item.id}
                onClick={() => onLanguageChange(item.id)}
                type="button"
              >
                {item.label} <span>{item.separator}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="formula-text">{mode === "generate" ? "Pedido" : "Formula"}</label>
          <textarea
            id="formula-text"
            minLength={2}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder={
              mode === "generate"
                ? "Quero somar a coluna B se a coluna C for Pago"
                : '=SOMASE(C:C;"Pago";B:B)'
            }
            rows={8}
            value={text}
          />
        </div>

        {validationError ? <div className="form-error">{validationError}</div> : null}

        {!isPro && lastFreeUse && !quotaBlocked ? (
          <div className="quota-warning">
            Este e seu ultimo uso gratuito. Assine Pro para acesso ilimitado.
          </div>
        ) : null}

        {!isPro && quotaBlocked ? (
          <div className="quota-blocked">
            <p>Voce atingiu o limite de 4 usos gratuitos. Experimente novamente mais tarde ou assine Pro para acesso ilimitado.</p>
            <button
              className="primary-button"
              type="button"
              onClick={async () => {
                const response = await fetch("/api/billing/checkout", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ cycle: "monthly" })
                });
                if (response.ok) {
                  const data = await response.json();
                  window.location.href = data.checkoutUrl;
                }
              }}
            >
              Assinar Pro
            </button>
          </div>
        ) : (
          <button className="primary-button" disabled={pending || quotaBlocked} onClick={onSubmit} type="button">
            <Wand2 aria-hidden size={16} />
            {pending ? "Gerando..." : mode === "generate" ? "Gerar formula" : "Explicar formula"}
          </button>
        )}
      </div>
    </section>
  );
}


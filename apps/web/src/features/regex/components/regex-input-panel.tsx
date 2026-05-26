"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import type { RegexMode } from "../hooks/use-regex-stream";

export function RegexInputPanel({
  mode,
  text,
  validationError,
  pending,
  isPro,
  quotaBlocked,
  lastFreeUse,
  onModeChange,
  onTextChange,
  onSubmit
}: {
  mode: RegexMode;
  text: string;
  validationError: string;
  pending: boolean;
  isPro: boolean;
  quotaBlocked: boolean;
  lastFreeUse: boolean;
  onModeChange: (mode: RegexMode) => void;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
}) {
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  return (
    <section className="tool-panel" aria-label="Entrada da regex">
      <div className="mode-tabs" role="tablist" aria-label="Modo">
        <button
          aria-selected={mode === "generate"}
          className="mode-tab"
          onClick={() => onModeChange("generate")}
          role="tab"
          type="button"
        >
          Gerar regex
        </button>
        <button
          aria-selected={mode === "explain"}
          className="mode-tab"
          onClick={() => onModeChange("explain")}
          role="tab"
          type="button"
        >
          Explicar regex
        </button>
      </div>

      <div className="field-stack">
        <div className="field">
          <label htmlFor="regex-text">
            {mode === "generate" ? "Descricao do padrao" : "Expressao"}
          </label>
          <textarea
            id="regex-text"
            minLength={mode === "generate" ? 3 : 1}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder={
              mode === "generate"
                ? "Quero validar um CPF com pontos e traco, ex: 123.456.789-09."
                : "^[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}$"
            }
            rows={8}
            value={text}
          />
        </div>

        {validationError ? <div className="form-error">{validationError}</div> : null}

        {!isPro && lastFreeUse && !quotaBlocked ? (
          <div className="quota-warning">Este e seu ultimo uso gratuito. Assine Pro para acesso ilimitado.</div>
        ) : null}

        {!isPro && quotaBlocked ? (
          <div className="quota-blocked">
            <p>Voce atingiu o limite de 4 usos gratuitos. Experimente novamente mais tarde ou assine Pro para acesso ilimitado.</p>
            {checkoutError ? <p className="form-error">{checkoutError}</p> : null}
            <button
              className="primary-button"
              type="button"
              onClick={async () => {
                setCheckoutError(null);
                const response = await fetch("/api/billing/checkout", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ cycle: "monthly" })
                });
                if (response.ok) {
                  const data = await response.json();
                  window.location.href = data.checkoutUrl;
                } else {
                  setCheckoutError("Nao foi possivel iniciar o checkout. Tente novamente.");
                }
              }}
            >
              Assinar Pro
            </button>
          </div>
        ) : (
          <button
            className="primary-button"
            disabled={pending || quotaBlocked}
            onClick={onSubmit}
            type="button"
          >
            <Wand2 aria-hidden size={16} />
            {pending ? "Gerando..." : mode === "generate" ? "Gerar regex" : "Explicar regex"}
          </button>
        )}
      </div>
    </section>
  );
}

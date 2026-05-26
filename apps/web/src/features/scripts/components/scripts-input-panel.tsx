"use client";

import { useState } from "react";
import { SCRIPT_TYPES } from "@tabelin/shared";
import type { ScriptType } from "@tabelin/shared";
import { Wand2 } from "lucide-react";

export function ScriptsInputPanel({
  scriptType,
  text,
  validationError,
  pending,
  isPro,
  quotaBlocked,
  lastFreeUse,
  onScriptTypeChange,
  onTextChange,
  onSubmit
}: {
  scriptType: ScriptType;
  text: string;
  validationError: string;
  pending: boolean;
  isPro: boolean;
  quotaBlocked: boolean;
  lastFreeUse: boolean;
  onScriptTypeChange: (type: ScriptType) => void;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
}) {
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  return (
    <section className="tool-panel" aria-label="Entrada do script">
      <div className="field-stack">
        <fieldset className="segmented-field">
          <legend>Tipo de script</legend>
          <div className="segmented-control">
            {SCRIPT_TYPES.map((item) => (
              <button
                aria-pressed={scriptType === item.id}
                className="segment-button"
                key={item.id}
                onClick={() => onScriptTypeChange(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="scripts-prompt">Descricao da automacao</label>
          <textarea
            id="scripts-prompt"
            minLength={3}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder="Quero copiar os dados da aba Vendas para a aba Relatorio ao clicar no botao."
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
            {pending ? "Gerando..." : "Gerar script"}
          </button>
        )}
      </div>
    </section>
  );
}

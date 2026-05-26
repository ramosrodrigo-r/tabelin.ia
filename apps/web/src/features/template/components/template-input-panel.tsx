"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";

export function TemplateInputPanel({
  text,
  validationError,
  pending,
  isPro,
  proBlocked,
  quotaBlocked,
  lastFreeUse,
  onTextChange,
  onSubmit
}: {
  text: string;
  validationError: string;
  pending: boolean;
  isPro: boolean;
  proBlocked: boolean;
  quotaBlocked: boolean;
  lastFreeUse: boolean;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
}) {
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const showProGate = !isPro || proBlocked;

  return (
    <section className="tool-panel" aria-label="Entrada do template">
      <div className="field-stack">
        <div className="field">
          <label htmlFor="template-prompt">Tipo de planilha</label>
          <textarea
            id="template-prompt"
            minLength={3}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder="Controle de gastos mensais por categoria com total acumulado."
            rows={8}
            value={text}
            disabled={showProGate}
          />
        </div>

        {validationError ? <div className="form-error">{validationError}</div> : null}

        {showProGate ? (
          <div className="quota-blocked">
            <p><strong>Recurso exclusivo Pro</strong></p>
            <p>Templates avancados de planilha estao disponiveis no plano Pro. Assine para desbloquear acesso ilimitado.</p>
            {checkoutError ? <p className="form-error">{checkoutError}</p> : null}
            <button
              aria-label="Assinar o plano Pro"
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
          <>
            {lastFreeUse && !quotaBlocked ? (
              <div className="quota-warning">Este e seu ultimo uso gratuito. Assine Pro para acesso ilimitado.</div>
            ) : null}
            <button
              className="primary-button"
              disabled={pending || quotaBlocked}
              onClick={onSubmit}
              type="button"
            >
              <Wand2 aria-hidden size={16} />
              {pending ? "Gerando..." : "Gerar template"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";

import { ChatInput } from "@/components/app/chat-input";

export function TemplateInputPanel({
  text,
  validationError,
  pending,
  isPro,
  proBlocked,
  quotaBlocked,
  lastFreeUse,
  onTextChange,
  onSubmit,
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
    <section aria-label="Entrada do template">
      <ChatInput
        id="template-prompt"
        label="Tipo de planilha"
        value={text}
        onChange={onTextChange}
        onSubmit={onSubmit}
        placeholder="Controle de gastos mensais por categoria com total acumulado."
        pending={pending}
        disabled={showProGate || quotaBlocked}
        submitLabel={pending ? "Gerando..." : "Gerar template"}
      />

      {validationError ? <div className="form-error mt-2">{validationError}</div> : null}

      {showProGate ? (
        <div className="quota-blocked mt-2">
          <p>
            <strong>Recurso exclusivo Pro</strong>
          </p>
          <p>
            Templates avancados de planilha estao disponiveis no plano Pro. Assine para desbloquear
            acesso ilimitado.
          </p>
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
                body: JSON.stringify({ cycle: "monthly" }),
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
      ) : null}

      {!showProGate && lastFreeUse && !quotaBlocked ? (
        <div className="quota-warning mt-2">
          Este e seu ultimo uso gratuito. Assine Pro para acesso ilimitado.
        </div>
      ) : null}
    </section>
  );
}

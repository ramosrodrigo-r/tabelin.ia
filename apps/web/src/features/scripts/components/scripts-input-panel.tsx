"use client";

import { useState } from "react";
import { SCRIPT_TYPES } from "@tabelin/shared";
import type { ScriptType } from "@tabelin/shared";

import { ChatInput } from "@/components/app/chat-input";

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
  onSubmit,
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

  const options = (
    <div className="chat-options-row">
      <div className="chat-mode-tabs" role="group" aria-label="Tipo de script">
        {SCRIPT_TYPES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={scriptType === item.id}
            className="chat-mode-tab"
            onClick={() => onScriptTypeChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <section aria-label="Entrada do script">
      <ChatInput
        id="scripts-prompt"
        label="Descricao da automacao"
        value={text}
        onChange={onTextChange}
        onSubmit={onSubmit}
        placeholder="Quero copiar os dados da aba Vendas para a aba Relatorio ao clicar no botao."
        pending={pending}
        disabled={quotaBlocked}
        submitLabel={pending ? "Gerando..." : "Gerar script"}
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
          {checkoutError ? <p className="form-error">{checkoutError}</p> : null}
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
                setCheckoutError("Nao foi possivel iniciar o checkout. Tente novamente.");
              }
            }}
          >
            Assinar Pro
          </button>
        </div>
      ) : null}
    </section>
  );
}

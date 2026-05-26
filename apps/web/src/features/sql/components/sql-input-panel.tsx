"use client";

import { useState } from "react";
import { SQL_DIALECTS } from "@tabelin/shared";
import type { SqlDialect } from "@tabelin/shared";
import { Wand2 } from "lucide-react";

export function SqlInputPanel({
  dialect,
  text,
  validationError,
  pending,
  isPro,
  quotaBlocked,
  lastFreeUse,
  onDialectChange,
  onTextChange,
  onSubmit
}: {
  dialect: SqlDialect;
  text: string;
  validationError: string;
  pending: boolean;
  isPro: boolean;
  quotaBlocked: boolean;
  lastFreeUse: boolean;
  onDialectChange: (dialect: SqlDialect) => void;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
}) {
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  return (
    <section className="tool-panel" aria-label="Entrada do SQL">
      <div className="field-stack">
        <div className="field">
          <label htmlFor="sql-dialect">Dialeto</label>
          <select
            id="sql-dialect"
            value={dialect}
            onChange={(event) => onDialectChange(event.target.value as SqlDialect)}
          >
            {SQL_DIALECTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="sql-prompt">Descricao da consulta</label>
          <textarea
            id="sql-prompt"
            minLength={3}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder="Quero listar os clientes que compraram mais de 3 vezes nos ultimos 30 dias."
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
            {pending ? "Gerando..." : "Gerar SQL"}
          </button>
        )}
      </div>
    </section>
  );
}

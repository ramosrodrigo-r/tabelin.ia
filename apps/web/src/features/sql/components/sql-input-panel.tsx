"use client";

import { useState } from "react";
import { SQL_DIALECTS } from "@tabelin/shared";
import type { SqlDialect } from "@tabelin/shared";

import { AttachmentButton } from "@/components/app/attachment-button";
import { AttachmentChip } from "@/components/app/attachment-chip";
import { ChatInput } from "@/components/app/chat-input";
import { PrivacyNotice } from "@/components/app/privacy-notice";

export function SqlInputPanel({
  dialect,
  text,
  validationError,
  pending,
  isPro,
  quotaBlocked,
  lastFreeUse,
  pendingFile,
  fileError,
  onDialectChange,
  onTextChange,
  onSubmit,
  onFileSelect,
  onFileRemove,
}: {
  dialect: SqlDialect;
  text: string;
  validationError: string;
  pending: boolean;
  isPro: boolean;
  quotaBlocked: boolean;
  lastFreeUse: boolean;
  pendingFile: File | null;
  fileError: string | null;
  onDialectChange: (dialect: SqlDialect) => void;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
  onFileSelect: (f: File) => void;
  onFileRemove: () => void;
}) {
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const options = (
    <div className="chat-options-row">
      <select
        className="chat-compact-select"
        value={dialect}
        aria-label="Dialeto SQL"
        onChange={(e) => onDialectChange(e.target.value as SqlDialect)}
      >
        {SQL_DIALECTS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <section aria-label="Entrada do SQL">
      <ChatInput
        id="sql-prompt"
        label="Descricao da consulta"
        value={text}
        onChange={onTextChange}
        onSubmit={onSubmit}
        placeholder="Quero listar os clientes que compraram mais de 3 vezes nos ultimos 30 dias."
        pending={pending}
        disabled={quotaBlocked}
        submitLabel={pending ? "Gerando..." : "Gerar SQL"}
        options={options}
        leftAction={
          <AttachmentButton
            isPro={isPro}
            disabled={pending || quotaBlocked}
            onFileSelect={onFileSelect}
          />
        }
      />

      {pendingFile ? (
        <>
          <AttachmentChip file={pendingFile} onRemove={onFileRemove} />
          <PrivacyNotice />
        </>
      ) : null}

      {fileError ? <div className="form-error mt-2">{fileError}</div> : null}

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

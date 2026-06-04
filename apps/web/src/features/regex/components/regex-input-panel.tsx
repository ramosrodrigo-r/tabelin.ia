"use client";

import { useState } from "react";

import { AttachmentButton } from "@/components/app/attachment-button";
import { AttachmentChip } from "@/components/app/attachment-chip";
import { ChatInput } from "@/components/app/chat-input";
import { PrivacyNotice } from "@/components/app/privacy-notice";
import { ToolNav } from "@/components/app/tool-nav";
import type { RegexMode } from "../hooks/use-regex-stream";

export function RegexInputPanel({
  mode,
  text,
  validationError,
  pending,
  isPro,
  quotaBlocked,
  lastFreeUse,
  pendingFile,
  fileError,
  onModeChange,
  onTextChange,
  onSubmit,
  onFileSelect,
  onFileRemove,
}: {
  mode: RegexMode;
  text: string;
  validationError: string;
  pending: boolean;
  isPro: boolean;
  quotaBlocked: boolean;
  lastFreeUse: boolean;
  pendingFile: File | null;
  fileError: string | null;
  onModeChange: (mode: RegexMode) => void;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
  onFileSelect: (f: File) => void;
  onFileRemove: () => void;
}) {
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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
    </div>
  );

  return (
    <section aria-label="Entrada da regex">
      <ChatInput
        id="regex-text"
        label={mode === "generate" ? "Descricao do padrao" : "Expressao"}
        value={text}
        onChange={onTextChange}
        onSubmit={onSubmit}
        placeholder={
          mode === "generate"
            ? "Quero validar um CPF com pontos e traco, ex: 123.456.789-09."
            : "^[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}$"
        }
        pending={pending}
        disabled={quotaBlocked}
        submitLabel={
          pending ? "Gerando..." : mode === "generate" ? "Gerar regex" : "Explicar regex"
        }
        options={options}
        leftAction={
          <AttachmentButton
            isPro={isPro}
            disabled={pending || quotaBlocked}
            onFileSelect={onFileSelect}
          />
        }
        bottomNav={<ToolNav />}
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

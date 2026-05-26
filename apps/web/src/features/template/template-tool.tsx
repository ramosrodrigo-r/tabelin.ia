"use client";

import type { UserEntitlement } from "@tabelin/shared";
import { useState } from "react";
import { TemplateInputPanel } from "./components/template-input-panel";
import { TemplateOutputPanel } from "./components/template-output-panel";
import { useTemplateStream } from "./hooks/use-template-stream";

export function TemplateTool({ entitlement }: { entitlement: UserEntitlement }) {
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState("");
  const stream = useTemplateStream();
  const pending = stream.status === "loading" || stream.status === "streaming";
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";

  async function submit() {
    if (!text.trim()) {
      setValidationError("Descreva o tipo de planilha antes de gerar.");
      return;
    }
    setValidationError("");
    await stream.submit({ text });
  }

  return (
    <section className="tool-grid" aria-label="Templates workspace">
      <TemplateInputPanel
        text={text}
        validationError={validationError}
        pending={pending}
        isPro={isPro}
        proBlocked={stream.proBlocked}
        quotaBlocked={stream.quotaBlocked}
        lastFreeUse={stream.lastFreeUse}
        onTextChange={setText}
        onSubmit={submit}
      />
      <TemplateOutputPanel
        status={stream.status}
        draft={stream.draft}
        result={stream.result}
        metadata={stream.metadata}
        warnings={stream.warnings}
        error={stream.error}
        onRetry={submit}
      />
    </section>
  );
}

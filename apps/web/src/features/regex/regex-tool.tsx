"use client";

import type { UserEntitlement } from "@tabelin/shared";
import { useState } from "react";
import { RegexInputPanel } from "./components/regex-input-panel";
import { RegexOutputPanel } from "./components/regex-output-panel";
import { type RegexMode, useRegexStream } from "./hooks/use-regex-stream";

export function RegexTool({ entitlement }: { entitlement: UserEntitlement }) {
  const [mode, setMode] = useState<RegexMode>("generate");
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState("");
  const stream = useRegexStream();
  const pending = stream.status === "loading" || stream.status === "streaming";
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";

  async function submit() {
    if (!text.trim()) {
      setValidationError(mode === "generate" ? "Descreva o padrao antes de gerar." : "Cole uma expressao regular antes de explicar.");
      return;
    }
    setValidationError("");
    await stream.submit({ mode, text });
  }

  // Reset state when switching modes
  function handleModeChange(newMode: RegexMode) {
    setMode(newMode);
    setText("");
    setValidationError("");
  }

  return (
    <section className="tool-grid" aria-label="Regex workspace">
      <RegexInputPanel
        mode={mode}
        text={text}
        validationError={validationError}
        pending={pending}
        isPro={isPro}
        quotaBlocked={stream.quotaBlocked}
        lastFreeUse={stream.lastFreeUse}
        onModeChange={handleModeChange}
        onTextChange={setText}
        onSubmit={submit}
      />
      <RegexOutputPanel
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

"use client";

import type { UserEntitlement } from "@tabelin/shared";
import type { ScriptType } from "@tabelin/shared";
import { useState } from "react";

import { ScriptsInputPanel } from "./components/scripts-input-panel";
import { ScriptsOutputPanel } from "./components/scripts-output-panel";
import { useScriptsStream } from "./hooks/use-scripts-stream";

export function ScriptsTool({ entitlement }: { entitlement: UserEntitlement }) {
  const [scriptType, setScriptType] = useState<ScriptType>("vba");
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState("");
  const stream = useScriptsStream();
  const pending = stream.status === "loading" || stream.status === "streaming";
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";

  async function submit() {
    if (!text.trim()) {
      setValidationError("Descreva a automacao antes de gerar.");
      return;
    }
    setValidationError("");
    await stream.submit({ scriptType, text });
  }

  return (
    <section className="tool-grid" aria-label="Scripts workspace">
      <ScriptsInputPanel
        scriptType={scriptType}
        text={text}
        validationError={validationError}
        pending={pending}
        isPro={isPro}
        quotaBlocked={stream.quotaBlocked}
        lastFreeUse={stream.lastFreeUse}
        onScriptTypeChange={setScriptType}
        onTextChange={setText}
        onSubmit={submit}
      />
      <ScriptsOutputPanel
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

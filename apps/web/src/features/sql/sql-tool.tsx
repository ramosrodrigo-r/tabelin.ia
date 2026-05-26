"use client";

import type { UserEntitlement } from "@tabelin/shared";
import type { SqlDialect } from "@tabelin/shared";
import { useState } from "react";

import { SqlInputPanel } from "./components/sql-input-panel";
import { SqlOutputPanel } from "./components/sql-output-panel";
import { useSqlStream } from "./hooks/use-sql-stream";

export function SqlTool({ entitlement }: { entitlement: UserEntitlement }) {
  const [dialect, setDialect] = useState<SqlDialect>("postgresql");
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState("");
  const stream = useSqlStream();
  const pending = stream.status === "loading" || stream.status === "streaming";
  const isPro = entitlement.plan === "pro" && entitlement.status === "active";

  async function submit() {
    if (!text.trim()) {
      setValidationError("Descreva a consulta antes de gerar.");
      return;
    }
    setValidationError("");
    await stream.submit({ dialect, text });
  }

  return (
    <section className="tool-grid" aria-label="SQL workspace">
      <SqlInputPanel
        dialect={dialect}
        text={text}
        validationError={validationError}
        pending={pending}
        isPro={isPro}
        quotaBlocked={stream.quotaBlocked}
        lastFreeUse={stream.lastFreeUse}
        onDialectChange={setDialect}
        onTextChange={setText}
        onSubmit={submit}
      />
      <SqlOutputPanel
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

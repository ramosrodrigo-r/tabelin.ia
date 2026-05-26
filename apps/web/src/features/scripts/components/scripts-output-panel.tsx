"use client";

import { AlertTriangle } from "lucide-react";
import { useShikiHighlighter } from "react-shiki";
import type { ScriptGenerateResponse, ScriptMetadata } from "@tabelin/shared";
import { SCRIPT_TYPES } from "@tabelin/shared";

import type { ScriptStreamStatus } from "../hooks/use-scripts-stream";
import { CopyButton } from "../../formula/components/copy-button";

// "vba" is not in shiki bundledLanguages — use "vb" as fallback for VBA highlighting
const SCRIPT_HIGHLIGHT_LANG: Record<string, string> = {
  vba: "vb",
  apps_script: "javascript",
  airtable_script: "javascript"
};

export function ScriptsOutputPanel({
  status,
  draft,
  result,
  metadata,
  warnings,
  error,
  onRetry
}: {
  status: ScriptStreamStatus;
  draft: string;
  result: ScriptGenerateResponse | null;
  metadata: ScriptMetadata | null;
  warnings: string[];
  error: string;
  onRetry: () => void;
}) {
  const codeToHighlight = status === "streaming" ? draft : (result?.code ?? "");
  const highlightLang = metadata?.scriptType ? (SCRIPT_HIGHLIGHT_LANG[metadata.scriptType] ?? "text") : "text";
  const highlighted = useShikiHighlighter(codeToHighlight, highlightLang, "github-light", { delay: 150 });

  const completeCode = result?.code ?? "";
  const scriptTypeLabel = metadata?.scriptType
    ? (SCRIPT_TYPES.find((s) => s.id === metadata.scriptType)?.label ?? metadata.scriptType)
    : null;

  return (
    <section className="tool-panel" aria-label="Script gerado">
      <div className="output-header">
        <div>
          <h2>Script gerado</h2>
          <p aria-live="polite">
            {status === "streaming"
              ? "Recebendo resposta..."
              : status === "complete"
                ? "Pronto para revisar e copiar."
                : status === "loading"
                  ? "Preparando resposta..."
                  : "O resultado aparece aqui assim que a resposta comecar."}
          </p>
        </div>
        <CopyButton disabled={status !== "complete"} value={completeCode} />
      </div>

      {scriptTypeLabel ? (
        <div className="metadata-row" aria-label="Metadados">
          <span>{scriptTypeLabel}</span>
        </div>
      ) : null}

      {result?.isDestructive ? (
        <div className="note-block warning" role="alert">
          <h3>
            <AlertTriangle aria-hidden size={16} />
            {" "}Atencao — Operacao destrutiva
          </h3>
          <p>Esta operacao remove dados da planilha ou base permanentemente. Nao pode ser desfeita.</p>
        </div>
      ) : null}

      <div className="output-box" data-status={status}>
        {status === "idle" ? <span>O resultado aparece aqui assim que a resposta comecar.</span> : null}
        {status === "loading" ? <span>Preparando resposta...</span> : null}
        {(status === "streaming" || status === "complete") && codeToHighlight ? (
          highlighted ? (
            <div className="code-output">{highlighted}</div>
          ) : (
            <pre>{codeToHighlight}</pre>
          )
        ) : null}
        {status === "complete" && result?.explanation ? (
          <p>{result.explanation}</p>
        ) : null}
        {status === "error" ? (
          <div className="error-block">
            <p>{error || "Nao foi possivel gerar o resultado. Ajuste o pedido e tente novamente."}</p>
            <button className="ghost-button" onClick={onRetry} type="button">Tentar novamente</button>
          </div>
        ) : null}
      </div>

      {result?.assumptions.length ? (
        <div className="note-block">
          <h3>Premissas</h3>
          <ul>
            {result.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

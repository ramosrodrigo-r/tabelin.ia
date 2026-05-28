"use client";

import type { FormulaCompletePayload, FormulaMetadata } from "@tabelin/shared";

import { CopyButton } from "./copy-button";
import type { FormulaStreamStatus } from "../hooks/use-formula-stream";

function copyValue(result: FormulaCompletePayload | null) {
  if (!result) {
    return "";
  }

  if (result.kind === "formula") {
    return result.formula;
  }

  return result.steps.join("\n");
}

export function FormulaOutputPanel({
  status,
  draft,
  result,
  metadata,
  warnings,
  error,
  onRetry
}: {
  status: FormulaStreamStatus;
  draft: string;
  result: FormulaCompletePayload | null;
  metadata: FormulaMetadata | null;
  warnings: string[];
  error: string;
  onRetry: () => void;
}) {
  const completeText = copyValue(result);

  return (
    <section className="output-panel" aria-label="Resultado">
      <div className="output-header">
        <div>
          <h2>Resultado</h2>
          <p aria-live="polite">{status === "streaming" ? "Recebendo resposta..." : "Pronto para revisar e copiar."}</p>
        </div>
        <CopyButton disabled={status !== "complete"} value={completeText} />
      </div>

      {metadata ? (
        <div className="metadata-row" aria-label="Metadados">
          <span>{metadata.platform}</span>
          <span>{metadata.formulaLanguage}</span>
          <span>Separador {metadata.separator}</span>
        </div>
      ) : null}

      <div className="output-box" data-status={status}>
        {status === "idle" ? <span>O resultado aparece aqui assim que a resposta comecar.</span> : null}
        {status === "loading" ? <span>Preparando resposta...</span> : null}
        {status === "streaming" ? <pre>{draft}</pre> : null}
        {status === "complete" && result?.kind === "formula" ? (
          <>
            <pre>{result.formula}</pre>
            <p>{result.explanation}</p>
          </>
        ) : null}
        {status === "complete" && result?.kind === "explanation" ? (
          <>
            <pre>{result.formula}</pre>
            <ol>
              {result.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </>
        ) : null}
        {status === "error" ? (
          <div className="error-block">
            <p>{error}</p>
            <button className="ghost-button" onClick={onRetry} type="button">
              Tentar novamente
            </button>
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

      {warnings.length ? (
        <div className="note-block warning">
          <h3>Atencao</h3>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}


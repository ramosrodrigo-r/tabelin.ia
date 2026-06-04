"use client";

import type { FormulaCompletePayload, FormulaMetadata } from "@tabelin/shared";

import { AttachmentPanel } from "@/components/app/attachment-panel";
import { CopyButton } from "./copy-button";
import type { FormulaStreamStatus } from "../hooks/use-formula-stream";

function copyValue(result: FormulaCompletePayload | null) {
  if (!result) return "";
  if (result.kind === "formula") return result.formula;
  return result.steps.join("\n");
}

export function FormulaOutputPanel({
  status,
  draft,
  result,
  metadata,
  warnings,
  error,
  attachmentMeta,
  onRetry,
}: {
  status: FormulaStreamStatus;
  draft: string;
  result: FormulaCompletePayload | null;
  metadata: FormulaMetadata | null;
  warnings: string[];
  error: string;
  attachmentMeta?: { charCount: number; wasTruncated: boolean; extractedText: string } | null;
  onRetry: () => void;
}) {
  const completeText = copyValue(result);

  return (
    <div className="assistant-card" aria-label="Resposta">
      <div className="output-header">
        <p aria-live="polite" style={{ margin: 0 }}>
          {status === "streaming" ? "Gerando..." : status === "loading" ? "Preparando..." : null}
        </p>
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

      {attachmentMeta ? (
        <div className="metadata-row">
          <span aria-label="Gerado com base em documento anexado">Grounded por documento</span>
        </div>
      ) : null}

      {attachmentMeta ? (
        <AttachmentPanel
          extractedText={attachmentMeta.extractedText}
          wasTruncated={attachmentMeta.wasTruncated}
        />
      ) : null}

      {warnings.length ? (
        <div className="note-block warning">
          <h3>Atenção</h3>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

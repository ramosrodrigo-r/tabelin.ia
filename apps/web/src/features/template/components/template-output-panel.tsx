"use client";

import type { TemplateGenerateResponse, TemplateMetadata } from "@tabelin/shared";
import { useShikiHighlighter } from "react-shiki";

import { AttachmentPanel } from "@/components/app/attachment-panel";
import type { TemplateStreamStatus } from "../hooks/use-template-stream";
import { CopyButton } from "../../formula/components/copy-button";

export function TemplateOutputPanel({
  status,
  draft,
  result,
  metadata,
  warnings,
  error,
  attachmentMeta,
  onRetry,
}: {
  status: TemplateStreamStatus;
  draft: string;
  result: TemplateGenerateResponse | null;
  metadata: TemplateMetadata | null;
  warnings: string[];
  error: string;
  attachmentMeta?: { charCount: number; wasTruncated: boolean; extractedText: string } | null;
  onRetry: () => void;
}) {
  const codeToHighlight = status === "streaming" ? draft : (result?.output ?? "");
  const highlighted = useShikiHighlighter(codeToHighlight, "markdown", "github-light", {
    delay: 150,
  });
  const copyValue = result?.output ?? "";

  return (
    <div className="assistant-card" aria-label="Template gerado">
      <div className="output-header">
        <p aria-live="polite" style={{ margin: 0 }}>
          {status === "streaming" ? "Gerando..." : status === "loading" ? "Preparando..." : null}
        </p>
        <CopyButton disabled={status !== "complete"} value={copyValue} />
      </div>

      {metadata?.providerModel ? (
        <div className="metadata-row" aria-label="Metadados">
          <span>{metadata.providerModel}</span>
        </div>
      ) : null}

      <div className="output-box" data-status={status}>
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

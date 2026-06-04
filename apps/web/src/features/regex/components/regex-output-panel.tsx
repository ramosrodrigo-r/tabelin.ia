"use client";

import type { RegexCompletePayload, RegexMetadata } from "@tabelin/shared";
import { useShikiHighlighter } from "react-shiki";

import { AttachmentPanel } from "@/components/app/attachment-panel";
import type { RegexStreamStatus } from "../hooks/use-regex-stream";
import { CopyButton } from "../../formula/components/copy-button";

export function RegexOutputPanel({
  status,
  draft,
  result,
  metadata,
  warnings,
  error,
  attachmentMeta,
  onRetry,
}: {
  status: RegexStreamStatus;
  draft: string;
  result: RegexCompletePayload | null;
  metadata: RegexMetadata | null;
  warnings: string[];
  error: string;
  attachmentMeta?: { charCount: number; wasTruncated: boolean; extractedText: string } | null;
  onRetry: () => void;
}) {
  const isGenerate = metadata?.mode === "generate" || !metadata;
  const codeToHighlight =
    status === "streaming" ? draft : result?.kind === "regex_generate" ? result.pattern : "";
  const highlighted = useShikiHighlighter(codeToHighlight, "regex", "github-light", { delay: 150 });

  const copyValue =
    result?.kind === "regex_generate"
      ? result.pattern
      : result?.kind === "regex_explain"
        ? result.steps.join("\n")
        : "";

  return (
    <div className="assistant-card" aria-label="Resposta">
      <div className="output-header">
        <p aria-live="polite" style={{ margin: 0 }}>
          {status === "streaming" ? "Gerando..." : status === "loading" ? "Preparando..." : null}
        </p>
        <CopyButton disabled={status !== "complete"} value={copyValue} />
      </div>

      <div className="output-box" data-status={status}>
        {status === "loading" ? <span>Preparando resposta...</span> : null}

        {(status === "streaming" || (status === "complete" && result?.kind === "regex_generate")) &&
        isGenerate ? (
          <>
            {codeToHighlight ? (
              highlighted ? (
                <div className="code-output">{highlighted}</div>
              ) : (
                <pre>{codeToHighlight}</pre>
              )
            ) : null}
            {status === "complete" && result?.kind === "regex_generate" && result.explanation ? (
              <p>{result.explanation}</p>
            ) : null}
          </>
        ) : null}

        {status === "complete" && result?.kind === "regex_explain" ? (
          <>
            <p>
              <code>{result.pattern}</code>
            </p>
            <ol>
              {result.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </>
        ) : null}

        {status === "streaming" && !isGenerate ? <pre>{draft}</pre> : null}

        {status === "error" ? (
          <div className="error-block">
            <p>{error || "Nao foi possivel gerar o resultado. Ajuste o pedido e tente novamente."}</p>
            <button className="ghost-button" onClick={onRetry} type="button">
              Tentar novamente
            </button>
          </div>
        ) : null}
      </div>

      {result?.kind === "regex_generate" && result.assumptions.length ? (
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

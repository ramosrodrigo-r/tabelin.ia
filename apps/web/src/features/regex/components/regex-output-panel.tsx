"use client";

import type { RegexCompletePayload, RegexMetadata } from "@tabelin/shared";
import { useShikiHighlighter } from "react-shiki";
import type { RegexStreamStatus } from "../hooks/use-regex-stream";
import { CopyButton } from "../../formula/components/copy-button";

export function RegexOutputPanel({
  status,
  draft,
  result,
  metadata,
  warnings,
  error,
  onRetry
}: {
  status: RegexStreamStatus;
  draft: string;
  result: RegexCompletePayload | null;
  metadata: RegexMetadata | null;
  warnings: string[];
  error: string;
  onRetry: () => void;
}) {
  const isGenerate = metadata?.mode === "generate" || !metadata;
  const codeToHighlight = status === "streaming" ? draft : (result?.kind === "regex_generate" ? result.pattern : "");
  // shiki supports "regex" language
  const highlighted = useShikiHighlighter(codeToHighlight, "regex", "github-light", { delay: 150 });

  // Copy value: for generate = pattern; for explain = full explanation text
  const copyValue = result?.kind === "regex_generate"
    ? result.pattern
    : result?.kind === "regex_explain"
      ? result.steps.join("\n")
      : "";

  const outputHeading = result?.kind === "regex_explain" ? "Explicacao" : "Regex gerada";

  return (
    <section className="tool-panel" aria-label={outputHeading}>
      <div className="output-header">
        <div>
          <h2>{outputHeading}</h2>
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
        <CopyButton disabled={status !== "complete"} value={copyValue} />
      </div>

      <div className="output-box" data-status={status}>
        {status === "idle" ? <span>O resultado aparece aqui assim que a resposta comecar.</span> : null}
        {status === "loading" ? <span>Preparando resposta...</span> : null}

        {(status === "streaming" || (status === "complete" && result?.kind === "regex_generate")) && isGenerate ? (
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
            <p><code>{result.pattern}</code></p>
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
            <button className="ghost-button" onClick={onRetry} type="button">Tentar novamente</button>
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
    </section>
  );
}

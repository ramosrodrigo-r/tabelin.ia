"use client";

import { AlertTriangle } from "lucide-react";
import { useShikiHighlighter } from "react-shiki";
import type { SqlGenerateResponse, SqlMetadata } from "@tabelin/shared";
import { SQL_DIALECTS } from "@tabelin/shared";

import type { SqlStreamStatus } from "../hooks/use-sql-stream";
import { CopyButton } from "../../formula/components/copy-button";

function getSqlWarningMessage(query: string): string | null {
  const upper = query.toUpperCase();
  if (/DROP\s|TRUNCATE\s/.test(upper)) {
    return "Este script apaga dados permanentemente. Faca um backup antes de executar.";
  }
  if (/DELETE\b(?![\s\S]*\bWHERE\b)/.test(upper)) {
    return "DELETE sem WHERE apaga todas as linhas da tabela. Verifique a clausula WHERE antes de executar.";
  }
  if (/UPDATE\b(?![\s\S]*\bWHERE\b)/.test(upper)) {
    return "UPDATE sem WHERE altera todos os registros. Adicione uma clausula WHERE para limitar o impacto.";
  }
  return null;
}

export function SqlOutputPanel({
  status,
  draft,
  result,
  metadata,
  warnings,
  error,
  onRetry,
}: {
  status: SqlStreamStatus;
  draft: string;
  result: SqlGenerateResponse | null;
  metadata: SqlMetadata | null;
  warnings: string[];
  error: string;
  onRetry: () => void;
}) {
  const codeToHighlight = status === "streaming" ? draft : (result?.query ?? "");
  const highlighted = useShikiHighlighter(codeToHighlight, "sql", "github-light", { delay: 150 });

  const completeQuery = result?.query ?? "";
  const dialectLabel = metadata?.dialect
    ? (SQL_DIALECTS.find((d) => d.id === metadata.dialect)?.label ?? metadata.dialect)
    : null;

  const isDestructive = result?.isDestructive ?? false;
  let warningMessage: string | null = null;
  if (isDestructive && result) {
    warningMessage = getSqlWarningMessage(result.query);
    if (!warningMessage) {
      warningMessage = "Esta operacao pode modificar ou apagar dados permanentemente. Revise antes de executar.";
    }
  }

  return (
    <div className="assistant-card" aria-label="Consulta gerada">
      <div className="output-header">
        <p aria-live="polite" style={{ margin: 0 }}>
          {status === "streaming" ? "Gerando..." : status === "loading" ? "Preparando..." : null}
        </p>
        <CopyButton disabled={status !== "complete"} value={completeQuery} />
      </div>

      {dialectLabel ? (
        <div className="metadata-row" aria-label="Metadados">
          <span>{dialectLabel}</span>
        </div>
      ) : null}

      {warningMessage ? (
        <div className="note-block warning" role="alert">
          <h3>
            <AlertTriangle aria-hidden size={16} />
            {" "}Atenção — Operação destrutiva
          </h3>
          <p>{warningMessage}</p>
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
    </div>
  );
}

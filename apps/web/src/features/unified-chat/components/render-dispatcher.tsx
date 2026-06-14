"use client";

import type {
  QaResponsePayload,
  TableSpecPayload,
  UnifiedCompletePayload,
} from "@tabelin/shared";

import type { UnifiedChatStreamStatus } from "../hooks/use-unified-chat-stream";
import { TableGridPanel } from "./table-grid-panel";

function StreamingCard({
  status,
  draft,
}: {
  status: UnifiedChatStreamStatus;
  draft: string;
}) {
  return (
    <div className="assistant-card" aria-label="Resposta">
      <div className="output-header">
        <p aria-live="polite" style={{ margin: 0 }}>
          {status === "streaming" ? "Gerando..." : "Preparando..."}
        </p>
      </div>
      <div className="output-box" data-status={status === "streaming" ? "streaming" : "loading"}>
        {status === "streaming" && draft ? <pre>{draft}</pre> : <span>Preparando resposta...</span>}
      </div>
    </div>
  );
}

function ErrorCard({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="assistant-card" aria-label="Erro">
      <div className="output-box" data-status="error">
        <div className="error-block">
          <p>{error || "Não consegui processar o pedido. Tente reescrever ou enviar de novo."}</p>
          <button className="ghost-button" type="button" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}

function QaResponseCard({ payload }: { payload: QaResponsePayload }) {
  return (
    <div className="assistant-card" aria-label="Resposta">
      <div className="output-box" data-status="complete">
        <pre>{payload.content}</pre>
      </div>
    </div>
  );
}

export function RenderDispatcher({
  status,
  draft,
  payload,
  error,
  onRetry,
}: {
  status: UnifiedChatStreamStatus;
  draft: string;
  payload: UnifiedCompletePayload | null;
  metadata: unknown | null;
  warnings: string[];
  error: string;
  onRetry: () => void;
}) {
  if (status === "error") {
    return <ErrorCard error={error} onRetry={onRetry} />;
  }

  if (!payload) {
    if (status === "idle") return null;
    return <StreamingCard status={status} draft={draft} />;
  }

  switch (payload.kind) {
    case "qa_response":
      return <QaResponseCard payload={payload} />;

    case "table_spec": {
      const hasRows = Array.isArray(payload.rows) && (payload.rows?.length ?? 0) > 0;
      if (hasRows) {
        return <TableGridPanel spec={payload as TableSpecPayload} />;
      }
      return null;
    }

    default:
      return null;
  }
}

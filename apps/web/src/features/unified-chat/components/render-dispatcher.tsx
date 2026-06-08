"use client";

import type {
  FileAnalysisPayload,
  FileDependentIntent,
  FormulaCompletePayload,
  FormulaMetadata,
  OcrPayload,
  RegexCompletePayload,
  RegexMetadata,
  ScriptGenerateResponse,
  ScriptMetadata,
  SqlGenerateResponse,
  SqlMetadata,
  TemplateGenerateResponse,
  TemplateMetadata,
  UnifiedCompletePayload,
} from "@tabelin/shared";

import { AttachmentPanel } from "@/components/app/attachment-panel";
import { FormulaOutputPanel } from "@/features/formula/components/formula-output-panel";
import { CopyButton } from "@/features/formula/components/copy-button";
import { RegexOutputPanel } from "@/features/regex/components/regex-output-panel";
import { ScriptsOutputPanel } from "@/features/scripts/components/scripts-output-panel";
import { SqlOutputPanel } from "@/features/sql/components/sql-output-panel";
import { TemplateOutputPanel } from "@/features/template/components/template-output-panel";
import type { UnifiedAttachmentMeta, UnifiedChatStreamStatus } from "../hooks/use-unified-chat-stream";
import { TableIntentStub } from "./table-intent-stub";

function FileBackedOutput({
  title,
  payload,
  attachmentMeta,
}: {
  title: string;
  payload: FileAnalysisPayload | OcrPayload;
  attachmentMeta?: UnifiedAttachmentMeta | null;
}) {
  return (
    <div className="assistant-card" aria-label={title}>
      <div className="output-header">
        <h2>{title}</h2>
        <CopyButton disabled={false} value={payload.content} />
      </div>
      <div className="metadata-row" aria-label="Metadados">
        <span>{payload.metadata.providerModel ?? "extraction-dispatcher"}</span>
      </div>
      <div className="output-box" data-status="complete">
        <pre>{payload.content}</pre>
      </div>
      {attachmentMeta ? (
        <div className="metadata-row">
          <span aria-label="Gerado com base em documento anexado">Grounded por documento</span>
        </div>
      ) : null}
      {attachmentMeta ? (
        <AttachmentPanel extractedText={attachmentMeta.extractedText} wasTruncated={attachmentMeta.wasTruncated} />
      ) : null}
    </div>
  );
}

function NeedsFileCard({ intent }: { intent: FileDependentIntent }) {
  const typeLabel = intent === "ocr" ? "leitura de imagem (OCR)" : "análise de planilha";

  return (
    <div className="assistant-card" aria-label="Pedido precisa de arquivo">
      <div className="output-header">
        <h2>Esse pedido precisa de um arquivo.</h2>
      </div>
      <div className="output-box" data-status="complete">
        <p>
          Detectei um pedido de {typeLabel}. Anexe o arquivo no clipe abaixo e envie de novo.
        </p>
      </div>
    </div>
  );
}

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

export function RenderDispatcher({
  status,
  draft,
  payload,
  metadata,
  warnings,
  error,
  attachmentMeta,
  needsFile,
  onRetry,
}: {
  status: UnifiedChatStreamStatus;
  draft: string;
  payload: UnifiedCompletePayload | null;
  metadata: unknown | null;
  warnings: string[];
  error: string;
  attachmentMeta?: UnifiedAttachmentMeta | null;
  needsFile?: FileDependentIntent | null;
  onRetry: () => void;
}) {
  if (status === "error") {
    return <ErrorCard error={error} onRetry={onRetry} />;
  }

  if (needsFile && (!payload || payload.kind === "needs_file")) {
    return <NeedsFileCard intent={needsFile} />;
  }

  if (!payload) {
    if (status === "idle") return null;
    return <StreamingCard status={status} draft={draft} />;
  }

  switch (payload.kind) {
    case "formula":
    case "explanation":
      return (
        <FormulaOutputPanel
          status={status}
          draft={draft}
          result={payload as FormulaCompletePayload}
          metadata={metadata as FormulaMetadata | null}
          warnings={warnings}
          error={error}
          attachmentMeta={attachmentMeta}
          onRetry={onRetry}
        />
      );

    case "sql":
      return (
        <SqlOutputPanel
          status={status}
          draft={draft}
          result={payload as SqlGenerateResponse}
          metadata={metadata as SqlMetadata | null}
          warnings={warnings}
          error={error}
          attachmentMeta={attachmentMeta}
          onRetry={onRetry}
        />
      );

    case "regex_generate":
    case "regex_explain":
      return (
        <RegexOutputPanel
          status={status}
          draft={draft}
          result={payload as RegexCompletePayload}
          metadata={metadata as RegexMetadata | null}
          warnings={warnings}
          error={error}
          attachmentMeta={attachmentMeta}
          onRetry={onRetry}
        />
      );

    case "script":
      return (
        <ScriptsOutputPanel
          status={status}
          draft={draft}
          result={payload as ScriptGenerateResponse}
          metadata={metadata as ScriptMetadata | null}
          warnings={warnings}
          error={error}
          attachmentMeta={attachmentMeta}
          onRetry={onRetry}
        />
      );

    case "template":
      return (
        <TemplateOutputPanel
          status={status}
          draft={draft}
          result={payload as TemplateGenerateResponse}
          metadata={metadata as TemplateMetadata | null}
          warnings={warnings}
          error={error}
          attachmentMeta={attachmentMeta}
          onRetry={onRetry}
        />
      );

    case "table_stub":
      return (
        <div className="assistant-card" aria-label="Tabela solicitada">
          <TableIntentStub />
        </div>
      );

    case "needs_file":
      return <NeedsFileCard intent={payload.intent} />;

    case "file_analysis":
      return <FileBackedOutput title="Análise do arquivo" payload={payload} attachmentMeta={attachmentMeta} />;

    case "ocr":
      return <FileBackedOutput title="OCR" payload={payload} attachmentMeta={attachmentMeta} />;
  }
}

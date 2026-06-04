"use client";

import { FileText } from "lucide-react";
import { useState } from "react";

export function AttachmentPanel({
  extractedText,
  wasTruncated,
}: {
  extractedText: string;
  wasTruncated: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <details
      className="attachment-panel note-block"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary>
        <FileText size={14} aria-hidden />
        Texto extraído do documento
        {wasTruncated ? (
          <span className="attachment-truncated-badge">extração parcial</span>
        ) : null}
      </summary>
      <pre
        className="attachment-panel-content"
        style={{ maxHeight: "200px", overflowY: "auto" }}
      >
        {extractedText}
      </pre>
    </details>
  );
}

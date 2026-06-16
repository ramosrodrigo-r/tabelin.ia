"use client";

import { useState } from "react";

/**
 * Split lado-a-lado (desktop) / toggle (mobile <900px) entre a planilha viva
 * e o chat de IA, mantendo ambos os painéis sempre montados — alternância via
 * `data-hidden` (CSS), nunca desmontando, para preservar estado de edição/undo
 * do grid e do histórico do chat (D-03).
 */
export function WorkspaceSplit({
  grid,
  chat,
}: {
  grid: React.ReactNode;
  chat: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<"grid" | "chat">("grid");

  return (
    <>
      <div className="workspace-mobile-toggle">
        <button
          type="button"
          data-active={activeTab === "grid"}
          onClick={() => setActiveTab("grid")}
        >
          Planilha
        </button>
        <button
          type="button"
          data-active={activeTab === "chat"}
          onClick={() => setActiveTab("chat")}
        >
          Chat IA
        </button>
      </div>
      <div className="workspace-grid-panel" data-hidden={activeTab === "chat"}>
        {grid}
      </div>
      <div className="workspace-chat-panel" data-hidden={activeTab === "grid"}>
        {chat}
      </div>
    </>
  );
}

"use client";

import { useState } from "react";

import type { TableClarQuestionPayload } from "@tabelin/shared";

export function ClarificationCard({
  payload,
  onAnswer,
  onSkip,
}: {
  payload: TableClarQuestionPayload;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
}) {
  const [answer, setAnswer] = useState("");

  function handleConfirm() {
    const trimmed = answer.trim();
    if (trimmed) {
      onAnswer(trimmed);
      setAnswer("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleConfirm();
    }
  }

  return (
    <div className="assistant-card" aria-label="Pergunta de clarificação">
      <div className="output-header">
        <p className="clarification-counter" style={{ margin: 0 }}>
          Pergunta {payload.turnIndex + 1} de {payload.totalTurns}
        </p>
      </div>
      <div className="output-box" data-status="complete">
        <p>{payload.question}</p>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua resposta..."
          aria-label="Resposta à pergunta de clarificação"
        />
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!answer.trim()}
        >
          Responder
        </button>
        <button className="ghost-button" type="button" onClick={onSkip}>
          Gerar mesmo assim
        </button>
      </div>
    </div>
  );
}

import { describe, expect, it } from "vitest";

import { buildToolContextMessages, truncateHistory, MAX_EXCHANGES, buildMultiTurnSystemPrompt } from "@/server/ai/context-messages";

// Helper para criar um exchange fake de ConversationExchange
function makeExchange(overrides: {
  userPrompt?: string;
  assistantPayload?: unknown;
  mode?: string;
  toolKind?: string;
  createdAt?: Date;
  attachmentContext?: string | null;
}) {
  return {
    id: "cuid-test",
    userId: "user-1",
    toolKind: overrides.toolKind ?? "sql",
    mode: overrides.mode ?? "generate",
    platform: null,
    dialect: null,
    userPrompt: overrides.userPrompt ?? "Prompt do usuário",
    assistantPayload: overrides.assistantPayload ?? { kind: "sql", query: "SELECT 1", explanation: "Seleciona 1" },
    attachmentContext: overrides.attachmentContext ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00Z"),
    user: { id: "user-1", name: "Ana", email: "ana@empresa.com" }
  };
}

// ---------------------------------------------------------------------------
// TASK 1: Serialização por tool + montagem do array
// ---------------------------------------------------------------------------

describe("buildToolContextMessages", () => {
  describe("serialização SQL", () => {
    it("serializa exchange SQL com query + explanation como prosa natural", () => {
      const exchange = makeExchange({
        assistantPayload: {
          kind: "sql",
          query: "SELECT * FROM orders WHERE status = 'paid'",
          explanation: "Busca todos os pedidos pagos",
          assumptions: ["tabela orders existe"],
          warnings: ["pode ser lento em tabelas grandes"],
          metadata: { mode: "generate", dialect: "postgresql", isDestructive: false }
        }
      });

      const result = buildToolContextMessages("sql", [exchange], "System prompt", "Nova pergunta");

      const assistantMsg = result.find((m) => m.role === "assistant");
      expect(assistantMsg).toBeDefined();
      const content = assistantMsg!.content as string;

      // deve conter artefato e explicação
      expect(content).toContain("SELECT * FROM orders WHERE status = 'paid'");
      expect(content).toContain("Busca todos os pedidos pagos");

      // NÃO deve conter JSON cru, metadata ou warnings
      expect(content).not.toContain('"kind"');
      expect(content).not.toContain("metadata");
      expect(content).not.toContain("{");
      expect(content).not.toContain("}");
    });
  });

  describe("serialização Regex", () => {
    it("serializa exchange Regex com pattern + explanation como prosa natural", () => {
      const exchange = makeExchange({
        toolKind: "regex",
        assistantPayload: {
          kind: "regex_generate",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          explanation: "Valida endereços de e-mail no formato padrão",
          examples: ["test@example.com"],
          metadata: { mode: "generate" }
        }
      });

      const result = buildToolContextMessages("regex", [exchange], "System", "Prompt");

      const assistantMsg = result.find((m) => m.role === "assistant");
      const content = assistantMsg!.content as string;

      expect(content).toContain("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$");
      expect(content).toContain("Valida endereços de e-mail no formato padrão");
      expect(content).not.toContain("metadata");
    });
  });

  describe("serialização Scripts", () => {
    it("serializa exchange Script com code + explanation como prosa natural", () => {
      const exchange = makeExchange({
        toolKind: "script",
        assistantPayload: {
          kind: "script",
          code: "Sub ExibirMensagem()\n  MsgBox \"Olá!\"\nEnd Sub",
          explanation: "Script VBA que exibe uma caixa de mensagem",
          assumptions: [],
          warnings: [],
          metadata: { mode: "generate", scriptType: "vba", isDestructive: false }
        }
      });

      const result = buildToolContextMessages("script", [exchange], "System", "Prompt");

      const assistantMsg = result.find((m) => m.role === "assistant");
      const content = assistantMsg!.content as string;

      expect(content).toContain('Sub ExibirMensagem()');
      expect(content).toContain("Script VBA que exibe uma caixa de mensagem");
      expect(content).not.toContain("metadata");
    });
  });

  describe("serialização Template", () => {
    it("serializa exchange Template com output + explanation como prosa natural", () => {
      const exchange = makeExchange({
        toolKind: "template",
        assistantPayload: {
          kind: "template",
          output: "| Produto | Preço | Quantidade |\n|---------|-------|------------|",
          explanation: "Tabela de controle de estoque simples",
          assumptions: [],
          warnings: [],
          metadata: { mode: "generate" }
        }
      });

      const result = buildToolContextMessages("template", [exchange], "System", "Prompt");

      const assistantMsg = result.find((m) => m.role === "assistant");
      const content = assistantMsg!.content as string;

      expect(content).toContain("| Produto | Preço | Quantidade |");
      expect(content).toContain("Tabela de controle de estoque simples");
      expect(content).not.toContain("metadata");
    });
  });

  describe("serialização tabela solicitada", () => {
    it("serializa table_stub com rótulo específico e sem JSON cru", () => {
      const exchange = makeExchange({
        toolKind: "unified_table",
        assistantPayload: {
          kind: "table_stub",
          originalPrompt: "Monte uma tabela de controle de gastos",
          message: "A tabela sera refinada nas proximas etapas."
        }
      });

      const result = buildToolContextMessages("unified_table", [exchange], "System", "Refine a tabela");

      const assistantMsg = result.find((m) => m.role === "assistant");
      expect(assistantMsg).toBeDefined();
      const content = assistantMsg!.content as string;

      expect(content).toContain("[Resposta anterior - tabela solicitada]");
      expect(content).toContain("Monte uma tabela de controle de gastos");
      expect(content).toContain("A tabela sera refinada nas proximas etapas.");
      expect(content).not.toContain('"kind"');
      expect(content).not.toContain("{");
      expect(content).not.toContain("}");
    });

    it("pula table_stub sem message sem lançar erro", () => {
      const exchange = makeExchange({
        toolKind: "unified_table",
        assistantPayload: {
          kind: "table_stub",
          originalPrompt: "Monte uma tabela"
        }
      });

      expect(() => {
        buildToolContextMessages("unified_table", [exchange], "System", "Prompt");
      }).not.toThrow();

      const result = buildToolContextMessages("unified_table", [exchange], "System", "Prompt");
      expect(result).toHaveLength(2);
    });
  });

  describe("estrutura de mensagens", () => {
    it("cada exchange gera exatamente 2 mensagens: user + assistant", () => {
      const exchanges = [
        makeExchange({ userPrompt: "Primeira pergunta", createdAt: new Date("2026-01-01") }),
        makeExchange({ userPrompt: "Segunda pergunta", createdAt: new Date("2026-01-02") })
      ];

      const result = buildToolContextMessages("sql", exchanges, "System", "Prompt atual");

      // [system, user1, assistant1, user2, assistant2, user_atual]
      expect(result).toHaveLength(6);
      expect(result[0].role).toBe("system");
      expect(result[1].role).toBe("user");
      expect(result[2].role).toBe("assistant");
      expect(result[3].role).toBe("user");
      expect(result[4].role).toBe("assistant");
      expect(result[5].role).toBe("user");
    });

    it("array final é [system, ...history, user] na ordem cronológica ascendente", () => {
      const exchanges = [
        makeExchange({ userPrompt: "Mais antiga", createdAt: new Date("2026-01-01") }),
        makeExchange({ userPrompt: "Mais recente", createdAt: new Date("2026-01-02") })
      ];

      const result = buildToolContextMessages("sql", exchanges, "System prompt", "Prompt atual");

      expect(result[0]).toMatchObject({ role: "system", content: "System prompt" });
      expect(result[1]).toMatchObject({ role: "user", content: "Mais antiga" });
      expect(result[3]).toMatchObject({ role: "user", content: "Mais recente" });
      expect(result.at(-1)).toMatchObject({ role: "user", content: "Prompt atual" });
    });

    it("histórico vazio produz array idêntico ao single-turn [system, user] (D-10)", () => {
      const result = buildToolContextMessages("sql", [], "System prompt", "Minha pergunta");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ role: "system", content: "System prompt" });
      expect(result[1]).toMatchObject({ role: "user", content: "Minha pergunta" });
    });
  });

  describe("filtro de mode (D-03)", () => {
    it("exchange com mode='explain' é descartado e não gera mensagens", () => {
      const exchanges = [
        makeExchange({ userPrompt: "Explique isso", mode: "explain" }),
        makeExchange({ userPrompt: "Gere isso", mode: "generate" })
      ];

      const result = buildToolContextMessages("sql", exchanges, "System", "Nova pergunta");

      // Somente o exchange "generate" deve aparecer: [system, user_generate, assistant_generate, user_atual]
      expect(result).toHaveLength(4);
      // O userPrompt "Explique isso" NÃO deve aparecer
      const userMessages = result.filter((m) => m.role === "user");
      const userContents = userMessages.map((m) => m.content as string);
      expect(userContents).not.toContain("Explique isso");
      expect(userContents).toContain("Gere isso");
    });

    it("múltiplos exchanges mode='explain' são todos descartados", () => {
      const exchanges = [
        makeExchange({ mode: "explain" }),
        makeExchange({ mode: "explain" })
      ];

      const result = buildToolContextMessages("sql", exchanges, "System", "Prompt");
      expect(result).toHaveLength(2); // somente [system, user]
    });
  });

  describe("edge cases", () => {
    it("payload com kind desconhecido é pulado sem lançar erro (D-09)", () => {
      const exchange = makeExchange({
        assistantPayload: { kind: "unknown_tool", someField: "value" }
      });

      expect(() => {
        buildToolContextMessages("sql", [exchange], "System", "Prompt");
      }).not.toThrow();

      // O exchange desconhecido é pulado → apenas [system, user]
      const result = buildToolContextMessages("sql", [exchange], "System", "Prompt");
      expect(result).toHaveLength(2);
    });

    it("payload com campos ausentes é pulado sem lançar erro", () => {
      const exchange = makeExchange({
        assistantPayload: { kind: "sql" }  // sem query nem explanation
      });

      expect(() => {
        buildToolContextMessages("sql", [exchange], "System", "Prompt");
      }).not.toThrow();
    });
  });

  describe("serialização SQL — rótulo [Resposta anterior]", () => {
    it("conteúdo do assistant começa com [Resposta anterior]", () => {
      const exchange = makeExchange({
        assistantPayload: {
          kind: "sql",
          query: "SELECT * FROM pedidos",
          explanation: "Busca todos os pedidos"
        }
      });

      const result = buildToolContextMessages("sql", [exchange], "System prompt", "Nova pergunta");

      const assistantMsg = result.find((m) => m.role === "assistant");
      expect(assistantMsg).toBeDefined();
      const content = assistantMsg!.content as string;
      expect(content).toContain("[Resposta anterior]");
    });

    it("buildToolContextMessages com 1 exchange: mensagem assistant contém [Resposta anterior]", () => {
      const exchange = makeExchange({
        assistantPayload: {
          kind: "sql",
          query: "SELECT id FROM clientes",
          explanation: "Busca IDs"
        }
      });

      const result = buildToolContextMessages("sql", [exchange], "System", "Follow-up");

      const assistantMsg = result.find((m) => m.role === "assistant");
      expect(assistantMsg).toBeDefined();
      expect(assistantMsg!.content as string).toContain("[Resposta anterior]");
    });
  });
});

// ---------------------------------------------------------------------------
// TASK 1b: buildMultiTurnSystemPrompt
// ---------------------------------------------------------------------------

describe("buildMultiTurnSystemPrompt", () => {
  it("retorna basePrompt sem modificação quando historyLength === 0", () => {
    const basePrompt = "Voce e um especialista em SQL.";
    expect(buildMultiTurnSystemPrompt(basePrompt, 0)).toBe(basePrompt);
  });

  it("retorna basePrompt + parágrafo multi-turn quando historyLength === 1", () => {
    const basePrompt = "Voce e um especialista em SQL.";
    const result = buildMultiTurnSystemPrompt(basePrompt, 1);
    expect(result).toContain(basePrompt);
    expect(result).toContain("ultima mensagem");
  });

  it("retorna basePrompt + parágrafo multi-turn quando historyLength === 5", () => {
    const basePrompt = "Voce e um especialista em regex.";
    const result = buildMultiTurnSystemPrompt(basePrompt, 5);
    expect(result).toContain(basePrompt);
    expect(result).toContain("ultima mensagem");
  });
});


// ---------------------------------------------------------------------------
// TASK 2: Truncagem híbrida
// ---------------------------------------------------------------------------

describe("truncateHistory", () => {
  it("MAX_EXCHANGES está exportado e é igual a 10", () => {
    expect(MAX_EXCHANGES).toBe(10);
  });

  it("preserva no máximo MAX_EXCHANGES trocas (últimas 10 das 25)", () => {
    const exchanges = Array.from({ length: 25 }, (_, i) =>
      makeExchange({
        userPrompt: `Pergunta ${i + 1}`,
        createdAt: new Date(2026, 0, i + 1)
      })
    );

    const result = truncateHistory(exchanges);

    expect(result.length).toBeLessThanOrEqual(MAX_EXCHANGES);
    // Deve preservar as ÚLTIMAS (mais recentes)
    expect((result.at(-1)!.userPrompt)).toBe("Pergunta 25");
    expect((result[0].userPrompt)).toBe("Pergunta 16");
  });

  it("preserva todas as trocas quando há ≤10 e não estouram o orçamento", () => {
    const exchanges = Array.from({ length: 5 }, (_, i) =>
      makeExchange({ userPrompt: `P${i}`, createdAt: new Date(2026, 0, i + 1) })
    );

    const result = truncateHistory(exchanges);

    expect(result).toHaveLength(5);
  });

  it("histórico vazio retorna []", () => {
    expect(truncateHistory([])).toEqual([]);
  });

  it("corta trocas antigas quando excedem o orçamento de tokens", () => {
    // Cria trocas grandes que certamente estouram o orçamento
    const bigText = "A".repeat(10_000); // 10.000 chars / 4 ≈ 2500 tokens por troca
    const exchanges = Array.from({ length: 10 }, (_, i) =>
      makeExchange({
        userPrompt: bigText,
        assistantPayload: {
          kind: "sql",
          query: bigText,
          explanation: bigText
        },
        createdAt: new Date(2026, 0, i + 1)
      })
    );

    const result = truncateHistory(exchanges);

    // Deve ter cortado algumas trocas antigas para caber no orçamento
    expect(result.length).toBeLessThan(10);
    // WR-02: sempre retém ao menos a troca mais recente
    expect(result.length).toBeGreaterThanOrEqual(1);
    // As que sobraram devem ser as MAIS RECENTES (finais do array)
    expect(result.at(-1)!.userPrompt).toBe(bigText);
  });

  it("retém a troca mais recente mesmo quando ela sozinha excede o orçamento (WR-02)", () => {
    // Uma única troca cujo corpo serializado estoura SAFE_TOKEN_BUDGET sozinha.
    const hugeText = "A".repeat(40_000); // ≈ 10.000 tokens, bem acima de 4.000
    const exchanges = [
      makeExchange({
        userPrompt: hugeText,
        assistantPayload: {
          kind: "sql",
          query: hugeText,
          explanation: hugeText
        },
        createdAt: new Date(2026, 0, 1)
      })
    ];

    const result = truncateHistory(exchanges);

    // Nunca retornar [] — o usuário ficaria sem contexto no turno que mais referencia
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.at(-1)!.userPrompt).toBe(hugeText);
  });

  it("estimativa de tokens é monotônica — string maior estima mais tokens", () => {
    // Cria dois pares de exchanges com tamanhos diferentes de payload
    const smallExchange = makeExchange({
      userPrompt: "Curto",
      assistantPayload: { kind: "sql", query: "SELECT 1", explanation: "Ok" }
    });
    const bigExchange = makeExchange({
      userPrompt: "A".repeat(5000),
      assistantPayload: { kind: "sql", query: "B".repeat(5000), explanation: "C".repeat(5000) }
    });

    // Se passarmos os dois, ambos pequenos cabem; se estoura, o menor fica
    const resultSmall = truncateHistory([smallExchange]);
    const resultBig = truncateHistory([bigExchange]);

    // resultSmall deve ter 1 exchange (cabe no orçamento)
    expect(resultSmall).toHaveLength(1);
    // resultBig pode ter 0 ou 1 dependendo do orçamento — mas nunca mais que o small
    expect(resultBig.length).toBeLessThanOrEqual(resultSmall.length);
  });
});

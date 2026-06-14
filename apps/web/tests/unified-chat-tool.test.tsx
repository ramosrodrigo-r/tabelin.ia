import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useInvokeNewConversation, WorkspaceConversationProvider } from "@/components/app/workspace-conversation-context";
import { IntentPill } from "@/features/unified-chat/components/intent-pill";
import { RenderDispatcher } from "@/features/unified-chat/components/render-dispatcher";
import { SessionContextSelector } from "@/features/unified-chat/components/session-context-selector";
import { UnifiedChatTool } from "@/features/unified-chat/unified-chat-tool";
import type { UnifiedCompletePayload } from "@tabelin/shared";

vi.mock("react-shiki", () => ({
  useShikiHighlighter: () => null,
}));

const formulaPayload = {
  kind: "formula",
  formula: "=SOMA(A:A)",
  explanation: "Soma a coluna A.",
  assumptions: [],
  warnings: [],
  metadata: {
    mode: "generate",
    platform: "excel",
    formulaLanguage: "pt-BR",
    separator: ";",
    providerModel: "test",
  },
} satisfies UnifiedCompletePayload;

const sqlPayload = {
  kind: "sql",
  query: "SELECT * FROM vendas",
  explanation: "Busca vendas.",
  assumptions: [],
  warnings: [],
  isDestructive: false,
  metadata: {
    mode: "generate",
    dialect: "postgresql",
    isDestructive: false,
    providerModel: "test",
  },
} satisfies UnifiedCompletePayload;

const regexPayload = {
  kind: "regex_generate",
  pattern: "\\d+",
  explanation: "Encontra números.",
  examples: ["123"],
  assumptions: [],
  warnings: [],
  metadata: { mode: "generate", providerModel: "test" },
} satisfies UnifiedCompletePayload;

const scriptPayload = {
  kind: "script",
  code: "function main() {}",
  explanation: "Executa uma automação.",
  assumptions: [],
  warnings: [],
  isDestructive: false,
  metadata: {
    mode: "generate",
    scriptType: "apps_script",
    isDestructive: false,
    providerModel: "test",
  },
} satisfies UnifiedCompletePayload;

const templatePayload = {
  kind: "template",
  output: "| Campo | Tipo |",
  explanation: "Modelo em Markdown.",
  assumptions: [],
  warnings: [],
  metadata: { mode: "generate", providerModel: "test" },
} satisfies UnifiedCompletePayload;

const archivedMessage = "Este tipo de resposta foi removido no novo modo de planilha viva.";

function encodeLine(line: unknown) {
  return new TextEncoder().encode(`${JSON.stringify(line)}\n`);
}

function streamResponse(lines: unknown[]) {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encodeLine(line));
        }
        controller.close();
      },
    }),
    { status: 200 }
  );
}

function rawStreamResponse(lines: string[]) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(line));
        }
        controller.close();
      },
    }),
    { status: 200 }
  );
}

function formulaStream() {
  return streamResponse([
    { type: "intent_detected", intent: "formula", confidence: "high" },
    { type: "metadata", metadata: formulaPayload.metadata },
    { type: "delta", text: formulaPayload.formula },
    { type: "complete", payload: formulaPayload },
  ]);
}

function sqlStream() {
  return streamResponse([
    { type: "intent_detected", intent: "sql", confidence: "high" },
    { type: "metadata", metadata: sqlPayload.metadata },
    { type: "delta", text: sqlPayload.query },
    { type: "complete", payload: sqlPayload },
  ]);
}

function parseJsonRequestBody(fetchMock: ReturnType<typeof vi.spyOn>, index = 0) {
  const init = fetchMock.mock.calls[index][1] as RequestInit;
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe("IntentPill", () => {
  it("renders detected state and closes the override dropdown with Escape", async () => {
    const user = userEvent.setup();
    render(<IntentPill intent="formula" onOverride={vi.fn()} />);

    expect(screen.getByText("Fórmula · detectado")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Tipo detectado: Fórmula/ }));
    expect(screen.getAllByRole("option")).toHaveLength(7);
    expect(screen.getByText("Mudar o tipo de resposta")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tipo detectado: Fórmula/ })).toHaveFocus();
  });

  it("selecting SQL calls onOverride", async () => {
    const user = userEvent.setup();
    const onOverride = vi.fn();
    render(<IntentPill intent="formula" onOverride={onOverride} />);

    await user.click(screen.getByRole("button", { name: /Tipo detectado: Fórmula/ }));
    await user.click(screen.getByRole("option", { name: "SQL" }));

    expect(onOverride).toHaveBeenCalledWith("sql");
  });
});

describe("SessionContextSelector", () => {
  it("shows the unified defaults", () => {
    render(
      <SessionContextSelector
        platform="excel"
        formulaLanguage="pt-BR"
        separator=";"
        sqlDialect="postgresql"
        onPlatformChange={vi.fn()}
        onFormulaLanguageChange={vi.fn()}
        onSeparatorChange={vi.fn()}
        onSqlDialectChange={vi.fn()}
      />
    );

    expect(screen.getByText("Plataforma")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Microsoft Excel" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "pt-BR" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Separador")).toHaveValue(";");
    expect(screen.getByLabelText("Dialeto SQL")).toHaveValue("postgresql");
  });
});

describe("RenderDispatcher", () => {
  const baseProps = {
    status: "complete" as const,
    draft: "",
    metadata: null,
    warnings: [],
    error: "",
    attachmentMeta: null,
    onRetry: vi.fn(),
  };

  it("renders archived legacy outputs, table_stub, needs_file, and streaming states", () => {
    const { rerender } = render(
      <RenderDispatcher {...baseProps} payload={formulaPayload} metadata={formulaPayload.metadata} />
    );
    expect(screen.getByText(archivedMessage)).toBeInTheDocument();

    rerender(<RenderDispatcher {...baseProps} payload={sqlPayload} metadata={sqlPayload.metadata} />);
    expect(screen.getByText(archivedMessage)).toBeInTheDocument();

    rerender(<RenderDispatcher {...baseProps} payload={regexPayload} metadata={regexPayload.metadata} />);
    expect(screen.getByText(archivedMessage)).toBeInTheDocument();

    rerender(<RenderDispatcher {...baseProps} payload={scriptPayload} metadata={scriptPayload.metadata} />);
    expect(screen.getByText(archivedMessage)).toBeInTheDocument();

    rerender(<RenderDispatcher {...baseProps} payload={templatePayload} metadata={templatePayload.metadata} />);
    expect(screen.getByText(archivedMessage)).toBeInTheDocument();

    rerender(
      <RenderDispatcher
        {...baseProps}
        payload={{
          kind: "table_stub",
          originalPrompt: "Monte uma tabela",
          message: "Tabela a caminho.",
        }}
      />
    );
    expect(screen.getByText("Tabela a caminho.")).toBeInTheDocument();

    rerender(
      <RenderDispatcher
        {...baseProps}
        payload={{ kind: "needs_file", intent: "ocr" }}
        needsFile="ocr"
      />
    );
    expect(screen.getByText("Esse pedido precisa de um arquivo.")).toBeInTheDocument();

    rerender(
      <RenderDispatcher
        {...baseProps}
        status="streaming"
        draft="rascunho em streaming"
        payload={null}
      />
    );
    expect(screen.getByText("rascunho em streaming")).toBeInTheDocument();
  });
});

describe("UnifiedChatTool", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("renders the empty state and selector defaults", () => {
    render(<UnifiedChatTool />);

    expect(screen.getByText("O que você quer resolver hoje?")).toBeInTheDocument();
    expect(screen.getByLabelText("Separador")).toHaveValue(";");
    expect(screen.getByLabelText("Dialeto SQL")).toHaveValue("postgresql");
  });

  it("shows intent_detected before the final payload arrives", async () => {
    const user = userEvent.setup();
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(c) {
            controller = c;
          },
        }),
        { status: 200 }
      )
    );

    render(<UnifiedChatTool />);

    await user.type(screen.getByLabelText("Pedido"), "Some a coluna A");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    await act(async () => {
      controller.enqueue(encodeLine({ type: "intent_detected", intent: "formula", confidence: "high" }));
    });

    expect(await screen.findByText("Fórmula · detectado")).toBeInTheDocument();
    expect(screen.queryByText("=SOMA(A:A)")).not.toBeInTheDocument();

    await act(async () => {
      controller.enqueue(encodeLine({ type: "metadata", metadata: formulaPayload.metadata }));
      controller.enqueue(encodeLine({ type: "complete", payload: formulaPayload }));
      controller.close();
    });

    await waitFor(() => expect(screen.getByText(archivedMessage)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/chat/unified", expect.any(Object));
  });

  it("submits default context fields as JSON", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(formulaStream());

    render(<UnifiedChatTool />);

    await user.type(screen.getByLabelText("Pedido"), "Some a coluna A");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = parseJsonRequestBody(fetchMock);

    expect(body).toMatchObject({
      prompt: "Some a coluna A",
      platform: "excel",
      formulaLanguage: "pt-BR",
      separator: ";",
      sqlDialect: "postgresql",
      scriptType: "apps_script",
    });
  });

  it("corrupt NDJSON enters the error state", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(rawStreamResponse(["not-json\n"]));

    render(<UnifiedChatTool />);

    await user.type(screen.getByLabelText("Pedido"), "Some a coluna A");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByText("Resposta corrompida. Tente novamente.")).toBeInTheDocument();
  });

  it("file submit uses FormData without manual content-type", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      streamResponse([
        { type: "intent_detected", intent: "ocr", confidence: "high" },
        { type: "needs_file", intent: "ocr" },
        { type: "complete", payload: { kind: "needs_file", intent: "ocr" } },
      ])
    );

    render(<UnifiedChatTool />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(["a,b\n1,2"], "dados.csv", { type: "text/csv" }));
    await user.type(screen.getByLabelText("Pedido"), "Analise o arquivo");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const init = fetchMock.mock.calls[0][1] as RequestInit;

    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers).toEqual({});
  });

  it("override re-submits the original prompt with overrideIntent", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(formulaStream())
      .mockResolvedValueOnce(sqlStream());

    render(<UnifiedChatTool />);

    await user.type(screen.getByLabelText("Pedido"), "Tenho PROCV, mas quero SQL");
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(screen.getByText(archivedMessage)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Tipo detectado: Fórmula/ }));
    await user.click(screen.getByRole("option", { name: "SQL" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const secondBody = parseJsonRequestBody(fetchMock, 1);

    expect(secondBody).toMatchObject({
      prompt: "Tenho PROCV, mas quero SQL",
      overrideIntent: "sql",
    });
    await waitFor(() => expect(screen.getByText(archivedMessage)).toBeInTheDocument());
    expect(screen.getByText("SQL · corrigido")).toBeInTheDocument();
  });

  it("new conversation clears archived exchanges", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(formulaStream());

    function ClearButton() {
      const invoke = useInvokeNewConversation();
      return <button type="button" onClick={() => invoke?.()}>Limpar</button>;
    }

    render(
      <WorkspaceConversationProvider>
        <ClearButton />
        <UnifiedChatTool />
      </WorkspaceConversationProvider>
    );

    await user.type(screen.getByLabelText("Pedido"), "Some a coluna A");
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(screen.getByText(archivedMessage)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Limpar" }));

    expect(screen.queryByText(archivedMessage)).not.toBeInTheDocument();
    expect(screen.getByText("O que você quer resolver hoje?")).toBeInTheDocument();
  });

  it("persists selected context across two submits", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(formulaStream())
      .mockResolvedValueOnce(formulaStream());

    render(<UnifiedChatTool />);

    await user.selectOptions(screen.getByLabelText("Dialeto SQL"), "mysql");
    await user.type(screen.getByLabelText("Pedido"), "Primeiro pedido");
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(screen.getByText(archivedMessage)).toBeInTheDocument());

    await user.type(screen.getByLabelText("Pedido"), "Segundo pedido");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(parseJsonRequestBody(fetchMock, 0).sqlDialect).toBe("mysql");
    expect(parseJsonRequestBody(fetchMock, 1).sqlDialect).toBe("mysql");
  });

  it("drag-and-drop attaches a valid file", () => {
    render(<UnifiedChatTool />);

    const workspace = screen.getByLabelText("Chat unificado");
    fireEvent.drop(workspace, {
      dataTransfer: { files: [new File(["a,b\n1,2"], "dados.csv", { type: "text/csv" })] },
    });

    expect(screen.getByLabelText("Arquivo anexado: dados.csv, 0 KB")).toBeInTheDocument();
  });

  it("does not use dangerouslySetInnerHTML in unified-chat source", () => {
    const sourceNodes = [
      IntentPill,
      RenderDispatcher,
      SessionContextSelector,
      UnifiedChatTool,
    ].map((component) => String(component));

    expect(sourceNodes.join("\n")).not.toContain("dangerouslySetInnerHTML");
  });

  describe("clarification loop", () => {
    const clarPayload = {
      kind: "table_clar_question",
      question: "Qual é o objetivo principal desta tabela?",
      turnIndex: 0,
      totalTurns: 2,
      canSkip: true,
    } satisfies UnifiedCompletePayload;

    const clarPayloadTurn1 = {
      kind: "table_clar_question",
      question: "Quantas linhas você precisa?",
      turnIndex: 1,
      totalTurns: 2,
      canSkip: true,
    } satisfies UnifiedCompletePayload;

    const tableSpecPayload = {
      kind: "table_spec",
      title: "Tabela de Vendas",
      columns: [
        { name: "Produto", type: "text" as const },
        { name: "Valor", type: "number" as const },
      ],
      rowCount: 10,
    } satisfies UnifiedCompletePayload;

    function clarStream(payload: UnifiedCompletePayload) {
      return streamResponse([
        { type: "intent_detected", intent: "tabela", confidence: "high" },
        { type: "complete", payload },
      ]);
    }

    // CLAR-01: hook processa complete com kind=table_clar_question → ClarificationCard no DOM
    it("CLAR-01: renderiza ClarificationCard com a pergunta ao receber table_clar_question", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(clarStream(clarPayload));

      render(<UnifiedChatTool />);

      await user.type(screen.getByLabelText("Pedido"), "cria uma tabela de vendas");
      await user.click(screen.getByRole("button", { name: "Enviar" }));

      await waitFor(() =>
        expect(screen.getByText("Qual é o objetivo principal desta tabela?")).toBeInTheDocument()
      );
      expect(screen.getByLabelText("Pergunta de clarificação")).toBeInTheDocument();
    });

    // CLAR-02: payload com turnIndex=1, totalTurns=2 → DOM contém "Pergunta 2 de 2"
    it("CLAR-02: exibe contador de turno correto (Pergunta 2 de 2)", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(clarStream(clarPayloadTurn1));

      render(<UnifiedChatTool />);

      await user.type(screen.getByLabelText("Pedido"), "cria uma tabela de vendas");
      await user.click(screen.getByRole("button", { name: "Enviar" }));

      await waitFor(() => expect(screen.getByText("Pergunta 2 de 2")).toBeInTheDocument());
    });

    // CLAR-03: botão "Gerar mesmo assim" visível; click dispara request com overrideGenerate="true"
    it("CLAR-03: botão 'Gerar mesmo assim' dispara request com overrideGenerate='true'", async () => {
      const user = userEvent.setup();
      const fetchMock = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(clarStream(clarPayload))
        .mockResolvedValueOnce(formulaStream());

      render(<UnifiedChatTool />);

      await user.type(screen.getByLabelText("Pedido"), "cria uma tabela de vendas");
      await user.click(screen.getByRole("button", { name: "Enviar" }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Gerar mesmo assim" })).toBeInTheDocument()
      );

      await user.click(screen.getByRole("button", { name: "Gerar mesmo assim" }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      const secondBody = parseJsonRequestBody(fetchMock, 1);
      expect(secondBody.overrideGenerate).toBe("true");

      await waitFor(() => expect(screen.getByText(archivedMessage)).toBeInTheDocument());
    });

    // CLAR-04: ConfirmationCard no DOM; click "Confirmar e Gerar" dispara request com overrideGenerate + specOverride
    it("CLAR-04: renderiza ConfirmationCard e 'Confirmar e Gerar' envia specOverride no body", async () => {
      const user = userEvent.setup();
      const fetchMock = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(clarStream(tableSpecPayload))
        .mockResolvedValueOnce(formulaStream());

      render(<UnifiedChatTool />);

      await user.type(screen.getByLabelText("Pedido"), "cria uma tabela de vendas");
      await user.click(screen.getByRole("button", { name: "Enviar" }));

      await waitFor(() =>
        expect(screen.getByLabelText("Confirmar especificação da tabela")).toBeInTheDocument()
      );
      // Título está em input editável — usar getByDisplayValue
      expect(screen.getByDisplayValue("Tabela de Vendas")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Confirmar e Gerar" }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      const secondBody = parseJsonRequestBody(fetchMock, 1);
      expect(secondBody.overrideGenerate).toBe("true");
      expect(secondBody.specOverride).toBeDefined();
      const parsedSpec = JSON.parse(secondBody.specOverride as string) as { title: string; columns: { name: string }[] };
      expect(parsedSpec.title).toBe("Tabela de Vendas");
      expect(parsedSpec.columns).toHaveLength(2);

      await waitFor(() => expect(screen.getByText(archivedMessage)).toBeInTheDocument());
    });

    // Cenário de resposta/onAnswer: o request NÃO inclui overrideGenerate="true"
    it("resposta à pergunta de clarificação NÃO inclui overrideGenerate no body", async () => {
      const user = userEvent.setup();
      const fetchMock = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(clarStream(clarPayload))
        .mockResolvedValueOnce(clarStream(clarPayloadTurn1));

      render(<UnifiedChatTool />);

      await user.type(screen.getByLabelText("Pedido"), "cria uma tabela de vendas");
      await user.click(screen.getByRole("button", { name: "Enviar" }));

      await waitFor(() =>
        expect(screen.getByLabelText("Resposta à pergunta de clarificação")).toBeInTheDocument()
      );

      await user.type(screen.getByLabelText("Resposta à pergunta de clarificação"), "Tabela de controle de estoque");
      await user.click(screen.getByRole("button", { name: "Responder" }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      const secondBody = parseJsonRequestBody(fetchMock, 1);
      expect(secondBody.overrideGenerate).toBeUndefined();
    });
  });
});

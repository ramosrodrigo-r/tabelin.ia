import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useInvokeNewConversation, WorkspaceConversationProvider } from "@/components/app/workspace-conversation-context";
import { IntentPill } from "@/features/unified-chat/components/intent-pill";
import { RenderDispatcher } from "@/features/unified-chat/components/render-dispatcher";
import { UnifiedChatTool } from "@/features/unified-chat/unified-chat-tool";
import type { UnifiedCompletePayload } from "@tabelin/shared";

vi.mock("react-shiki", () => ({
  useShikiHighlighter: () => null,
}));

// react-datasheet-grid (TableGridPanel) usa ResizeObserver internamente
// (react-resize-detector); jsdom não implementa — polyfill mínimo para o render real.
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

const qaPayload = {
  kind: "qa_response",
  content: "A média da coluna Valor é 42.",
} satisfies UnifiedCompletePayload;

const sheetOperationPayload = {
  kind: "qa_response",
  content: "Operação de planilha recebida.",
} satisfies UnifiedCompletePayload;

const tableSpecWithRows = {
  kind: "table_spec",
  title: "Vendas",
  columns: [
    { name: "Produto", type: "text" as const, key: "produto" },
    { name: "Valor", type: "number" as const, key: "valor" },
  ],
  rowCount: 1,
  rows: [{ produto: "A", valor: 10 }],
  formulaLanguage: "pt-BR" as const,
  separator: ";" as const,
} satisfies UnifiedCompletePayload;

const tableSpecWithoutRows = {
  kind: "table_spec",
  title: "Tabela Sem Linhas",
  columns: [{ name: "Produto", type: "text" as const, key: "produto" }],
  rowCount: 1,
} satisfies UnifiedCompletePayload;

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

function qaStream() {
  return streamResponse([
    { type: "intent_detected", intent: "qa", confidence: "high" },
    { type: "metadata", metadata: { mode: "generate", providerModel: "test" } },
    { type: "delta", text: qaPayload.content },
    { type: "complete", payload: qaPayload },
  ]);
}

function sheetOperationStream() {
  return streamResponse([
    { type: "intent_detected", intent: "sheet_operation", confidence: "high" },
    { type: "metadata", metadata: { mode: "generate", providerModel: "test" } },
    { type: "delta", text: sheetOperationPayload.content },
    { type: "complete", payload: sheetOperationPayload },
  ]);
}

function parseJsonRequestBody(fetchMock: ReturnType<typeof vi.spyOn>, index = 0) {
  const init = fetchMock.mock.calls[index][1] as RequestInit;
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe("IntentPill", () => {
  it("renders detected state and closes the override dropdown with Escape", async () => {
    const user = userEvent.setup();
    render(<IntentPill intent="qa" onOverride={vi.fn()} />);

    expect(screen.getByText("Pergunta · detectado")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Tipo detectado: Pergunta/ }));
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByText("Mudar o tipo de resposta")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tipo detectado: Pergunta/ })).toHaveFocus();
  });

  it("selecting Operação calls onOverride", async () => {
    const user = userEvent.setup();
    const onOverride = vi.fn();
    render(<IntentPill intent="qa" onOverride={onOverride} />);

    await user.click(screen.getByRole("button", { name: /Tipo detectado: Pergunta/ }));
    await user.click(screen.getByRole("option", { name: "Operação" }));

    expect(onOverride).toHaveBeenCalledWith("sheet_operation");
  });
});

describe("RenderDispatcher", () => {
  const baseProps = {
    status: "complete" as const,
    draft: "",
    metadata: null,
    warnings: [],
    error: "",
    onRetry: vi.fn(),
  };

  it("renders qa_response, table_spec with rows, table_spec without rows, and streaming states", () => {
    const { container, rerender } = render(<RenderDispatcher {...baseProps} payload={qaPayload} />);
    expect(screen.getByText(qaPayload.content)).toBeInTheDocument();

    rerender(<RenderDispatcher {...baseProps} payload={tableSpecWithRows} />);
    expect(screen.getByText("Vendas")).toBeInTheDocument();
    // table_spec com rows renderiza TableGridPanel (a grade só aparece quando hasRows);
    // o valor da célula é virtualizado pelo react-datasheet-grid e não é texto plano em jsdom,
    // então afirmamos a presença da toolbar da grade (exclusiva do TableGridPanel).
    expect(screen.getByLabelText("Adicionar linha")).toBeInTheDocument();

    rerender(<RenderDispatcher {...baseProps} payload={tableSpecWithoutRows} />);
    expect(container.textContent).toBe("");

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

  it("renders the empty state", () => {
    render(<UnifiedChatTool />);

    expect(screen.getByText("O que você quer resolver hoje?")).toBeInTheDocument();
    expect(screen.getByLabelText("Pedido")).toBeInTheDocument();
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
      controller.enqueue(encodeLine({ type: "intent_detected", intent: "qa", confidence: "high" }));
    });

    expect(await screen.findByText("Pergunta · detectado")).toBeInTheDocument();
    expect(screen.queryByText(qaPayload.content)).not.toBeInTheDocument();

    await act(async () => {
      controller.enqueue(encodeLine({ type: "metadata", metadata: { mode: "generate", providerModel: "test" } }));
      controller.enqueue(encodeLine({ type: "complete", payload: qaPayload }));
      controller.close();
    });

    await waitFor(() => expect(screen.getByText(qaPayload.content)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/chat/unified", expect.any(Object));
  });

  it("submits the binary prompt payload as JSON without legacy tool fields", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(qaStream());

    render(<UnifiedChatTool />);

    await user.type(screen.getByLabelText("Pedido"), "Some a coluna A");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = parseJsonRequestBody(fetchMock);

    expect(body).toMatchObject({ prompt: "Some a coluna A" });
    // Campos de tools avulsos não existem mais no payload binário
    expect(body).not.toHaveProperty("platform");
    expect(body).not.toHaveProperty("formulaLanguage");
    expect(body).not.toHaveProperty("separator");
    expect(body).not.toHaveProperty("sqlDialect");
    expect(body).not.toHaveProperty("scriptType");
  });

  it("corrupt NDJSON enters the error state", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(rawStreamResponse(["not-json\n"]));

    render(<UnifiedChatTool />);

    await user.type(screen.getByLabelText("Pedido"), "Some a coluna A");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(
      () => expect(screen.getByText("Resposta corrompida. Tente novamente.")).toBeInTheDocument(),
      { timeout: 5_000 }
    );
  });

  it("file submit uses FormData without manual content-type", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(qaStream());

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
      .mockResolvedValueOnce(qaStream())
      .mockResolvedValueOnce(sheetOperationStream());

    render(<UnifiedChatTool />);

    await user.type(screen.getByLabelText("Pedido"), "Tenho PROCV, mas quero operação");
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(screen.getByText(qaPayload.content)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Tipo detectado: Pergunta/ }));
    await user.click(screen.getByRole("option", { name: "Operação" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const secondBody = parseJsonRequestBody(fetchMock, 1);

    expect(secondBody).toMatchObject({
      prompt: "Tenho PROCV, mas quero operação",
      overrideIntent: "sheet_operation",
    });
    await waitFor(() => expect(screen.getByText(sheetOperationPayload.content)).toBeInTheDocument());
    expect(screen.getByText("Operação · corrigido")).toBeInTheDocument();
  });

  it("new conversation clears exchanges", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(qaStream());

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
    await waitFor(() => expect(screen.getByText(qaPayload.content)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Limpar" }));

    expect(screen.queryByText(qaPayload.content)).not.toBeInTheDocument();
    expect(screen.getByText("O que você quer resolver hoje?")).toBeInTheDocument();
  });

  it("carries lastIntent from the previous exchange into the next submit", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(qaStream())
      .mockResolvedValueOnce(qaStream());

    render(<UnifiedChatTool />);

    await user.type(screen.getByLabelText("Pedido"), "Primeiro pedido");
    await user.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(screen.getByText(qaPayload.content)).toBeInTheDocument());

    await user.type(screen.getByLabelText("Pedido"), "Segundo pedido");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    // Primeiro submit não tem histórico → sem lastIntent; o segundo herda "qa" do anterior
    expect(parseJsonRequestBody(fetchMock, 0).lastIntent).toBeFalsy();
    expect(parseJsonRequestBody(fetchMock, 1).lastIntent).toBe("qa");
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
      UnifiedChatTool,
    ].map((component) => String(component));

    expect(sourceNodes.join("\n")).not.toContain("dangerouslySetInnerHTML");
  });
});

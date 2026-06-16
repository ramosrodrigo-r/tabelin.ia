import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import type { SessionUser } from "@/server/auth/session";

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigationMock.push }),
  redirect: navigationMock.redirect,
}));

const requestCacheMock = vi.hoisted(() => ({
  getCachedUser: vi.fn(),
}));

vi.mock("@/server/request-cache", () => ({
  getCachedUser: requestCacheMock.getCachedUser,
}));

vi.mock("@/server/support/support-config", () => ({
  getSupportLinks: () => ({}),
}));

// react-datasheet-grid (TableGridPanel) usa ResizeObserver internamente
// (react-resize-detector); jsdom não implementa — polyfill mínimo necessário
// para permitir o render real do componente (mesmo padrão de table-grid-panel.test.tsx).
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

const user: SessionUser = {
  id: "user_1",
  email: "ana@empresa.com",
  name: "Ana",
};

describe("WorkspaceLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza a planilha-amostra (TableGridPanel) e o chat (children) simultaneamente", async () => {
    requestCacheMock.getCachedUser.mockResolvedValue(user);

    const { default: WorkspaceLayout } = await import("../layout");

    render(
      await WorkspaceLayout({
        children: <div data-testid="chat-child">chat</div>,
      })
    );

    expect(screen.getByText("Controle de Gastos")).toBeInTheDocument();
    expect(screen.getByTestId("chat-child")).toBeInTheDocument();
  });

  it("não renderiza a Sidebar (aria-label Ferramentas removido)", async () => {
    requestCacheMock.getCachedUser.mockResolvedValue(user);

    const { default: WorkspaceLayout } = await import("../layout");

    render(
      await WorkspaceLayout({
        children: <div data-testid="chat-child">chat</div>,
      })
    );

    expect(screen.queryByLabelText("Ferramentas")).not.toBeInTheDocument();
  });

  it("renderiza os paineis workspace-grid-panel e workspace-chat-panel", async () => {
    requestCacheMock.getCachedUser.mockResolvedValue(user);

    const { default: WorkspaceLayout } = await import("../layout");

    const { container } = render(
      await WorkspaceLayout({
        children: <div data-testid="chat-child">chat</div>,
      })
    );

    expect(container.querySelector(".workspace-grid-panel")).toBeInTheDocument();
    expect(container.querySelector(".workspace-chat-panel")).toBeInTheDocument();
  });

  it("deslogado: NÃO redireciona e renderiza o preview travado (SAMPLE_SPEC + AuthGate)", async () => {
    requestCacheMock.getCachedUser.mockResolvedValue(null);
    navigationMock.redirect.mockImplementation(() => {
      throw new Error("REDIRECT");
    });

    const { default: WorkspaceLayout } = await import("../layout");

    const { container } = render(
      await WorkspaceLayout({
        children: <div data-testid="chat-child">chat</div>,
      })
    );

    // D-03/D-02: sem redirect quando não há sessão
    expect(navigationMock.redirect).not.toHaveBeenCalled();
    // casca de preview com a planilha-amostra (SAMPLE_SPEC)
    expect(screen.getByText("Controle de Gastos")).toBeInTheDocument();
    // overlay do AuthGate presente (gate não-dispensável)
    expect(container.querySelector(".auth-gate-overlay")).toBeInTheDocument();
  });
});

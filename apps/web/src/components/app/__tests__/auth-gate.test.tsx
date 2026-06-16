import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthGate } from "@/components/app/auth-gate";

vi.mock("@/components/app/auth-gate-modal", () => ({
  AuthGateModal: () => <div role="dialog" aria-label="mock-modal" />,
}));

describe("AuthGate", () => {
  it("autenticado: renderiza children sem overlay", () => {
    const { container } = render(
      <AuthGate isAuthenticated={true}>
        <span data-testid="child">conteudo</span>
      </AuthGate>
    );

    expect(screen.getByTestId("child")).toBeTruthy();
    expect(container.querySelector(".auth-gate-overlay")).toBeNull();
  });

  it("deslogado: renderiza children E o overlay", () => {
    const { container } = render(
      <AuthGate isAuthenticated={false}>
        <span data-testid="child">conteudo</span>
      </AuthGate>
    );

    expect(screen.getByTestId("child")).toBeTruthy();
    expect(container.querySelector(".auth-gate-overlay")).not.toBeNull();
  });

  it("deslogado: o overlay contém um dialog e sem botão de fechar acessível", () => {
    render(
      <AuthGate isAuthenticated={false}>
        <span>conteudo</span>
      </AuthGate>
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /fechar/i })).toBeNull();
  });

  it("deslogado: container contém elemento com data-testid='auth-gate-overlay'", () => {
    render(
      <AuthGate isAuthenticated={false}>
        <span>conteudo</span>
      </AuthGate>
    );

    expect(screen.getByTestId("auth-gate-overlay")).toBeTruthy();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthGateModal } from "@/components/app/auth-gate-modal";

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigationMock.push, refresh: navigationMock.refresh }),
}));

describe("AuthGateModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
  });

  function fillAndSubmit(submitLabel: RegExp) {
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ana@empresa.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "supersenha" },
    });
    fireEvent.click(screen.getByRole("button", { name: submitLabel }));
  }

  it("submete o login para /api/auth/sign-in/email", async () => {
    render(<AuthGateModal />);

    fillAndSubmit(/^Entrar$/);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/sign-in/email",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("ao alternar para cadastro, submete para /api/auth/sign-up/email", async () => {
    render(<AuthGateModal />);

    fireEvent.click(screen.getByRole("button", { name: /^Criar conta$/ }));

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana" } });
    fillAndSubmit(/^Criar conta$/);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/sign-up/email",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("em resposta ok, chama router.refresh()", async () => {
    render(<AuthGateModal />);

    fillAndSubmit(/^Entrar$/);

    await waitFor(() => {
      expect(navigationMock.refresh).toHaveBeenCalled();
    });
  });

  it("não expõe um botão/elemento de fechar acessível", () => {
    render(<AuthGateModal />);

    expect(screen.queryByLabelText("Fechar")).toBeNull();
    expect(screen.queryByRole("button", { name: /fechar/i })).toBeNull();
  });
});

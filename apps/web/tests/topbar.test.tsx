import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Topbar } from "@/components/app/topbar";
import { getSupportLinks } from "@/server/support/support-config";
import type { SessionUser } from "@/server/auth/session";

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigationMock.push }),
}));

const user: SessionUser = {
  id: "user_1",
  email: "ana@empresa.com",
  name: "Ana",
};

describe("Topbar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes unified conversation history from the root workspace", async () => {
    const browserUser = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    render(<Topbar user={user} supportLinks={getSupportLinks({})} />);

    await browserUser.click(screen.getByRole("button", { name: "Nova conversa" }));

    expect(
      screen.getByText("Apagar todo o histórico do chat unificado? Esta ação não pode ser desfeita.")
    ).toBeInTheDocument();

    await browserUser.click(screen.getByRole("button", { name: "Apagar histórico" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/conversations/unified", { method: "DELETE" });
  });

  it("renders a link to /privacidade", () => {
    render(<Topbar user={user} supportLinks={getSupportLinks({})} />);

    expect(screen.getByRole("link", { name: "Privacidade" })).toHaveAttribute("href", "/privacidade");
  });
});

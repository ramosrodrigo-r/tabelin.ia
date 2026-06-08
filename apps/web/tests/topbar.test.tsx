import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Topbar } from "@/components/app/topbar";
import { getSupportLinks } from "@/server/support/support-config";
import type { SessionUser } from "@/server/auth/session";
import type { UserEntitlement } from "@tabelin/shared";

const navigationMock = vi.hoisted(() => ({
  pathname: "/workspace",
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigationMock.push }),
  usePathname: () => navigationMock.pathname,
}));

const user: SessionUser = {
  id: "user_1",
  email: "ana@empresa.com",
  name: "Ana",
};

const freeEntitlement: UserEntitlement = { plan: "free", status: "active" };
const proEntitlement: UserEntitlement = { plan: "pro", status: "active", cycle: "monthly" };

describe("Topbar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    navigationMock.pathname = "/workspace";
  });

  it("renders validated Pro support links for Pro users", async () => {
    const browserUser = userEvent.setup();
    const supportLinks = getSupportLinks({
      NEXT_PUBLIC_PRO_SUPPORT_EMAIL: "pro@tabelin.ia",
      NEXT_PUBLIC_PRO_SUPPORT_WHATSAPP_URL: "https://wa.me/5585999999999",
    });

    render(<Topbar user={user} entitlement={proEntitlement} supportLinks={supportLinks} />);

    await browserUser.click(screen.getByRole("button", { name: "ana@empresa.com" }));

    expect(screen.getByText("Suporte Pro")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Email prioritario" })).toHaveAttribute("href", "mailto:pro@tabelin.ia");
    expect(screen.getByRole("menuitem", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/5585999999999");
  });

  it("does not render Pro support links for Free users", async () => {
    const browserUser = userEvent.setup();
    const supportLinks = getSupportLinks({
      NEXT_PUBLIC_PRO_SUPPORT_EMAIL: "pro@tabelin.ia",
      NEXT_PUBLIC_PRO_SUPPORT_WHATSAPP_URL: "https://wa.me/5585999999999",
    });

    render(<Topbar user={user} entitlement={freeEntitlement} supportLinks={supportLinks} />);

    await browserUser.click(screen.getByRole("button", { name: "ana@empresa.com" }));

    expect(screen.queryByText("Suporte Pro")).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Email prioritario" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "WhatsApp" })).not.toBeInTheDocument();
  });

  it("omits unsafe WhatsApp support URLs", async () => {
    const browserUser = userEvent.setup();
    const supportLinks = getSupportLinks({
      NEXT_PUBLIC_PRO_SUPPORT_EMAIL: "pro@tabelin.ia",
      NEXT_PUBLIC_PRO_SUPPORT_WHATSAPP_URL: "javascript:alert(1)",
    });

    render(<Topbar user={user} entitlement={proEntitlement} supportLinks={supportLinks} />);

    await browserUser.click(screen.getByRole("button", { name: "ana@empresa.com" }));

    expect(screen.getByRole("menuitem", { name: "Email prioritario" })).toHaveAttribute("href", "mailto:pro@tabelin.ia");
    expect(screen.queryByRole("menuitem", { name: "WhatsApp" })).not.toBeInTheDocument();
  });

  it("deletes unified conversation history from the root workspace", async () => {
    const browserUser = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    render(<Topbar user={user} entitlement={freeEntitlement} supportLinks={getSupportLinks({})} />);

    await browserUser.click(screen.getByRole("button", { name: "Nova conversa" }));

    expect(
      screen.getByText("Apagar todo o histórico do chat unificado? Esta ação não pode ser desfeita.")
    ).toBeInTheDocument();

    await browserUser.click(screen.getByRole("button", { name: "Apagar histórico" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/conversations/unified", { method: "DELETE" });
  });

  it("keeps SQL conversation deletion on the SQL deep link", async () => {
    navigationMock.pathname = "/workspace/sql";
    const browserUser = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    render(<Topbar user={user} entitlement={freeEntitlement} supportLinks={getSupportLinks({})} />);

    await browserUser.click(screen.getByRole("button", { name: "Nova conversa" }));
    await browserUser.click(screen.getByRole("button", { name: "Apagar histórico" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/conversations/sql", { method: "DELETE" });
  });
});

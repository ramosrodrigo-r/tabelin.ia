import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Topbar } from "@/components/app/topbar";
import { getSupportLinks } from "@/server/support/support-config";
import type { SessionUser } from "@/server/auth/session";
import type { UserEntitlement } from "@tabelin/shared";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/workspace",
}));

const user: SessionUser = {
  id: "user_1",
  email: "ana@empresa.com",
  name: "Ana",
};

const freeEntitlement: UserEntitlement = { plan: "free", status: "active" };
const proEntitlement: UserEntitlement = { plan: "pro", status: "active", cycle: "monthly" };

describe("Topbar", () => {
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
});

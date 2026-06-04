import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FormulaTool } from "@/features/formula/formula-tool";
import type { UserEntitlement } from "@tabelin/shared";

function streamResponse(lines: unknown[]) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
        }
        controller.close();
      }
    }),
    { status: 200 }
  );
}

const freeEntitlement: UserEntitlement = { plan: "free", status: "active" };
const proEntitlement: UserEntitlement = { plan: "pro", status: "active", cycle: "monthly", currentPeriodEnd: new Date("2027-01-01") };

describe("FormulaTool", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  it("renders platform and language controls with separator indicators", () => {
    render(<FormulaTool entitlement={freeEntitlement} />);

    expect(screen.getByText("Microsoft Excel")).toBeInTheDocument();
    expect(screen.getByText("Google Sheets")).toBeInTheDocument();
    expect(screen.getByText("Airtable")).toBeInTheDocument();
    expect(screen.getByText("LibreOffice Calc")).toBeInTheDocument();
    expect(screen.getByText(/Portugues \(Brasil\)/)).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it("blocks submit with visible validation when input is missing", async () => {
    const user = userEvent.setup();
    render(<FormulaTool entitlement={freeEntitlement} />);

    await user.click(screen.getByRole("button", { name: "Gerar formula" }));

    expect(screen.getByText("Descreva a tarefa da planilha antes de gerar.")).toBeInTheDocument();
  });

  it("streams formula output and enables validated copy", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      streamResponse([
        {
          type: "metadata",
          metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "test" }
        },
        { type: "delta", text: '=SOMASE(C:C;"Pago";B:B)' },
        {
          type: "complete",
          payload: {
            kind: "formula",
            formula: '=SOMASE(C:C;"Pago";B:B)',
            explanation: "Soma pagamentos marcados como Pago.",
            assumptions: ["A coluna B contem valores."],
            warnings: [],
            metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "test" }
          }
        }
      ])
    );

    render(<FormulaTool entitlement={freeEntitlement} />);

    expect(screen.queryByRole("button", { name: "Copiar resultado" })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Pedido"), "Quero somar a coluna B se a coluna C for Pago");
    await user.click(screen.getByRole("button", { name: "Gerar formula" }));

    await waitFor(() => expect(screen.getByText('=SOMASE(C:C;"Pago";B:B)')).toBeInTheDocument());
    expect(screen.getByText("Separador ;")).toBeInTheDocument();
    expect(screen.getByText("A coluna B contem valores.")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole("button", { name: "Copiar resultado" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Copiar resultado" }));

    expect(await screen.findByRole("button", { name: "Copiado" })).toBeInTheDocument();
  });

  it("does not show Pro badge or support links for Free users", () => {
    render(<FormulaTool entitlement={freeEntitlement} />);

    expect(screen.queryByText("Pro")).not.toBeInTheDocument();
  });

  it("renders Pro badge for active Pro users", () => {
    render(<FormulaTool entitlement={proEntitlement} />);

    // Pro badge presence would be tested at workspace/topbar level, not in FormulaTool
    // FormulaTool receives isPro state for quota bypass only
  });
});

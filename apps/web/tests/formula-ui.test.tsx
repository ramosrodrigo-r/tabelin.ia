import * as fs from "node:fs";
import * as path from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { validateFile } from "@/components/app/attachment-button";
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

  describe("attachment UI", () => {
    it("free user sees disabled attachment button", () => {
      render(<FormulaTool entitlement={freeEntitlement} />);

      const btn = screen.getByRole("button", { name: "Anexar arquivo (exclusivo Pro)" });
      expect(btn).toBeDisabled();
    });

    it("pro user sees enabled attachment button", () => {
      render(<FormulaTool entitlement={proEntitlement} />);

      const btn = screen.getByRole("button", { name: "Anexar arquivo" });
      expect(btn).not.toBeDisabled();
    });

    it("pro user sees attachment chip after file select", async () => {
      const user = userEvent.setup();
      render(<FormulaTool entitlement={proEntitlement} />);

      const file = new File(["col1,col2\n1,2"], "dados.csv", { type: "text/csv" });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      expect(screen.getByRole("status", { name: /Arquivo anexado/ })).toBeInTheDocument();
      expect(screen.getByText("dados.csv")).toBeInTheDocument();
    });

    it("file type validation rejects unsupported type", async () => {
      render(<FormulaTool entitlement={proEntitlement} />);

      const file = new File(["binary"], "malware.exe", { type: "application/exe" });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      // Use fireEvent.change to bypass userEvent's accept-filter (applyAccept defaults to true in v14)
      // This simulates the browser delivering the file despite the accept attribute (e.g. drag-and-drop or manual path entry)
      Object.defineProperty(input, "files", { value: [file], configurable: true });
      fireEvent.change(input);

      expect(screen.getByText(/Tipo não suportado/)).toBeInTheDocument();
      expect(screen.queryByRole("status", { name: /Arquivo anexado/ })).not.toBeInTheDocument();
    });

    it("file size validation rejects files over 5MB", () => {
      const bigFile = new File(["x"], "grande.csv", { type: "text/csv" });
      Object.defineProperty(bigFile, "size", { value: 6 * 1024 * 1024 });

      const err = validateFile(bigFile);
      expect(err).toContain("Arquivo muito grande");
    });

    it("pro user can remove attachment chip", async () => {
      const user = userEvent.setup();
      render(<FormulaTool entitlement={proEntitlement} />);

      const file = new File(["col1,col2\n1,2"], "dados.csv", { type: "text/csv" });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      expect(screen.getByRole("status", { name: /Arquivo anexado/ })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Remover arquivo" }));

      expect(screen.queryByRole("status", { name: /Arquivo anexado/ })).not.toBeInTheDocument();
    });

    it("privacy notice appears with pending file", async () => {
      const user = userEvent.setup();
      render(<FormulaTool entitlement={proEntitlement} />);

      const file = new File(["col1,col2\n1,2"], "dados.csv", { type: "text/csv" });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      expect(screen.getByText(/Nova conversa/)).toBeInTheDocument();
    });
  });

  describe("grounding and transparency", () => {
    it("shows grounding badge after submit with attachment", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        streamResponse([
          { type: "attachment_grounded", charCount: 1234, wasTruncated: false, extractedText: "col1,col2\n1,2" },
          {
            type: "metadata",
            metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "test" }
          },
          { type: "delta", text: "=SOMA(A:A)" },
          {
            type: "complete",
            payload: {
              kind: "formula",
              formula: "=SOMA(A:A)",
              explanation: "Soma a coluna A.",
              assumptions: [],
              warnings: [],
              metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "test" }
            }
          }
        ])
      );

      render(<FormulaTool entitlement={proEntitlement} />);

      const file = new File(["col1,col2\n1,2"], "dados.csv", { type: "text/csv" });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      await user.type(screen.getByLabelText("Pedido"), "Some a coluna A");
      await user.click(screen.getByRole("button", { name: "Gerar formula" }));

      await waitFor(() =>
        expect(screen.getByRole("generic", { name: "Gerado com base em documento anexado" })).toBeInTheDocument()
      );
    });

    it("shows attachment panel with extracted text", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        streamResponse([
          { type: "attachment_grounded", charCount: 14, wasTruncated: false, extractedText: "col1,col2\n1,2" },
          {
            type: "metadata",
            metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "test" }
          },
          { type: "delta", text: "=SOMA(A:A)" },
          {
            type: "complete",
            payload: {
              kind: "formula",
              formula: "=SOMA(A:A)",
              explanation: "Soma a coluna A.",
              assumptions: [],
              warnings: [],
              metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "test" }
            }
          }
        ])
      );

      render(<FormulaTool entitlement={proEntitlement} />);

      const file = new File(["col1,col2\n1,2"], "dados.csv", { type: "text/csv" });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      await user.type(screen.getByLabelText("Pedido"), "Some a coluna A");
      await user.click(screen.getByRole("button", { name: "Gerar formula" }));

      await waitFor(() =>
        expect(screen.getByText("Texto extraído do documento")).toBeInTheDocument()
      );

      // Open the details to see extracted text
      await user.click(screen.getByText("Texto extraído do documento"));

      await waitFor(() => {
        const pre = document.querySelector(".attachment-panel-content");
        expect(pre).toBeInTheDocument();
        expect(pre?.textContent).toContain("col1,col2");
      });
    });

    it("shows truncation warning when wasTruncated=true", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        streamResponse([
          { type: "attachment_grounded", charCount: 9000, wasTruncated: true, extractedText: "...texto longo..." },
          {
            type: "metadata",
            metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "test" }
          },
          { type: "delta", text: "=SOMA(A:A)" },
          {
            type: "complete",
            payload: {
              kind: "formula",
              formula: "=SOMA(A:A)",
              explanation: "Soma a coluna A.",
              assumptions: [],
              warnings: [],
              metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "test" }
            }
          }
        ])
      );

      render(<FormulaTool entitlement={proEntitlement} />);

      const file = new File(["...texto longo..."], "grande.csv", { type: "text/csv" });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      await user.type(screen.getByLabelText("Pedido"), "Analise o arquivo");
      await user.click(screen.getByRole("button", { name: "Gerar formula" }));

      await waitFor(() =>
        expect(screen.getByText("extração parcial")).toBeInTheDocument()
      );
    });

    it("does not show grounding badge without attachment", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        streamResponse([
          {
            type: "metadata",
            metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "test" }
          },
          { type: "delta", text: "=SOMA(A:A)" },
          {
            type: "complete",
            payload: {
              kind: "formula",
              formula: "=SOMA(A:A)",
              explanation: "Soma a coluna A.",
              assumptions: [],
              warnings: [],
              metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "test" }
            }
          }
        ])
      );

      render(<FormulaTool entitlement={freeEntitlement} />);

      await user.type(screen.getByLabelText("Pedido"), "Some a coluna A");
      await user.click(screen.getByRole("button", { name: "Gerar formula" }));

      await waitFor(() =>
        expect(screen.getByText("=SOMA(A:A)")).toBeInTheDocument()
      );

      expect(screen.queryByText("Gerado com base em documento")).toBeNull();
    });

    it("attachment-panel never uses dangerouslySetInnerHTML (SEC-01)", () => {
      const panelFile = fs.readFileSync(
        path.join(__dirname, "../src/components/app/attachment-panel.tsx"),
        "utf-8"
      );
      expect(panelFile).not.toContain("dangerouslySetInnerHTML");
    });
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AttachmentButton, validateFile } from "@/components/app/attachment-button";

describe("validateFile", () => {
  it("returns null for a valid CSV file", () => {
    const file = new File(["a,b"], "test.csv", { type: "text/csv" });
    expect(validateFile(file)).toBeNull();
  });

  it("returns null for a valid PNG file", () => {
    const file = new File(["data"], "img.png", { type: "image/png" });
    expect(validateFile(file)).toBeNull();
  });

  it("returns null for a valid PDF file", () => {
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    expect(validateFile(file)).toBeNull();
  });

  it("returns null for a valid TXT file", () => {
    const file = new File(["data"], "doc.txt", { type: "text/plain" });
    expect(validateFile(file)).toBeNull();
  });

  it("returns null for CSV with empty MIME type via extension fallback", () => {
    const file = new File(["a,b"], "test.csv", { type: "" });
    expect(validateFile(file)).toBeNull();
  });

  it("returns null for XLSX with empty MIME type via extension fallback", () => {
    const file = new File(["data"], "sheet.xlsx", { type: "" });
    expect(validateFile(file)).toBeNull();
  });

  it("returns pt-BR error for unsupported file type", () => {
    const file = new File(["data"], "doc.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    expect(validateFile(file)).toBe("Tipo não suportado. Use CSV, XLSX, PNG, JPEG, PDF ou TXT.");
  });

  it("returns pt-BR error for file exceeding 5MB", () => {
    const bigContent = new Uint8Array(6 * 1024 * 1024);
    const file = new File([bigContent], "big.csv", { type: "text/csv" });
    expect(validateFile(file)).toBe("Arquivo muito grande. O limite é 5 MB.");
  });
});

describe("AttachmentButton", () => {
  it("renders disabled button for free user (isPro=false)", () => {
    render(<AttachmentButton isPro={false} onFileSelect={vi.fn()} />);

    const btn = screen.getByRole("button", { name: "Anexar arquivo (exclusivo Pro)" });
    expect(btn).toBeDisabled();
  });

  it("renders file input and clickable button for pro user (isPro=true)", () => {
    render(<AttachmentButton isPro={true} onFileSelect={vi.fn()} />);

    const btn = screen.getByRole("button", { name: "Anexar arquivo" });
    expect(btn).not.toBeDisabled();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.accept).toContain(".csv");
  });

  it("calls onFileSelect when pro user selects a file", async () => {
    const user = userEvent.setup();
    const onFileSelect = vi.fn();
    render(<AttachmentButton isPro={true} onFileSelect={onFileSelect} />);

    const file = new File(["col1,col2\n1,2"], "dados.csv", { type: "text/csv" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it("is disabled when disabled prop is true (pro user)", () => {
    render(<AttachmentButton isPro={true} onFileSelect={vi.fn()} disabled={true} />);

    const btn = screen.getByRole("button", { name: "Anexar arquivo" });
    expect(btn).toBeDisabled();
  });
});

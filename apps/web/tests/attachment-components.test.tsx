import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AttachmentChip } from "@/components/app/attachment-chip";
import { AttachmentPanel } from "@/components/app/attachment-panel";
import { PrivacyNotice } from "@/components/app/privacy-notice";

describe("AttachmentChip", () => {
  it("renders with role=status and aria-label containing file name and size", () => {
    const file = new File(["a,b,c"], "report.csv", { type: "text/csv" });
    Object.defineProperty(file, "size", { value: 2048 }); // 2KB
    render(<AttachmentChip file={file} onRemove={vi.fn()} />);

    const chip = screen.getByRole("status");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveAttribute("aria-label", expect.stringContaining("report.csv"));
  });

  it("shows file name", () => {
    const file = new File(["data"], "meu-arquivo.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    Object.defineProperty(file, "size", { value: 512 });
    render(<AttachmentChip file={file} onRemove={vi.fn()} />);

    expect(screen.getByText("meu-arquivo.xlsx")).toBeInTheDocument();
  });

  it("shows size in KB when file is less than 1MB", () => {
    const file = new File(["data"], "small.csv", { type: "text/csv" });
    Object.defineProperty(file, "size", { value: 2048 }); // 2KB
    render(<AttachmentChip file={file} onRemove={vi.fn()} />);

    expect(screen.getByText("2 KB")).toBeInTheDocument();
  });

  it("shows size in MB when file is larger than 1MB", () => {
    const file = new File(["data"], "big.csv", { type: "text/csv" });
    Object.defineProperty(file, "size", { value: 1.5 * 1024 * 1024 }); // 1.5MB
    render(<AttachmentChip file={file} onRemove={vi.fn()} />);

    expect(screen.getByText("1.5 MB")).toBeInTheDocument();
  });

  it("renders remove button with aria-label and calls onRemove when clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 1024 });
    render(<AttachmentChip file={file} onRemove={onRemove} />);

    const removeBtn = screen.getByRole("button", { name: "Remover arquivo" });
    expect(removeBtn).toBeInTheDocument();
    await user.click(removeBtn);
    expect(onRemove).toHaveBeenCalledOnce();
  });
});

describe("AttachmentPanel", () => {
  it("renders extracted text as plain text inside pre (no dangerouslySetInnerHTML)", () => {
    const extractedText = "<script>alert('xss')</script>Some content";
    render(<AttachmentPanel extractedText={extractedText} wasTruncated={false} />);

    // The text should be escaped as text, not as HTML
    const pre = document.querySelector("pre");
    expect(pre).toBeTruthy();
    expect(pre?.textContent).toContain("<script>alert('xss')</script>");
    // Must not set innerHTML directly
    expect(pre?.innerHTML).not.toContain("<script>");
  });

  it("shows truncation badge when wasTruncated=true", () => {
    render(<AttachmentPanel extractedText="some text" wasTruncated={true} />);

    expect(screen.getByText("extração parcial")).toBeInTheDocument();
  });

  it("does not show truncation badge when wasTruncated=false", () => {
    render(<AttachmentPanel extractedText="some text" wasTruncated={false} />);

    expect(screen.queryByText("extração parcial")).not.toBeInTheDocument();
  });

  it("renders details element with summary", () => {
    render(<AttachmentPanel extractedText="content here" wasTruncated={false} />);

    const details = document.querySelector("details");
    expect(details).toBeTruthy();
    expect(screen.getByText("Texto extraído do documento")).toBeInTheDocument();
  });
});

describe("PrivacyNotice", () => {
  it("renders the LGPD privacy copy in pt-BR", () => {
    render(<PrivacyNotice />);

    expect(screen.getByText(/O conteúdo do documento/)).toBeInTheDocument();
  });

  it("renders Nova conversa in bold (strong element)", () => {
    render(<PrivacyNotice />);

    const strong = document.querySelector("strong");
    expect(strong).toBeTruthy();
    expect(strong?.textContent).toBe("Nova conversa");
  });

  it("has aria-live=polite on the paragraph", () => {
    render(<PrivacyNotice />);

    const p = document.querySelector("p.privacy-notice");
    expect(p).toBeTruthy();
    expect(p).toHaveAttribute("aria-live", "polite");
  });
});

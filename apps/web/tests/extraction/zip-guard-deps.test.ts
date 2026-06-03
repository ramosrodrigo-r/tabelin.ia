import { describe, expect, it } from "vitest";

/**
 * Smoke test: prova que as 3 dependências da Plan 09-01 são importáveis
 * no runtime de teste antes de Plans 02–04 dependerem delas (D-09).
 * Usa dynamic import para compatibilidade com módulos ESM-only (file-type@22).
 */
describe("zip-guard-deps — smoke imports", () => {
  it("unpdf exporta extractText e getDocumentProxy como funções", async () => {
    const unpdf = await import("unpdf");
    expect(typeof unpdf.extractText).toBe("function");
    expect(typeof unpdf.getDocumentProxy).toBe("function");
  });

  it("file-type exporta fileTypeFromBuffer como função", async () => {
    const fileType = await import("file-type");
    expect(typeof fileType.fileTypeFromBuffer).toBe("function");
  });

  it("fflate exporta unzipSync como função", async () => {
    const fflate = await import("fflate");
    expect(typeof fflate.unzipSync).toBe("function");
  });
});

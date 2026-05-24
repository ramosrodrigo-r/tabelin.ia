import { describe, expect, it } from "vitest";

import {
  FORMULA_FIXTURES,
  FORMULA_PLATFORMS,
  formulaGenerateRequestSchema,
  getSeparatorForLanguage
} from "@tabelin/shared";

import { buildFormulaGenerationPrompt } from "@/server/ai/formula-prompts";

describe("formula contracts", () => {
  it("exports all required platforms", () => {
    expect(FORMULA_PLATFORMS.map((platform) => platform.id)).toEqual([
      "excel",
      "google_sheets",
      "airtable",
      "libreoffice_calc"
    ]);
  });

  it("requires platform and formula language", () => {
    expect(formulaGenerateRequestSchema.safeParse({ prompt: "Somar pagos" }).success).toBe(false);
    expect(
      formulaGenerateRequestSchema.safeParse({
        prompt: "Somar pagos",
        platform: "excel",
        formulaLanguage: "pt-BR"
      }).success
    ).toBe(true);
  });

  it("maps formula language to the correct separator", () => {
    expect(getSeparatorForLanguage("pt-BR")).toBe(";");
    expect(getSeparatorForLanguage("en-US")).toBe(",");
  });

  it("keeps golden localized fixtures for common formulas", () => {
    const formulas = FORMULA_FIXTURES.map((fixture) => fixture.formula).join("\n");

    expect(formulas).toContain("SE");
    expect(formulas).toContain("PROCV");
    expect(formulas).toContain("SOMASE");
    expect(formulas).toContain("SOMASES");
  });

  it("includes platform, language, separator, and assumptions instructions in prompts", () => {
    const prompt = buildFormulaGenerationPrompt({
      platform: "excel",
      formulaLanguage: "pt-BR",
      prompt: "Somar pagos"
    });

    expect(prompt).toContain("Microsoft Excel");
    expect(prompt).toContain("Portugues (Brasil)");
    expect(prompt).toContain(";");
    expect(prompt).toContain("premissa");
  });
});


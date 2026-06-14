import { describe, expect, it } from "vitest";

import {
  translateEnToPtBr,
  translatePtBrToEn,
} from "@/server/ai/formula-translator";

describe("translateEnToPtBr", () => {
  it("traduz nomes de funções EN para pt-BR", () => {
    expect(translateEnToPtBr("=SUM(A1)")).toBe("=SOMA(A1)");
    expect(translateEnToPtBr("=IF(A1>0,1,0)")).toBe("=SE(A1>0;1;0)");
    expect(translateEnToPtBr("=VLOOKUP(A1,B:C,2,0)")).toBe("=PROCV(A1;B:C;2;0)");
  });

  it("substitui separadores de argumento , por ; dentro dos parênteses", () => {
    expect(translateEnToPtBr("=SUM(A1, B1)")).toBe("=SOMA(A1; B1)");
    expect(translateEnToPtBr("SUM(A1, B1, C1)")).toBe("SOMA(A1; B1; C1)");
  });

  it("preserva decimais e strings de texto contendo vírgulas", () => {
    expect(translateEnToPtBr('=IF(A1 > 3.5, "A, B", "C")')).toBe(
      '=SE(A1 > 3.5; "A, B"; "C")'
    );
  });

  it("traduz funções aninhadas", () => {
    expect(translateEnToPtBr("=IF(SUM(A1, B1) > 10, 1, 0)")).toBe(
      "=SE(SOMA(A1; B1) > 10; 1; 0)"
    );
  });

  it("mantém intacto texto que não é fórmula reconhecida", () => {
    expect(translateEnToPtBr("texto livre, sem função")).toBe(
      "texto livre, sem função"
    );
  });

  it("é case-insensitive no nome da função", () => {
    expect(translateEnToPtBr("=sum(A1, B1)")).toBe("=SOMA(A1; B1)");
  });
});

describe("translatePtBrToEn", () => {
  it("traduz nomes de funções pt-BR para EN", () => {
    expect(translatePtBrToEn("=SOMA(A1)")).toBe("=SUM(A1)");
    expect(translatePtBrToEn("=SE(A1>0;1;0)")).toBe("=IF(A1>0,1,0)");
    expect(translatePtBrToEn("=PROCV(A1;B:C;2;0)")).toBe("=VLOOKUP(A1,B:C,2,0)");
  });

  it("substitui separadores ; por , fora de strings", () => {
    expect(translatePtBrToEn('=SE(A1 > 3.5; "A; B"; "C")')).toBe(
      '=IF(A1 > 3.5, "A; B", "C")'
    );
  });

  it("é round-trippable para fórmulas suportadas", () => {
    const enInput = '=IF(SUM(A1, B1) > 3.5, "X, Y", "Z")';
    expect(translatePtBrToEn(translateEnToPtBr(enInput))).toBe(enInput);
  });
});

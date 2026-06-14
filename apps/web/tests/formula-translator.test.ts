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

  it("trata aspas escapadas no estilo Excel e padrão", () => {
    expect(translateEnToPtBr('=IF(A1="say ""hi, there""", 1, 0)')).toBe(
      '=SE(A1="say ""hi, there"""; 1; 0)'
    );
    expect(translateEnToPtBr('=IF(A1="say \\"hi, there\\"", 1, 0)')).toBe(
      '=SE(A1="say \\"hi, there\\""; 1; 0)'
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

  it("normaliza aliases de funções pt-BR para a forma canônica no round-trip", () => {
    // Exemplo: CONTSE e CONT_SE são aliases não-canônicos para COUNTIF,
    // que se traduzem no round-trip para a forma canônica CONT.SE.
    const inputBr = "=CONTSE(A1:A5; 2)";
    const expectedEn = "=COUNTIF(A1:A5, 2)";
    const expectedCanonicalBr = "=CONT.SE(A1:A5; 2)";

    const en = translatePtBrToEn(inputBr);
    expect(en).toBe(expectedEn);

    const br = translateEnToPtBr(en);
    expect(br).toBe(expectedCanonicalBr);
  });
});

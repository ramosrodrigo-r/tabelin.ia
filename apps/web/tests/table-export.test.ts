import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";

import {
  sanitizeCellForExport,
  buildCsv,
  buildXlsx,
} from "../src/features/unified-chat/lib/table-export";
import type { TableColumn } from "@tabelin/shared";
import type { RowData } from "../src/features/unified-chat/hooks/use-formula-engine";

const COLUMNS: TableColumn[] = [
  { name: "Descrição", type: "text", key: "descricao" },
  { name: "Valor", type: "currency", key: "valor" },
  { name: "Total", type: "formula", key: "total", formula: "=SOMA(B{row};0)" },
];

const ROWS: RowData[] = [
  { descricao: "Categoria", valor: 1500, total: 1900 },
  { descricao: "Outra", valor: 200, total: 600 },
];

describe("sanitizeCellForExport — SEC-04 prefixo de injeção de fórmula", () => {
  it.each([
    ["=SOMA(1)", "'=SOMA(1)"],
    ["+1+1", "'+1+1"],
    ["-1+1", "'-1+1"],
    ["@SOMA(1)", "'@SOMA(1)"],
    ["\tabc", "'\tabc"],
    ["\rabc", "'\rabc"],
    ["\nabc", "'\nabc"],
  ])("prefixa célula perigosa %s com aspa simples", (input, expected) => {
    expect(sanitizeCellForExport(input)).toBe(expected);
  });

  it("não altera célula normal (não perigosa)", () => {
    expect(sanitizeCellForExport("Categoria")).toBe("Categoria");
  });

  it("coage número para string sem alteração", () => {
    expect(sanitizeCellForExport(1500)).toBe("1500");
  });

  it("retorna string vazia para null/undefined sem lançar", () => {
    expect(sanitizeCellForExport(null as unknown as string)).toBe("");
    expect(sanitizeCellForExport(undefined as unknown as string)).toBe("");
  });

  // CR-01 (15-REVIEW): importadores podem descartar aspas/espaços iniciais
  // antes de avaliar a fórmula — o gatilho precisa olhar o conteúdo normalizado.
  it.each([
    ['"=cmd"', `'"=cmd"`],
    [" =1+1", "' =1+1"],
    ["\t=1+1", "'\t=1+1"],
    ["'=1+1", "''=1+1"],
    ["`=1+1", "'`=1+1"],
  ])(
    "CR-01: prefixa célula com gatilho após neutralizador inicial (%j)",
    (input, expected) => {
      expect(sanitizeCellForExport(input)).toBe(expected);
    },
  );

  it("CR-01: não prefixa célula com aspa inicial mas sem gatilho", () => {
    expect(sanitizeCellForExport('"texto"')).toBe('"texto"');
    expect(sanitizeCellForExport(" Categoria")).toBe(" Categoria");
  });
});

describe("buildCsv — EXP-01", () => {
  it("começa com BOM UTF-8 e usa header na primeira linha", () => {
    const csv = buildCsv(COLUMNS, ROWS);
    expect(csv.startsWith("﻿")).toBe(true);
    const firstLine = csv.slice(1).split("\r\n")[0];
    expect(firstLine).toBe("Descrição;Valor;Total");
  });

  it("usa ';' como separador de campos", () => {
    const csv = buildCsv(COLUMNS, ROWS);
    const dataLine = csv.split("\r\n")[1];
    expect(dataLine.split(";").length).toBe(3);
  });

  it("quota campo que contém ; , \" ou newline e duplica aspas internas (RFC 4180)", () => {
    const cols: TableColumn[] = [{ name: "Nota", type: "text", key: "nota" }];
    const rows: RowData[] = [{ nota: 'Valor com "aspas" e ; ponto e vírgula' }];
    const csv = buildCsv(cols, rows);
    const dataLine = csv.split("\r\n")[1];
    expect(dataLine).toBe('"Valor com ""aspas"" e ; ponto e vírgula"');
  });

  it("exporta valores de displayRows (calculados), nunca o template de fórmula", () => {
    const csv = buildCsv(COLUMNS, ROWS);
    expect(csv).toContain("1900");
    expect(csv).not.toContain("{row}");
    expect(csv).not.toContain("=SOMA");
  });
});

describe("buildXlsx — EXP-02 / SEC-04 cell-objects {t:\"s\"}", () => {
  it("retorna WorkBook com 1 sheet 'Tabela'", () => {
    const wb = buildXlsx(COLUMNS, ROWS);
    expect(wb.SheetNames).toEqual(["Tabela"]);
    expect(wb.Sheets["Tabela"]).toBeDefined();
  });

  it("ws['A1'] (header) é cell-object t:'s'", () => {
    const wb = buildXlsx(COLUMNS, ROWS);
    const ws = wb.Sheets["Tabela"];
    expect(ws["A1"].t).toBe("s");
    expect(ws["A1"].v).toBe("Descrição");
  });

  it("toda célula de dados tem t === 's'", () => {
    const wb = buildXlsx(COLUMNS, ROWS);
    const ws = wb.Sheets["Tabela"];
    const range = XLSX.utils.decode_range(ws["!ref"] as string);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        expect(cell).toBeDefined();
        expect(cell.t).toBe("s");
      }
    }
  });

  it("célula perigosa '=1+1' vira texto sanitizado \"'=1+1\" com t:'s'", () => {
    const cols: TableColumn[] = [{ name: "Formula", type: "text", key: "formula" }];
    const rows: RowData[] = [{ formula: "=1+1" }];
    const wb = buildXlsx(cols, rows);
    const ws = wb.Sheets["Tabela"];
    expect(ws["A2"].t).toBe("s");
    expect(ws["A2"].v).toBe("'=1+1");
  });
});

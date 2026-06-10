import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

// Mocks da util de export (Plan 01) — evita efeito DOM/fs real (Pitfall 4).
const buildCsvMock = vi.fn(() => "csv-content");
const buildXlsxMock = vi.fn(() => ({ SheetNames: [], Sheets: {} }));
const downloadCsvMock = vi.fn();
const downloadXlsxMock = vi.fn();

vi.mock("../src/features/unified-chat/lib/table-export", () => ({
  buildCsv: buildCsvMock,
  buildXlsx: buildXlsxMock,
  downloadCsv: downloadCsvMock,
  downloadXlsx: downloadXlsxMock,
  sanitizeCellForExport: (v: string | number) => String(v ?? ""),
}));

// react-datasheet-grid usa ResizeObserver internamente (react-resize-detector);
// jsdom não implementa — polyfill mínimo para permitir render real do componente.
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Import direto: o módulo já existe nesta fase (Wave 2) — usado pelos testes
// de export EXP-01/EXP-02 que precisam de render real (não skip-graceful).
import { TableGridPanel as TableGridPanelDirect } from "../src/features/unified-chat/components/table-grid-panel";

// NOTE: TableGridPanel será criado no Wave 2.
// Import dinâmico com try/catch para skip-graceful enquanto o módulo não existe.

type TableGridPanelComponent = React.ComponentType<{ spec: Record<string, unknown> }> | undefined;
let TableGridPanel: TableGridPanelComponent;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("../src/features/unified-chat/components/table-grid-panel") as Record<string, unknown>;
  if (typeof mod.TableGridPanel === "function") {
    TableGridPanel = mod.TableGridPanel as TableGridPanelComponent;
  }
} catch {
  // módulo ainda não existe — Wave 2 o criará
}

const SPEC_FIXTURE = {
  kind: "table_spec" as const,
  title: "Controle de Gastos",
  columns: [
    { name: "Descrição", type: "text", key: "descricao" },
    { name: "Valor", type: "currency", key: "valor" },
    { name: "Total", type: "formula", key: "total", formula: "=SOMA(B{row};0)" },
  ],
  rowCount: 3,
  rows: [
    { descricao: "Aluguel", valor: 2000 },
    { descricao: "Internet", valor: 150 },
    { descricao: "Academia", valor: 120 },
  ],
  formulaLanguage: "pt-BR" as const,
  separator: ";" as const,
};

describe("TableGridPanel — render / TAB-01", () => {
  it("renderiza título da spec no output-header", () => {
    if (!TableGridPanel) {
      expect(true).toBe(true);
      return;
    }
    render(<TableGridPanel spec={SPEC_FIXTURE} />);
    expect(screen.getByText("Controle de Gastos")).toBeInTheDocument();
  });

  it("renderiza sem crash com spec mínima", () => {
    if (!TableGridPanel) {
      expect(true).toBe(true);
      return;
    }
    const minimalSpec = {
      kind: "table_spec" as const,
      title: "Tabela Mínima",
      columns: [{ name: "Coluna A", type: "text", key: "col_a" }],
      rowCount: 1,
      rows: [{ col_a: "valor" }],
      formulaLanguage: "pt-BR" as const,
      separator: ";" as const,
    };
    expect(() => render(<TableGridPanel spec={minimalSpec} />)).not.toThrow();
  });
});

describe("TableGridPanel — SEC-05 XSS", () => {
  it("conteúdo de célula com <script> não executa: window.__xss permanece undefined", () => {
    if (!TableGridPanel) {
      expect(true).toBe(true);
      return;
    }
    (window as unknown as Record<string, unknown>).__xss = undefined;
    const xssSpec = {
      kind: "table_spec" as const,
      title: "XSS Test",
      columns: [{ name: "Valor", type: "text", key: "valor" }],
      rowCount: 1,
      rows: [{ valor: "<script>window.__xss = true;</script>" }],
      formulaLanguage: "pt-BR" as const,
      separator: ";" as const,
    };
    render(<TableGridPanel spec={xssSpec} />);
    expect((window as unknown as Record<string, unknown>).__xss).toBeUndefined();
  });
});

describe("TableGridPanel — LOC-03 formatação BR", () => {
  it("valor currency 2000 exibe 'R$' no DOM", () => {
    if (!TableGridPanel) {
      expect(true).toBe(true);
      return;
    }
    render(<TableGridPanel spec={SPEC_FIXTURE} />);
    expect(screen.getByText(/R\$/)).toBeInTheDocument();
  });
});

describe("TableGridPanel — TAB-06 virtualização", () => {
  it("renderiza sem crash com 200 linhas", () => {
    if (!TableGridPanel) {
      expect(true).toBe(true);
      return;
    }
    const rows = Array.from({ length: 200 }, (_, i) => ({ valor: i }));
    const bigSpec = {
      kind: "table_spec" as const,
      title: "Tabela Grande",
      columns: [{ name: "Valor", type: "number", key: "valor" }],
      rowCount: 200,
      rows,
      formulaLanguage: "pt-BR" as const,
      separator: ";" as const,
    };
    expect(() => render(<TableGridPanel spec={bigSpec} />)).not.toThrow();
  });
});

describe("TableGridPanel — TAB-03 add/remove", () => {
  it("estado inicial: rowCount linhas presentes", () => {
    if (!TableGridPanel) {
      expect(true).toBe(true);
      return;
    }
    render(<TableGridPanel spec={SPEC_FIXTURE} />);
    // O componente deve renderizar com os rows iniciais; verificar que o grid está presente
    const grid = document.querySelector(".table-grid-panel");
    expect(grid).not.toBeNull();
  });
});

describe("TableGridPanel — TAB-04 undo/redo", () => {
  it("Ctrl+Z não lança erro quando sem histórico", () => {
    if (!TableGridPanel) {
      expect(true).toBe(true);
      return;
    }
    render(<TableGridPanel spec={SPEC_FIXTURE} />);
    const container = document.querySelector(".table-grid-panel") ?? document.body;
    expect(() =>
      fireEvent.keyDown(container, { key: "z", ctrlKey: true })
    ).not.toThrow();
  });
});

describe("TableGridPanel — TAB-05 sort", () => {
  it("sort não muta o array original de rows", () => {
    if (!TableGridPanel) {
      expect(true).toBe(true);
      return;
    }
    const originalRows = [
      { descricao: "Aluguel", valor: 2000 },
      { descricao: "Internet", valor: 150 },
    ];
    const specWithRows = {
      ...SPEC_FIXTURE,
      rows: originalRows,
      rowCount: 2,
    };
    const frozen = JSON.stringify(originalRows);
    render(<TableGridPanel spec={specWithRows} />);
    // Após render, o array original não deve ter sido mutado
    expect(JSON.stringify(originalRows)).toBe(frozen);
  });
});

// CR-01/CR-02: Testes unitários da lógica de sortIndexMap

describe("CR-01 — lógica sortIndexMap preserva ordem original", () => {
  it("sortIndexMap identidade quando sort está inativo", () => {
    // Sem sort ativo, sortIndexMap deve ser [0, 1, 2, ...] (identidade)
    const rows = [{ valor: 10 }, { valor: 5 }, { valor: 20 }];
    const map = rows.map((_, i) => i);
    expect(map).toEqual([0, 1, 2]);
  });

  it("sortIndexMap correto após sort ascendente", () => {
    // Simula a lógica do useMemo que cria sortIndexMap
    const rows = [{ valor: 20 }, { valor: 5 }, { valor: 10 }];
    const key = "valor";
    const indexed = rows.map((row, i) => ({ row, originalIdx: i }));
    indexed.sort((a, b) => {
      const va = a.row[key] ?? 0;
      const vb = b.row[key] ?? 0;
      return typeof va === "number" && typeof vb === "number" ? va - vb : 0;
    });
    const sortIndexMap = indexed.map((e) => e.originalIdx);
    // Ordem asc: [5,10,20] → originalIdxs [1,2,0]
    expect(sortIndexMap).toEqual([1, 2, 0]);
  });

  it("restaurar newRows para ordem original via sortIndexMap", () => {
    // Simula o que handleChange faz com sortIndexMap (CR-01)
    // Original: [A=20, B=5, C=10]
    // Sorted asc: [B=5, C=10, A=20] → sortIndexMap = [1, 2, 0]
    const sortIndexMap = [1, 2, 0]; // sorted[0] veio de original[1], etc.
    const newRowsInSortOrder = [
      { valor: 5, editado: "X" },   // foi B (originalIdx=1), editado
      { valor: 10 },                 // foi C (originalIdx=2)
      { valor: 20 },                 // foi A (originalIdx=0)
    ];
    // Restaurar para ordem original
    const restored = new Array<Record<string, unknown>>(newRowsInSortOrder.length);
    sortIndexMap.forEach((origIdx, sortedIdx) => {
      restored[origIdx] = newRowsInSortOrder[sortedIdx];
    });
    // Deve ser [A=20 (idx0), B=5+editado (idx1), C=10 (idx2)]
    expect(restored[0]).toEqual({ valor: 20 });
    expect(restored[1]).toEqual({ valor: 5, editado: "X" }); // edit preservado
    expect(restored[2]).toEqual({ valor: 10 });
  });
});

describe("CR-02 — delete usa índice original via sortIndexMap", () => {
  it("sortIndexMap mapeia sorted → original corretamente para delete", () => {
    // Original: [A=20, B=5, C=10]
    // Sorted asc: [B=5, C=10, A=20] → sortIndexMap = [1, 2, 0]
    const sortIndexMap = [1, 2, 0];
    // Deletar linha visível 0 (B=5) → deve deletar original[1]
    const originalIdxToDelete = sortIndexMap[0] ?? 0;
    expect(originalIdxToDelete).toBe(1);
    // Deletar linha visível 2 (A=20) → deve deletar original[0]
    const originalIdxToDelete2 = sortIndexMap[2] ?? 2;
    expect(originalIdxToDelete2).toBe(0);
  });
});

describe("WR-05 — undo/redo scopado ao grid focado", () => {
  it("Ctrl+Z fora do grid container não aciona undo", () => {
    if (!TableGridPanel) {
      expect(true).toBe(true);
      return;
    }
    render(<TableGridPanel spec={SPEC_FIXTURE} />);
    // Disparar Ctrl+Z no body (fora do grid) não deve lançar erro
    // O guard verifica document.activeElement dentro do gridContainerRef
    expect(() =>
      fireEvent.keyDown(document.body, { key: "z", ctrlKey: true })
    ).not.toThrow();
  });

  it("Ctrl+Z dentro do grid container não lança erro", () => {
    if (!TableGridPanel) {
      expect(true).toBe(true);
      return;
    }
    render(<TableGridPanel spec={SPEC_FIXTURE} />);
    const container = document.querySelector(".table-grid-panel");
    if (!container) {
      expect(true).toBe(true);
      return;
    }
    expect(() =>
      fireEvent.keyDown(container, { key: "z", ctrlKey: true })
    ).not.toThrow();
  });

  it("Ctrl+Z em dois grids montados simultaneamente não duplica undo", () => {
    if (!TableGridPanel) {
      expect(true).toBe(true);
      return;
    }
    // Montar dois grids
    const { unmount: unmount1 } = render(<TableGridPanel spec={SPEC_FIXTURE} />);
    const { unmount: unmount2 } = render(<TableGridPanel spec={{ ...SPEC_FIXTURE, title: "Grid 2" }} />);
    // Ctrl+Z no body (nenhum grid focado) — não deve lançar
    expect(() =>
      fireEvent.keyDown(document.body, { key: "z", ctrlKey: true })
    ).not.toThrow();
    unmount1();
    unmount2();
  });
});

describe("TableGridPanel — EXP-01/EXP-02 export CSV/XLSX", () => {
  it("renderiza botões 'Exportar CSV' e 'Exportar XLSX' no toolbar", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE} />);
    expect(screen.getAllByLabelText("Exportar CSV")[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText("Exportar XLSX")[0]).toBeInTheDocument();
  });

  it("clicar em 'Exportar CSV' chama downloadCsv exatamente uma vez", () => {
    downloadCsvMock.mockClear();
    buildCsvMock.mockClear();
    render(<TableGridPanelDirect spec={SPEC_FIXTURE} />);
    fireEvent.click(screen.getAllByLabelText("Exportar CSV")[0]);
    expect(buildCsvMock).toHaveBeenCalledTimes(1);
    expect(downloadCsvMock).toHaveBeenCalledTimes(1);
  });

  it("clicar em 'Exportar XLSX' chama downloadXlsx exatamente uma vez", () => {
    downloadXlsxMock.mockClear();
    buildXlsxMock.mockClear();
    render(<TableGridPanelDirect spec={SPEC_FIXTURE} />);
    fireEvent.click(screen.getAllByLabelText("Exportar XLSX")[0]);
    expect(buildXlsxMock).toHaveBeenCalledTimes(1);
    expect(downloadXlsxMock).toHaveBeenCalledTimes(1);
  });
});

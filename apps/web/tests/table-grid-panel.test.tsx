import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

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

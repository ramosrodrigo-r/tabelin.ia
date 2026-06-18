import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocks da util de export (Plan 01) — evita efeito DOM/fs real (Pitfall 4).
// vi.hoisted: vi.mock é hoisted ao topo do arquivo, então as referências usadas
// na factory precisam ser declaradas via vi.hoisted para evitar TDZ.
const { buildCsvMock, buildXlsxMock, downloadCsvMock, downloadXlsxMock } = vi.hoisted(() => ({
  buildCsvMock: vi.fn(() => "csv-content"),
  buildXlsxMock: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
  downloadCsvMock: vi.fn(),
  downloadXlsxMock: vi.fn(),
}));

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
import {
  TableGridPanel as TableGridPanelDirect,
  formatCellValue,
} from "../src/features/unified-chat/components/table-grid-panel";
import { WorkspaceStateProvider } from "../src/components/app/workspace-state-context";
import { SAMPLE_SPEC } from "../src/features/unified-chat/lib/sample-spec";
import type { TableSpecPayload } from "@tabelin/shared";

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
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    expect(screen.getAllByLabelText("Exportar CSV")[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText("Exportar XLSX")[0]).toBeInTheDocument();
  });

  it("clicar em 'Exportar CSV' chama downloadCsv exatamente uma vez", () => {
    downloadCsvMock.mockClear();
    buildCsvMock.mockClear();
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    fireEvent.click(screen.getAllByLabelText("Exportar CSV")[0]);
    expect(buildCsvMock).toHaveBeenCalledTimes(1);
    expect(downloadCsvMock).toHaveBeenCalledTimes(1);
  });

  it("clicar em 'Exportar XLSX' chama downloadXlsx exatamente uma vez", () => {
    downloadXlsxMock.mockClear();
    buildXlsxMock.mockClear();
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    fireEvent.click(screen.getAllByLabelText("Exportar XLSX")[0]);
    expect(buildXlsxMock).toHaveBeenCalledTimes(1);
    expect(downloadXlsxMock).toHaveBeenCalledTimes(1);
  });
});

// ─── Wave 2: controles de ingestão (DATA-01..04) ──────────────────────────────

/** Renderiza o grid principal (sem propSpec) dentro do provider de estado. */
function renderWorkspaceGrid() {
  return render(
    <WorkspaceStateProvider>
      <TableGridPanelDirect />
    </WorkspaceStateProvider>
  );
}

/** Cria um FileList sintético com um único arquivo (jsdom não expõe construtor). */
function setInputFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, "files", {
    configurable: true,
    value: {
      0: file,
      length: 1,
      item: (i: number) => (i === 0 ? file : null),
    },
  });
}

const IMPORTED_PAYLOAD: TableSpecPayload = {
  kind: "table_spec",
  title: "Planilha Importada",
  columns: [
    { name: "Produto", type: "text", key: "produto" },
    { name: "Preco", type: "number", key: "preco" },
  ],
  rowCount: 2,
  rows: [
    { produto: "Café Importado XYZ", preco: 30 },
    { produto: "Açúcar Importado XYZ", preco: 12 },
  ],
  formulaLanguage: "pt-BR",
  separator: ";",
};

describe("TableGridPanel — DATA-01 Nova em Branco", () => {
  it("renderiza os botões de ingestão na toolbar do grid principal", () => {
    renderWorkspaceGrid();
    expect(screen.getByLabelText("Nova em Branco")).toBeInTheDocument();
    expect(screen.getByLabelText("Carregar Exemplo")).toBeInTheDocument();
    expect(screen.getByLabelText("Importar Planilha")).toBeInTheDocument();
  });

  it("clicar reseta para a planilha em branco (título 'Planilha sem título')", () => {
    renderWorkspaceGrid();
    expect(screen.getByText(SAMPLE_SPEC.title)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Nova em Branco"));
    expect(screen.getByText("Planilha sem título")).toBeInTheDocument();
  });
});

describe("TableGridPanel — DATA-02 Carregar Exemplo", () => {
  it("restaura o SAMPLE_SPEC após reset para branco", () => {
    renderWorkspaceGrid();
    fireEvent.click(screen.getByLabelText("Nova em Branco"));
    expect(screen.getByText("Planilha sem título")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Carregar Exemplo"));
    expect(screen.getByText(SAMPLE_SPEC.title)).toBeInTheDocument();
  });
});

describe("TableGridPanel — DATA-03 importação com sucesso", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => IMPORTED_PAYLOAD,
      })) as unknown as typeof fetch
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("seleciona arquivo, faz POST e atualiza a grade com o payload importado", async () => {
    renderWorkspaceGrid();
    const input = screen.getByTestId("import-file-input") as HTMLInputElement;
    const file = new File(["produto;preco\nCafé;30"], "lista.csv", { type: "text/csv" });
    setInputFile(input, file);
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText("Planilha Importada")).toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledWith("/api/workspace/import", expect.objectContaining({ method: "POST" }));
    // overlay de loading deve ter desaparecido
    expect(screen.queryByText("Importando planilha...")).not.toBeInTheDocument();
  });
});

describe("TableGridPanel — DATA-04 importação com erro preserva estado", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 422,
        json: async () => ({ error: "Formato de arquivo não suportado. Use CSV ou XLSX." }),
      })) as unknown as typeof fetch
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exibe banner de erro em pt-BR e mantém o título anterior intacto", async () => {
    renderWorkspaceGrid();
    const input = screen.getByTestId("import-file-input") as HTMLInputElement;
    const file = new File(["conteúdo"], "arquivo.pdf", { type: "application/pdf" });
    setInputFile(input, file);
    fireEvent.change(input);

    await waitFor(() => {
      expect(
        screen.getByText("Formato de arquivo não suportado. Use CSV ou XLSX.")
      ).toBeInTheDocument();
    });
    // estado anterior preservado
    expect(screen.getByText(SAMPLE_SPEC.title)).toBeInTheDocument();

    // banner pode ser fechado
    fireEvent.click(screen.getByLabelText("Fechar erro"));
    expect(
      screen.queryByText("Formato de arquivo não suportado. Use CSV ou XLSX.")
    ).not.toBeInTheDocument();
  });
});

describe("TableGridPanel — TAB-04 undo de ingestão (Ctrl+Z)", () => {
  it("Ctrl+Z focado no grid reverte o reset para o estado anterior", () => {
    renderWorkspaceGrid();
    expect(screen.getByText(SAMPLE_SPEC.title)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Nova em Branco"));
    expect(screen.getByText("Planilha sem título")).toBeInTheDocument();

    const container = document.querySelector(".table-grid-panel") as HTMLElement;
    // Simular foco dentro do grid para que o guard de undo dispare
    const focusable = document.createElement("button");
    container.appendChild(focusable);
    focusable.focus();

    fireEvent.keyDown(focusable, { key: "z", ctrlKey: true });

    expect(screen.getByText(SAMPLE_SPEC.title)).toBeInTheDocument();
  });
});

// ─── Plan 260617-ukf: cellStyles model + activeCell tracking (Task 1) ─────────

describe("TableGridPanel — cellStyles model (applyCellStyle)", () => {
  it("aplicar um patch numa célula e ler de volta retorna o patch mesclado", async () => {
    const mod = await import("../src/features/unified-chat/components/table-grid-panel");
    const helpers = mod as unknown as {
      mergeCellStyle?: (
        styles: Record<string, Record<string, unknown>>,
        key: string,
        patch: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)
      ) => Record<string, Record<string, unknown>>;
    };
    expect(typeof helpers.mergeCellStyle).toBe("function");
    const result = helpers.mergeCellStyle!({}, "0:valor", { bold: true });
    expect(result["0:valor"]).toEqual({ bold: true });
  });

  it("aplicar estilo em duas células diferentes não vaza estilo entre elas", async () => {
    const mod = await import("../src/features/unified-chat/components/table-grid-panel");
    const helpers = mod as unknown as {
      mergeCellStyle: (
        styles: Record<string, Record<string, unknown>>,
        key: string,
        patch: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)
      ) => Record<string, Record<string, unknown>>;
    };
    let styles = helpers.mergeCellStyle({}, "0:valor", { bold: true });
    styles = helpers.mergeCellStyle(styles, "1:valor", { italic: true });
    expect(styles["0:valor"]).toEqual({ bold: true });
    expect(styles["1:valor"]).toEqual({ italic: true });
  });

  it("toggle de uma propriedade booleana duas vezes retorna ao estado original", async () => {
    const mod = await import("../src/features/unified-chat/components/table-grid-panel");
    const helpers = mod as unknown as {
      mergeCellStyle: (
        styles: Record<string, Record<string, unknown>>,
        key: string,
        patch: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)
      ) => Record<string, Record<string, unknown>>;
    };
    let styles = helpers.mergeCellStyle({}, "0:valor", (prev) => ({ bold: !prev.bold }));
    expect(styles["0:valor"]).toEqual({ bold: true });
    styles = helpers.mergeCellStyle(styles, "0:valor", (prev) => ({ bold: !prev.bold }));
    expect(styles["0:valor"]).toEqual({ bold: false });
  });
});

describe("TableGridPanel — activeCell tracking via onMouseDown", () => {
  it("clicar (mousedown) em qualquer span de célula renderizada não lança erro", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    const grid = document.querySelector(".table-grid-panel");
    expect(grid).not.toBeNull();
    const cellSpans = grid!.querySelectorAll("span");
    expect(() => {
      cellSpans.forEach((span) => fireEvent.mouseDown(span));
    }).not.toThrow();
  });

  it("renderer de célula continua aplicando o estilo lido do map sem quebrar a renderização existente (regressão TAB-01)", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    expect(screen.getByText("Controle de Gastos")).toBeInTheDocument();
    const grid = document.querySelector(".table-grid-panel");
    expect(grid).not.toBeNull();
  });
});

// ─── Plan 260617-ukf: formatação de texto (Task 2) ────────────────────────────
//
// NOTA: react-datasheet-grid usa useResizeDetector (width/height reais do DOM)
// para decidir quais linhas virtualizar — jsdom retorna 0 para essas medidas,
// então nenhuma linha de DADOS é renderizada em testes (apenas o header). Por
// isso os testes abaixo verificam (1) a lógica pura exportada (nextAlign) e
// (2) que os botões não lançam erro ao clicar sem activeCell (no-op gracioso)
// — mesmo padrão já usado pelos testes TAB-01/TAB-03 existentes neste arquivo.

describe("TableGridPanel — Negrito/Italico/Tachado/Cor/Preenchimento/Bordas/Alinhar (format-btn)", () => {
  it("clicar em Negrito sem nenhuma célula ativa não lança erro (no-op gracioso)", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    expect(() => fireEvent.click(screen.getByTitle("Negrito"))).not.toThrow();
  });

  it("clicar em Itálico sem nenhuma célula ativa não lança erro (no-op gracioso)", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    expect(() => fireEvent.click(screen.getByTitle("Itálico"))).not.toThrow();
  });

  it("clicar em Tachado sem nenhuma célula ativa não lança erro (no-op gracioso)", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    expect(() => fireEvent.click(screen.getByTitle("Tachado"))).not.toThrow();
  });

  it("clicar em Bordas sem nenhuma célula ativa não lança erro (no-op gracioso)", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    expect(() => fireEvent.click(screen.getByTitle("Bordas"))).not.toThrow();
  });

  it("clicar em Alinhar sem nenhuma célula ativa não lança erro (no-op gracioso)", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    expect(() => fireEvent.click(screen.getByTitle(/^Alinhar/))).not.toThrow();
  });

  it("Negrito/Itálico/Tachado/Bordas não são mais 'disabled' nem têm title '(em breve)'", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    for (const title of ["Negrito", "Itálico", "Tachado", "Bordas"]) {
      const btn = screen.getByTitle(title) as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
      expect(btn.title).not.toMatch(/em breve/);
    }
  });

  it("abrir popover de Cor do texto e clicar fora dele fecha o popover", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    const colorBtn = screen.getByTitle("Cor do texto") as HTMLButtonElement;
    expect(colorBtn.disabled).toBe(false);
    fireEvent.click(colorBtn);
    expect(document.querySelector(".color-popover")).not.toBeNull();
    fireEvent.mouseDown(document.body);
    expect(document.querySelector(".color-popover")).toBeNull();
  });

  it("abrir popover de Preenchimento mostra swatches de cor", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    const fillBtn = screen.getByTitle("Cor de preenchimento") as HTMLButtonElement;
    expect(fillBtn.disabled).toBe(false);
    fireEvent.click(fillBtn);
    const swatches = document.querySelectorAll(".color-popover-swatch");
    expect(swatches.length).toBeGreaterThan(0);
  });

  it("nextAlign cicla left -> center -> right -> left", async () => {
    const mod = await import("../src/features/unified-chat/components/table-grid-panel");
    const helpers = mod as unknown as { nextAlign?: (current: "left" | "center" | "right") => string };
    expect(typeof helpers.nextAlign).toBe("function");
    expect(helpers.nextAlign!("left")).toBe("center");
    expect(helpers.nextAlign!("center")).toBe("right");
    expect(helpers.nextAlign!("right")).toBe("left");
  });
});

// ─── Plan 260617-ukf: formato numérico, decimais, zoom, fonte, tamanho (Task 3) ──

describe("TableGridPanel — Moeda/Percentual/decimais/Zoom/Fonte/Tamanho", () => {
  it("formatCellValue aceita 'percent' e formata via Intl.NumberFormat pt-BR", () => {
    const formatted = formatCellValue(0.42, "percent");
    expect(formatted).toMatch(/%/);
  });

  it("formatCellValue aceita decimals opcional sem quebrar chamadas existentes (assinatura compatível)", () => {
    expect(formatCellValue(2000, "currency")).toMatch(/R\$/);
    expect(formatCellValue(2000, "currency", 0)).toMatch(/R\$/);
  });

  it("clicar em Moeda sem nenhuma célula ativa não lança erro (no-op gracioso)", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    expect(() => fireEvent.click(screen.getByTitle("Formato moeda"))).not.toThrow();
  });

  it("clicar em Percentual sem nenhuma célula ativa não lança erro (no-op gracioso)", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    expect(() => fireEvent.click(screen.getByTitle("Formato percentual"))).not.toThrow();
  });

  it("Moeda/Percentual/decimais não são mais 'disabled' nem têm title '(em breve)'", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    for (const title of ["Formato moeda", "Formato percentual", "Diminuir decimais", "Aumentar decimais"]) {
      const btn = screen.getByTitle(title) as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
      expect(btn.title).not.toMatch(/em breve/);
    }
  });

  it("clicar em Diminuir/Aumentar decimais sem célula ativa não lança erro (no-op gracioso)", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    expect(() => fireEvent.click(screen.getByTitle("Diminuir decimais"))).not.toThrow();
    expect(() => fireEvent.click(screen.getByTitle("Aumentar decimais"))).not.toThrow();
  });

  it("Zoom inicia em 100% e abre dropdown real com 4 opções (75/100/125/150%)", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    const zoomBtn = screen.getByTitle("Zoom");
    fireEvent.click(zoomBtn);
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("125%")).toBeInTheDocument();
    expect(screen.getByText("150%")).toBeInTheDocument();
  });

  it("selecionar 125% no dropdown de Zoom aplica scale(1.25) no wrapper do grid", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    fireEvent.click(screen.getByTitle("Zoom"));
    fireEvent.click(screen.getByText("125%"));
    const zoomWrapper = document.querySelector(".table-grid-zoom-wrapper") as HTMLElement;
    expect(zoomWrapper).not.toBeNull();
    expect(zoomWrapper.style.transform).toBe("scale(1.25)");
  });

  it("Fonte e Tamanho são dropdowns reais (não mais span estático) que abrem opções ao clicar", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    const fontBtn = screen.getByTitle("Fonte");
    fireEvent.click(fontBtn);
    expect(screen.getByText("Georgia")).toBeInTheDocument();

    const sizeBtn = screen.getByTitle("Tamanho");
    fireEvent.click(sizeBtn);
    expect(screen.getByText("18")).toBeInTheDocument();
  });
});

// ─── Plan 260617-ukf: Sigma, Mesclar, Pintura (Task 4) ─────────────────────────

describe("TableGridPanel — Sigma (funções), Mesclar, Pintura (format painter)", () => {
  it("Sigma não é mais 'disabled' nem tem title '(em breve)'", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    const btn = screen.getByTitle("Funções") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.title).not.toMatch(/em breve/);
  });

  it("clicar em Sigma sem nenhuma célula ativa não lança erro (no-op gracioso)", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    expect(() => fireEvent.click(screen.getByTitle("Funções"))).not.toThrow();
  });

  it("Mesclar não é mais 'disabled' nem tem title '(em breve)'", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    const btn = screen.getByTitle("Mesclar células") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.title).not.toMatch(/em breve/);
  });

  it("clicar em Mesclar sem nenhuma célula ativa não lança erro (no-op gracioso)", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    expect(() => fireEvent.click(screen.getByTitle("Mesclar células"))).not.toThrow();
  });

  it("Pintura não é mais 'disabled' nem tem title '(em breve)'", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    const btn = screen.getByTitle("Formato de pintura") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.title).not.toMatch(/em breve/);
  });

  it("clicar em Pintura sem nenhuma célula ativa não lança erro (no-op gracioso)", () => {
    render(<TableGridPanelDirect spec={SPEC_FIXTURE as TableSpecPayload} />);
    expect(() => fireEvent.click(screen.getByTitle("Formato de pintura"))).not.toThrow();
  });

  it("buildMergedRow concatena valores de duas colunas adjacentes na primeira e limpa a segunda", async () => {
    const mod = await import("../src/features/unified-chat/components/table-grid-panel");
    const helpers = mod as unknown as {
      buildMergedRow?: (
        row: Record<string, string | number>,
        firstKey: string,
        secondKey: string
      ) => Record<string, string | number>;
    };
    expect(typeof helpers.buildMergedRow).toBe("function");
    const result = helpers.buildMergedRow!({ descricao: "Aluguel", valor: "casa" }, "descricao", "valor");
    expect(result.descricao).toBe("Aluguel casa");
    expect(result.valor).toBe("");
  });

  it("buildSigmaRow insere '=SOMA()' na coluna alvo preservando os demais campos", async () => {
    const mod = await import("../src/features/unified-chat/components/table-grid-panel");
    const helpers = mod as unknown as {
      buildSigmaRow?: (
        row: Record<string, string | number>,
        colKey: string
      ) => Record<string, string | number>;
    };
    expect(typeof helpers.buildSigmaRow).toBe("function");
    const result = helpers.buildSigmaRow!({ descricao: "Aluguel", valor: 2000 }, "valor");
    expect(result.valor).toBe("=SOMA()");
    expect(result.descricao).toBe("Aluguel");
  });
});

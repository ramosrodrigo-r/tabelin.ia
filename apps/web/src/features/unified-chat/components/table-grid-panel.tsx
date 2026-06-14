"use client";

import { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { DynamicDataSheetGrid, keyColumn, textColumn } from "react-datasheet-grid";
import "react-datasheet-grid/dist/style.css";

import { ArrowDown, ArrowUp, X } from "lucide-react";

import { type TableColumn, type TableSpecPayload, tableSpecPayloadSchema } from "@tabelin/shared";

import { WorkspaceStateContext } from "@/components/app/workspace-state-context";
import { type RowData, useFormulaEngine } from "../hooks/use-formula-engine";
import { buildCsv, buildXlsx, downloadCsv, downloadXlsx } from "../lib/table-export";

// ─── Tipos locais ──────────────────────────────────────────────────────────────

type GridState = { rows: RowData[]; columns: TableColumn[] };

type Action = { type: "SET"; newState: GridState } | { type: "UNDO" } | { type: "REDO" };

type HistoryState = {
  past: GridState[];
  present: GridState;
  future: GridState[];
};

// ─── historyReducer (puro, module-scope) ──────────────────────────────────────

function historyReducer(state: HistoryState, action: Action): HistoryState {
  switch (action.type) {
    case "SET":
      return {
        past: [...state.past.slice(-49), state.present], // cap 50 entradas
        present: action.newState,
        future: [],
      };
    case "UNDO":
      if (state.past.length === 0) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
      };
    case "REDO":
      if (state.future.length === 0) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
      };
    default: {
      const _exhaustive: never = action;
      return state;
    }
  }
}

// ─── formatCellValue (pura, module-scope) ─────────────────────────────────────

/**
 * Formata valor de célula para exibição (display-only — Pitfall 2).
 * Nunca retorna JSX — apenas string (SEC-05, D-07).
 */
export function formatCellValue(value: string | number, type: string): string {
  if (type === "currency" && typeof value === "number") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }
  if (type === "date" && value !== "" && value !== null && value !== undefined) {
    const d = new Date(String(value));
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(d);
    }
  }
  return String(value);
}

// ─── ERROR_TOOLTIPS ────────────────────────────────────────────────────────────

const ERROR_TOOLTIPS: Record<string, string> = {
  "#NAME?": "Função não reconhecida. Verifique o nome em português (ex.: SOMA, SE, PROCV).",
  "#REF!": "Referência de célula inválida ou fora dos limites da tabela.",
  "#DIV/0!": "Divisão por zero. O divisor dessa fórmula resultou em zero.",
  "#CIRC!": "Referência circular detectada. A fórmula referencia a própria célula.",
  "#ERRO!": "Erro ao calcular esta fórmula. Verifique os argumentos.",
  // IN-03: adicionar códigos que mapFormulaError pode retornar mas não tinham tooltip
  "#N/A": "Valor não encontrado. PROCV/PROCH não encontrou correspondência.",
  "#VALUE!": "Tipo de valor inválido para esta fórmula.",
  "#NOME?": "Função não reconhecida (alias pt-BR de #NAME?).",
};

const ERROR_CODES = new Set(Object.keys(ERROR_TOOLTIPS));

function isErrorCode(value: string | number): boolean {
  return typeof value === "string" && ERROR_CODES.has(value);
}

// ─── slugifyTitle ──────────────────────────────────────────────────────────────

/**
 * Normaliza `spec.title` para um nome de arquivo seguro: minúsculas, sem
 * acentos, espaços viram `-`, e caracteres inválidos são removidos.
 * Usado como base do nome do arquivo exportado (CSV/XLSX).
 */
export function slugifyTitle(title: string): string {
  const normalized = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return normalized || "tabela";
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function TableGridPanel({ spec: propSpec }: { spec?: TableSpecPayload }) {
  const context = useContext(WorkspaceStateContext);

  // 1. Initial / Active Spec
  const activeSpec = propSpec ?? context!.spec;

  // ── Estado de ingestão (importação de planilha) ──
  const [loading, setLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derivar chaves de colunas a partir do spec
  const initialColumns: TableColumn[] = useMemo(
    () =>
      activeSpec.columns.map((col) => ({
        ...col,
        key: col.key ?? col.name.toLowerCase().replace(/\s+/g, "_"),
      })),
    [activeSpec.columns]
  );

  // ── Estado de histórico local (só usado se propSpec for passado) ──
  const [localHistoryState, localDispatch] = useReducer(historyReducer, {
    past: [],
    present: {
      rows: (activeSpec.rows ?? []) as RowData[],
      columns: initialColumns,
    },
    future: [],
  });

  // ── Determinar Rows, Columns, Separator com base na presença de propSpec ──
  const currentRows = propSpec ? localHistoryState.present.rows : context!.state.rows;
  const currentColumns = propSpec ? localHistoryState.present.columns : context!.state.columns;
  const currentSeparator = activeSpec.separator ?? ";";

  // ── Função de dispatch unificada ──
  const dispatch = useCallback(
    (action: Action) => {
      if (propSpec) {
        localDispatch(action);
      } else {
        if (action.type === "SET") {
          context!.updateState({
            rows: action.newState.rows,
            columns: action.newState.columns,
            title: activeSpec.title,
            separator: currentSeparator,
          });
        }
      }
    },
    [propSpec, context, activeSpec.title, currentSeparator]
  );

  // ── Motor de fórmulas — displayRows derivado, nunca armazenado (Pitfall 2) ──
  const { displayRows } = useFormulaEngine(
    currentRows,
    currentColumns,
    currentSeparator
  );

  // ── Sort state ──
  const [sortState, setSortState] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  // ── sortedRows + sortIndexMap ──
  const { sortedRows, sortIndexMap } = useMemo(() => {
    if (!sortState) {
      return {
        sortedRows: displayRows,
        sortIndexMap: displayRows.map((_, i) => i),
      };
    }
    const indexed = displayRows.map((row, i) => ({ row, originalIdx: i }));
    indexed.sort((a, b) => {
      const va = a.row[sortState.key] ?? "";
      const vb = b.row[sortState.key] ?? "";
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "pt-BR");
      return sortState.dir === "asc" ? cmp : -cmp;
    });
    return {
      sortedRows: indexed.map((e) => e.row),
      sortIndexMap: indexed.map((e) => e.originalIdx),
    };
  }, [displayRows, sortState]);

  // ── Ref do container do grid ──
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // ── Handlers ──

  const handleSortClick = useCallback((key: string) => {
    setSortState((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }, []);

  const handleChange = useCallback(
    (newRows: RowData[]) => {
      let rowsInOriginalOrder: RowData[];
      if (sortState) {
        const restored = new Array<RowData>(newRows.length);
        sortIndexMap.forEach((origIdx, sortedIdx) => {
          restored[origIdx] = newRows[sortedIdx];
        });
        rowsInOriginalOrder = restored;
        setSortState(null);
      } else {
        rowsInOriginalOrder = newRows;
      }
      dispatch({
        type: "SET",
        newState: { rows: rowsInOriginalOrder, columns: currentColumns },
      });
    },
    [currentColumns, sortState, sortIndexMap, dispatch]
  );

  const addRow = useCallback(() => {
    if (currentRows.length >= 200) return;
    const newRow: RowData = {};
    currentColumns.forEach((c) => {
      newRow[c.key!] = "";
    });
    dispatch({
      type: "SET",
      newState: {
        rows: [...currentRows, newRow],
        columns: currentColumns,
      },
    });
  }, [currentRows, currentColumns, dispatch]);

  const addColumn = useCallback(() => {
    if (currentColumns.length >= 26) return;
    const newKey = `coluna_${Date.now()}`;
    dispatch({
      type: "SET",
      newState: {
        rows: currentRows.map((r) => ({ ...r, [newKey]: "" })),
        columns: [
          ...currentColumns,
          { name: "Nova Coluna", type: "text" as const, key: newKey },
        ],
      },
    });
  }, [currentRows, currentColumns, dispatch]);

  const removeColumn = useCallback(
    (key: string) => {
      if (currentColumns.length <= 1) return;
      dispatch({
        type: "SET",
        newState: {
          rows: currentRows.map((r) => {
            const { [key]: _removed, ...rest } = r;
            return rest;
          }),
          columns: currentColumns.filter((c) => c.key !== key),
        },
      });
    },
    [currentRows, currentColumns, dispatch]
  );

  const removeRow = useCallback(
    (index: number) => {
      dispatch({
        type: "SET",
        newState: {
          rows: currentRows.filter((_, i) => i !== index),
          columns: currentColumns,
        },
      });
    },
    [currentRows, currentColumns, dispatch]
  );

  // ── Undo/redo via Ctrl+Z / Ctrl+Y (TAB-04) ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!gridContainerRef.current?.contains(document.activeElement)) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (propSpec) {
          localDispatch({ type: "UNDO" });
        } else {
          context!.undo();
        }
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        if (propSpec) {
          localDispatch({ type: "REDO" });
        } else {
          context!.redo();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [propSpec, context]);

  // ── Colunas do DSG ──
  const dsgColumns = useMemo(() => {
    const dataCols = currentColumns.map((col) => {
      const colKey = col.key!;
      const colType = col.type;
      const isFormula = colType === "formula";

      return {
        ...keyColumn(colKey, textColumn),
        title: (
          <div
            className="col-header"
            data-sort={sortState?.key === colKey ? sortState.dir : undefined}
            onClick={() => handleSortClick(colKey)}
          >
            {col.name}
            {sortState?.key === colKey && sortState.dir === "asc" && <ArrowUp size={12} />}
            {sortState?.key === colKey && sortState.dir === "desc" && <ArrowDown size={12} />}
            {currentColumns.length > 1 && (
              <button
                className="col-header-remove"
                type="button"
                aria-label={`Remover coluna ${col.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeColumn(colKey);
                }}
              >
                Remover
              </button>
            )}
          </div>
        ),
        disabled: isFormula ? () => true : undefined,
        component: ({
          rowData,
          rowIndex,
        }: {
          rowData: RowData;
          rowIndex: number;
          columnIndex: number;
          active: boolean;
          focus: boolean;
          disabled: boolean;
          columnData: unknown;
          setRowData: (row: RowData) => void;
          stopEditing: () => void;
          insertRowBelow: () => void;
          duplicateRow: () => void;
          deleteRow: () => void;
          getContextMenuItems: () => unknown[];
        }) => {
          const displayRow = sortedRows[rowIndex] ?? rowData;
          const rawValue = displayRow[colKey] ?? "";
          const displayValue = isFormula ? rawValue : (rowData[colKey] ?? "");

          if (isErrorCode(displayValue)) {
            return (
              <span
                className="cell-error"
                title={ERROR_TOOLTIPS[String(displayValue)] ?? "Erro"}
              >
                {String(displayValue)}
              </span>
            );
          }

          const formatted = formatCellValue(displayValue, colType);
          return <span>{formatted}</span>;
        },
      };
    });

    const deleteColComponent = ({
      rowIndex,
    }: {
      rowData: RowData;
      rowIndex: number;
      columnIndex: number;
      active: boolean;
      focus: boolean;
      disabled: boolean;
      columnData: unknown;
      setRowData: (row: RowData) => void;
      stopEditing: () => void;
      insertRowBelow: () => void;
      duplicateRow: () => void;
      deleteRow: () => void;
      getContextMenuItems: () => unknown[];
    }) => (
      <button
        type="button"
        aria-label={`Remover linha ${rowIndex + 1}`}
        onClick={() => {
          const originalIdx = sortIndexMap[rowIndex] ?? rowIndex;
          removeRow(originalIdx);
        }}
        style={{
          background: "none",
          border: 0,
          cursor: "pointer",
          color: "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <X size={14} />
      </button>
    );

    return {
      columns: dataCols,
      stickyRightColumn: {
        component: deleteColComponent,
        title: "",
        width: 36,
        minWidth: 36,
        maxWidth: 36,
      },
    };
  }, [currentColumns, sortState, sortedRows, sortIndexMap, handleSortClick, removeColumn, removeRow]);

  // ── Export CSV/XLSX ──
  const handleExportCsv = useCallback(() => {
    const slug = slugifyTitle(activeSpec.title);
    const csv = buildCsv(currentColumns, displayRows);
    downloadCsv(csv, `${slug}.csv`);
  }, [currentColumns, displayRows, activeSpec.title]);

  const handleExportXlsx = useCallback(() => {
    const slug = slugifyTitle(activeSpec.title);
    const wb = buildXlsx(currentColumns, displayRows);
    downloadXlsx(wb, `${slug}.xlsx`);
  }, [currentColumns, displayRows, activeSpec.title]);

  const createRow = useCallback((): RowData => {
    const newRow: RowData = {};
    currentColumns.forEach((c) => {
      newRow[c.key!] = "";
    });
    return newRow;
  }, [currentColumns]);

  // ── Controles de ingestão (Nova em Branco / Carregar Exemplo / Importar) ──

  const handleNewBlank = useCallback(() => {
    setImportError(null);
    context?.resetToBlank();
  }, [context]);

  const handleLoadSample = useCallback(() => {
    setImportError(null);
    context?.resetToSeed();
  }, [context]);

  const handleImportClick = useCallback(() => {
    setImportError(null);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const file = input.files?.[0];
      if (!file) return;

      setLoading(true);
      setImportError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/workspace/import", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          let message = "Falha ao importar a planilha. Tente novamente.";
          try {
            const json = (await response.json()) as { error?: string };
            if (json?.error) message = json.error;
          } catch {
            // resposta sem JSON — mantém o fallback
          }
          setImportError(message);
          return;
        }

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          setImportError("Resposta inválida do servidor.");
          return;
        }

        const parsed = tableSpecPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          setImportError("Planilha importada em formato inválido.");
          return;
        }
        context?.setSpec(parsed.data);
      } catch {
        setImportError("Não foi possível importar a planilha. Verifique sua conexão e tente novamente.");
      } finally {
        setLoading(false);
        // Limpar o seletor para permitir reimportar o mesmo arquivo
        input.value = "";
      }
    },
    [context]
  );

  const rowsAtLimit = currentRows.length >= 200;
  const colsAtLimit = currentColumns.length >= 26;

  return (
    <div className="assistant-card" aria-label={`Tabela: ${activeSpec.title}`}>
      <div className="output-header">
        <h2>{activeSpec.title}</h2>
      </div>

      {importError && (
        <div className="table-grid-error-banner" role="alert">
          <span className="table-grid-error-banner-message">{importError}</span>
          <button
            className="table-grid-error-banner-close"
            type="button"
            aria-label="Fechar erro"
            onClick={() => setImportError(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="table-grid-toolbar">
        {!propSpec && (
          <>
            <button
              className="ghost-button"
              type="button"
              aria-label="Nova em Branco"
              onClick={handleNewBlank}
            >
              Nova em Branco
            </button>
            <button
              className="ghost-button"
              type="button"
              aria-label="Carregar Exemplo"
              onClick={handleLoadSample}
            >
              Carregar Exemplo
            </button>
            <button
              className="ghost-button"
              type="button"
              aria-label="Importar Planilha"
              onClick={handleImportClick}
            >
              Importar Planilha
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display: "none" }}
              aria-hidden="true"
              data-testid="import-file-input"
              onChange={handleFileChange}
            />
          </>
        )}
        <button
          className="ghost-button"
          type="button"
          aria-label="Adicionar linha"
          disabled={rowsAtLimit}
          title={rowsAtLimit ? "Limite de 200 linhas atingido." : undefined}
          onClick={addRow}
        >
          + Linha
        </button>
        <button
          className="ghost-button"
          type="button"
          aria-label="Adicionar coluna"
          disabled={colsAtLimit}
          title={colsAtLimit ? "Limite de 26 colunas atingido." : undefined}
          onClick={addColumn}
        >
          + Coluna
        </button>
        <div className="table-grid-toolbar-spacer" />
        <button
          className="ghost-button"
          type="button"
          aria-label="Exportar CSV"
          onClick={handleExportCsv}
        >
          Exportar CSV
        </button>
        <button
          className="ghost-button"
          type="button"
          aria-label="Exportar XLSX"
          onClick={handleExportXlsx}
        >
          Exportar XLSX
        </button>
      </div>

      <div
        className="table-grid-panel"
        ref={gridContainerRef}
        style={{ position: "relative" }}
      >
        {loading && (
          <div
            className="table-grid-loading-overlay"
            role="status"
            aria-live="polite"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              background: "rgba(255, 255, 255, 0.75)",
              zIndex: 10,
            }}
          >
            <span className="table-grid-loading-spinner" aria-hidden="true" />
            <span>Importando planilha...</span>
          </div>
        )}
        <DynamicDataSheetGrid
          value={sortedRows}
          onChange={handleChange}
          columns={dsgColumns.columns}
          createRow={createRow}
          stickyRightColumn={dsgColumns.stickyRightColumn}
          height={600}
        />
      </div>
    </div>
  );
}

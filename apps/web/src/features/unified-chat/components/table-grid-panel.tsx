"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { DynamicDataSheetGrid, keyColumn, textColumn } from "react-datasheet-grid";
import "react-datasheet-grid/dist/style.css";

import { ArrowDown, ArrowUp, X } from "lucide-react";

import type { TableColumn, TableSpecPayload } from "@tabelin/shared";

import { type RowData, useFormulaEngine } from "../hooks/use-formula-engine";

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

// ─── Componente principal ──────────────────────────────────────────────────────

export function TableGridPanel({ spec }: { spec: TableSpecPayload }) {
  // Derivar chaves de colunas a partir do spec
  const initialColumns: TableColumn[] = useMemo(
    () =>
      spec.columns.map((col) => ({
        ...col,
        key: col.key ?? col.name.toLowerCase().replace(/\s+/g, "_"),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Inicialização única — spec não muda durante o ciclo de vida do grid
  );

  // ── Estado de histórico (undo/redo) ──
  const [historyState, dispatch] = useReducer(historyReducer, {
    past: [],
    present: {
      rows: (spec.rows ?? []) as RowData[],
      columns: initialColumns,
    },
    future: [],
  });

  // ── Motor de fórmulas — displayRows derivado, nunca armazenado (Pitfall 2) ──
  const { displayRows } = useFormulaEngine(
    historyState.present.rows,
    historyState.present.columns,
    spec.separator ?? ";"
  );

  // ── Sort state ──
  const [sortState, setSortState] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  // ── sortedRows + sortIndexMap — Pitfall 3: [...rows].sort() nunca muta original ──
  // sortIndexMap[sortedIdx] = originalIdx — permite reverter edição e delete para ordem original
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

  // ── Ref do container do grid (WR-05: scopar undo/redo ao grid focado) ──
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
      // CR-01: quando sort está ativo, newRows chega em ordem do sort.
      // Usar sortIndexMap para restaurar a ordem original antes do dispatch —
      // assim o estado canônico nunca é corrompido pelo sort.
      let rowsInOriginalOrder: RowData[];
      if (sortState) {
        // Reconstrói o array na ordem original usando o mapa sort→original
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
        newState: { rows: rowsInOriginalOrder, columns: historyState.present.columns },
      });
    },
    [historyState.present.columns, sortState, sortIndexMap]
  );

  const addRow = useCallback(() => {
    if (historyState.present.rows.length >= 200) return; // TAB-06
    const newRow: RowData = {};
    historyState.present.columns.forEach((c) => {
      newRow[c.key!] = "";
    });
    dispatch({
      type: "SET",
      newState: {
        rows: [...historyState.present.rows, newRow],
        columns: historyState.present.columns,
      },
    });
  }, [historyState.present]);

  const addColumn = useCallback(() => {
    if (historyState.present.columns.length >= 26) return; // TAB-06
    const newKey = `coluna_${Date.now()}`;
    dispatch({
      type: "SET",
      newState: {
        rows: historyState.present.rows.map((r) => ({ ...r, [newKey]: "" })),
        columns: [
          ...historyState.present.columns,
          { name: "Nova Coluna", type: "text" as const, key: newKey },
        ],
      },
    });
  }, [historyState.present]);

  const removeColumn = useCallback(
    (key: string) => {
      dispatch({
        type: "SET",
        newState: {
          rows: historyState.present.rows.map((r) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [key]: _removed, ...rest } = r;
            return rest;
          }),
          columns: historyState.present.columns.filter((c) => c.key !== key),
        },
      });
    },
    [historyState.present]
  );

  const removeRow = useCallback(
    (index: number) => {
      dispatch({
        type: "SET",
        newState: {
          rows: historyState.present.rows.filter((_, i) => i !== index),
          columns: historyState.present.columns,
        },
      });
    },
    [historyState.present]
  );

  // ── Undo/redo via Ctrl+Z / Ctrl+Y (TAB-04) ──
  // WR-05: listener no window guardado por foco-dentro do container — evita
  // disparar undo em todos os grids montados e em inputs de texto da página.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Só processa se o foco estiver dentro do container deste grid
      if (!gridContainerRef.current?.contains(document.activeElement)) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        dispatch({ type: "REDO" });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Colunas do DSG — Pitfall 4: useMemo obrigatório ──
  const dsgColumns = useMemo(() => {
    const dataCols = historyState.present.columns.map((col) => {
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
          </div>
        ),
        // Células formula são read-only (D-06, TAB-01)
        disabled: isFormula ? () => true : undefined,
        // Renderizador customizado de célula (SEC-05 — apenas textContent via React children)
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
          // Para colunas formula: exibir displayRows (calculado), não rawRows
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

          // Formatar para exibição — NUNCA dangerouslySetInnerHTML (SEC-05)
          const formatted = formatCellValue(displayValue, colType);
          return <span>{formatted}</span>;
        },
      };
    });

    // stickyRightColumn para remoção de linha (TAB-03)
    // CR-02: usar apenas removeRow com o índice original (sortIndexMap[rowIndex]).
    // Não chamar dsgDeleteRow() — isso causaria double-dispatch e usaria rowIndex
    // como índice no array original (errado quando sort está ativo).
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
          // Mapeia índice sorted → índice original para garantir remoção correta
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
  }, [historyState.present.columns, sortState, sortedRows, sortIndexMap, handleSortClick, removeColumn, removeRow]);

  const createRow = useCallback((): RowData => {
    const newRow: RowData = {};
    historyState.present.columns.forEach((c) => {
      newRow[c.key!] = "";
    });
    return newRow;
  }, [historyState.present.columns]);

  const rowsAtLimit = historyState.present.rows.length >= 200;
  const colsAtLimit = historyState.present.columns.length >= 26;

  return (
    <div className="assistant-card" aria-label={`Tabela: ${spec.title}`}>
      <div className="output-header">
        <h2>{spec.title}</h2>
      </div>

      <div className="table-grid-toolbar">
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
        {/* Slot reservado para export Phase 15 */}
        <div className="table-grid-toolbar-spacer" />
      </div>

      <div className="table-grid-panel" ref={gridContainerRef}>
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

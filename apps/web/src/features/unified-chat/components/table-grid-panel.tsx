"use client";

import { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { DynamicDataSheetGrid, keyColumn, textColumn } from "react-datasheet-grid";
import "react-datasheet-grid/dist/style.css";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bold,
  Check,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Columns2,
  DollarSign,
  Filter,
  Italic,
  LayoutGrid,
  Layers,
  Merge,
  Paintbrush,
  PaintBucket,
  Percent,
  Plus,
  Redo2,
  Share2,
  Sigma,
  Strikethrough,
  Undo2,
  Type,
  X,
} from "lucide-react";

import { type TableColumn, type TableSpecPayload, tableSpecPayloadSchema } from "@tabelin/shared";

import { WorkspaceStateContext } from "@/components/app/workspace-state-context";
import { type RowData, useFormulaEngine } from "../hooks/use-formula-engine";
import { buildCsv, buildXlsx, downloadCsv, downloadXlsx } from "../lib/table-export";

// ─── Tipos locais ──────────────────────────────────────────────────────────────

type GridState = { rows: RowData[]; columns: TableColumn[] };

type Action = { type: "SET"; newState: GridState } | { type: "UNDO" } | { type: "REDO" };

/**
 * Estilo visual de uma célula individual. Vive em estado LOCAL ao componente
 * (`cellStyles`) — não entra no `historyReducer` (undo/redo) nem no
 * `WorkspaceStateContext`/auto-save (decisão de escopo documentada no PLAN).
 */
export type CellStyle = {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  color?: string;
  background?: string;
  align?: "left" | "center" | "right";
  border?: boolean;
  fontFamily?: string;
  fontSize?: number;
  numberFormat?: "currency" | "percent" | undefined;
  decimals?: number;
};

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
      void _exhaustive;
      return state;
    }
  }
}

// ─── formatCellValue (pura, module-scope) ─────────────────────────────────────

/**
 * Formata valor de célula para exibição (display-only — Pitfall 2).
 * Nunca retorna JSX — apenas string (SEC-05, D-07).
 *
 * `decimals` é um parâmetro opcional adicional (Task 3) — não quebra
 * chamadas existentes que passam só (value, type). Aplica
 * minimumFractionDigits/maximumFractionDigits quando definido, para
 * "currency"/"percent"/"number".
 */
export function formatCellValue(value: string | number, type: string, decimals?: number): string {
  if (type === "currency" && typeof value === "number") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      ...(decimals !== undefined
        ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
        : {}),
    }).format(value);
  }
  if (type === "percent" && typeof value === "number") {
    return new Intl.NumberFormat("pt-BR", {
      style: "percent",
      ...(decimals !== undefined
        ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
        : {}),
    }).format(value);
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
  if (decimals !== undefined && typeof value === "number") {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }
  return String(value);
}

// ─── mergeCellStyle (pura, module-scope) ──────────────────────────────────────

/**
 * Faz merge imutável de um patch de `CellStyle` na chave `key` de um map de
 * estilos. Aceita um patch direto ou uma função `(prev) => patch` (para
 * comportamento de toggle, ex.: `(prev) => ({ bold: !prev.bold })`).
 * Nunca muta `styles` — retorna um novo objeto (Pitfall 2: mesmo padrão de
 * `recalcAll`/`historyReducer`, que nunca mutam o estado anterior).
 */
export function mergeCellStyle(
  styles: Record<string, CellStyle>,
  key: string,
  patch: Partial<CellStyle> | ((prev: CellStyle) => Partial<CellStyle>)
): Record<string, CellStyle> {
  const prev = styles[key] ?? {};
  const resolvedPatch = typeof patch === "function" ? patch(prev) : patch;
  return {
    ...styles,
    [key]: { ...prev, ...resolvedPatch },
  };
}

/** Cicla o alinhamento de célula: left -> center -> right -> left. */
export function nextAlign(current: "left" | "center" | "right"): "left" | "center" | "right" {
  if (current === "left") return "center";
  if (current === "center") return "right";
  return "left";
}

/** Paleta fixa de cores para os popovers de Cor do texto / Preenchimento (T-260617-01). */
export const COLOR_SWATCHES = [
  "#000000",
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#7c3aed",
  "#6b7280",
  "#92400e",
];

/**
 * Constrói a nova versão de `row` com `"=SOMA()"` inserido em `colKey`,
 * preservando os demais campos (Task 4 — Sigma). Não muta `row`.
 */
export function buildSigmaRow(
  row: Record<string, string | number>,
  colKey: string
): Record<string, string | number> {
  return { ...row, [colKey]: "=SOMA()" };
}

/**
 * Mescla duas células ADJACENTES da mesma linha: concatena `row[firstKey]` e
 * `row[secondKey]` (trim + espaço, ignorando vazios) em `firstKey` e limpa
 * `secondKey`. Não muta `row` (Task 4 — Mesclar células).
 */
export function buildMergedRow(
  row: Record<string, string | number>,
  firstKey: string,
  secondKey: string
): Record<string, string | number> {
  const a = String(row[firstKey] ?? "").trim();
  const b = String(row[secondKey] ?? "").trim();
  const merged = [a, b].filter(Boolean).join(" ");
  return { ...row, [firstKey]: merged, [secondKey]: "" };
}

// ─── ERROR_TOOLTIPS ────────────────────────────────────────────────────────────

const ERROR_TOOLTIPS: Record<string, string> = {
  "#NAME?": "Função não reconhecida. Verifique o nome em português (ex.: SOMA, SE, PROCV).",
  "#REF!": "Referência de célula inválida ou fora dos limites da tabela.",
  "#DIV/0!": "Divisão por zero. O divisor dessa fórmula resultou em zero.",
  "#CIRC!": "Referência circular detectada. A fórmula referencia a própria célula.",
  "#ERRO!": "Erro ao calcular esta fórmula. Verifique os argumentos.",
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
 */
export function slugifyTitle(title: string): string {
  const normalized = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return normalized || "tabela";
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function TableGridPanel({ spec: propSpec }: { spec?: TableSpecPayload }) {
  const context = useContext(WorkspaceStateContext);

  const activeSpec = propSpec ?? context!.spec;

  const [loading, setLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialColumns: TableColumn[] = useMemo(
    () =>
      activeSpec.columns.map((col) => ({
        ...col,
        key: col.key ?? col.name.toLowerCase().replace(/\s+/g, "_"),
      })),
    [activeSpec.columns]
  );

  const [localHistoryState, localDispatch] = useReducer(historyReducer, {
    past: [],
    present: {
      rows: (activeSpec.rows ?? []) as RowData[],
      columns: initialColumns,
    },
    future: [],
  });

  const currentRows = propSpec ? localHistoryState.present.rows : context!.state.rows;
  const currentColumns = propSpec ? localHistoryState.present.columns : context!.state.columns;
  const currentSeparator = activeSpec.separator ?? ";";

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

  const { displayRows } = useFormulaEngine(
    currentRows,
    currentColumns,
    currentSeparator
  );

  const [sortState, setSortState] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [filterText, setFilterText] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [showColsPanel, setShowColsPanel] = useState(false);
  const colsPanelRef = useRef<HTMLDivElement>(null);

  // ── Estilo por célula + célula ativa (toolbar de formatação) ──
  // Estado LOCAL — não entra no historyReducer nem no WorkspaceStateContext
  // (decisão de escopo documentada no PLAN 260617-ukf).
  const [cellStyles, setCellStyles] = useState<Record<string, CellStyle>>({});
  const [activeCell, setActiveCell] = useState<{ rowIndex: number; colKey: string } | null>(null);

  const applyCellStyle = useCallback(
    (
      rowIndex: number,
      colKey: string,
      patch: Partial<CellStyle> | ((prev: CellStyle) => Partial<CellStyle>)
    ) => {
      setCellStyles((prev) => mergeCellStyle(prev, `${rowIndex}:${colKey}`, patch));
    },
    []
  );

  const applyCellStyleToActive = useCallback(
    (patch: Partial<CellStyle> | ((prev: CellStyle) => Partial<CellStyle>)) => {
      if (!activeCell) return;
      applyCellStyle(activeCell.rowIndex, activeCell.colKey, patch);
    },
    [activeCell, applyCellStyle]
  );

  const activeCellStyle: CellStyle = activeCell
    ? cellStyles[`${activeCell.rowIndex}:${activeCell.colKey}`] ?? {}
    : {};

  const [showColorPopover, setShowColorPopover] = useState(false);
  const [showFillPopover, setShowFillPopover] = useState(false);
  const colorPopoverRef = useRef<HTMLDivElement>(null);
  const fillPopoverRef = useRef<HTMLDivElement>(null);

  // ── Fechar popover de Cor do texto ao clicar fora ──
  useEffect(() => {
    if (!showColorPopover) return;
    function handleMouseDown(e: MouseEvent) {
      if (colorPopoverRef.current && !colorPopoverRef.current.contains(e.target as Node)) {
        setShowColorPopover(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showColorPopover]);

  // ── Fechar popover de Preenchimento ao clicar fora ──
  useEffect(() => {
    if (!showFillPopover) return;
    function handleMouseDown(e: MouseEvent) {
      if (fillPopoverRef.current && !fillPopoverRef.current.contains(e.target as Node)) {
        setShowFillPopover(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showFillPopover]);

  // ── Zoom (Task 3) ──
  const [zoom, setZoom] = useState(100);
  const [showZoomPopover, setShowZoomPopover] = useState(false);
  const zoomPopoverRef = useRef<HTMLDivElement>(null);
  const ZOOM_OPTIONS = [75, 100, 125, 150];

  useEffect(() => {
    if (!showZoomPopover) return;
    function handleMouseDown(e: MouseEvent) {
      if (zoomPopoverRef.current && !zoomPopoverRef.current.contains(e.target as Node)) {
        setShowZoomPopover(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showZoomPopover]);

  // ── Fonte / Tamanho (Task 3) ──
  const [showFontPopover, setShowFontPopover] = useState(false);
  const [showSizePopover, setShowSizePopover] = useState(false);
  const fontPopoverRef = useRef<HTMLDivElement>(null);
  const sizePopoverRef = useRef<HTMLDivElement>(null);
  const FONT_OPTIONS = ["Inter", "Arial", "Georgia", "Courier New", "Verdana"];
  const SIZE_OPTIONS = [8, 9, 10, 11, 12, 14, 16, 18, 24];

  useEffect(() => {
    if (!showFontPopover) return;
    function handleMouseDown(e: MouseEvent) {
      if (fontPopoverRef.current && !fontPopoverRef.current.contains(e.target as Node)) {
        setShowFontPopover(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showFontPopover]);

  useEffect(() => {
    if (!showSizePopover) return;
    function handleMouseDown(e: MouseEvent) {
      if (sizePopoverRef.current && !sizePopoverRef.current.contains(e.target as Node)) {
        setShowSizePopover(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showSizePopover]);

  // ── Sigma (Funções) — Task 4 ──
  const handleSigmaClick = useCallback(() => {
    if (!activeCell) return;
    const newRows = currentRows.map((row, idx) =>
      idx === activeCell.rowIndex ? buildSigmaRow(row, activeCell.colKey) : row
    );
    dispatch({ type: "SET", newState: { rows: newRows, columns: currentColumns } });
  }, [activeCell, currentRows, currentColumns, dispatch]);

  // ── Mesclar células — Task 4 ──
  const [mergeArmed, setMergeArmed] = useState(false);

  const handleMergeClick = useCallback(() => {
    if (!activeCell) return;
    setMergeArmed((v) => !v);
  }, [activeCell]);

  const handleMergeTargetCell = useCallback(
    (rowIndex: number, colKey: string) => {
      if (!mergeArmed || !activeCell) return false;
      setMergeArmed(false);
      if (rowIndex !== activeCell.rowIndex) return true; // cancela: linha diferente
      if (colKey === activeCell.colKey) return true; // mesma célula: no-op
      const colKeys = currentColumns.map((c) => c.key!);
      const firstColKey =
        colKeys.indexOf(activeCell.colKey) <= colKeys.indexOf(colKey) ? activeCell.colKey : colKey;
      const secondColKey = firstColKey === activeCell.colKey ? colKey : activeCell.colKey;
      const newRows = currentRows.map((row, idx) =>
        idx === activeCell.rowIndex ? buildMergedRow(row, firstColKey, secondColKey) : row
      );
      dispatch({ type: "SET", newState: { rows: newRows, columns: currentColumns } });
      return true;
    },
    [mergeArmed, activeCell, currentColumns, currentRows, dispatch]
  );

  // ── Pintura (format painter) — Task 4 ──
  const [paintMode, setPaintMode] = useState(false);
  const [copiedStyle, setCopiedStyle] = useState<CellStyle | null>(null);

  const handlePaintbrushClick = useCallback(() => {
    if (!activeCell) return;
    setCopiedStyle(cellStyles[`${activeCell.rowIndex}:${activeCell.colKey}`] ?? {});
    setPaintMode(true);
  }, [activeCell, cellStyles]);

  const handlePaintTargetCell = useCallback(
    (rowIndex: number, colKey: string) => {
      if (!paintMode) return false;
      setPaintMode(false);
      if (copiedStyle) {
        setCellStyles((prev) => ({ ...prev, [`${rowIndex}:${colKey}`]: { ...copiedStyle } }));
      }
      return true;
    },
    [paintMode, copiedStyle]
  );

  // ── Ordenar (menu real) — Task 5 ──
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortMenuColKey, setSortMenuColKey] = useState<string | null>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSortMenu) return;
    function handleMouseDown(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
        setSortMenuColKey(null);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showSortMenu]);

  // ── Agrupar (grupos visuais) — Task 5 ──
  const [groupByKey, setGroupByKey] = useState<string | null>(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const groupMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showGroupMenu) return;
    function handleMouseDown(e: MouseEvent) {
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target as Node)) {
        setShowGroupMenu(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showGroupMenu]);

  // ── Compartilhar (diálogo) — Task 5 ──
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareCopyFeedback, setShareCopyFeedback] = useState(false);

  useEffect(() => {
    if (!showShareDialog) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowShareDialog(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showShareDialog]);

  const buildShareText = useCallback(() => {
    const header = currentColumns.map((c) => c.name).join("\t");
    const lines = displayRows.map((row) =>
      currentColumns.map((c) => String(row[c.key ?? c.name] ?? "")).join("\t")
    );
    return [header, ...lines].join("\n");
  }, [currentColumns, displayRows]);

  const handleCopyTableAsText = useCallback(async () => {
    const text = buildShareText();
    try {
      await navigator.clipboard.writeText(text);
      setShareCopyFeedback(true);
      setTimeout(() => setShareCopyFeedback(false), 2000);
    } catch {
      // usuário pode negar permissão de clipboard — falha silenciosa, sem crash
    }
  }, [buildShareText]);

  const handleShareFile = useCallback(async () => {
    if (typeof navigator.share !== "function") return;
    try {
      const slug = slugifyTitle(activeSpec.title);
      const csv = buildCsv(currentColumns, displayRows);
      const file = new File([csv], `${slug}.csv`, { type: "text/csv" });
      await navigator.share({ files: [file], title: activeSpec.title });
    } catch {
      // usuário cancelou o share nativo — falha silenciosa, sem crash
    }
  }, [activeSpec.title, currentColumns, displayRows]);

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

  // ── Filtro de linhas ──
  const filteredSortedRows = useMemo(() => {
    if (!filterText.trim()) return sortedRows;
    const term = filterText.trim().toLowerCase();
    return sortedRows.filter((row) =>
      Object.values(row).some((v) => String(v).toLowerCase().includes(term))
    );
  }, [sortedRows, filterText]);

  // ── Agrupamento visual (Task 5) ──
  // Quando groupByKey está definido, reordena implicitamente por essa coluna
  // (mesma comparação de sortedRows) e marca a primeira linha de cada grupo
  // distinto para exibir um separador/label visual no renderer da célula.
  // `groupToFilteredIndexMap` preserva o índice em filteredSortedRows (que por
  // sua vez já é rastreável até o índice ORIGINAL via sortIndexMap), para que
  // handleChange/cellStyles/activeCell continuem corretos mesmo agrupados —
  // nenhuma linha de dados real é inserida na grade (evita corromper rows/onChange).
  const { groupedRows, groupStartIndexes, groupToFilteredIndexMap } = useMemo(() => {
    if (!groupByKey) {
      return {
        groupedRows: filteredSortedRows,
        groupStartIndexes: new Set<number>(),
        groupToFilteredIndexMap: filteredSortedRows.map((_, i) => i),
      };
    }
    const indexed = filteredSortedRows.map((row, i) => ({ row, i }));
    indexed.sort((a, b) => {
      const va = a.row[groupByKey] ?? "";
      const vb = b.row[groupByKey] ?? "";
      return typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb), "pt-BR");
    });
    const starts = new Set<number>();
    let prevValue: string | number | undefined;
    indexed.forEach((entry, idx) => {
      const value = entry.row[groupByKey] ?? "";
      if (idx === 0 || value !== prevValue) {
        starts.add(idx);
        prevValue = value;
      }
    });
    return {
      groupedRows: indexed.map((e) => e.row),
      groupStartIndexes: starts,
      groupToFilteredIndexMap: indexed.map((e) => e.i),
    };
  }, [filteredSortedRows, groupByKey]);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  const handleSortClick = useCallback((key: string) => {
    setSortState((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }, []);

  const handleChange = useCallback(
    (newRows: RowData[]) => {
      // Se agrupado, primeiro desfaz o reordenamento de grupo (volta para a
      // ordem de filteredSortedRows) antes de aplicar a restauração de sortState.
      let newRowsInFilteredOrder: RowData[];
      if (groupByKey) {
        const restoredGroup = new Array<RowData>(newRows.length);
        groupToFilteredIndexMap.forEach((filteredIdx, groupedIdx) => {
          restoredGroup[filteredIdx] = newRows[groupedIdx];
        });
        newRowsInFilteredOrder = restoredGroup;
      } else {
        newRowsInFilteredOrder = newRows;
      }

      let rowsInOriginalOrder: RowData[];
      if (sortState) {
        const restored = new Array<RowData>(newRowsInFilteredOrder.length);
        sortIndexMap.forEach((origIdx, sortedIdx) => {
          restored[origIdx] = newRowsInFilteredOrder[sortedIdx];
        });
        rowsInOriginalOrder = restored;
        setSortState(null);
      } else {
        rowsInOriginalOrder = newRowsInFilteredOrder;
      }
      dispatch({
        type: "SET",
        newState: { rows: rowsInOriginalOrder, columns: currentColumns },
      });
    },
    [currentColumns, sortState, sortIndexMap, groupByKey, groupToFilteredIndexMap, dispatch]
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
            void _removed;
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

  // ── Fechar painel de colunas ao clicar fora ──
  useEffect(() => {
    if (!showColsPanel) return;
    function handleMouseDown(e: MouseEvent) {
      if (colsPanelRef.current && !colsPanelRef.current.contains(e.target as Node)) {
        setShowColsPanel(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showColsPanel]);

  // ── Undo/redo via Ctrl+Z / Ctrl+Y ──
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
    const visibleColumns = currentColumns.filter((col) => !hiddenCols.has(col.key!));
    const firstVisibleColKey = visibleColumns[0]?.key;
    const dataCols = visibleColumns.map((col) => {
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
          const filteredRowIndex = groupToFilteredIndexMap[rowIndex] ?? rowIndex;
          const displayRow = sortedRows[filteredRowIndex] ?? rowData;
          const rawValue = displayRow[colKey] ?? "";
          const displayValue = isFormula ? rawValue : (rowData[colKey] ?? "");

          const originalRowIndex = sortIndexMap[filteredRowIndex] ?? filteredRowIndex;
          const styleKey = `${originalRowIndex}:${colKey}`;
          const style = cellStyles[styleKey];
          const isActiveCell = activeCell?.rowIndex === originalRowIndex && activeCell?.colKey === colKey;
          const isGroupStart =
            groupByKey !== null && colKey === firstVisibleColKey && groupStartIndexes.has(rowIndex);
          const groupLabel = isGroupStart
            ? `— ${currentColumns.find((c) => c.key === groupByKey)?.name ?? groupByKey}: ${String(displayRow[groupByKey!] ?? "")} —`
            : null;

          // Preenche 100% da célula sempre (não só quando há estilo) — sem isso,
          // o span só cobre a largura do texto e a maior parte da célula fica
          // sem handler de clique, deixando a célula "morta" ao clicar fora do texto.
          const cellInlineStyle: React.CSSProperties = {
            fontWeight: style?.bold ? "bold" : undefined,
            fontStyle: style?.italic ? "italic" : undefined,
            textDecoration: style?.strikethrough ? "line-through" : undefined,
            color: style?.color,
            background: style?.background,
            textAlign: style?.align,
            border: style?.border ? "1px solid var(--text)" : undefined,
            fontFamily: style?.fontFamily,
            fontSize: style?.fontSize,
            display: "block",
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            outline: isActiveCell ? "2px solid var(--primary)" : undefined,
            outlineOffset: isActiveCell ? "-1px" : undefined,
          };

          const handleCellMouseDown = () => {
            if (handleMergeTargetCell(originalRowIndex, colKey)) return;
            if (handlePaintTargetCell(originalRowIndex, colKey)) return;
            setActiveCell({ rowIndex: originalRowIndex, colKey });
          };

          if (isErrorCode(displayValue)) {
            return (
              <span
                className="cell-error"
                title={ERROR_TOOLTIPS[String(displayValue)] ?? "Erro"}
                onMouseDown={handleCellMouseDown}
                style={cellInlineStyle}
              >
                {String(displayValue)}
              </span>
            );
          }

          const effectiveType = style?.numberFormat ?? colType;
          const formatted = formatCellValue(displayValue, effectiveType, style?.decimals);
          return (
            <span
              className={isGroupStart ? "row-group-header" : undefined}
              onMouseDown={handleCellMouseDown}
              style={cellInlineStyle}
            >
              {groupLabel ? <span className="row-group-header-label">{groupLabel}</span> : null}
              {formatted}
            </span>
          );
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
  }, [
    currentColumns,
    sortState,
    sortedRows,
    sortIndexMap,
    handleSortClick,
    removeColumn,
    removeRow,
    hiddenCols,
    cellStyles,
    handleMergeTargetCell,
    handlePaintTargetCell,
    groupByKey,
    groupStartIndexes,
    groupToFilteredIndexMap,
  ]);

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
        input.value = "";
      }
    },
    [context]
  );

  const toggleColVisibility = useCallback((key: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const rowsAtLimit = currentRows.length >= 200;
  const colsAtLimit = currentColumns.length >= 26;

  const handleUndo = useCallback(() => {
    if (propSpec) {
      localDispatch({ type: "UNDO" });
    } else {
      context!.undo();
    }
  }, [propSpec, context]);

  const handleRedo = useCallback(() => {
    if (propSpec) {
      localDispatch({ type: "REDO" });
    } else {
      context!.redo();
    }
  }, [propSpec, context]);

  return (
    <div className="table-grid-wrapper" aria-label={`Tabela: ${activeSpec.title}`}>

      {/* ── Utility Bar ──────────────────────────────────────────────── */}
      <div className="utility-bar">
        <div className="utility-bar-left">
          {/* Filtrar — funcional */}
          <button
            className="utility-btn"
            type="button"
            data-active={showFilter || undefined}
            title={showFilter ? "Ocultar filtro" : "Filtrar linhas"}
            onClick={() => {
              setShowFilter((v) => !v);
              if (showFilter) setFilterText("");
            }}
          >
            <Filter size={15} />
            Filtrar
            {filterText ? <span className="utility-btn-badge">{filteredSortedRows.length}</span> : null}
          </button>
          <div className="columns-panel-container" ref={sortMenuRef}>
            <button
              className="utility-btn"
              type="button"
              data-active={showSortMenu || undefined}
              title="Ordenar"
              onClick={() => {
                setShowSortMenu((v) => !v);
                setSortMenuColKey(null);
              }}
            >
              <ArrowUpDown size={15} />
              Ordenar
            </button>
            {showSortMenu ? (
              <div className="sort-menu" role="dialog" aria-label="Ordenar por coluna">
                {sortMenuColKey === null ? (
                  currentColumns.map((col) => (
                    <button
                      key={col.key}
                      type="button"
                      className="columns-panel-item"
                      onClick={() => setSortMenuColKey(col.key!)}
                    >
                      {col.name}
                    </button>
                  ))
                ) : (
                  <>
                    <button
                      type="button"
                      className="columns-panel-item"
                      onClick={() => {
                        setSortState({ key: sortMenuColKey, dir: "asc" });
                        setShowSortMenu(false);
                        setSortMenuColKey(null);
                      }}
                    >
                      Crescente
                    </button>
                    <button
                      type="button"
                      className="columns-panel-item"
                      onClick={() => {
                        setSortState({ key: sortMenuColKey, dir: "desc" });
                        setShowSortMenu(false);
                        setSortMenuColKey(null);
                      }}
                    >
                      Decrescente
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
          <div className="columns-panel-container" ref={groupMenuRef}>
            <button
              className="utility-btn"
              type="button"
              data-active={(showGroupMenu || groupByKey !== null) || undefined}
              title="Agrupar"
              onClick={() => setShowGroupMenu((v) => !v)}
            >
              <Layers size={15} />
              Agrupar
            </button>
            {showGroupMenu ? (
              <div className="group-menu" role="dialog" aria-label="Agrupar por coluna">
                <button
                  type="button"
                  className="columns-panel-item"
                  onClick={() => {
                    setGroupByKey(null);
                    setShowGroupMenu(false);
                  }}
                >
                  Nenhum
                  {groupByKey === null ? <Check size={12} className="columns-panel-check" /> : null}
                </button>
                {currentColumns.map((col) => (
                  <button
                    key={col.key}
                    type="button"
                    className="columns-panel-item"
                    onClick={() => {
                      setGroupByKey(col.key!);
                      setShowGroupMenu(false);
                    }}
                  >
                    {col.name}
                    {groupByKey === col.key ? (
                      <Check size={12} className="columns-panel-check" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <span className="utility-btn-separator" aria-hidden />
          {/* Colunas — funcional */}
          <div className="columns-panel-container" ref={colsPanelRef}>
            <button
              className="utility-btn"
              type="button"
              data-active={showColsPanel || undefined}
              title="Mostrar/ocultar colunas"
              onClick={() => setShowColsPanel((v) => !v)}
            >
              <Columns2 size={15} />
              Colunas
              {hiddenCols.size > 0 ? <span className="utility-btn-badge">{hiddenCols.size}</span> : null}
            </button>
            {showColsPanel ? (
              <div className="columns-panel" role="dialog" aria-label="Visibilidade de colunas">
                <p className="columns-panel-label">Colunas visíveis</p>
                {currentColumns.map((col) => (
                  <label key={col.key} className="columns-panel-item">
                    <input
                      type="checkbox"
                      checked={!hiddenCols.has(col.key!)}
                      onChange={() => {
                        if (currentColumns.filter((c) => !hiddenCols.has(c.key!)).length === 1 && !hiddenCols.has(col.key!)) return;
                        toggleColVisibility(col.key!);
                      }}
                    />
                    {col.name}
                    {!hiddenCols.has(col.key!) ? <Check size={12} className="columns-panel-check" /> : null}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
          <span className="utility-btn-separator" aria-hidden />

          {/* Functional: import / new / sample */}
          {!propSpec && (
            <>
              <button
                className="utility-btn"
                type="button"
                aria-label="Nova em Branco"
                onClick={handleNewBlank}
              >
                Nova
              </button>
              <button
                className="utility-btn"
                type="button"
                aria-label="Carregar Exemplo"
                onClick={handleLoadSample}
              >
                Exemplo
              </button>
              <button
                className="utility-btn"
                type="button"
                aria-label="Importar Planilha"
                onClick={handleImportClick}
              >
                Importar
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
              <span className="utility-btn-separator" aria-hidden />
            </>
          )}

          {/* Functional: add row / column */}
          <button
            className="utility-btn"
            type="button"
            aria-label="Adicionar linha"
            disabled={rowsAtLimit}
            title={rowsAtLimit ? "Limite de 200 linhas atingido." : "Adicionar linha"}
            onClick={addRow}
          >
            <Plus size={14} />
            Linha
          </button>
          <button
            className="utility-btn"
            type="button"
            aria-label="Adicionar coluna"
            disabled={colsAtLimit}
            title={colsAtLimit ? "Limite de 26 colunas atingido." : "Adicionar coluna"}
            onClick={addColumn}
          >
            <Plus size={14} />
            Coluna
          </button>
        </div>

        <div className="utility-bar-right">
          <h2 className="utility-bar-title">{activeSpec.title}</h2>
          {/* Functional: export */}
          <button
            className="utility-btn"
            type="button"
            aria-label="Exportar CSV"
            onClick={handleExportCsv}
          >
            CSV
          </button>
          <button
            className="utility-btn"
            type="button"
            aria-label="Exportar XLSX"
            onClick={handleExportXlsx}
          >
            XLSX
          </button>
          <button
            className="utility-btn"
            type="button"
            data-active={showShareDialog || undefined}
            title="Compartilhar"
            onClick={() => setShowShareDialog(true)}
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────── */}
      {showFilter ? (
        <div className="filter-bar" role="search" aria-label="Filtrar linhas">
          <Filter size={14} aria-hidden />
          <input
            className="filter-bar-input"
            type="text"
            placeholder="Filtrar linhas..."
            value={filterText}
            autoFocus
            onChange={(e) => setFilterText(e.target.value)}
            aria-label="Texto de filtro"
          />
          {filterText ? (
            <span className="filter-bar-count" aria-live="polite">
              {filteredSortedRows.length} de {sortedRows.length}
            </span>
          ) : null}
          <button
            className="filter-bar-clear"
            type="button"
            aria-label="Limpar filtro e fechar"
            onClick={() => {
              setFilterText("");
              setShowFilter(false);
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* ── Formatting Toolbar ───────────────────────────────────────── */}
      <div className="formatting-toolbar">
        {/* Functional: undo / redo */}
        <button
          className="format-btn"
          type="button"
          title="Desfazer (Ctrl+Z)"
          aria-label="Desfazer"
          onClick={handleUndo}
        >
          <Undo2 size={15} />
        </button>
        <button
          className="format-btn"
          type="button"
          title="Refazer (Ctrl+Y)"
          aria-label="Refazer"
          onClick={handleRedo}
        >
          <Redo2 size={15} />
        </button>
        <button
          className="format-btn"
          type="button"
          title="Formato de pintura"
          data-active={paintMode || undefined}
          onClick={handlePaintbrushClick}
        >
          <Paintbrush size={15} />
        </button>
        <span className="format-btn-separator" aria-hidden />
        {/* Zoom */}
        <div className="columns-panel-container" ref={zoomPopoverRef}>
          <button
            className="format-dropdown format-dropdown-btn"
            type="button"
            title="Zoom"
            onClick={() => setShowZoomPopover((v) => !v)}
          >
            {zoom}% <ChevronDown size={11} />
          </button>
          {showZoomPopover ? (
            <div className="columns-panel" role="dialog" aria-label="Zoom">
              {ZOOM_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="columns-panel-item"
                  onClick={() => {
                    setZoom(option);
                    setShowZoomPopover(false);
                  }}
                >
                  {option}%
                  {zoom === option ? <Check size={12} className="columns-panel-check" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <span className="format-btn-separator" aria-hidden />
        {/* Number format */}
        <button
          className="format-btn"
          type="button"
          title="Formato moeda"
          data-active={activeCellStyle.numberFormat === "currency" || undefined}
          onClick={() =>
            applyCellStyleToActive((prev) => ({
              numberFormat: prev.numberFormat === "currency" ? undefined : "currency",
            }))
          }
        >
          <DollarSign size={15} />
        </button>
        <button
          className="format-btn"
          type="button"
          title="Formato percentual"
          data-active={activeCellStyle.numberFormat === "percent" || undefined}
          onClick={() =>
            applyCellStyleToActive((prev) => ({
              numberFormat: prev.numberFormat === "percent" ? undefined : "percent",
            }))
          }
        >
          <Percent size={15} />
        </button>
        <button
          className="format-btn"
          type="button"
          title="Diminuir decimais"
          onClick={() =>
            applyCellStyleToActive((prev) => ({
              decimals: Math.max(0, (prev.decimals ?? 2) - 1),
            }))
          }
        >
          <ChevronsLeft size={15} />
        </button>
        <button
          className="format-btn"
          type="button"
          title="Aumentar decimais"
          onClick={() =>
            applyCellStyleToActive((prev) => ({
              decimals: Math.min(10, (prev.decimals ?? 2) + 1),
            }))
          }
        >
          <ChevronsRight size={15} />
        </button>
        <span className="format-btn-separator" aria-hidden />
        {/* Font */}
        <div className="columns-panel-container" ref={fontPopoverRef}>
          <button
            className="format-dropdown format-dropdown-btn"
            type="button"
            title="Fonte"
            onClick={() => setShowFontPopover((v) => !v)}
          >
            {activeCellStyle.fontFamily ?? "Inter"} <ChevronDown size={11} />
          </button>
          {showFontPopover ? (
            <div className="columns-panel" role="dialog" aria-label="Fonte">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font}
                  type="button"
                  className="columns-panel-item"
                  style={{ fontFamily: font }}
                  onClick={() => {
                    applyCellStyleToActive({ fontFamily: font });
                    setShowFontPopover(false);
                  }}
                >
                  {font}
                  {activeCellStyle.fontFamily === font ? (
                    <Check size={12} className="columns-panel-check" />
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <span className="format-btn-separator" aria-hidden />
        <div className="columns-panel-container" ref={sizePopoverRef}>
          <button
            className="format-dropdown format-dropdown-btn"
            type="button"
            title="Tamanho"
            onClick={() => setShowSizePopover((v) => !v)}
          >
            {activeCellStyle.fontSize ?? 10} <ChevronDown size={11} />
          </button>
          {showSizePopover ? (
            <div className="columns-panel" role="dialog" aria-label="Tamanho da fonte">
              {SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  className="columns-panel-item"
                  onClick={() => {
                    applyCellStyleToActive({ fontSize: size });
                    setShowSizePopover(false);
                  }}
                >
                  {size}
                  {activeCellStyle.fontSize === size ? (
                    <Check size={12} className="columns-panel-check" />
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <span className="format-btn-separator" aria-hidden />
        {/* Text formatting */}
        <button
          className="format-btn"
          type="button"
          title="Negrito"
          data-active={activeCellStyle.bold || undefined}
          onClick={() => applyCellStyleToActive((prev) => ({ bold: !prev.bold }))}
        >
          <Bold size={15} />
        </button>
        <button
          className="format-btn"
          type="button"
          title="Itálico"
          data-active={activeCellStyle.italic || undefined}
          onClick={() => applyCellStyleToActive((prev) => ({ italic: !prev.italic }))}
        >
          <Italic size={15} />
        </button>
        <button
          className="format-btn"
          type="button"
          title="Tachado"
          data-active={activeCellStyle.strikethrough || undefined}
          onClick={() => applyCellStyleToActive((prev) => ({ strikethrough: !prev.strikethrough }))}
        >
          <Strikethrough size={15} />
        </button>
        <div className="columns-panel-container" ref={colorPopoverRef}>
          <button
            className="format-btn"
            type="button"
            title="Cor do texto"
            data-active={showColorPopover || undefined}
            onClick={() => setShowColorPopover((v) => !v)}
          >
            <Type size={15} />
          </button>
          {showColorPopover ? (
            <div className="color-popover" role="dialog" aria-label="Cor do texto">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  className="color-popover-swatch"
                  aria-label={`Cor do texto ${swatch}`}
                  style={{ background: swatch }}
                  onClick={() => {
                    applyCellStyleToActive({ color: swatch });
                    setShowColorPopover(false);
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
        <div className="columns-panel-container" ref={fillPopoverRef}>
          <button
            className="format-btn"
            type="button"
            title="Cor de preenchimento"
            data-active={showFillPopover || undefined}
            onClick={() => setShowFillPopover((v) => !v)}
          >
            <PaintBucket size={15} />
          </button>
          {showFillPopover ? (
            <div className="color-popover" role="dialog" aria-label="Cor de preenchimento">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  className="color-popover-swatch"
                  aria-label={`Preenchimento ${swatch}`}
                  style={{ background: swatch }}
                  onClick={() => {
                    applyCellStyleToActive({ background: swatch });
                    setShowFillPopover(false);
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
        <span className="format-btn-separator" aria-hidden />
        {/* Cell formatting */}
        <button
          className="format-btn"
          type="button"
          title="Bordas"
          data-active={activeCellStyle.border || undefined}
          onClick={() => applyCellStyleToActive((prev) => ({ border: !prev.border }))}
        >
          <LayoutGrid size={15} />
        </button>
        <button
          className="format-btn"
          type="button"
          title="Mesclar células"
          data-active={mergeArmed || undefined}
          onClick={handleMergeClick}
        >
          <Merge size={15} />
        </button>
        <button
          className="format-btn"
          type="button"
          title={`Alinhar à ${activeCellStyle.align === "center" ? "centro" : activeCellStyle.align === "right" ? "direita" : "esquerda"}`}
          onClick={() =>
            applyCellStyleToActive((prev) => ({ align: nextAlign(prev.align ?? "left") }))
          }
        >
          {activeCellStyle.align === "center" ? (
            <AlignCenter size={15} />
          ) : activeCellStyle.align === "right" ? (
            <AlignRight size={15} />
          ) : (
            <AlignLeft size={15} />
          )}
        </button>
        <button className="format-btn" type="button" title="Funções" onClick={handleSigmaClick}>
          <Sigma size={15} />
        </button>
      </div>

      {/* ── Diálogo de Compartilhar ──────────────────────────────────── */}
      {showShareDialog ? (
        <div
          className="share-dialog-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowShareDialog(false);
          }}
        >
          <div className="share-dialog" role="dialog" aria-label="Compartilhar tabela">
            <h3 className="share-dialog-title">Compartilhar</h3>
            <button
              type="button"
              className="share-dialog-action"
              onClick={handleCopyTableAsText}
            >
              {shareCopyFeedback ? "Copiado!" : "Copiar tabela como texto"}
            </button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
              <button type="button" className="share-dialog-action" onClick={handleShareFile}>
                Compartilhar arquivo
              </button>
            ) : null}
            <button
              type="button"
              className="share-dialog-close"
              aria-label="Fechar"
              onClick={() => setShowShareDialog(false)}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Error banner ─────────────────────────────────────────────── */}
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

      {/* ── Grid ─────────────────────────────────────────────────────── */}
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
        <div
          className="table-grid-zoom-wrapper"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top left",
            width: `${(100 / zoom) * 100}%`,
          }}
        >
          <DynamicDataSheetGrid
            value={groupedRows}
            onChange={handleChange}
            columns={dsgColumns.columns}
            createRow={createRow}
            stickyRightColumn={dsgColumns.stickyRightColumn}
            height={600}
          />
        </div>
      </div>
    </div>
  );
}

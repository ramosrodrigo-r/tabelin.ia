"use client";
import { createContext, useCallback, useContext, useReducer } from "react";
import type { TableColumn, TableSpecPayload } from "@tabelin/shared";
import { SAMPLE_SPEC } from "@/features/unified-chat/lib/sample-spec";

export type RowData = Record<string, string | number>;

export type GridState = {
  rows: RowData[];
  columns: TableColumn[];
  title: string;
  separator?: ";" | ",";
};

type HistoryState = {
  past: GridState[];
  present: GridState;
  future: GridState[];
};

type Action =
  | { type: "SET"; newState: GridState }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET_TO_BLANK" }
  | { type: "RESET_TO_SEED"; seed: TableSpecPayload };

function historyReducer(state: HistoryState, action: Action): HistoryState {
  switch (action.type) {
    case "SET":
      return {
        past: [...state.past.slice(-49), state.present],
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
    case "RESET_TO_BLANK": {
      const blankState: GridState = {
        title: "Planilha sem título",
        columns: [
          { name: "Coluna A", type: "text", key: "coluna_a" },
          { name: "Coluna B", type: "text", key: "coluna_b" },
          { name: "Coluna C", type: "text", key: "coluna_c" },
        ],
        rows: Array.from({ length: 10 }, () => ({
          coluna_a: "",
          coluna_b: "",
          coluna_c: "",
        })),
        separator: ";",
      };
      return {
        past: [...state.past.slice(-49), state.present],
        present: blankState,
        future: [],
      };
    }
    case "RESET_TO_SEED": {
      const seedState: GridState = {
        title: action.seed.title,
        columns: action.seed.columns.map((c) => ({
          ...c,
          key: c.key ?? c.name.toLowerCase().replace(/\s+/g, "_"),
        })),
        rows: (action.seed.rows ?? []) as RowData[],
        separator: action.seed.separator ?? ";",
      };
      return {
        past: [...state.past.slice(-49), state.present],
        present: seedState,
        future: [],
      };
    }
  }
}

type WorkspaceStateContextValue = {
  state: GridState;
  spec: TableSpecPayload;
  undo: () => void;
  redo: () => void;
  updateState: (newState: GridState) => void;
  setSpec: (spec: TableSpecPayload) => void;
  resetToBlank: () => void;
  resetToSeed: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const WorkspaceStateContext = createContext<WorkspaceStateContextValue | null>(null);

export function WorkspaceStateProvider({ children }: { children: React.ReactNode }) {
  const initialPresent: GridState = {
    title: SAMPLE_SPEC.title,
    columns: SAMPLE_SPEC.columns.map((c) => ({
      ...c,
      key: c.key ?? c.name.toLowerCase().replace(/\s+/g, "_"),
    })),
    rows: (SAMPLE_SPEC.rows ?? []) as RowData[],
    separator: SAMPLE_SPEC.separator ?? ";",
  };

  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initialPresent,
    future: [],
  });

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);
  const updateState = useCallback((newState: GridState) => dispatch({ type: "SET", newState }), []);
  const setSpec = useCallback((seed: TableSpecPayload) => dispatch({ type: "RESET_TO_SEED", seed }), []);
  const resetToBlank = useCallback(() => dispatch({ type: "RESET_TO_BLANK" }), []);
  const resetToSeed = useCallback(() => dispatch({ type: "RESET_TO_SEED", seed: SAMPLE_SPEC }), []);

  const spec = {
    kind: "table_spec" as const,
    title: history.present.title,
    columns: history.present.columns,
    rows: history.present.rows,
    rowCount: history.present.rows.length,
    separator: history.present.separator ?? ";",
    formulaLanguage: "pt-BR" as const,
  };

  return (
    <WorkspaceStateContext
      value={{
        state: history.present,
        spec,
        undo,
        redo,
        updateState,
        setSpec,
        resetToBlank,
        resetToSeed,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
      }}
    >
      {children}
    </WorkspaceStateContext>
  );
}

export function useWorkspaceState() {
  const ctx = useContext(WorkspaceStateContext);
  if (!ctx) {
    throw new Error("useWorkspaceState must be used within a WorkspaceStateProvider");
  }
  return ctx;
}

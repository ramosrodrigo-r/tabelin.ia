"use client";
import { createContext, useCallback, useContext, useEffect, useReducer, useRef } from "react";
import { deriveColumnKey, type TableColumn, type TableSpecPayload } from "@tabelin/shared";
import { SAMPLE_SPEC } from "@/features/unified-chat/lib/sample-spec";

/** Janela de debounce do auto-save da planilha (D-02): 1.5s sem mudanças. */
const AUTO_SAVE_DEBOUNCE_MS = 1_500;

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

function seedToGridState(seed: TableSpecPayload): GridState {
  // CR-02: desambigua keys colidentes na ESCRITA. Duas colunas que derivam (ou
  // declaram) a mesma key sobrescreveriam uma à outra em newRow[key], perdendo
  // dados no reload. Mantém um Set de keys já usadas e sufixa o índice na
  // colisão. Usa deriveColumnKey (@tabelin/shared) — a MESMA normalização do
  // schema — para evitar drift entre validação e escrita. Esta dedupe de escrita
  // é a garantia primária de round-trip sem perda; o superRefine do schema só
  // pega as colisões que a própria normalização produz.
  const seen = new Set<string>();
  const columns = seed.columns.map((c) => {
    let key = c.key ?? deriveColumnKey(c.name);
    if (seen.has(key)) {
      // Sufixa o índice da coluna até obter uma key inédita.
      const colIndex = seed.columns.indexOf(c);
      let suffixed = `${key}_${colIndex}`;
      while (seen.has(suffixed)) suffixed = `${suffixed}_x`;
      key = suffixed;
    }
    seen.add(key);
    return { ...c, key };
  });
  const rows = (seed.rows ?? []).map((r) => {
    const newRow: RowData = {};
    seed.columns.forEach((c, index) => {
      const resolvedKey = columns[index].key;
      // Leitura tolerante: aceita key explícita, nome, ou a key resolvida (única).
      const val = r[c.key ?? ""] ?? r[c.name] ?? r[resolvedKey];
      newRow[resolvedKey] = val !== undefined ? val : "";
    });
    return newRow;
  });
  return {
    title: seed.title,
    columns,
    rows,
    separator: seed.separator ?? ";",
  };
}

/**
 * Deriva o specJson canônico de um GridState — a MESMA serialização usada pelo
 * auto-save. Reutilizado para pré-marcar lastSavedRef no reset (CR-01), de modo
 * que o efeito de auto-save veja `specJson === lastSavedRef.current` e retorne
 * cedo, sem disparar POST.
 */
function gridStateToSpecJson(state: GridState): string {
  const spec = {
    kind: "table_spec" as const,
    title: state.title,
    columns: state.columns,
    rows: state.rows,
    rowCount: state.rows.length,
    separator: state.separator ?? ";",
    formulaLanguage: "pt-BR" as const,
  };
  return JSON.stringify(spec);
}

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
      const seedState = seedToGridState(action.seed);
      return {
        past: [...state.past.slice(-49), state.present],
        present: seedState,
        future: [],
      };
    }
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
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

export const WorkspaceStateContext = createContext<WorkspaceStateContextValue | null>(null);

export function WorkspaceStateProvider({
  children,
  initialSpec,
}: {
  children: React.ReactNode;
  initialSpec?: TableSpecPayload;
}) {
  // D-03: inicializa a partir do spec persistido (server-side), caindo de
  // volta no SAMPLE_SPEC quando não há planilha salva.
  const initialPresent = seedToGridState(initialSpec ?? SAMPLE_SPEC);

  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initialPresent,
    future: [],
  });

  // D-02: auto-save debancado e deduplicado. lastSavedRef guarda a string do
  // último estado conhecido como salvo; o mount inicial não dispara POST porque
  // lastSavedRef já reflete o estado inicial. Mudanças subsequentes agendam um
  // POST após AUTO_SAVE_DEBOUNCE_MS; o sucesso atualiza o ref para evitar
  // gravações redundantes.
  const lastSavedRef = useRef(gridStateToSpecJson(initialPresent));

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);
  const updateState = useCallback((newState: GridState) => dispatch({ type: "SET", newState }), []);
  const setSpec = useCallback((seed: TableSpecPayload) => dispatch({ type: "RESET_TO_SEED", seed }), []);
  const resetToBlank = useCallback(() => dispatch({ type: "RESET_TO_BLANK" }), []);
  // CR-01: o reset para SAMPLE_SPEC NÃO deve disparar auto-save. O "Nova conversa"
  // já apaga a linha unified_table via DELETE no Topbar; se o auto-save POSTasse o
  // SAMPLE_SPEC logo em seguida, a linha ressuscitaria (corrida CR-01). Pré-marcamos
  // lastSavedRef com o specJson do estado de reset ANTES do dispatch, de modo que o
  // efeito de auto-save veja specJson === lastSavedRef.current e retorne cedo.
  const resetToSeed = useCallback(() => {
    lastSavedRef.current = gridStateToSpecJson(seedToGridState(SAMPLE_SPEC));
    dispatch({ type: "RESET_TO_SEED", seed: SAMPLE_SPEC });
  }, []);

  const spec = {
    kind: "table_spec" as const,
    title: history.present.title,
    columns: history.present.columns,
    rows: history.present.rows,
    rowCount: history.present.rows.length,
    separator: history.present.separator ?? ";",
    formulaLanguage: "pt-BR" as const,
  };

  const specJson = JSON.stringify(spec);

  useEffect(() => {
    if (specJson === lastSavedRef.current) return;

    const timer = setTimeout(() => {
      void fetch("/api/workspace/state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: specJson,
      })
        .then((res) => {
          if (res.ok) {
            lastSavedRef.current = specJson;
          }
        })
        .catch(() => {
          // Falha de rede é silenciosa: a próxima mudança reagenda o save.
        });
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [specJson]);

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

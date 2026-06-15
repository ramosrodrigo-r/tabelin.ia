import { act, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TableSpecPayload } from "@tabelin/shared";

import {
  useWorkspaceState,
  WorkspaceStateProvider,
} from "../src/components/app/workspace-state-context";

const INITIAL_SPEC: TableSpecPayload = {
  kind: "table_spec",
  title: "Planilha Persistida",
  columns: [{ name: "Produto", type: "text", key: "produto" }],
  rows: [{ produto: "Café" }, { produto: "Açúcar" }],
  rowCount: 2,
  separator: ";",
  formulaLanguage: "pt-BR",
};

function Consumer() {
  const { state, updateState } = useWorkspaceState();
  return (
    <div>
      <span data-testid="title">{state.title}</span>
      <span data-testid="row-count">{state.rows.length}</span>
      <button
        type="button"
        onClick={() =>
          updateState({
            ...state,
            rows: [...state.rows, { produto: "Leite" }],
          })
        }
      >
        adicionar
      </button>
    </div>
  );
}

// Sonda que expõe as keys de coluna e os valores da primeira linha + reset.
function CollisionProbe() {
  const { state, resetToSeed } = useWorkspaceState();
  return (
    <div>
      <span data-testid="col-keys">{state.columns.map((c) => c.key).join("|")}</span>
      <span data-testid="row0-values">
        {state.columns.map((c) => String(state.rows[0]?.[c.key!] ?? "")).join("|")}
      </span>
      <button type="button" onClick={() => resetToSeed()}>
        resetar
      </button>
    </div>
  );
}

describe("WorkspaceStateProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true } as Response));
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("inicializa a partir do initialSpec quando fornecido", () => {
    render(
      <WorkspaceStateProvider initialSpec={INITIAL_SPEC}>
        <Consumer />
      </WorkspaceStateProvider>,
    );

    expect(screen.getByTestId("title").textContent).toBe("Planilha Persistida");
    expect(screen.getByTestId("row-count").textContent).toBe("2");
  });

  it("cai no SAMPLE_SPEC quando initialSpec é omitido", () => {
    render(
      <WorkspaceStateProvider>
        <Consumer />
      </WorkspaceStateProvider>,
    );

    expect(screen.getByTestId("title").textContent).not.toBe("Planilha Persistida");
  });

  it("não dispara auto-save no mount inicial", () => {
    render(
      <WorkspaceStateProvider initialSpec={INITIAL_SPEC}>
        <Consumer />
      </WorkspaceStateProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("dispara um POST debancado para /api/workspace/state após mudança", async () => {
    render(
      <WorkspaceStateProvider initialSpec={INITIAL_SPEC}>
        <Consumer />
      </WorkspaceStateProvider>,
    );

    act(() => {
      screen.getByText("adicionar").click();
    });

    // Antes do debounce expirar, nenhum fetch.
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(fetch).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe("/api/workspace/state");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body as string) as TableSpecPayload;
    expect(body.rowCount).toBe(3);
  });

  // CR-02: duas colunas que derivam a mesma key fazem round-trip sem perder dados.
  it("preserva dados de colunas com key colidente no round-trip (CR-02)", () => {
    const collidingSpec: TableSpecPayload = {
      kind: "table_spec",
      title: "Colisão",
      // "Total" duas vezes → ambas derivam "total" sem desambiguação.
      columns: [
        { name: "Total", type: "number" },
        { name: "Total", type: "number" },
      ],
      // A primeira linha traz valores distintos por POSIÇÃO de coluna.
      rows: [{ total: 10, total_1: 20 }],
      rowCount: 1,
      separator: ";",
      formulaLanguage: "pt-BR",
    };

    render(
      <WorkspaceStateProvider initialSpec={collidingSpec}>
        <CollisionProbe />
      </WorkspaceStateProvider>,
    );

    const keys = screen.getByTestId("col-keys").textContent!.split("|");
    // As duas keys são DISTINTAS (a segunda foi desambiguada).
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
    // Nenhuma coluna foi sobrescrita: ambos os slots têm valor próprio.
    const values = screen.getByTestId("row0-values").textContent!.split("|");
    expect(values).toHaveLength(2);
    expect(new Set(values).size).toBe(2);
  });

  // CR-01: resetToSeed não dispara auto-save (lastSavedRef pré-marcado).
  it("não dispara auto-save após resetToSeed (CR-01)", () => {
    render(
      <WorkspaceStateProvider initialSpec={INITIAL_SPEC}>
        <CollisionProbe />
      </WorkspaceStateProvider>,
    );

    act(() => {
      screen.getByText("resetar").click();
    });

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    // O reset volta ao SAMPLE_SPEC, mas o auto-save é suprimido — nenhum POST.
    expect(fetch).not.toHaveBeenCalled();
  });
});

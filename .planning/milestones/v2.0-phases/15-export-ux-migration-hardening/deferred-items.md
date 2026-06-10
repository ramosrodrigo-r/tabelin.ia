# Deferred Items — Phase 15

## From 15-02

- **`apps/web/tests/table-grid-panel.test.tsx`: 15 pre-existing tests use a `require()`-based
  dynamic import of `TableGridPanel` guarded by `if (!TableGridPanel) { expect(true).toBe(true); return; }`.
  This `require()` always throws `Cannot find module` in this project's vitest/ESM setup, so all
  15 tests have been silently skip-passing without ever rendering the real component.
  Out of scope for 15-02 (pre-existing, unrelated to EXP-01/EXP-02). A future plan should replace
  the `require` pattern with a direct ESM import (as done for the new EXP-01/EXP-02 tests in 15-02,
  which include a `ResizeObserver` polyfill needed by `react-datasheet-grid`) so these tests
  actually exercise `TableGridPanel`.

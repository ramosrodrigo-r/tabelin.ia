import * as XLSX from "xlsx";

import type { TableColumn } from "@tabelin/shared";
import type { RowData } from "../hooks/use-formula-engine";

// ─── Constantes ─────────────────────────────────────────────────────────────────

/**
 * Caracteres que, ao iniciarem uma célula, podem ser interpretados como
 * fórmula/comando por Excel/Sheets ao abrir um CSV/XLSX (CSV Injection).
 *
 * Source: OWASP CSV Injection — https://owasp.org/www-community/attacks/CSV_Injection
 * `=` `+` `-` `@` TAB(0x09) CR(0x0D) LF(0x0A)
 */
const DANGEROUS_LEAD = /^[=+\-@\t\r\n]/;

/** Caracteres que exigem quoting RFC 4180 em campo CSV. */
const NEEDS_QUOTING = /[",;\r\n]/;

// ─── Funções puras (module-scope, testáveis sem React) ─────────────────────────

/**
 * Sanitiza uma célula para export (CSV/XLSX), prefixando com `'` (aspa simples)
 * toda célula cujo primeiro caractere seja potencialmente perigoso (= + - @ TAB CR LF).
 *
 * Mitiga T-15-01 (CSV/Excel formula injection — OWASP).
 * Coage `value` para string via `String(value ?? "")`; null/undefined viram "".
 */
export function sanitizeCellForExport(value: string | number): string {
  const s = String(value ?? "");
  return DANGEROUS_LEAD.test(s) ? `'${s}` : s;
}

/**
 * Lê o valor de uma célula em `row` usando o accessor canônico:
 * `col.key ?? col.name` (mesmo padrão de table-grid-panel.tsx:104).
 */
function cellValue(row: RowData, col: TableColumn): string | number {
  const key = col.key ?? col.name;
  return row[key] ?? "";
}

/**
 * Aplica quoting RFC 4180 a um campo já sanitizado: se contiver `;`, `,`, `"`
 * ou quebra de linha, envolve em aspas duplas e duplica aspas internas.
 */
function csvField(raw: string | number): string {
  const sanitized = sanitizeCellForExport(raw);
  if (NEEDS_QUOTING.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

/**
 * Gera o conteúdo CSV (RFC 4180) a partir de `columns` + `rows` (displayRows —
 * valores de fórmula já calculados, nunca templates `{row}`).
 *
 * - Inicia com BOM UTF-8 (`﻿`) — necessário para acentos pt-BR no Excel.
 *   BOM ownership: incluído aqui uma única vez; `downloadCsv` NÃO re-prepende.
 * - Separador `;` (locale pt-BR — vírgula é decimal).
 * - Linhas terminadas em `\r\n`.
 * - Cada campo passa por `sanitizeCellForExport` (SEC-04) + quoting RFC 4180.
 */
export function buildCsv(columns: TableColumn[], rows: RowData[]): string {
  const header = columns.map((c) => csvField(c.name)).join(";");
  const lines = rows.map((row) =>
    columns.map((c) => csvField(cellValue(row, c))).join(";")
  );
  return "﻿" + [header, ...lines].join("\r\n");
}

/**
 * Gera um WorkBook XLSX (1 sheet "Tabela") a partir de `columns` + `rows`
 * (displayRows — valores de fórmula já calculados).
 *
 * SEC-04 / T-15-02: TODA célula de dados (header + body) é escrita como
 * cell-object `{ t: "s", v: sanitizeCellForExport(...) }` — string explícita,
 * nunca deixando o SheetJS inferir tipo (o que poderia transformar `=...`
 * em fórmula viva). `aoa_to_sheet` aceita cell-objects em vez de valores brutos.
 */
export function buildXlsx(columns: TableColumn[], rows: RowData[]): XLSX.WorkBook {
  const header = columns.map((c) => ({ t: "s" as const, v: sanitizeCellForExport(c.name) }));
  const body = rows.map((row) =>
    columns.map((c) => ({ t: "s" as const, v: sanitizeCellForExport(cellValue(row, c)) }))
  );
  const aoa = [header, ...body];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tabela");
  return wb;
}

// ─── Efeitos de download (DOM-only — não testados em jsdom) ────────────────────

/**
 * Dispara o download de um arquivo CSV no browser via Blob + `<a download>`.
 *
 * O BOM UTF-8 já está incluído em `content` (gerado por `buildCsv`) — NÃO
 * re-prepender aqui, para evitar BOM duplicado no arquivo final.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Dispara o download de um arquivo XLSX no browser.
 * `XLSX.writeFile` é DOM-only (cria o Blob + anchor internamente).
 */
export function downloadXlsx(wb: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(wb, filename);
}

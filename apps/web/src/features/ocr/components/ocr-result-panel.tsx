"use client";

import type { OcrResponse } from "@tabelin/shared";

import { CopyButton } from "@/features/file-analysis/components/copy-button";

type Props = {
  result: OcrResponse;
  onNewImage: () => void;
};

function toTsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((r) => r.join("\t")).join("\n");
}

function escapeCsvField(field: string): string {
  if (field.includes('"') || field.includes(',') || field.includes('\n')) {
    return `"${field.replaceAll('"', '""')}"`;
  }
  return field;
}

function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows]
    .map((r) => r.map(escapeCsvField).join(","))
    .join("\n");
}

export function OcrResultPanel({ result, onNewImage }: Props) {
  const { headers, rows } = result;

  const tsvValue = toTsv(headers, rows);
  const csvValue = toCsv(headers, rows);

  const isEmpty = headers.length === 0 && rows.length === 0;

  return (
    <div
      className="tool-panel"
      role="img"
      aria-label="Resultado da extracao de tabela por OCR"
    >
      {/* Heading row com botao "Nova imagem" */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px"
        }}
      >
        <h2 style={{ margin: 0 }}>Tabela reconstruida</h2>
        <button
          className="ghost-button"
          onClick={onNewImage}
          style={{ fontSize: "13px", padding: "4px 10px", minHeight: "32px" }}
          type="button"
        >
          Nova imagem
        </button>
      </div>

      {isEmpty ? (
        <p style={{ fontSize: "14px", color: "var(--muted)" }}>
          Nenhuma tabela detectada na imagem.
        </p>
      ) : (
        <>
          {/* Table wrapper com scroll */}
          <div
            style={{
              maxHeight: "240px",
              overflowY: "auto",
              border: "1px solid var(--border)",
              borderRadius: "6px"
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px"
              }}
            >
              <caption className="sr-only">Tabela reconstruida da imagem</caption>
              <thead>
                <tr>
                  {headers.map((header, idx) => (
                    <th
                      key={idx}
                      scope="col"
                      style={{
                        background: "#f8fafc",
                        fontSize: "12px",
                        fontWeight: 600,
                        padding: "8px 12px",
                        border: "1px solid var(--border)",
                        textAlign: "left",
                        position: "sticky",
                        top: 0
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        style={{
                          fontSize: "12px",
                          padding: "8px 12px",
                          border: "1px solid var(--border)"
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Botoes de copia */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "8px"
            }}
          >
            <CopyButton value={tsvValue} label="Copiar TSV" />
            <CopyButton value={csvValue} label="Copiar CSV" />
          </div>
        </>
      )}
    </div>
  );
}

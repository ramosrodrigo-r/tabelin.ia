import type { FileSchema } from "@tabelin/shared";

type Props = {
  schema: FileSchema;
};

const TYPE_LABELS: Record<string, string> = {
  numero: "numero",
  data: "data",
  texto: "texto",
  booleano: "booleano"
};

export function SchemaPreview({ schema }: Props) {
  return (
    <div
      style={{
        borderLeft: "3px solid var(--info)",
        background: "#f8fafc",
        borderRadius: "0 6px 6px 0",
        padding: "12px 16px"
      }}
    >
      <p
        style={{
          margin: "0 0 4px",
          fontSize: "14px",
          fontWeight: 650
        }}
      >
        Arquivo carregado — {schema.columns.length} colunas detectadas
      </p>
      <p
        style={{
          margin: "0 0 10px",
          fontSize: "12px",
          color: "var(--muted)"
        }}
      >
        {schema.fileName} · {schema.rowCount} linhas
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {schema.columns.map((col) => (
          <span
            key={col.name}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "999px",
              background: "#f8fafc",
              color: "var(--muted)",
              fontSize: "12px",
              fontWeight: 650,
              padding: "4px 8px"
            }}
          >
            {col.name} · {TYPE_LABELS[col.type] ?? col.type}
          </span>
        ))}
      </div>
    </div>
  );
}

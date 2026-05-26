"use client";

import type { ChartData } from "@tabelin/shared";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { CopyButton } from "./copy-button";

type ChartType = "bar" | "line" | "pie";

const COLORS = ["var(--primary)", "#0ea5e9", "#f59e0b", "#10b981", "#8b5cf6"];

type Props = {
  data: ChartData;
};

export function ChartMessage({ data }: Props) {
  const [activeType, setActiveType] = useState<ChartType>(data.chartType);

  const csvData = [
    [data.xKey, data.yKey].join("\t"),
    ...data.rows.map((r) => [r[data.xKey], r[data.yKey]].join("\t"))
  ].join("\n");

  const chartTypeLabel: Record<ChartType, string> = {
    bar: "barras",
    line: "linhas",
    pie: "pizza"
  };

  function renderChart() {
    if (activeType === "bar") {
      return (
        <BarChart data={data.rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={data.xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey={data.yKey} fill="var(--primary)" />
        </BarChart>
      );
    }

    if (activeType === "line") {
      return (
        <LineChart data={data.rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={data.xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line dataKey={data.yKey} dot={false} stroke="var(--primary)" type="monotone" />
        </LineChart>
      );
    }

    // pie
    return (
      <PieChart>
        <Tooltip />
        <Pie data={data.rows} dataKey={data.yKey} nameKey={data.xKey}>
          {data.rows.map((_, index) => (
            <Cell fill={COLORS[index % COLORS.length]} key={index} />
          ))}
        </Pie>
      </PieChart>
    );
  }

  return (
    <div role="article" aria-label="Resposta do Tabelin.IA">
      <p
        style={{
          margin: "0 0 4px",
          fontSize: "12px",
          color: "var(--muted)"
        }}
      >
        Tabelin.IA
      </p>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "12px 16px",
          maxWidth: "90%"
        }}
      >
        {/* Título */}
        <p
          style={{
            fontSize: "12px",
            color: "var(--muted)",
            margin: "0 0 8px"
          }}
        >
          {data.title}
        </p>

        {/* Gráfico */}
        <div
          role="img"
          aria-label={`Grafico ${chartTypeLabel[activeType]} — ${data.title}`}
          style={{ minHeight: 220 }}
        >
          <ResponsiveContainer height={220} width="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>

        {/* Controles: alternância de tipo + botão copiar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "12px"
          }}
        >
          {(["bar", "line", "pie"] as ChartType[]).map((type) => (
            <button
              key={type}
              aria-pressed={activeType === type}
              onClick={() => setActiveType(type)}
              style={{
                border: activeType === type ? "none" : "1px solid var(--border)",
                borderRadius: "4px",
                background: activeType === type ? "var(--primary)" : "#fff",
                color: activeType === type ? "#fff" : "var(--text)",
                padding: "3px 10px",
                fontSize: "12px",
                cursor: "pointer"
              }}
              type="button"
            >
              {type === "bar" ? "Barras" : type === "line" ? "Linhas" : "Pizza"}
            </button>
          ))}
          <div style={{ marginLeft: "auto" }}>
            <CopyButton value={csvData} />
          </div>
        </div>
      </div>
    </div>
  );
}

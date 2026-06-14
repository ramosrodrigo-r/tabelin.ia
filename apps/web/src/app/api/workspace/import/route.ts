import { NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import type { TableColumn, TableSpecPayload } from "@tabelin/shared";

import { getSessionFromCookieHeader } from "@/server/auth/session";
import { detectFileType } from "@/server/extraction/byte-validation";
import { guardXlsxZip } from "@/server/extraction/zip-guard";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

function detectDelimiter(text: string): "," | ";" {
  const firstLine = text.split("\n")[0] ?? "";
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

function inferTypeForColumn(samples: unknown[]): "number" | "date" | "text" {
  const nonNull = samples.filter(
    (v) => v !== null && v !== undefined && String(v).trim() !== ""
  );
  if (nonNull.length === 0) return "text";

  if (nonNull.every((v) => v instanceof Date)) {
    return "date";
  }

  if (
    nonNull.every((v) => {
      const str = String(v).trim().replace(",", ".");
      return str.length > 0 && !isNaN(parseFloat(str)) && isFinite(Number(str));
    })
  ) {
    return "number";
  }

  if (
    nonNull.every((v) => {
      const s = String(v).trim();
      return s.length > 5 && !isNaN(Date.parse(s));
    })
  ) {
    return "date";
  }

  return "text";
}

export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Content-Type inválido." }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Arquivo excede o tamanho máximo de 5 MB." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const bytes = new Uint8Array(buffer);
    const fileType = await detectFileType(bytes);

    if (fileType.kind === "unsupported") {
      return NextResponse.json({ error: "Formato de arquivo não suportado. Use CSV ou XLSX." }, { status: 422 });
    }

    let rawRows: Record<string, unknown>[] = [];
    const fileName = file.name;

    if (fileType.kind === "xlsx") {
      const guardResult = guardXlsxZip(bytes);
      if (!guardResult.ok) {
        return NextResponse.json({ error: "Possível ZIP bomb detectado no arquivo." }, { status: 422 });
      }

      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const targetSheet = workbook.SheetNames[0];
      if (!targetSheet) {
        return NextResponse.json({ error: "Planilha vazia." }, { status: 422 });
      }

      const ws = workbook.Sheets[targetSheet];
      if (!ws) {
        return NextResponse.json({ error: "Aba não encontrada." }, { status: 422 });
      }

      rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
    } else {
      // Caso de texto / CSV
      const ext = fileName.toLowerCase().split(".").pop() ?? "";
      if (ext !== "csv") {
        return NextResponse.json({ error: "Formato de arquivo não suportado. Use CSV ou XLSX." }, { status: 422 });
      }

      const text = new TextDecoder("utf-8").decode(buffer);
      const delimiter = detectDelimiter(text);
      rawRows = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter,
      }) as Record<string, unknown>[];
    }

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "O arquivo não contém dados." }, { status: 422 });
    }

    // Limitar linhas a 200
    const limitedRawRows = rawRows.slice(0, 200);

    // Extrair headers
    const headers = Object.keys(limitedRawRows[0] ?? {});
    if (headers.length === 0) {
      return NextResponse.json({ error: "O arquivo não contém colunas válidas." }, { status: 422 });
    }

    // Limitar colunas a 26
    const limitedHeaders = headers.slice(0, 26);

    // Mapear cabeçalhos para chaves únicas seguras e inferir tipos
    const headersToKeys: Record<string, string> = {};
    const columnTypes: Record<string, "number" | "date" | "text"> = {};
    const columns: TableColumn[] = limitedHeaders.map((h, index) => {
      const baseKey = h
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/^_+|_+$/g, "");
      const key = baseKey || `col_${index}`;
      
      headersToKeys[h] = key;
      const type = inferTypeForColumn(limitedRawRows.map((r) => r[h]));
      columnTypes[h] = type;

      return {
        name: h,
        type: type === "number" ? "number" : type === "date" ? "date" : "text",
        key,
      };
    });

    // Mapear linhas estruturadas
    const rows = limitedRawRows.map((row) => {
      const mappedRow: Record<string, string | number> = {};
      limitedHeaders.forEach((h) => {
        const key = headersToKeys[h]!;
        const val = row[h];
        if (val instanceof Date) {
          mappedRow[key] = val.toISOString().slice(0, 10);
        } else if (typeof val === "number") {
          mappedRow[key] = val;
        } else if (val === null || val === undefined) {
          mappedRow[key] = "";
        } else {
          const strVal = String(val).trim();
          if (columnTypes[h] === "number") {
            const parsed = parseFloat(strVal.replace(",", "."));
            mappedRow[key] = isNaN(parsed) ? strVal : parsed;
          } else {
            mappedRow[key] = strVal;
          }
        }
      });
      return mappedRow;
    });

    // Derivar título do nome do arquivo
    const cleanFileName = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
    const title = cleanFileName.charAt(0).toUpperCase() + cleanFileName.slice(1) || "Planilha Importada";

    const payload: TableSpecPayload = {
      kind: "table_spec",
      title,
      columns,
      rows,
      rowCount: rows.length,
      separator: fileType.kind === "xlsx" ? ";" : detectDelimiter(new TextDecoder("utf-8").decode(buffer)),
      formulaLanguage: "pt-BR",
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Falha ao importar planilha", error);
    return NextResponse.json({ error: "Erro ao processar o arquivo de planilha." }, { status: 500 });
  }
}

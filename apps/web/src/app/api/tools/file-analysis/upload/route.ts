import { NextResponse } from "next/server";

import { createUploadedFile } from "@/server/file-analysis/file-repository";
import { parseFile } from "@/server/file-analysis/file-parser";
import { getSessionFromCookieHeader } from "@/server/auth/session";

export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requisicao invalida." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const sheetName = formData.get("sheetName") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Arquivo obrigatorio." }, { status: 400 });
  }

  // Validacao de tamanho: 5 MB (T-04-02-01)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Arquivo excede o limite de 5 MB. Reduza o tamanho e tente novamente." },
      { status: 413 }
    );
  }

  // T-04-01-03: validar extensao E MIME type
  const name = file.name.toLowerCase();
  const isCSV = name.endsWith(".csv") || file.type === "text/csv";
  const isXLSX =
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel";

  if (!isCSV && !isXLSX) {
    return NextResponse.json(
      { error: "Formato invalido. Use arquivos .csv ou .xlsx." },
      { status: 415 }
    );
  }

  const mimeType: "csv" | "xlsx" = isCSV ? "csv" : "xlsx";

  try {
    const buffer = await file.arrayBuffer();
    // PRIV-02: buffer raw descartado apos o parse — nunca persistido, nunca logado

    // Para XLSX: checar se ha multiplas abas sem sheetName especificado
    if (mimeType === "xlsx" && !sheetName) {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "array" });
      if (workbook.SheetNames.length > 1) {
        // Retorna lista de abas para o cliente escolher (D-06)
        return NextResponse.json(
          { type: "sheet_selection", sheetNames: workbook.SheetNames },
          { status: 200 }
        );
      }
    }

    const schema = parseFile(
      buffer,
      mimeType,
      sheetName ?? undefined,
      file.name
    );

    // PRIV-02: apenas metadata logada — sem conteudo do arquivo
    const savedFile = await createUploadedFile({
      userId: user.id,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || mimeType,
      schema,
      rowCount: schema.rowCount
    });

    if (!savedFile) {
      return NextResponse.json(
        { error: "Nao foi possivel processar o arquivo. Verifique se esta integro e tente novamente." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { type: "upload_complete", uploadedFileId: savedFile.id, schema },
      { status: 200 }
    );
  } catch {
    // T-04-01-02: nenhum log de conteudo raw
    return NextResponse.json(
      { error: "Nao foi possivel processar o arquivo. Verifique se esta integro e tente novamente." },
      { status: 422 }
    );
  }
}

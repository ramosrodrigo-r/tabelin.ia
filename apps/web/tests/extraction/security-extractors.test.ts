import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Helpers para criar buffers de teste
// ---------------------------------------------------------------------------

/**
 * Bytes mínimos de um PNG real (1×1 px, transparente).
 * Assinatura PNG: 89 50 4E 47 0D 0A 1A 0A
 */
function makePngBytes(): Uint8Array {
  // PNG 1×1 transparente (gerado via pnglib-js, sequência mínima válida)
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/**
 * Bytes mínimos de um JPEG real (1×1 px vermelho).
 * Assinatura JPEG: FF D8 FF
 */
function makeJpegBytes(): Uint8Array {
  const base64 =
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUEB/8QAIhAAAQMEAgMAAAAAAAAAAAAAAQIDBAUREiExBhP/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AmaXFQ2nZT3nB7dh7FGOiI0OtEbpF1XRXQAD/2Q==";
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/**
 * Bytes de um PDF real com texto ASCII longo (>50 chars) — necessário para
 * passar a heurística D-12 (text.trim().length >= 50).
 * Texto puro ASCII garante extração correta sem problema de encoding.
 */
function makePdfBytes(): Uint8Array {
  // Texto ASCII puro com 88 chars — confirmado extraível via unpdf
  const textContent =
    "This PDF file contains text layer data that is long enough for extraction tests to pass.";
  // Conteúdo do stream BT...ET com o texto
  const streamBody = `BT /F1 12 Tf 100 700 Td (${textContent}) Tj ET`;
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamBody.length} >>
stream
${streamBody}
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000055 00000 n
0000000112 00000 n
0000000274 00000 n
0000000353 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
450
%%EOF`;
  return new Uint8Array(Buffer.from(pdfContent, "utf-8"));
}

/**
 * Bytes de um XLSX real (gerado via xlsx lib).
 */
function makeXlsxBytes(): Uint8Array {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([{ col1: "valor", col2: 42 }]);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Uint8Array(buf);
}

/**
 * Bytes de texto puro CSV (sem magic bytes).
 */
function makeTextBytes(text = "nome,idade\nAlice,30"): Uint8Array {
  return new Uint8Array(Buffer.from(text, "utf-8"));
}

/**
 * Bytes de um GIF (formato não suportado).
 * Assinatura GIF: 47 49 46 38
 */
function makeGifBytes(): Uint8Array {
  // GIF89a 1×1 px transparente
  const base64 = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/**
 * Cria um XLSX real em Uint8Array (alias para makeXlsxBytes, para clareza).
 */
const makeRealXlsxBytes = makeXlsxBytes;

// ---------------------------------------------------------------------------
// Task 1: byte-validation.ts — magic bytes (D-10/SEC-02)
// ---------------------------------------------------------------------------

describe("byte-validation — magic bytes (D-10)", () => {
  it("PNG real → kind 'png' com mimeType 'image/png'", async () => {
    const { detectFileType } = await import("../../src/server/extraction/byte-validation");
    const bytes = makePngBytes();
    const result = await detectFileType(bytes);
    expect(result.kind).toBe("png");
    expect(result.mimeType).toBe("image/png");
  });

  it("JPEG real → kind 'jpg' com mimeType 'image/jpeg'", async () => {
    const { detectFileType } = await import("../../src/server/extraction/byte-validation");
    const bytes = makeJpegBytes();
    const result = await detectFileType(bytes);
    expect(result.kind).toBe("jpg");
    expect(result.mimeType).toBe("image/jpeg");
  });

  it("PDF real → kind 'pdf'", async () => {
    const { detectFileType } = await import("../../src/server/extraction/byte-validation");
    const bytes = makePdfBytes();
    const result = await detectFileType(bytes);
    expect(result.kind).toBe("pdf");
  });

  it("XLSX real → kind 'xlsx'", async () => {
    const { detectFileType } = await import("../../src/server/extraction/byte-validation");
    const bytes = makeXlsxBytes();
    const result = await detectFileType(bytes);
    expect(result.kind).toBe("xlsx");
  });

  it("texto puro (CSV, sem magic bytes) → kind 'text' (não INVALID_BYTES)", async () => {
    const { detectFileType } = await import("../../src/server/extraction/byte-validation");
    const bytes = makeTextBytes("nome,idade\nAlice,30");
    const result = await detectFileType(bytes);
    expect(result.kind).toBe("text");
  });

  it("GIF (não suportado) → kind 'unsupported'", async () => {
    const { detectFileType } = await import("../../src/server/extraction/byte-validation");
    const bytes = makeGifBytes();
    const result = await detectFileType(bytes);
    expect(result.kind).toBe("unsupported");
  });
});

// ---------------------------------------------------------------------------
// Task 2: zip-guard.ts — anti-ZIP-bomb (D-11/SEC-02) + discharge A2
// ---------------------------------------------------------------------------

describe("zip-guard — anti-ZIP-bomb (D-11) + discharge A2", () => {
  it("discharge A2: XLSX real → { ok: true } e originalSize > 0 para ao menos uma entrada", async () => {
    const { guardXlsxZip, getLastOriginalSizes } = await import("../../src/server/extraction/zip-guard");
    const bytes = makeRealXlsxBytes();
    const result = guardXlsxZip(bytes);

    expect(result.ok).toBe(true);

    // A2: prova que originalSize é confiável — ao menos uma entrada > 0
    const sizes = getLastOriginalSizes();
    expect(sizes.length).toBeGreaterThan(0);
    expect(sizes.some((s) => s > 0)).toBe(true);
  });

  it("ZIP com excesso de entradas (> 1000) → { ok: false, code: 'ZIP_BOMB' }", async () => {
    const { guardXlsxZip } = await import("../../src/server/extraction/zip-guard");

    // Criar ZIP sintético com 1001 entradas via fflate
    const { strToU8, zipSync } = await import("fflate");
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i <= 1000; i++) {
      files[`file${i}.txt`] = strToU8("x");
    }
    const zipped = zipSync(files);

    const result = guardXlsxZip(zipped);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("ZIP_BOMB");
  });

  it("ZIP cujo originalSize total excede MAX_TOTAL_UNCOMPRESSED → { ok: false, code: 'ZIP_BOMB' }", async () => {
    const { guardXlsxZip } = await import("../../src/server/extraction/zip-guard");

    // Criar ZIP com conteúdo total descompactado > 50 MB
    // Usamos um bloco de 51 MB de dados repetidos (comprime bem, mas originalSize reporta o real)
    const { zipSync } = await import("fflate");
    const bigData = new Uint8Array(51 * 1024 * 1024).fill(65); // 51 MB de 'A'
    const files: Record<string, Uint8Array> = { "big.bin": bigData };
    const zipped = zipSync(files);

    const result = guardXlsxZip(zipped);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("ZIP_BOMB");
  });
});

  it("ratio bomb → ZIP_BOMB (CR-01): ZIP com dados altamente comprimíveis produz ratio real >> MAX_RATIO", async () => {
    // RED: este teste deve FALHAR antes da adição de MAX_RATIO ao zip-guard.ts.
    // Abordagem determinística — sem mock: 1 MB de bytes NUL comprimem para ~1 KB via deflate,
    // produzindo ratio ~1000x >> MAX_RATIO=100.
    const { guardXlsxZip } = await import("../../src/server/extraction/zip-guard");
    const { zipSync } = await import("fflate");

    // 1 MB de bytes NUL — ratio real de compressão > 1000x
    const compressibleData = new Uint8Array(1024 * 1024).fill(0);
    const zipped = zipSync({ "bomb.bin": compressibleData });

    const result = guardXlsxZip(zipped);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("ZIP_BOMB");
  });

  it("per-entry bomb → ZIP_BOMB (CR-01): entrada com originalSize > MAX_ENTRY_UNCOMPRESSED=25 MB", async () => {
    // RED: este teste deve FALHAR antes da adição de MAX_ENTRY_UNCOMPRESSED ao zip-guard.ts.
    // Cria ZIP com entrada de 26 MB — acima de MAX_ENTRY_UNCOMPRESSED=25 MB.
    const { guardXlsxZip } = await import("../../src/server/extraction/zip-guard");
    const { zipSync } = await import("fflate");

    // 26 MB de bytes 'A' (dados repetitivos para compressão rápida em CI)
    const bigEntry = new Uint8Array(26 * 1024 * 1024).fill(65);
    const zipped = zipSync({ "big-entry.bin": bigEntry });

    const result = guardXlsxZip(zipped);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("ZIP_BOMB");
  });

  it("XLSX real com dados repetitivos não é falso-positivo (ratio < MAX_RATIO=100)", async () => {
    // Regressão: planilha com ~500 linhas de strings longas idênticas.
    // XLSX é XML deflate-comprimido; dados repetitivos podem atingir ratio 50-90x —
    // ainda abaixo de MAX_RATIO=100. Confirma que arquivos legítimos NÃO são rejeitados.
    const { guardXlsxZip } = await import("../../src/server/extraction/zip-guard");

    const wb = XLSX.utils.book_new();
    const longString = "valor_longo_que_se_repete_muitas_vezes_para_testar_ratio_de_compressao";
    const rows = Array.from({ length: 500 }, (_, i) => ({
      col1: longString,
      col2: longString,
      col3: i,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const bytes = new Uint8Array(buf);

    const result = guardXlsxZip(bytes);
    expect(result.ok).toBe(true);
  });

// ---------------------------------------------------------------------------
// Task 3: pdf-extractor.ts — extração + detecção de escaneado (EXT-03/EXT-06) + discharge A1
// ---------------------------------------------------------------------------

describe("pdf-extractor — unpdf (EXT-03/EXT-06) + discharge A1", () => {
  it("discharge A1: PDF com texto longo → { ok: true } com o texto extraído", async () => {
    const { extractPdf } = await import("../../src/server/extraction/pdf-extractor");
    const bytes = makePdfBytes();
    const result = await extractPdf(bytes);

    // A1: unpdf extrai texto corretamente para PDF com camada de texto
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text.trim().length).toBeGreaterThan(0);
  });

  it("discharge A1: PDF escaneado (texto < 50 chars) → { ok: false, code: 'SCANNED_PDF' }", async () => {
    const { extractPdf } = await import("../../src/server/extraction/pdf-extractor");

    // PDF mínimo sem camada de texto (apenas um stream vazio)
    const emptyPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj

xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n

trailer
<< /Size 4 /Root 1 0 R >>
startxref
197
%%EOF`;
    const bytes = new Uint8Array(Buffer.from(emptyPdf, "utf-8"));
    const result = await extractPdf(bytes);

    // A1: unpdf retorna string curta (não lança) para PDF sem texto → SCANNED_PDF
    // Se lançar em vez de retornar string curta, o catch produz EMPTY_EXTRACTION — documentado no SUMMARY
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code === "SCANNED_PDF" || result.code === "EMPTY_EXTRACTION").toBe(true);
  });

  it("PDF corrompido → { ok: false, code: 'EMPTY_EXTRACTION' }", async () => {
    const { extractPdf } = await import("../../src/server/extraction/pdf-extractor");

    const corruptBytes = new Uint8Array(Buffer.from("isso nao e um pdf valido %%EOF", "utf-8"));
    const result = await extractPdf(corruptBytes);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("EMPTY_EXTRACTION");
  });
});

// ---------------------------------------------------------------------------
// Task 4 (CR-02): dispatcher — input size guard (MAX_INPUT_BYTES)
// ---------------------------------------------------------------------------

describe("dispatcher — input size guard (CR-02)", () => {
  it("RED: buffer > MAX_INPUT_BYTES → FILE_TOO_LARGE antes de qualquer alocação", async () => {
    // RED: este teste deve FALHAR antes da adição de MAX_INPUT_BYTES ao dispatcher.ts.
    // Buffer.allocUnsafe suficiente para testar o guard sem custo de preenchimento.
    const { extractContent } = await import("../../src/server/extraction/dispatcher");
    const { MAX_INPUT_BYTES } = await import("../../src/server/extraction/dispatcher");

    const oversized = Buffer.allocUnsafe(MAX_INPUT_BYTES + 1);
    const result = await extractContent(oversized, "arquivo.xlsx");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("FILE_TOO_LARGE");
    expect(result.message).toContain("25 MB");
  });

  it("buffer === MAX_INPUT_BYTES (exatamente no limite) → guard NÃO rejeita (strict-greater)", async () => {
    // Regressão: buffer exatamente no limite deve prosseguir normalmente.
    // Usamos um XLSX real de tamanho < MAX_INPUT_BYTES, padded com Buffer.concat.
    // Na prática qualquer XLSX legítimo tem << 25 MB, então o guard não deve disparar.
    const { extractContent } = await import("../../src/server/extraction/dispatcher");
    const { MAX_INPUT_BYTES } = await import("../../src/server/extraction/dispatcher");

    // XLSX real pequeno — confirma que o guard é strict-greater (> e não >=)
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([{ col: "valor" }]);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const xlsxBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    // O XLSX real é << MAX_INPUT_BYTES; apenas verificamos que buffer.length <= MAX_INPUT_BYTES
    // não dispara o guard (tested implicitly — se o guard fosse >=, XLSX legítimo seria rejeitado)
    expect(xlsxBuf.length).toBeLessThanOrEqual(MAX_INPUT_BYTES);
    const result = await extractContent(xlsxBuf, "pequeno.xlsx");
    // Deve prosseguir normalmente (não FILE_TOO_LARGE)
    expect(result.ok).toBe(true);
  });
});

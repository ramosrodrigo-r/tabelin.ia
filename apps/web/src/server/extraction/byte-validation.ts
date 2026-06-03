import "server-only";

/**
 * D-10/SEC-02: Detecção de tipo de arquivo por magic bytes via file-type.
 *
 * Eleva o padrão de validação de extensão/MIME (padrão antigo de upload/route.ts)
 * para detecção por assinatura binária — impede spoofing de tipo.
 *
 * Pitfall 1: file-type@22 é ESM-only; usar dynamic import para compatibilidade
 * de bundling (precedente: await import("xlsx") em upload/route.ts:59).
 * Pitfall 3: undefined para CSV/TXT é correto — texto não tem magic bytes.
 */

export type FileKind = "pdf" | "png" | "jpg" | "xlsx" | "text" | "unsupported";

export type FileTypeResult = {
  kind: FileKind;
  /** mimeType preenchido para tipos binários com mapping definido; undefined para "text"/"unsupported" */
  mimeType?: "image/png" | "image/jpeg";
};

/**
 * Detecta o tipo real de um arquivo por magic bytes.
 *
 * - Binários suportados: pdf, png, jpg (jpeg), xlsx
 * - undefined da lib → sinal "text" (CSV/TXT não têm magic bytes — NÃO é erro, Pitfall 3)
 * - Binário não suportado (ex.: gif, mp4) → "unsupported"
 *
 * NÃO usa extensão/MIME declarado para binários — magic bytes substituem (D-10).
 */
export async function detectFileType(bytes: Uint8Array): Promise<FileTypeResult> {
  // Dynamic import para compatibilidade ESM em bundling Next (Pitfall 1)
  const { fileTypeFromBuffer } = await import("file-type");

  const detected = await fileTypeFromBuffer(bytes);

  if (!detected) {
    // undefined = sem assinatura binária reconhecida → texto legítimo (CSV/TXT)
    // Garantia de segurança: se fosse binário disfarçado, a lib teria detectado
    return { kind: "text" };
  }

  switch (detected.ext) {
    case "pdf":
      return { kind: "pdf" };
    case "png":
      return { kind: "png", mimeType: "image/png" };
    case "jpg":
      // file-type reporta JPEG como ext:"jpg" / mime:"image/jpeg" (RESEARCH 254)
      return { kind: "jpg", mimeType: "image/jpeg" };
    case "xlsx":
      return { kind: "xlsx" };
    default:
      // Formato binário não suportado nesta fase
      return { kind: "unsupported" };
  }
}

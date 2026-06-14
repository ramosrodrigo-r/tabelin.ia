import { NextResponse } from "next/server";

import {
  type IntentClassification,
  type OverrideIntent,
  type UnifiedIntent,
  overrideIntentSchema,
  tableStubPayloadSchema,
  unifiedIntentSchema,
} from "@tabelin/shared";

import { MAX_EXTRACTED_CHARS } from "@/server/ai/context-messages";
import { classifyIntent } from "@/server/ai/intent-classifier";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { extractContent } from "@/server/extraction/dispatcher";

const MAX_PROMPT_CHARS = 8_000;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

type ResolvedToolKind =
  | "formula"
  | "sql"
  | "regex"
  | "script"
  | "template"
  | "file_analysis"
  | "ocr"
  | "unified_table";

type UnifiedFields = {
  prompt: string;
  platform: string;
  formulaLanguage: string;
  separator: string;
  sqlDialect: string;
  scriptType: string;
  overrideIntent?: string;
  lastIntent?: string;
  overrideGenerate?: string;
  specOverride?: string;
};

type AttachmentMeta = {
  charCount: number;
  wasTruncated: boolean;
  extractedText: string;
};

const DEFAULT_FIELDS: UnifiedFields = {
  prompt: "",
  platform: "excel",
  formulaLanguage: "pt-BR",
  separator: ";",
  sqlDialect: "postgresql",
  scriptType: "apps_script",
};

const INTENT_TO_TOOL_KIND: Record<UnifiedIntent, ResolvedToolKind> = {
  formula: "formula",
  sql: "sql",
  regex: "regex",
  script: "script",
  template: "template",
  file_analysis: "file_analysis",
  ocr: "ocr",
  tabela: "unified_table",
  unknown: "formula",
};

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readObjectFields(body: unknown): UnifiedFields {
  const input = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  return {
    prompt: asString(input.prompt) ?? DEFAULT_FIELDS.prompt,
    platform: asString(input.platform) ?? DEFAULT_FIELDS.platform,
    formulaLanguage: asString(input.formulaLanguage) ?? DEFAULT_FIELDS.formulaLanguage,
    separator: asString(input.separator) ?? DEFAULT_FIELDS.separator,
    sqlDialect: asString(input.sqlDialect) ?? DEFAULT_FIELDS.sqlDialect,
    scriptType: asString(input.scriptType) ?? DEFAULT_FIELDS.scriptType,
    overrideIntent: asString(input.overrideIntent),
    lastIntent: asString(input.lastIntent),
    overrideGenerate: asString(input.overrideGenerate),
    specOverride: asString(input.specOverride),
  };
}

function readFormString(formData: FormData, key: keyof UnifiedFields) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

async function parseUnifiedRequest(request: Request): Promise<{ fields: UnifiedFields; file: File | null }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const rawFile = formData.get("file");

    return {
      fields: {
        prompt: readFormString(formData, "prompt") ?? DEFAULT_FIELDS.prompt,
        platform: readFormString(formData, "platform") ?? DEFAULT_FIELDS.platform,
        formulaLanguage: readFormString(formData, "formulaLanguage") ?? DEFAULT_FIELDS.formulaLanguage,
        separator: readFormString(formData, "separator") ?? DEFAULT_FIELDS.separator,
        sqlDialect: readFormString(formData, "sqlDialect") ?? DEFAULT_FIELDS.sqlDialect,
        scriptType: readFormString(formData, "scriptType") ?? DEFAULT_FIELDS.scriptType,
        overrideIntent: readFormString(formData, "overrideIntent"),
        lastIntent: readFormString(formData, "lastIntent"),
        overrideGenerate: readFormString(formData, "overrideGenerate"),
        specOverride: readFormString(formData, "specOverride"),
      },
      file: rawFile instanceof File && rawFile.size > 0 ? rawFile : null,
    };
  }

  const body = await request.json().catch(() => null);
  return { fields: readObjectFields(body), file: null };
}

function validatePrompt(prompt: string) {
  const trimmed = prompt.trim();
  if (trimmed.length < 3) {
    return { ok: false as const, error: "Descreva o que voce precisa antes de enviar." };
  }

  if (trimmed.length > MAX_PROMPT_CHARS) {
    return { ok: false as const, error: "Pedido muito longo. Reduza para ate 8000 caracteres." };
  }

  return { ok: true as const, prompt: trimmed };
}

function validateOptionalIntent(value: string | undefined, schema: typeof overrideIntentSchema | typeof unifiedIntentSchema) {
  if (!value) return { ok: true as const, value: undefined };

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return { ok: false as const, issues: parsed.error.issues };
  }

  return { ok: true as const, value: parsed.data };
}

function attachmentMetaFromContext(attachmentContext: string | undefined): AttachmentMeta | undefined {
  if (!attachmentContext) return undefined;

  const extractedText = attachmentContext.slice(0, MAX_EXTRACTED_CHARS);
  return {
    charCount: extractedText.length,
    wasTruncated: attachmentContext.length > MAX_EXTRACTED_CHARS,
    extractedText,
  };
}

function createEventStream(events: object[]) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      controller.close();
    },
  });
}

function responseFromStream(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function intentEvent(classification: IntentClassification) {
  return {
    type: "intent_detected" as const,
    intent: classification.intent === "unknown" ? ("formula" as const) : classification.intent,
    confidence: classification.confidence,
  };
}

function unsupportedLegacyIntentStream(
  classification: IntentClassification,
  prompt: string,
  resolvedToolKind: ResolvedToolKind,
  attachmentMeta?: AttachmentMeta
) {
  const payload = tableStubPayloadSchema.parse({
    kind: "table_stub",
    originalPrompt: prompt,
    message:
      "Este modo antigo nao esta mais disponivel. Descreva uma operacao na planilha aberta ou uma pergunta sobre os dados.",
  });

  return createEventStream([
    intentEvent(classification),
    ...(attachmentMeta ? [{ type: "attachment_grounded", ...attachmentMeta }] : []),
    { type: "metadata", metadata: { mode: "generate", providerModel: `removed-${resolvedToolKind}` } },
    { type: "delta", text: payload.message },
    { type: "complete", payload },
  ]);
}

export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  const { fields, file } = await parseUnifiedRequest(request);
  const promptResult = validatePrompt(fields.prompt);

  if (!promptResult.ok) {
    return NextResponse.json({ error: "Pedido invalido.", message: promptResult.error }, { status: 400 });
  }

  const overrideResult = validateOptionalIntent(fields.overrideIntent, overrideIntentSchema);
  if (!overrideResult.ok) {
    return NextResponse.json({ error: "Override invalido.", issues: overrideResult.issues }, { status: 400 });
  }

  const lastIntentResult = validateOptionalIntent(fields.lastIntent, unifiedIntentSchema);
  if (!lastIntentResult.ok) {
    return NextResponse.json({ error: "Intent anterior invalido.", issues: lastIntentResult.issues }, { status: 400 });
  }

  try {
    let attachmentContext: string | undefined;
    if (file) {
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ code: "FILE_TOO_LARGE", message: "Arquivo excede 5 MB." }, { status: 413 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await extractContent(buffer, file.name);
      if (!result.ok) {
        return NextResponse.json({ code: result.code, message: result.message }, { status: 422 });
      }

      attachmentContext = result.text;
    }

    const classification = await classifyIntent({
      prompt: promptResult.prompt,
      hasFile: file !== null,
      lastIntent: lastIntentResult.value,
      overrideIntent: overrideResult.value as OverrideIntent | undefined,
    });
    const resolvedToolKind = INTENT_TO_TOOL_KIND[classification.intent];

    const attachmentMeta = attachmentMetaFromContext(attachmentContext);

    return responseFromStream(
      unsupportedLegacyIntentStream(classification, promptResult.prompt, resolvedToolKind, attachmentMeta)
    );
  } catch (err) {
    console.error("unified chat failed", { err });
    return NextResponse.json({ error: "Nao consegui validar a resposta." }, { status: 502 });
  }
}

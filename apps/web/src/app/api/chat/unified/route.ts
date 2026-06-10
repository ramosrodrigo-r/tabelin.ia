import { NextResponse } from "next/server";

import {
  type FileDependentIntent,
  type IntentClassification,
  type OverrideIntent,
  type TableSpecPayload,
  type UnifiedIntent,
  fileAnalysisPayloadSchema,
  formulaGenerateRequestSchema,
  needsFilePayloadSchema,
  ocrPayloadSchema,
  overrideIntentSchema,
  regexGenerateRequestSchema,
  scriptGenerateRequestSchema,
  sqlGenerateRequestSchema,
  tableSpecPayloadSchema,
  tableStubPayloadSchema,
  templateGenerateRequestSchema,
  unifiedIntentSchema,
} from "@tabelin/shared";

import { GENERATE_MODE, MAX_EXTRACTED_CHARS } from "@/server/ai/context-messages";
import { createFormulaEventStream, resolveFormulaPayload } from "@/server/ai/formula-stream";
import { classifyIntent } from "@/server/ai/intent-classifier";
import { askClarificationQuestion, buildTableSpec } from "@/server/ai/table-clarifier";
import { createRegexEventStream, resolveRegexPayload } from "@/server/ai/regex-stream";
import { createScriptEventStream, resolveScriptPayload } from "@/server/ai/scripts-stream";
import { createSqlEventStream, resolveSqlPayload } from "@/server/ai/sql-stream";
import { createTemplateEventStream, resolveTemplatePayload } from "@/server/ai/template-stream";
import { getSessionFromCookieHeader } from "@/server/auth/session";
import { getUserEntitlement } from "@/server/billing/entitlements";
import { extractContent } from "@/server/extraction/dispatcher";
import { recordFormulaToolRequest } from "@/server/tools/formula-repository";
import { findConversationExchanges, saveConversationExchange } from "@/server/tools/conversation-repository";
import { recordToolRequest } from "@/server/tools/tool-repository";
import { confirmToolUse, releaseToolUse, reserveToolUse } from "@/server/usage/quota-service";

const MAX_PROMPT_CHARS = 8_000;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_CLAR_TURNS = 2;

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

function prefixIntentEvent(
  stream: ReadableStream<Uint8Array>,
  classification: IntentClassification
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`${JSON.stringify(intentEvent(classification))}\n`));

      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } finally {
        reader.releaseLock();
        controller.close();
      }
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

function needsFileStream(classification: IntentClassification, intent: FileDependentIntent) {
  const payload = needsFilePayloadSchema.parse({ kind: "needs_file", intent });
  return createEventStream([
    intentEvent(classification),
    { type: "needs_file", intent },
    { type: "complete", payload },
  ]);
}

function tableStubMessage() {
  return (
    "Detectei que voce quer montar uma tabela. Nesta fase eu ja separei o pedido; " +
    "a proxima etapa vai confirmar os campos e gerar a tabela interativa."
  );
}

async function ensureProUser(userId: string) {
  const entitlement = await getUserEntitlement(userId);
  return entitlement.plan === "pro" && entitlement.status === "active";
}

// ---------------------------------------------------------------------------
// Helpers para o loop de clarificação (case unified_table)
// ---------------------------------------------------------------------------

type ConversationExchangeLike = {
  assistantPayload: unknown;
};

/**
 * Conta quantos turns de clarificação existem no histórico do usuário.
 * Derivado exclusivamente do banco — nunca de campo client-side (T-13-08).
 */
function countClarTurns(history: ConversationExchangeLike[]): number {
  return history.filter((ex) => {
    const p = ex.assistantPayload as Record<string, unknown> | null;
    return p?.kind === "table_clar_question";
  }).length;
}

/**
 * Detecta se há uma clarificação unified_table ABERTA no histórico.
 * "Aberta" = o último exchange unified_table é uma table_clar_question
 * (ainda não finalizada em table_spec) E o teto de turns não foi atingido.
 * Derivado exclusivamente do banco — nunca de campo client-side (T-13-08).
 */
function hasOpenTableClarification(history: ConversationExchangeLike[], MAX: number): boolean {
  if (history.length === 0) return false;
  const lastPayload = history[history.length - 1]?.assistantPayload as Record<string, unknown> | null;
  const lastIsClarQuestion = lastPayload?.kind === "table_clar_question";
  return lastIsClarQuestion && countClarTurns(history) < MAX;
}

/**
 * Extrai a spec parcial mais recente do histórico de clarificação.
 * Utilizada para alimentar o LLM no próximo turno.
 */
function mergeSpecFromHistory(history: ConversationExchangeLike[]): Record<string, unknown> {
  const lastClarWithSpec = [...history]
    .reverse()
    .find((ex) => {
      const p = ex.assistantPayload as Record<string, unknown> | null;
      return p?.kind === "table_clar_question" && p?.spec;
    });
  const p = lastClarWithSpec?.assistantPayload as Record<string, unknown> | null;
  return (p?.spec as Record<string, unknown>) ?? {};
}

/**
 * Heurística: retorna true se o prompt parece um NOVO pedido de tabela
 * (contém variações de "tabela" com ou sem acento).
 */
function promptLooksLikeNewTableRequest(prompt: string): boolean {
  return /tabela|tabel[ao]/i.test(prompt);
}

/**
 * Contagem conservativa de turns — se o histórico estiver vazio E o prompt
 * não parece novo pedido, assume que o teto foi atingido (evita loop infinito
 * em falha silenciosa do banco — Armadilha 2).
 */
function conservativeClarTurnCount(
  history: ConversationExchangeLike[],
  prompt: string,
  MAX: number
): number {
  if (history.length === 0 && !promptLooksLikeNewTableRequest(prompt)) {
    return MAX;
  }
  return countClarTurns(history);
}

/**
 * Tenta parsear e validar a spec editada enviada pelo client no campo `specOverride`.
 * Re-validação server-side obrigatória — T-13-10.
 * Retorna null se ausente, JSON inválido ou falhar na validação Zod.
 */
function resolveOverrideSpec(specOverride: string | undefined): TableSpecPayload | null {
  if (!specOverride) return null;
  try {
    const raw = JSON.parse(specOverride) as unknown;
    const result = tableSpecPayloadSchema.safeParse(raw);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const user = getSessionFromCookieHeader(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ error: "Autenticacao obrigatoria." }, { status: 401 });
  }

  const startedAt = performance.now();
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

  if (file && !(await ensureProUser(user.id))) {
    return NextResponse.json(
      { code: "pro_required", feature: "attachment", cta: "pro_checkout" },
      { status: 403 }
    );
  }

  const quotaCheck = await reserveToolUse(user.id, "unified", "generate");
  if (!quotaCheck.allowed) {
    return NextResponse.json(
      { code: "quota_exceeded", meterKind: quotaCheck.meterKind, cta: "pro_checkout" },
      { status: 429 }
    );
  }

  try {
    let attachmentContext: string | undefined;
    if (file) {
      if (file.size > MAX_UPLOAD_BYTES) {
        await releaseToolUse(quotaCheck.reservationKey);
        return NextResponse.json({ code: "FILE_TOO_LARGE", message: "Arquivo excede 5 MB." }, { status: 413 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await extractContent(buffer, file.name);
      if (!result.ok) {
        await releaseToolUse(quotaCheck.reservationKey);
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
    let resolvedToolKind = INTENT_TO_TOOL_KIND[classification.intent];

    // CURTO-CIRCUITO DE CLARIFICAÇÃO (Phase 12/13 — bug table-clarification-misroute):
    // Se há uma clarificação unified_table aberta no histórico, OU a requisição
    // carrega overrideGenerate/specOverride (botões "Gerar mesmo assim" / "Confirmar
    // spec" do card de clarificação), o roteamento NÃO pode depender da reclassificação
    // do texto atual (uma resposta curta como "10, texto" cairia em formula/template).
    // Forçamos unified_table para que o loop de clarificação seja re-entrado e o flag
    // overrideGenerate/specOverride seja efetivamente avaliado. Estado derivado do banco
    // (T-13-08) — nunca de campo client-side bruto.
    if (resolvedToolKind !== "unified_table" && !file) {
      const wantsTableOverride =
        fields.overrideGenerate === "true" || Boolean(fields.specOverride);
      if (wantsTableOverride) {
        resolvedToolKind = "unified_table";
      } else {
        const tableHistory = await findConversationExchanges(user.id, "unified_table");
        if (hasOpenTableClarification(tableHistory, MAX_CLAR_TURNS)) {
          resolvedToolKind = "unified_table";
        }
      }
    }

    if ((classification.intent === "file_analysis" || classification.intent === "ocr") && !file) {
      await releaseToolUse(quotaCheck.reservationKey);
      return responseFromStream(needsFileStream(classification, classification.intent));
    }

    const attachmentMeta = attachmentMetaFromContext(attachmentContext);

    if (resolvedToolKind === "file_analysis" || resolvedToolKind === "ocr") {
      const payload =
        resolvedToolKind === "ocr"
          ? ocrPayloadSchema.parse({
              kind: "ocr",
              content: attachmentContext,
              metadata: { mode: GENERATE_MODE, providerModel: "extraction-dispatcher" },
            })
          : fileAnalysisPayloadSchema.parse({
              kind: "file_analysis",
              content: attachmentContext,
              metadata: { mode: GENERATE_MODE, providerModel: "extraction-dispatcher" },
            });

      await confirmToolUse(quotaCheck.reservationKey);
      await recordToolRequest({
        userId: user.id,
        toolKind: resolvedToolKind,
        mode: GENERATE_MODE,
        status: "success",
        latencyMs: Math.round(performance.now() - startedAt),
        providerModel: payload.metadata.providerModel,
      });

      return responseFromStream(
        createEventStream([
          intentEvent(classification),
          ...(attachmentMeta ? [{ type: "attachment_grounded", ...attachmentMeta }] : []),
          { type: "metadata", metadata: payload.metadata },
          { type: "delta", text: payload.content },
          { type: "complete", payload },
        ])
      );
    }

    if (resolvedToolKind === "template" && !(await ensureProUser(user.id))) {
      await releaseToolUse(quotaCheck.reservationKey);
      return NextResponse.json({ code: "pro_required", cta: "pro_checkout" }, { status: 403 });
    }

    switch (resolvedToolKind) {
      case "formula": {
        const requestPayload = formulaGenerateRequestSchema.parse({
          platform: fields.platform,
          formulaLanguage: fields.formulaLanguage,
          prompt: promptResult.prompt,
        });
        const history = await findConversationExchanges(user.id, "formula");
        const payload = await resolveFormulaPayload({
          mode: "generate",
          request: requestPayload,
          history,
          attachmentContext,
        });

        await confirmToolUse(quotaCheck.reservationKey);
        await recordFormulaToolRequest({
          userId: user.id,
          metadata: payload.metadata,
          status: "success",
          latencyMs: Math.round(performance.now() - startedAt),
        });
        await saveConversationExchange({
          userId: user.id,
          toolKind: "formula",
          mode: GENERATE_MODE,
          platform: requestPayload.platform,
          dialect: requestPayload.formulaLanguage,
          userPrompt: requestPayload.prompt,
          assistantPayload: payload,
          attachmentContext,
        });

        return responseFromStream(
          prefixIntentEvent(createFormulaEventStream(payload, quotaCheck.lastFreeUse, attachmentMeta), classification)
        );
      }

      case "sql": {
        const requestPayload = sqlGenerateRequestSchema.parse({
          dialect: fields.sqlDialect,
          prompt: promptResult.prompt,
        });
        const history = await findConversationExchanges(user.id, "sql");
        const payload = await resolveSqlPayload({ request: requestPayload, history, attachmentContext });

        await confirmToolUse(quotaCheck.reservationKey);
        await recordToolRequest({
          userId: user.id,
          toolKind: "sql",
          mode: GENERATE_MODE,
          dialect: requestPayload.dialect,
          status: "success",
          latencyMs: Math.round(performance.now() - startedAt),
          providerModel: payload.metadata.providerModel,
        });
        await saveConversationExchange({
          userId: user.id,
          toolKind: "sql",
          mode: GENERATE_MODE,
          dialect: requestPayload.dialect,
          userPrompt: requestPayload.prompt,
          assistantPayload: payload,
          attachmentContext,
        });

        return responseFromStream(
          prefixIntentEvent(createSqlEventStream(payload, quotaCheck.lastFreeUse, attachmentMeta), classification)
        );
      }

      case "regex": {
        const requestPayload = regexGenerateRequestSchema.parse({ prompt: promptResult.prompt });
        const history = await findConversationExchanges(user.id, "regex");
        const payload = await resolveRegexPayload({
          mode: "generate",
          request: requestPayload,
          history,
          attachmentContext,
        });

        await confirmToolUse(quotaCheck.reservationKey);
        await recordToolRequest({
          userId: user.id,
          toolKind: "regex",
          mode: GENERATE_MODE,
          status: "success",
          latencyMs: Math.round(performance.now() - startedAt),
          providerModel: payload.metadata.providerModel,
        });
        await saveConversationExchange({
          userId: user.id,
          toolKind: "regex",
          mode: GENERATE_MODE,
          userPrompt: requestPayload.prompt,
          assistantPayload: payload,
          attachmentContext,
        });

        return responseFromStream(
          prefixIntentEvent(createRegexEventStream(payload, quotaCheck.lastFreeUse, attachmentMeta), classification)
        );
      }

      case "script": {
        const requestPayload = scriptGenerateRequestSchema.parse({
          scriptType: fields.scriptType,
          prompt: promptResult.prompt,
        });
        const history = await findConversationExchanges(user.id, "script");
        const payload = await resolveScriptPayload({ request: requestPayload, history, attachmentContext });

        await confirmToolUse(quotaCheck.reservationKey);
        await recordToolRequest({
          userId: user.id,
          toolKind: "script",
          mode: GENERATE_MODE,
          dialect: requestPayload.scriptType,
          status: "success",
          latencyMs: Math.round(performance.now() - startedAt),
          providerModel: payload.metadata.providerModel,
        });
        await saveConversationExchange({
          userId: user.id,
          toolKind: "script",
          mode: GENERATE_MODE,
          dialect: requestPayload.scriptType,
          userPrompt: requestPayload.prompt,
          assistantPayload: payload,
          attachmentContext,
        });

        return responseFromStream(
          prefixIntentEvent(createScriptEventStream(payload, quotaCheck.lastFreeUse, attachmentMeta), classification)
        );
      }

      case "template": {
        const requestPayload = templateGenerateRequestSchema.parse({ prompt: promptResult.prompt });
        const history = await findConversationExchanges(user.id, "template");
        const payload = await resolveTemplatePayload({ request: requestPayload, history, attachmentContext });

        await confirmToolUse(quotaCheck.reservationKey);
        await recordToolRequest({
          userId: user.id,
          toolKind: "template",
          mode: GENERATE_MODE,
          status: "success",
          latencyMs: Math.round(performance.now() - startedAt),
          providerModel: payload.metadata.providerModel,
        });
        await saveConversationExchange({
          userId: user.id,
          toolKind: "template",
          mode: GENERATE_MODE,
          userPrompt: requestPayload.prompt,
          assistantPayload: payload,
          attachmentContext,
        });

        return responseFromStream(
          prefixIntentEvent(createTemplateEventStream(payload, quotaCheck.lastFreeUse, attachmentMeta), classification)
        );
      }

      case "unified_table": {
        const tableHistory = await findConversationExchanges(user.id, "unified_table");
        const clarTurnCount = conservativeClarTurnCount(tableHistory, promptResult.prompt, MAX_CLAR_TURNS);
        const collectedSpec = mergeSpecFromHistory(tableHistory);
        const shouldGenerate =
          clarTurnCount >= MAX_CLAR_TURNS || fields.overrideGenerate === "true";

        if (!shouldGenerate) {
          // CLARIFICATION PATH — NÃO debita cota (CLAR-05, T-13-09)
          await releaseToolUse(quotaCheck.reservationKey);

          const question = await askClarificationQuestion({
            prompt: promptResult.prompt,
            turnIndex: clarTurnCount,
            collectedSpec,
          });

          const clarPayload = {
            kind: "table_clar_question" as const,
            question,
            turnIndex: clarTurnCount,
            totalTurns: MAX_CLAR_TURNS,
            canSkip: true,
            spec: collectedSpec,
          };

          await saveConversationExchange({
            userId: user.id,
            toolKind: "unified_table",
            mode: GENERATE_MODE,
            userPrompt: promptResult.prompt,
            assistantPayload: clarPayload,
          });

          return responseFromStream(
            createEventStream([
              intentEvent(classification),
              { type: "complete", payload: clarPayload },
            ])
          );
        }

        // GENERATION PATH — debita cota
        await confirmToolUse(quotaCheck.reservationKey);

        const overrideSpec = resolveOverrideSpec(fields.specOverride);
        // tableSpec.kind === "table_spec" — garantido por tableSpecPayloadSchema
        const tableSpec = overrideSpec ?? (await buildTableSpec({
          prompt: promptResult.prompt,
          collectedSpec,
        }));

        await recordToolRequest({
          userId: user.id,
          toolKind: "unified_table",
          mode: GENERATE_MODE,
          status: "success",
          latencyMs: Math.round(performance.now() - startedAt),
          providerModel: "table-clarifier",
        });
        // Persiste com kind: "table_spec" no assistantPayload (tabela gerada)
        await saveConversationExchange({
          userId: user.id,
          toolKind: "unified_table",
          mode: GENERATE_MODE,
          userPrompt: promptResult.prompt,
          assistantPayload: { ...tableSpec, kind: "table_spec" as const },
        });

        return responseFromStream(
          createEventStream([
            intentEvent(classification),
            { type: "complete", payload: tableSpec },
          ])
        );
      }
    }
  } catch (err) {
    console.error("unified chat failed", { err });
    await releaseToolUse(quotaCheck.reservationKey);
    return NextResponse.json({ error: "Nao consegui validar a resposta." }, { status: 502 });
  }
}

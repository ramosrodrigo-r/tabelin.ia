import "server-only";

import { zodResponseFormat } from "openai/helpers/zod";

import {
  type IntentClassification,
  type QaResponsePayload,
  type TableSpecPayload,
  qaResponsePayloadSchema,
  tableSpecPayloadSchema,
} from "@tabelin/shared";

import { translateEnToPtBr } from "./formula-translator";
import { createOpenAIClient, getOpenAIModel } from "./openai-client";

/**
 * Provedor do protocolo de mutação chat->grade e Q&A do chat unificado.
 *
 * Para `sheet_operation` o modelo recebe o estado completo da planilha
 * (`specOverride`) e devolve uma NOVA tabela estruturada via Structured Outputs;
 * as fórmulas geradas (inglês) são traduzidas para pt-BR no BFF antes de
 * voltarem à grade. Para `qa` o modelo responde em texto (streaming).
 *
 * Sem `OPENAI_API_KEY`, um provedor de fixture determinístico ignora o prompt
 * e devolve um resultado estável (mutação ou Q&A) para dev/test (CHAT fixture).
 */

const SYSTEM_PROMPT_MUTATION = `Você é o motor de mutação de planilha do Tabelin.IA.
Receberá o estado atual de uma planilha (colunas, tipos e linhas) e um pedido do usuário.
Devolva a planilha COMPLETA já modificada conforme o pedido, no schema table_spec.
Regras:
- Escreva fórmulas em INGLÊS com separador de argumento ",", usando referências como C{row}. O sistema traduz para pt-BR.
- Preserve as colunas e linhas existentes a menos que o pedido peça para alterá-las.
- Nunca invente dados não solicitados; opere sobre os dados fornecidos.`;

const SYSTEM_PROMPT_QA = `Você é o assistente analítico do Tabelin.IA.
Receberá o estado atual de uma planilha (colunas, tipos e linhas) e uma pergunta do usuário.
Responda em português, de forma objetiva, SEM alterar a planilha. Apenas texto analítico.`;

export type SheetContext = {
  prompt: string;
  spec?: TableSpecPayload;
};

function serializeSpecForPrompt(spec: TableSpecPayload | undefined): string {
  if (!spec) return "Nenhuma planilha foi enviada no contexto.";

  const columns = spec.columns
    .map((c) => {
      const formula = c.formula ? ` fórmula=${c.formula}` : "";
      return `- ${c.name} (tipo=${c.type}${formula})`;
    })
    .join("\n");

  const rows = (spec.rows ?? [])
    .map((row, idx) => {
      const truncatedRow: Record<string, string | number> = {};
      for (const [key, val] of Object.entries(row)) {
        if (typeof val === "string" && val.length > 100) {
          truncatedRow[key] = val.slice(0, 97) + "...";
        } else {
          truncatedRow[key] = val;
        }
      }
      return `linha ${idx + 1}: ${JSON.stringify(truncatedRow)}`;
    })
    .join("\n");

  return [
    `Título: ${spec.title}`,
    `Colunas:`,
    columns,
    `Linhas (${spec.rowCount}):`,
    rows || "(sem linhas)",
  ].join("\n");
}

/**
 * Monta o prompt do usuário enriquecido com o contexto completo da planilha.
 * Exposto para testes/observabilidade.
 */
export function buildSheetUserPrompt(context: SheetContext): string {
  return [
    "ESTADO ATUAL DA PLANILHA:",
    serializeSpecForPrompt(context.spec),
    "",
    "PEDIDO DO USUÁRIO:",
    context.prompt,
  ].join("\n");
}

/** Traduz todas as fórmulas das colunas de uma tabela de EN para pt-BR. */
function translateSpecFormulas(spec: TableSpecPayload): TableSpecPayload {
  return {
    ...spec,
    columns: spec.columns.map((column) =>
      column.formula
        ? { ...column, formula: translateEnToPtBr(column.formula) }
        : column
    ),
    formulaLanguage: "pt-BR",
    separator: ";",
  };
}

// ── Fixture determinística (sem OPENAI_API_KEY) ──────────────────────────────

/**
 * Mutação de fixture: adiciona uma coluna "Total IA" de fórmula que soma as
 * colunas numéricas/currency existentes (ou ecoa a planilha quando não há base
 * numérica). Determinística — ignora o conteúdo exato do prompt.
 */
export function fixtureMutation(context: SheetContext): TableSpecPayload {
  const base: TableSpecPayload =
    context.spec ??
    ({
      kind: "table_spec",
      title: "Planilha",
      columns: [{ name: "Coluna A", type: "text", key: "colA" }],
      rowCount: 1,
      rows: [{ colA: "" }],
    } satisfies TableSpecPayload);

  const numericKeys = base.columns
    .filter((c) => c.type === "number" || c.type === "currency")
    .map((c) => ({ column: c, ref: columnRef(base, c.key ?? c.name) }))
    .filter((entry) => entry.ref !== null);

  if (numericKeys.length === 0) {
    // Nada para somar — ecoa a planilha já no idioma pt-BR.
    return translateSpecFormulas(base);
  }

  const sumRefs = numericKeys.map((entry) => entry.ref).join(", ");
  const totalColumn = {
    name: "Total IA",
    type: "formula" as const,
    key: "total_ia",
    // Fórmula em INGLÊS — translateSpecFormulas converte para pt-BR/`;`.
    formula: `=SUM(${sumRefs})`,
  };

  const mutated: TableSpecPayload = {
    ...base,
    columns: [...base.columns, totalColumn],
  };

  return translateSpecFormulas(mutated);
}

/** Retorna a letra correspondente ao índice da coluna estilo Excel (A, B, ..., Z, AA, AB, ...). */
function columnLetter(index: number): string {
  let n = index;
  let letter = "";
  do {
    letter = String.fromCharCode("A".charCodeAt(0) + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letter;
}

/** Resolve a letra de coluna (estilo Excel) de uma chave de coluna no spec. */
function columnRef(spec: TableSpecPayload, key: string): string | null {
  const index = spec.columns.findIndex((c) => (c.key ?? c.name) === key);
  if (index < 0) return null;
  const letter = columnLetter(index);
  return `${letter}{row}`;
}

/** Resposta de Q&A de fixture: texto analítico coerente e determinístico. */
export function fixtureQa(context: SheetContext): QaResponsePayload {
  const spec = context.spec;
  if (!spec) {
    return qaResponsePayloadSchema.parse({
      kind: "qa_response",
      content:
        "Não há planilha carregada no momento, então não consigo analisar dados. Carregue ou gere uma planilha e refaça a pergunta.",
    });
  }

  const colNames = spec.columns.map((c) => c.name).join(", ");
  return qaResponsePayloadSchema.parse({
    kind: "qa_response",
    content: `A planilha "${spec.title}" tem ${spec.rowCount} linha(s) e as colunas: ${colNames}. Com base nesses dados, posso resumir, comparar e calcular totais sob demanda. (Resposta de fixture: defina OPENAI_API_KEY para análises reais.)`,
  });
}

// ── Provedor real (OpenAI) ───────────────────────────────────────────────────

async function openAiMutation(context: SheetContext): Promise<TableSpecPayload> {
  const client = createOpenAIClient();
  const completion = await client.chat.completions.parse({
    model: getOpenAIModel(),
    messages: [
      { role: "system", content: SYSTEM_PROMPT_MUTATION },
      { role: "user", content: buildSheetUserPrompt(context) },
    ],
    response_format: zodResponseFormat(tableSpecPayloadSchema, "table_spec"),
  });

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) {
    throw new Error("Mutation provider returned no parsed table_spec");
  }

  // Traduz as fórmulas geradas (EN) para pt-BR no BFF antes de voltar à grade.
  return translateSpecFormulas(parsed);
}

async function* openAiQaDeltas(context: SheetContext): AsyncGenerator<string> {
  const client = createOpenAIClient();
  const stream = await client.chat.completions.create({
    model: getOpenAIModel(),
    stream: true,
    messages: [
      { role: "system", content: SYSTEM_PROMPT_QA },
      { role: "user", content: buildSheetUserPrompt(context) },
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

// ── API pública do provedor ──────────────────────────────────────────────────

export function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Gera a nova tabela para uma operação de planilha (sheet_operation).
 * Usa OpenAI quando há chave; caso contrário a fixture determinística.
 * As fórmulas retornadas já estão traduzidas para pt-BR.
 */
export async function generateMutation(
  context: SheetContext
): Promise<TableSpecPayload> {
  if (!hasOpenAiKey()) {
    return fixtureMutation(context);
  }
  return openAiMutation(context);
}

/**
 * Gera a resposta de Q&A em deltas de texto. Em modo fixture devolve um único
 * delta determinístico; com chave, transmite o stream real da OpenAI.
 */
export async function* generateQaDeltas(
  context: SheetContext
): AsyncGenerator<string> {
  if (!hasOpenAiKey()) {
    yield fixtureQa(context).content;
    return;
  }
  yield* openAiQaDeltas(context);
}

export type { IntentClassification };

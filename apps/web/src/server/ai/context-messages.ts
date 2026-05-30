import "server-only";

import type { ConversationExchange } from "@prisma/client";

/**
 * Número máximo de trocas a incluir no histórico de contexto multi-turn.
 * Estratégia D-07: teto numérico antes da guarda de tokens.
 */
export const MAX_EXCHANGES = 10;

/**
 * Literal canônico do modo "generate" persistido em ConversationExchange.mode.
 *
 * Centralizado para evitar drift stringly-typed (WR-04): o filtro D-03 e o
 * caminho de gravação (route handlers) devem referenciar esta constante em vez
 * de repetir o literal "generate", que falharia silenciosamente como contexto
 * vazio se divergir (ex.: "GENERATE", "gen").
 */
export const GENERATE_MODE = "generate";

/**
 * Orçamento conservador de tokens reservado para o histórico.
 *
 * gpt-5-mini tem janela de contexto de ~128k tokens.
 * Reservamos ~4.000 tokens para o histórico, deixando folga para:
 *   - system prompt (~500 tokens)
 *   - prompt atual do usuário (~500 tokens)
 *   - resposta do modelo (~2.000 tokens)
 * A heurística ~4 chars/token é uma guarda de segurança conservadora.
 * Um tokenizer real (tiktoken) está deferido (ver 08-CONTEXT.md <deferred>).
 */
const SAFE_TOKEN_BUDGET = 4_000;

/**
 * Estima o número de tokens em um texto usando heurística chars/4.
 * Guarda conservadora — tokenizer real está deferido.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Serializa o assistantPayload de um ConversationExchange em prosa natural.
 *
 * Extrai apenas o artefato principal + explicação curta por tool kind (D-05).
 * NUNCA emite JSON cru, metadata, warnings, assumptions ou outros campos —
 * isso impede que o modelo imite o formato JSON de saída (T-08-01).
 *
 * RISCO RESIDUAL (WR-02): o corpo do artefato (query SQL, regex, código VBA/
 * Apps Script, Markdown de template) e o userPrompt são texto influenciado pelo
 * usuário e são reproduzidos como mensagens assistant/user em turnos seguintes.
 * O field-stripping NÃO é defesa de injeção: uma explicação adversária persistida
 * é replayed como contexto "confiável". Mitigação real (delimitar/rotular o
 * histórico, reforçar no system prompt que turnos anteriores são referência e não
 * instruções) está fora do escopo desta fase. Tratar o histórico como não-confiável.
 *
 * Retorna null para payloads com kind desconhecido ou campos ausentes (D-09).
 */
function serializeAssistant(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const p = payload as Record<string, unknown>;

  switch (p.kind) {
    case "sql": {
      const query = typeof p.query === "string" ? p.query.trim() : "";
      const explanation = typeof p.explanation === "string" ? p.explanation.trim() : "";
      if (!query || !explanation) return null;
      return `${query}\n\n${explanation}`;
    }

    case "regex_generate": {
      const pattern = typeof p.pattern === "string" ? p.pattern.trim() : "";
      const explanation = typeof p.explanation === "string" ? p.explanation.trim() : "";
      if (!pattern || !explanation) return null;
      return `${pattern}\n\n${explanation}`;
    }

    case "script": {
      const code = typeof p.code === "string" ? p.code.trim() : "";
      const explanation = typeof p.explanation === "string" ? p.explanation.trim() : "";
      if (!code || !explanation) return null;
      return `${code}\n\n${explanation}`;
    }

    case "template": {
      const output = typeof p.output === "string" ? p.output.trim() : "";
      const explanation = typeof p.explanation === "string" ? p.explanation.trim() : "";
      if (!output || !explanation) return null;
      return `${output}\n\n${explanation}`;
    }

    default:
      // Kind desconhecido — pular sem throw (D-09 / T-08-03)
      return null;
  }
}

/**
 * Trunca o histórico de exchanges aplicando estratégia híbrida (D-07 / D-08):
 *
 * 1. Mantém no máximo as últimas MAX_EXCHANGES=10 trocas (mais recentes).
 * 2. Estima tokens por heurística ~4 chars/token somando userPrompt + payload.
 * 3. Se exceder SAFE_TOKEN_BUDGET, remove trocas mais antigas uma a uma até caber.
 *
 * T-08-02: guarda de DoS — histórico não-confiável nunca excede o limite seguro.
 *
 * @param history Array de exchanges já ordenado cronologicamente (asc).
 * @returns Subconjunto truncado, mantendo os mais recentes, dentro do orçamento.
 */
export function truncateHistory(history: ConversationExchange[]): ConversationExchange[] {
  if (history.length === 0) return [];

  // Passo 1: teto numérico — últimas MAX_EXCHANGES trocas
  let truncated = history.slice(-MAX_EXCHANGES);

  // Passo 2: guarda de tokens — estimar custo total do histórico truncado.
  // Estima contra a MESMA serialização que será enviada ao modelo
  // (serializeAssistant: artefato + explicação), não o JSON cru — o payload
  // bruto inclui metadata/warnings/assumptions que nunca trafegam (WR-01).
  function totalTokens(exchanges: ConversationExchange[]): number {
    return exchanges.reduce((sum, ex) => {
      const promptTokens = estimateTokens(ex.userPrompt);
      const serialized = serializeAssistant(ex.assistantPayload) ?? "";
      const payloadTokens = estimateTokens(serialized);
      return sum + promptTokens + payloadTokens;
    }, 0);
  }

  // Passo 3: cortar mais antigas uma a uma até caber no orçamento.
  // Preserva sempre ao menos a troca mais recente (WR-02): se a última troca
  // sozinha exceder o orçamento, retorná-la vazia daria ZERO contexto justamente
  // no turno que o usuário mais provavelmente referencia. O recorte do corpo
  // serializado quando uma única troca estoura o budget está deferido (ver
  // 08-CONTEXT.md <deferred>); por ora a retemos inteira em vez de descartá-la.
  while (truncated.length > 1 && totalTokens(truncated) > SAFE_TOKEN_BUDGET) {
    truncated = truncated.slice(1);
  }

  return truncated;
}

/**
 * Constrói o array de mensagens para uma chamada multi-turn ao LLM.
 *
 * Responsabilidade única: serialização + montagem. Truncagem via truncateHistory
 * (caller ou este módulo — veja parâmetro skipTruncation para testes unitários).
 *
 * Aplica internamente truncateHistory antes de serializar (D-07/D-08).
 *
 * Ordem de saída: [system, ...historyMsgs, user] (D-06).
 * - Exchanges com mode != "generate" são descartados (D-03).
 * - userPrompt → role:"user" direto (D-04).
 * - assistantPayload → role:"assistant" via serializador conciso (D-05).
 * - Payload com kind desconhecido ou campos ausentes → exchange pulado (D-09).
 *
 * @param toolKind  Kind do tool ("sql" | "regex" | "script" | "template").
 * @param history   Exchanges persistidos, ordenados por createdAt asc.
 * @param systemPrompt  Conteúdo do system message.
 * @param userPrompt    Prompt atual do usuário (turno corrente, não no histórico).
 * @returns Array de ChatCompletionMessageParam compatível com openai SDK.
 */
export function buildToolContextMessages(
  toolKind: string,
  history: ConversationExchange[],
  systemPrompt: string,
  userPrompt: string
): import("openai").OpenAI.Chat.ChatCompletionMessageParam[] {
  // D-03: descartar exchanges com mode != "generate" (literal via GENERATE_MODE — WR-04)
  const generateExchanges = history.filter((ex) => ex.mode === GENERATE_MODE);

  // D-07/D-08: truncagem híbrida
  const truncated = truncateHistory(generateExchanges);

  // Serializar cada exchange em par [user, assistant]
  const historyMessages: import("openai").OpenAI.Chat.ChatCompletionMessageParam[] = [];

  for (const ex of truncated) {
    const assistantContent = serializeAssistant(ex.assistantPayload);

    // Pular exchange se o payload não puder ser serializado (kind desconhecido ou campos ausentes)
    if (assistantContent === null) continue;

    // D-04: userPrompt → role:user direto
    historyMessages.push({ role: "user", content: ex.userPrompt });

    // D-05: assistantPayload serializado em prosa natural
    historyMessages.push({ role: "assistant", content: assistantContent });
  }

  // Montar array final espelhando buildFileChatMessages (file-chat-stream.ts:62-69)
  return [
    { role: "system", content: systemPrompt },
    ...historyMessages,
    { role: "user", content: userPrompt }
  ];
}

# Phase 8: Multi-turn LLM Context - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 8-multi-turn-llm-context
**Areas discussed:** Escopo (tools e modos), Serialização do histórico, Estratégia de truncagem, Fallback e bordas

---

## Escopo: tools e modos

### Tratamento do Formula

| Option | Description | Selected |
|--------|-------------|----------|
| Deixar de fora por ora | Multi-turn só em SQL/Regex/Scripts/Template; Formula fica como fixture; "fiar ao LLM real" anotado como lacuna/fase futura | ✓ |
| Fiar Formula ao LLM real + contexto | Substituir o fixture por chamada OpenAI real + contexto; amplia escopo e muda geração de fórmula | |
| Você decide | Researcher avalia esforço e escolhe caminho de menor risco | |

**User's choice:** Deixar de fora por ora (recomendado)
**Notes:** Formula usa fixture determinístico (`formula-stream.ts` não chama o LLM). Flagado que o exemplo do ROADMAP ("agora adapte para o Google Sheets") é de Formula — critério #1 será ilustrado por um tool que chama o LLM. Geração real de fórmula é lacuna de produto separada.

### Modos explain

| Option | Description | Selected |
|--------|-------------|----------|
| Só generate | Contexto multi-turn só em `generate`; `explain` é ação isolada | ✓ |
| Generate e explain | Ambos recebem contexto; mistura threads | |
| Você decide | Escolher por coerência com histórico salvo | |

**User's choice:** Só generate (recomendado)
**Notes:** `explain` (Formula/Regex) atua sobre conteúdo colado, sem thread conversacional.

---

## Serialização do histórico

| Option | Description | Selected |
|--------|-------------|----------|
| Texto conciso por tool | Serializador por tool: artefato principal + explicação curta; ignora metadata/warnings | ✓ |
| Só o artefato principal | Só query/pattern/código, sem explicação | |
| Payload JSON bruto | Serializar o assistantPayload inteiro como JSON | |

**User's choice:** Texto conciso por tool (recomendado)
**Notes:** `userPrompt` vira `role:user`; assistente vira texto natural (artefato + explicação) para evitar que o modelo imite formato JSON.

---

## Estratégia de truncagem

### Estratégia

| Option | Description | Selected |
|--------|-------------|----------|
| Híbrido: teto N + guarda de tokens | Máx. últimas N trocas; se estourar orçamento de tokens, corta mais | ✓ |
| Só N fixo de trocas | Sempre últimas N trocas, sem contar tokens | |
| Só orçamento de tokens | Trocas recentes até encher budget, sem teto fixo | |

**User's choice:** Híbrido: teto N + guarda de tokens (recomendado)
**Notes:** Atende literalmente MULTI-02.

### Tokens / N

| Option | Description | Selected |
|--------|-------------|----------|
| Heurística chars/4, N=10 | Estimativa ~4 chars/token, sem nova dependência; teto de 10 trocas | ✓ |
| Tokenizer real (tiktoken), N=10 | Contagem exata via lib; nova dependência | |
| Você decide | Researcher/planner calibram método e N | |

**User's choice:** Heurística chars/4, N=10 (recomendado)
**Notes:** Margem conservadora sobre o limite do `gpt-5-mini`.

---

## Fallback e bordas

| Option | Description | Selected |
|--------|-------------|----------|
| Seguir sem contexto | "Skip on error" das fases 6/7: loga e chama LLM só com system+user | ✓ |
| Retornar erro ao usuário | Falhar a requisição se o histórico não puder ser lido | |

**User's choice:** Seguir sem contexto (recomendado)
**Notes:** Primeira msg sem histórico = system+user; turno atual não duplicado (save após stream); isolamento por `userId+toolKind` (MULTI-03).

---

## Claude's Discretion

- Nome/assinatura das funções serializadoras por tool e onde vivem.
- Valor exato do limite seguro de tokens e da margem na heurística.
- Ponto exato de leitura do histórico no route handler e forma de passar `history` aos streams.
- Forma de filtrar `explain` na leitura do contexto.

## Deferred Ideas

- Fiar o Formula ao LLM real (pré-requisito para multi-turn e geração real de fórmula) — candidata a fase própria.
- Multi-turn nos modos `explain` — reavaliar se houver demanda.
- File Analysis no histórico persistente — permanece efêmero por privacidade.
- Tokenizer real (tiktoken) — só se a heurística chars/4 se mostrar imprecisa.
- Busca/filtro/export de histórico — Future.

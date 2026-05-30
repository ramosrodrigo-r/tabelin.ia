---
status: diagnosed
trigger: "Phase 08 multi-turn: 2nd+ turn follow-up returns byte-for-byte identical previous answer (SQL + Regex). New instruction ignored. Single-turn works."
created: 2026-05-30T00:00:00Z
updated: 2026-05-30T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — The messages array structure is correct ([system, user_old, assistant_old, user_new]). The defect is in message CONTENT/prompting: (a) injected assistant turns are prose while the system prompt + response_format demand JSON, and (b) the static single-shot system prompt never tells the model that history is prior context and that it must answer the LATEST user message / modify the prior artifact. With gpt-5-mini, the terse follow-up is answered by regenerating the original answer.
test: Traced full pipeline (client -> route -> stream -> buildToolContextMessages) and unit/integration tests.
expecting: N/A — root cause confirmed.
next_action: Diagnosis-only mode — return ROOT CAUSE FOUND. Do NOT fix.

## Symptoms

expected: 2nd turn follow-up builds on prior artifact, applying the new instruction (e.g. add ORDER BY data_cadastro; or new RG regex).
actual: 2nd turn returns BYTE-FOR-BYTE identical prior assistant answer (same SQL + same "Premissas"; same CPF regex). New instruction fully ignored.
errors: none (no crash, wrong output)
reproduction: Tests 1 & 2 in 08-UAT.md — generate then follow-up in SQL and Regex tools.
started: After Phase 08 multi-turn + code-review --fix --auto pass (commits 54b8a13, a2ab9bc).

## Eliminated

- hypothesis: H1/H4 — messages array misordered / stale/duplicated user prompt / off-by-one.
  evidence: context-messages.test.ts asserts exact order [system, user_old, assistant_old, user_new] with `result.at(-1)` = live "Prompt atual". Code at context-messages.ts:194-198 appends the live userPrompt LAST. Structure is provably correct.
  timestamp: 2026-05-30

- hypothesis: H3 — current-turn userPrompt not passed through (old prompt reused).
  evidence: Route handlers pass `parsed.data.prompt` (the live request body prompt) as the 4th arg to buildToolContextMessages (sql-stream.ts:42, regex-stream.ts:47). Client (use-sql-stream.ts:41) sends `prompt: input.text` from the live textbox. New prompt genuinely reaches the model.
  timestamp: 2026-05-30

- hypothesis: History read includes the current turn so model matches/echoes it.
  evidence: Route reads history (line 31) BEFORE saving current exchange (line 44). History strictly excludes the current turn.
  timestamp: 2026-05-30

- hypothesis: Fixture mode — OPENAI_API_KEY unset returns SQL_FIXTURES[0] every time (prompt-agnostic, would be byte-identical).
  evidence: UAT first responses are prompt-relevant (CPF regex for "validar cpf"; clientes query). Fixtures don't match prompts, so a real key was in use. Not fixture mode.
  timestamp: 2026-05-30

- hypothesis: mode-filter mismatch drops history (read filters mode != GENERATE_MODE).
  evidence: Route saves mode:"generate" literal; GENERATE_MODE="generate"; findConversationExchanges filters mode:GENERATE_MODE. They match. (And a dropped history would yield NO echo, contradicting the symptom.)
  timestamp: 2026-05-30

## Evidence

- timestamp: 2026-05-30
  checked: context-messages.ts buildToolContextMessages (assembly)
  found: Order is [system, ...historyMessages, {role:user, content:userPrompt}]. Live userPrompt appended LAST. Correct.
  implication: Structural hypotheses (H1/H3/H4) eliminated. Bug is in message CONTENT/prompting, not ordering.

- timestamp: 2026-05-30
  checked: serializeAssistant (context-messages.ts:59-99) vs system prompts (sql/regex/scripts/template-stream.ts)
  found: Injected assistant history messages are PLAIN PROSE — SQL: `${query}\n\n${explanation}`; regex: `${pattern}\n\n${explanation}`. The `assumptions`/`warnings` (rendered as "Premissas") are STRIPPED from history. But the system prompt commands `Responda APENAS com JSON valido: {"query":...,"explanation":...,"assumptions":[...]}` AND the call sets `response_format: {type:"json_object"}`.
  implication: The model's own prior turns (history) are in a format that contradicts both the system instruction and the enforced response format. The history looks nothing like what the model is told to produce.

- timestamp: 2026-05-30
  checked: byte-for-byte identical symptom incl. "Premissas" (assumptions)
  found: serializeAssistant STRIPS assumptions, so the prose history does NOT contain "Premissas". Yet the 2nd response reproduced the same assumptions identically. The model could only produce identical assumptions by regenerating the ENTIRE original answer to the ORIGINAL request — not by editing the prose history.
  implication: DECISIVE. The model is effectively answering the OLD question both times. The new instruction ("ordene por data"; "validar rg") is not treated as the operative request. CPF->RG producing byte-identical output under default sampling is essentially impossible by chance — proves same effective request.

- timestamp: 2026-05-30
  checked: system prompts in all four stream resolvers
  found: Static, single-shot framing ("Gere uma consulta ... em resposta ao pedido"). NONE mention multi-turn, NONE label history as prior reference context, NONE instruct the model to answer the LATEST user message or to MODIFY the prior artifact when the new turn is a refinement. Model is gpt-5-mini (openai-client.ts:6), no temperature/seed set.
  implication: With no multi-turn guidance + a malformed (prose-vs-JSON) history block + a terse follow-up, gpt-5-mini regenerates the prior complete artifact instead of applying the new instruction.

- timestamp: 2026-05-30
  checked: multi-turn-context.test.ts (integration) + context-messages.test.ts (unit)
  found: Integration tests mock findConversationExchanges to return [] in EVERY case — the real multi-turn path (non-empty history assembled into a live LLM call) was NEVER exercised end-to-end. Unit tests assert array STRUCTURE only, never the model's behavior on that structure.
  implication: The defect lives in untested territory (prompt design for non-empty history); structure tests passing gave false confidence.

## Resolution

root_cause: |
  The bug is NOT in the message-array assembly (that is provably correct:
  [system, ...history, live_user_prompt], live prompt last). It is a multi-turn
  PROMPTING defect with two compounding causes, both in the static system prompts +
  the history serialization, shared by all four tools (sql/regex/scripts/template):

  1) HISTORY/OUTPUT FORMAT MISMATCH. serializeAssistant injects each prior assistant
     turn as PLAIN PROSE (`artifact\n\nexplanation`), but the system prompt commands
     "Responda APENAS com JSON valido {...}" and the call enforces
     response_format:{type:"json_object"}. The model's own prior turns therefore do
     not match the format it is being told to produce, degrading the history into
     weak/ignored context.

  2) NO MULTI-TURN INSTRUCTION. The system prompts are static single-shot framings
     ("Gere uma consulta ... em resposta ao pedido"). They never tell the model that
     earlier turns are prior context, that it must answer the LATEST user message, or
     that a terse follow-up ("agora ordene por data"; "quero validar um rg") is a
     refinement of / replacement for the prior request. With gpt-5-mini and a short
     follow-up, the model "completes the pattern" by regenerating the previous full
     artifact verbatim instead of applying the new instruction.

  Decisive proof it is answering the OLD request: the 2nd SQL response reproduced the
  "Premissas" (assumptions) byte-for-byte even though serializeAssistant STRIPS
  assumptions from history — the model could only produce them by regenerating the
  original answer to the original prompt. And CPF->RG yielding byte-identical output
  under default sampling is impossible by chance.

  Why single-turn works and multi-turn fails: single-turn sends [system, user] with no
  conflicting prose-history block and no prior artifact to echo, so the model answers
  the prompt normally.
fix: (deferred — diagnosis-only mode; plan-phase --gaps will design the fix)
verification: (deferred)
files_changed: []

---
status: partial
phase: 08-multi-turn-llm-context
source: [08-VERIFICATION.md]
started: 2026-05-31T00:16:31Z
updated: 2026-06-01T00:00:00Z
---

## Current Test

[bloqueado por ambiente — OPENAI_API_KEY ausente; reexecutar com chave setada]

## Tests

### 1. Follow-up SQL ao vivo
expected: Gerar uma query SQL, depois enviar "agora adicione ORDER BY nome". A segunda resposta constrói sobre a anterior e aplica a nova instrução — não repete a resposta anterior verbatim.
result: BLOCKED — o ambiente testado roda sem OPENAI_API_KEY (comentada em apps/web/.env.local:7). As respostas devolvidas foram os fixtures determinísticos (sql-stream.ts:23-31) que ignoram prompt e histórico por design. O LLM não foi chamado, então o comportamento multi-turn não pôde ser exercitado. A saída recebida bate byte-a-byte com packages/shared/src/sql/fixtures.ts (a query do fixture já contém ORDER BY total_compras DESC).

### 2. Follow-up Regex ao vivo
expected: Gerar regex de CPF, depois enviar "quero validar um RG". Um novo padrão é gerado para RG, sem repetir o padrão de CPF anterior.
result: BLOCKED — mesmo motivo: regex-stream.ts:23 caiu no fixture (packages/shared/src/regex/fixtures.ts). Sem chamada ao LLM, sem teste real do histórico.

## Summary

total: 2
passed: 0
issues: 0
pending: 0
skipped: 0
blocked: 2

## Gaps

- Nenhum gap de código identificado. A falha observada foi um artefato do ambiente de teste (fixture mode sem OPENAI_API_KEY), não um defeito da camada multi-turn. Reexecutar os 2 testes com OPENAI_API_KEY setada antes de qualquer gap closure.

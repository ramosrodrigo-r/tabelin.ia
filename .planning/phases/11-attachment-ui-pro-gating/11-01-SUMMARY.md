---
phase: 11-attachment-ui-pro-gating
plan: "01"
subsystem: stream-protocol
tags: [attachment, ndjson, schema, stream-emitter, route-handler, test-fix]
dependency_graph:
  requires: [10-03-SUMMARY.md]
  provides: [attachment_grounded NDJSON event, attachmentMeta in 5 routes]
  affects: [formula-stream, sql-stream, regex-stream, scripts-stream, template-stream]
tech_stack:
  added: []
  patterns: [discriminated-union-extension, optional-param-spread-conditional]
key_files:
  created: []
  modified:
    - packages/shared/src/formula/schema.ts
    - packages/shared/src/sql/schema.ts
    - packages/shared/src/regex/schema.ts
    - packages/shared/src/scripts/schema.ts
    - packages/shared/src/template/schema.ts
    - apps/web/src/server/ai/formula-stream.ts
    - apps/web/src/server/ai/sql-stream.ts
    - apps/web/src/server/ai/regex-stream.ts
    - apps/web/src/server/ai/scripts-stream.ts
    - apps/web/src/server/ai/template-stream.ts
    - apps/web/src/app/api/tools/formula/generate/route.ts
    - apps/web/src/app/api/tools/sql/generate/route.ts
    - apps/web/src/app/api/tools/regex/generate/route.ts
    - apps/web/src/app/api/tools/scripts/generate/route.ts
    - apps/web/src/app/api/tools/template/generate/route.ts
    - apps/web/tests/formula-ui.test.tsx
decisions:
  - "Nomes únicos para AttachmentGroundedEvent: FormulaAttachmentGroundedEvent, SqlAttachmentGroundedEvent, etc. — evita conflito de export no barrel index.ts"
  - "attachment_grounded inserido como segundo elemento no discriminatedUnion (posição pré-metadata) para refletir ordem de emissão"
metrics:
  duration: ~8 min
  completed: 2026-06-04
  tasks: 3
  files: 16
---

# Phase 11 Plan 01: Stream Protocol Attachment Grounded Summary

**One-liner:** Evento `attachment_grounded` com charCount/wasTruncated/extractedText adicionado ao NDJSON dos 5 tools via Zod discriminatedUnion, param opcional nos emitters, e attachmentMeta construído com `slice(0, MAX_EXTRACTED_CHARS)` nos route handlers.

## Tasks Completed

| Task | Name | Commit | Files Modified |
|------|------|--------|----------------|
| 1 | Schemas — adicionar variant attachment_grounded | 946b19f | 5 schema files em packages/shared |
| 2 | Stream emitters — adicionar terceiro parâmetro attachmentMeta | 8aa078a | 5 stream emitters em apps/web/src/server/ai |
| 3 | Route handlers — construir attachmentMeta + fix teste pré-existente | 4cfaba0 | 5 routes + formula-ui.test.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Export name conflict no barrel index.ts**
- **Found during:** Task 1 (typecheck pós-edição)
- **Issue:** O plano indicava `export type AttachmentGroundedEvent = Extract<XxxStreamEvent, ...>` com o mesmo nome em todos os 5 schemas. Como `packages/shared/src/index.ts` usa `export *` de todos os schemas, o TypeScript reportou TS2308: "has already exported a member named 'AttachmentGroundedEvent'"
- **Fix:** Renomear cada tipo com prefixo do tool: `FormulaAttachmentGroundedEvent`, `SqlAttachmentGroundedEvent`, `RegexAttachmentGroundedEvent`, `ScriptAttachmentGroundedEvent`, `TemplateAttachmentGroundedEvent`
- **Files modified:** todos os 5 schema files em packages/shared
- **Commit:** 946b19f (inline com a task — reenviado no mesmo commit após correção)

## Verification Results

- grep attachment_grounded: todos os 5 schemas retornam 2 linhas cada (variant + export de tipo) ✓
- grep attachmentMeta nos emitters: todos os 5 retornam >=1 ✓
- grep attachmentMeta nos routes: todos os 5 retornam >=2 (construcao + chamada) ✓
- pnpm typecheck: sem novos erros introduzidos (erros pre-existentes do Prisma client sem Prisma generate) ✓
- pnpm exec vitest run tests/formula-ui.test.tsx: 5/5 tests passed ✓
- Fixture mode preservado: OPENAI_API_KEY check intacto em todos os emitters ✓

## Known Stubs

Nenhum. Toda a funcionalidade está wired: schemas validados, emitters emitem evento quando presente, routes constroem attachmentMeta a partir do attachmentContext real.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| (none) | — | Nenhuma nova superfície de segurança introduzida. attachmentMeta.extractedText é derivado de attachmentContext (já validado pelo extractor Phase 9/10, cap de 5 MB no route, slice para MAX_EXTRACTED_CHARS=8000). Mitigações T-11-01-02 e T-11-01-03 aplicadas conforme threat register. |

## Self-Check: PASSED

- SUMMARY.md: FOUND
- Commit 946b19f (Task 1 schemas): FOUND
- Commit 8aa078a (Task 2 emitters): FOUND
- Commit 4cfaba0 (Task 3 routes + test): FOUND

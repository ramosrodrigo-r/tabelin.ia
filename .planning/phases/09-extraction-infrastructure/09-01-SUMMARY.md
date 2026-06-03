---
phase: 09-extraction-infrastructure
plan: 01
subsystem: infra
tags: [typescript, unpdf, file-type, fflate, extraction, pdf, zip, discriminated-union]

# Dependency graph
requires: []
provides:
  - "ExtractionResult discriminated union + ExtractionErrorCode (5 códigos D-09) em apps/web/src/server/extraction/types.ts"
  - "unpdf@1.6.2, file-type@22.0.1, fflate@0.8.3 instalados e importáveis no runtime de teste"
affects:
  - 09-extraction-infrastructure/09-02
  - 09-extraction-infrastructure/09-03
  - 09-extraction-infrastructure/09-04

# Tech tracking
tech-stack:
  added: [unpdf@1.6.2, file-type@22.0.1, fflate@0.8.3]
  patterns:
    - "ExtractionResult discriminated union: { ok: true; text } | { ok: false; code; message }"
    - "Dynamic import (await import()) para módulos ESM-only como file-type@22"
    - "server-only alias em vitest.config.ts — testes de server code funcionam sem erros ESM"

key-files:
  created:
    - apps/web/src/server/extraction/types.ts
    - apps/web/tests/extraction/zip-guard-deps.test.ts
  modified:
    - apps/web/package.json
    - pnpm-lock.yaml

key-decisions:
  - "Contrato ExtractionResult estende convenção Result do projeto (reset-password.ts) adicionando code + message pt-BR"
  - "Pacotes instalados via pnpm (não npm) — projeto usa pnpm workspaces; npm --workspace falhou"
  - "Dynamic import usado no smoke test para compatibilidade com ESM-only de file-type@22"
  - "Gate blocking-human (Task 2) honrado — install só após aprovação explícita do humano (T-09-SC)"

patterns-established:
  - "Pattern D-09: todos os extratores retornam ExtractionResult via import from './types'"
  - "Smoke test de deps em tests/extraction/ valida disponibilidade real antes de Plans 02-04 dependerem"

requirements-completed: [SEC-02]

# Metrics
duration: 20min
completed: 2026-06-03
---

# Phase 09 Plan 01: Contrato tipado ExtractionResult e 3 deps de extração instaladas

**Discriminated union ExtractionResult com 5 códigos D-09 (types.ts) + unpdf/file-type/fflate instalados e provados importáveis via smoke test vitest 3/3 verde**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-06-03T18:00:00Z
- **Completed:** 2026-06-03T19:35:00Z
- **Tasks:** 3 (Task 1 + Task 2 checkpoint + Task 3)
- **Files modified:** 4

## Accomplishments

- `apps/web/src/server/extraction/types.ts` define o contrato D-09 completo: `ExtractionErrorCode` (5 literais), `ExtractionError`, `ExtractionSuccess`, `ExtractionResult` — base de todas as Plans 02-04
- Checkpoint humano (Task 2, gate=blocking-human) respeitado — pacotes nunca instalados antes da aprovação explícita (T-09-SC)
- `pnpm add unpdf@1.6.2 file-type@22.0.1 fflate@0.8.3 --filter web` executado com sucesso; deps pinadas em `apps/web/package.json`
- Smoke test `zip-guard-deps.test.ts` (3 testes, 3 verdes) prova que `extractText`, `getDocumentProxy`, `fileTypeFromBuffer` e `unzipSync` são funções importáveis no runtime vitest

## Task Commits

1. **Task 1: Definir o contrato de erro tipado (types.ts)** - `33ecdcf` (feat)
2. **Task 2: Checkpoint de legitimidade dos pacotes** - aprovado por humano (nenhum commit — gate)
3. **Task 3: Instalar as 3 deps e provar import (smoke test)** - `f42b392` (feat)

**Plan metadata:** (commit final abaixo)

## Files Created/Modified

- `apps/web/src/server/extraction/types.ts` — Discriminated union ExtractionResult + ExtractionErrorCode (D-09); começa com `import "server-only"`
- `apps/web/tests/extraction/zip-guard-deps.test.ts` — Smoke test: dynamic import de unpdf/file-type/fflate, asserções typeof function
- `apps/web/package.json` — Adicionados unpdf@1.6.2, file-type@22.0.1, fflate@0.8.3
- `pnpm-lock.yaml` — Lockfile atualizado com as 3 novas deps

## Decisions Made

- **pnpm em vez de npm**: O projeto usa pnpm workspaces (`pnpm-workspace.yaml`). O comando `npm install --workspace apps/web` falhou; correto é `pnpm add ... --filter web`.
- **Dynamic import no smoke test**: `file-type@22` é ESM-only; usar `await import("file-type")` evita o erro `require() of ES Module` documentado em 09-RESEARCH.md Pitfall 1.
- **Gate blocking-human honrado**: A instrução no plan explicita que o checkpoint Task 2 nunca é auto-aprovado mesmo com `auto_advance` ativo — executor aguardou sinal "aprovado" antes de rodar qualquer install.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Substituição de `npm install --workspace` por `pnpm add --filter`**
- **Found during:** Task 3 (instalação das deps)
- **Issue:** O plano especificava `npm install unpdf@1.6.2 file-type@22.0.1 fflate@0.8.3 --workspace apps/web` mas o projeto usa pnpm. O comando npm falhou com "No workspaces found".
- **Fix:** Executado `pnpm add unpdf@1.6.2 file-type@22.0.1 fflate@0.8.3 --filter web` — semanticamente equivalente, mesmo resultado em `apps/web/package.json`.
- **Files modified:** apps/web/package.json, pnpm-lock.yaml
- **Verification:** `node -e "require('./apps/web/package.json').dependencies['unpdf']"` retorna `1.6.2`; smoke test passa 3/3
- **Committed in:** f42b392

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Correção necessária; resultado idêntico ao esperado. Sem desvio de escopo.

## Issues Encountered

- Uso de pnpm vs npm não estava explícito no plano; detectado ao falhar o comando npm e resolvido automaticamente verificando `package.json` raiz e `pnpm-workspace.yaml`.

## User Setup Required

None - nenhuma configuração externa necessária.

## Next Phase Readiness

- **Plans 02-04 desbloqueadas:** `types.ts` exporta o contrato completo; qualquer extrator pode `import type { ExtractionResult } from "./types"` sem bloqueio de compilação
- **Pacotes disponíveis:** unpdf, file-type, fflate em node_modules; smoke test confirma importabilidade real
- **Blocker monitorado:** `unpdf` é o único pacote novo não testado em extração real de PDF — validação acontece na Plan 02

## Known Stubs

None - nenhum stub ou placeholder introduzido.

## Threat Flags

Nenhuma superfície nova além do previsto no `<threat_model>` do plano. T-09-SC mitigado via gate blocking-human cumprido.

## Self-Check: PASSED

- `apps/web/src/server/extraction/types.ts` existe: FOUND
- `apps/web/tests/extraction/zip-guard-deps.test.ts` existe: FOUND
- Commit 33ecdcf (Task 1): FOUND
- Commit f42b392 (Task 3): FOUND

---
*Phase: 09-extraction-infrastructure*
*Completed: 2026-06-03*

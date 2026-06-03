---
phase: 09-extraction-infrastructure
plan: "05"
subsystem: infra
tags: [security, zip-bomb, fflate, extraction, typescript, tdd, file-validation]

# Dependency graph
requires:
  - phase: 09-extraction-infrastructure/09-04
    provides: dispatcher extractContent + zip-guard guardXlsxZip (ambos sem ratio/input guards)
provides:
  - ExtractionErrorCode agora inclui FILE_TOO_LARGE (6 membros)
  - guardXlsxZip: ratio check (originalSize/info.size > MAX_RATIO=100) fecha bypass de ZIP bomb com metadado forjado (CR-01)
  - guardXlsxZip: per-entry cap (originalSize > MAX_ENTRY_UNCOMPRESSED=25 MB) complementa cap total
  - extractContent: MAX_INPUT_BYTES=25 MB guard como PRIMEIRA instrução, antes de qualquer Uint8Array/ArrayBuffer (CR-02)
  - Testes de segurança adicionais: ratio bomb, per-entry bomb, FILE_TOO_LARGE — 43 testes verdes total
affects:
  - 09-extraction-infrastructure/Phase 10 (rotas de upload)
  - Callers do dispatcher que podem distinguir FILE_TOO_LARGE de UNSUPPORTED_TYPE

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ratio-check anti-ZIP-bomb: usar info.size (comprimido, confiável) em vez de info.originalSize (attacker-controlled) para ratio check é a defesa real contra ZIP bombs com central directory forjado"
    - "input-size-guard-first: guard de tamanho de input como PRIMEIRA instrução do dispatcher, antes de qualquer new Uint8Array() ou new ArrayBuffer(), previne dupla alocação de memória para inputs de tamanho arbitrário"
    - "deterministic-bomb-test: criar ZIP bomb para teste com dados altamente comprimíveis (NUL bytes) via zipSync — sem mock, sem spy, sem API nova no código de produção"

key-files:
  created: []
  modified:
    - apps/web/src/server/extraction/types.ts
    - apps/web/src/server/extraction/zip-guard.ts
    - apps/web/src/server/extraction/dispatcher.ts
    - apps/web/tests/extraction/security-extractors.test.ts

key-decisions:
  - "Ratio check usa info.size (tamanho comprimido real no arquivo) em vez de info.originalSize (metadado do central directory, gravável pelo atacante) — esta é a defesa real contra ZIP bombs com metadado forjado"
  - "MAX_RATIO=100 é conservador e deixa margem para XLSX legítimos com dados repetitivos (ratio real ~50-90x), confirmado com regressão de 500 linhas de strings longas idênticas"
  - "_lastOriginalSizes (WR-07 do REVIEW): warning de concorrência real documentado no SUMMARY mas fora do escopo bloqueador — não modificado neste plano; candidato a próximo ciclo"
  - "MAX_INPUT_BYTES guard é strict-greater (>) não >= para alinhar com o limite real de upload de 25 MB (arquivo de exatamente 25 MB ainda passa)"

patterns-established:
  - "Pattern: guard de segurança como primeira instrução — antes de qualquer alocação ou transformação de dados"
  - "Pattern: TDD com testes RED determinísticos que usam dados reais (NUL bytes comprimíveis) em vez de mocks"

requirements-completed: [SEC-02]

# Metrics
duration: 5min
completed: 2026-06-03
---

# Phase 09 Plan 05: Gap Closure SEC-02 — Ratio Cap + Input Size Guard Summary

**guardXlsxZip fecha bypass ZIP bomb via ratio check em info.size (comprimido) + per-entry cap 25 MB; extractContent rejeita inputs >25 MB com FILE_TOO_LARGE antes de qualquer alocação de Uint8Array/ArrayBuffer (CR-01 + CR-02 fechados, SEC-02 satisfeito)**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-06-03T20:35:42Z
- **Completed:** 2026-06-03T20:41:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `zip-guard.ts`: adicionados `MAX_RATIO=100` e `MAX_ENTRY_UNCOMPRESSED=25MB` — ratio check em `info.size` (comprimido, confiável) fecha o bypass CR-01 onde ZIP bomb com `originalSize` forjado passava pelo guard e explodia em `XLSX.read`
- `dispatcher.ts`: `MAX_INPUT_BYTES=25MB` como PRIMEIRA instrução de `extractContent` — impede dupla alocação ~2N bytes para inputs de tamanho arbitrário (CR-02 fechado)
- `types.ts`: `FILE_TOO_LARGE` adicionado ao `ExtractionErrorCode` (6 membros) — callers da Phase 10 podem distinguir arquivo-grande de tipo não suportado
- 43 testes passando (38 baseline + 5 novos: ratio bomb, per-entry bomb, XLSX legítimo regressão, FILE_TOO_LARGE guard, limite exato)

## Task Commits

Cada task foi commitada atomicamente com ciclo TDD RED→GREEN:

1. **Baseline infrastructure sync** - `c564ea5` (chore) — checkout extraction/*.ts + packages do main para o worktree
2. **Task 1 RED: ratio bomb + per-entry bomb tests** - `021718c` (test)
3. **Task 1 GREEN: FILE_TOO_LARGE + zip-guard ratio/per-entry** - `3d30011` (feat)
4. **Task 2 RED: dispatcher input size guard tests** - `af005fd` (test)
5. **Task 2 GREEN: MAX_INPUT_BYTES guard in dispatcher** - `52f37ae` (feat)

## Files Created/Modified

- `apps/web/src/server/extraction/types.ts` — `FILE_TOO_LARGE` adicionado ao `ExtractionErrorCode` union
- `apps/web/src/server/extraction/zip-guard.ts` — `MAX_RATIO=100`, `MAX_ENTRY_UNCOMPRESSED=25MB`; ratio check + per-entry cap no filter do fflate; JSDoc atualizado documentando que `info.originalSize` é attacker-controlled e que ratio check é a defesa real
- `apps/web/src/server/extraction/dispatcher.ts` — `MAX_INPUT_BYTES=25MB` exportado; guard como primeira instrução de `extractContent` antes de `new Uint8Array(buffer)`
- `apps/web/tests/extraction/security-extractors.test.ts` — 5 testes novos: ratio bomb (1 MB NUL → ratio ~1000x, confirmado >100), per-entry bomb (26 MB), XLSX com 500 linhas repetitivas não é falso-positivo, FILE_TOO_LARGE (oversized buffer), limite exato não rejeita

## Decisions Made

- Ratio check usa `info.size` (tamanho comprimido real) e não `info.originalSize` (attacker-controlled metadata) — esta é a distinção central da correção CR-01
- `MAX_RATIO=100` é conservador: XLSX com 500 linhas de strings longas idênticas produziu ratio bem abaixo de 100 (verificado empiricamente na regressão)
- Guard de input é strict-greater (`>`) não `>=` — arquivo de exatamente 25 MB ainda passa, alinhado com o limite de upload da plataforma
- `_lastOriginalSizes` (WR-07 do REVIEW) tem warning de concorrência real entre requests paralelas mas está fora do escopo bloqueador deste plano; não modificado; candidato ao próximo ciclo de refinamento

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree não tinha arquivos de extração nem dependências instaladas**
- **Found during:** Início da execução (antes de qualquer task)
- **Issue:** O branch `worktree-agent-a2afc721ebd660cea` divergiu do `main` antes das commits da Phase 09. Os arquivos `apps/web/src/server/extraction/`, `apps/web/tests/extraction/`, `package.json` com `fflate`/`file-type`/`unpdf`, e a exportação de `formatSchemaForPrompt` não existiam no worktree.
- **Fix:** `git checkout main -- apps/web/src/server/extraction/ apps/web/tests/extraction/ apps/web/package.json pnpm-lock.yaml apps/web/src/server/ai/file-chat-stream.ts` + `pnpm install --frozen-lockfile`
- **Verification:** 38 testes passando antes de qualquer modificação do plano
- **Committed in:** `c564ea5` (chore: sync extraction infrastructure baseline)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking setup issue)
**Impact on plan:** Setup necessário para o worktree funcionar; sem scope creep.

## Known Stubs

Nenhum — todos os valores são reais e fluem para o runtime de produção.

## Threat Flags

Nenhuma superfície nova além das mitigações documentadas no `<threat_model>` do plano (T-09-05-01 a T-09-05-04 todas implementadas).

## Deferred Items

- `_lastOriginalSizes`: estado mutável global compartilhado entre requisições. Warning de concorrência documentado mas não resolvido neste plano (WR-07 do REVIEW). A correção recomendada é retornar os sizes no valor de retorno de `guardXlsxZip` em vez de estado global — candidato ao próximo ciclo.

## Issues Encountered

Worktree divergia do main antes das commits da Phase 09 — resolvido com `git checkout main --` para trazer os arquivos de extração e dependências. Todos os 38 testes passaram após o sync antes de qualquer modificação.

## User Setup Required

Nenhum — não requer configuração de serviços externos.

## Next Phase Readiness

- SEC-02 satisfeito: `guardXlsxZip` usa ratio check em `info.size` (comprimido) que não pode ser forjado pelo atacante; `extractContent` rejeita inputs acima de 25 MB antes de qualquer alocação
- `FILE_TOO_LARGE` disponível no contrato — Phase 10 (rotas de upload) pode distinguir arquivo-grande de tipo não suportado e retornar HTTP 413 adequado
- `MAX_INPUT_BYTES` exportado do dispatcher — rotas upstream podem validar antes de chamar
- 43 testes verdes confirmam que nenhuma regressão foi introduzida

---
*Phase: 09-extraction-infrastructure*
*Completed: 2026-06-03*

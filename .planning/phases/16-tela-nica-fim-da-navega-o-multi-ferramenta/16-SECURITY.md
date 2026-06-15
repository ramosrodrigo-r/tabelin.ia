---
phase: 16-tela-nica-fim-da-navega-o-multi-ferramenta
status: secured
asvs_level: 1
block_on: high
audited: 2026-06-15
threats_total: 8
threats_closed: 8
threats_open: 0
threats_accepted: 6
register_authored_at_plan_time: true
---

# SECURITY.md — Phase 16: Tela Única, Fim da Navegação Multi-Ferramenta

Audit date: 2026-06-15
ASVS level: 1
block_on: high

## Threat Verification Summary

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-16-01 | Tampering (open redirect) | accept | CLOSED | `apps/web/next.config.ts:7-12` — 6 entradas de `redirects()`, todas com `destination: "/workspace"` literal estático, sem interpolação de input do usuário. Sem superfície de redirect externo. |
| T-16-02 | Information Disclosure | accept | CLOSED | Cadeia `/workspace/sql` → 308 → `/workspace` → gate de auth → `/sign-in`. Comportamento pré-existente; layout segue como gate de auth (ver T-16-06). Redirects para o mesmo destino não criam nova superfície. |
| T-16-03 | Tampering | accept | CLOSED | `topbar.tsx:28` `toolKind = toolKindProp ?? "unified"`; `:44` mantém `DELETE /api/conversations/${toolKind}` autenticado por sessão. `usePathname`/`useWorkspaceToolKind` ausentes (grep 0). `toolKind` fixo não introduz novo input. |
| T-16-04 | Tampering | accept | CLOSED | `workspace-split.tsx:18` `useState<"grid"\|"chat">("grid")` — estado de UI puramente client-side, não persiste nem trafega para o servidor. |
| T-16-05 | Information Disclosure | accept | CLOSED | `sample-spec.ts:10-30` — `SAMPLE_SPEC` é dado estático/público ("Controle de Gastos"), sem dados de usuário, sem persistência (D-06). Ver Notas: drift de fase posterior. |
| T-16-06 | Elevation of Privilege | mitigate | CLOSED | `layout.tsx:18-20` — `if (!user) redirect("/sign-in")` executado antes de qualquer carga de dados; guard preservado e na ordem correta. Coberto por teste `layout.test.tsx:94-107` (caso "redireciona para /sign-in quando não há usuário autenticado"). |
| T-16-07 | Tampering (CSS regression) | mitigate | CLOSED | `globals.css` — zero referências residuais a `.sidebar*`/`.workspace-content`/`.workspace-center` (grep exit 1). Classes de split presentes (`workspace-grid-panel`, `workspace-chat-panel`, `workspace-mobile-toggle` + media block). `.topbar-brand:270` autocontida. `sidebar.tsx`/`tool-nav.tsx` deletados, sem imports residuais. |
| T-16-SC | Tampering (supply chain) | accept | CLOSED | Nenhuma dependência nova instalada nesta fase. Ambos os SUMMARYs declaram `tech-stack.added: []` (RESEARCH.md: Package Legitimacy Audit "não aplicável"). |

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-16-01 | T-16-01 | `destination` é literal estático, não controlável pelo usuário — sem risco de open redirect | gsd-security-auditor | 2026-06-15 |
| AR-16-02 | T-16-02 | Cadeia de redirect reaproveita gate de auth pré-existente; sem nova superfície | gsd-security-auditor | 2026-06-15 |
| AR-16-03 | T-16-03 | `toolKind` fixo não adiciona input; endpoint de delete já autenticado | gsd-security-auditor | 2026-06-15 |
| AR-16-04 | T-16-04 | Estado de toggle puramente client-side, não persiste nem trafega | gsd-security-auditor | 2026-06-15 |
| AR-16-05 | T-16-05 | `SAMPLE_SPEC` é dado estático/público, sem dados de usuário | gsd-security-auditor | 2026-06-15 |
| AR-16-SC | T-16-SC | Nenhuma dependência nova instalada na fase | gsd-security-auditor | 2026-06-15 |

## Unregistered Flags

None. Nenhum dos SUMMARYs (`16-01`, `16-02`) contém seção `## Threat Flags`; nenhuma nova superfície de ataque foi declarada durante a implementação.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-15 | 8 | 8 | 0 | gsd-security-auditor |

## Notes

- **Drift de fase posterior (informativo, não é gap da fase 16):** `layout.tsx` evoluiu além do plano da fase 16 (fases 20+): agora carrega `getActiveSpreadsheetSpec(user.id)` e passa `initialSpec` ao `WorkspaceShell`, montando `<TableGridPanel />` sem a prop estática `spec={SAMPLE_SPEC}`. Isso **não afeta** nenhum dos dois threats `mitigate` da fase 16 (guard de auth intacto e ordenado antes da carga nova; remoção de CSS inalterada). Porém a premissa de T-16-05 ("dado estático, sem dados de usuário") foi superada por uma leitura de spec **por-usuário** — esse caminho de dados é responsabilidade de auditoria das fases posteriores (17/18/21/22 já possuem SECURITY.md), que devem cobrir o read por-usuário com escopo de authZ (`spec` pertence a `user.id`). Disposição da fase 16 mantida.

## Sign-Off

- [x] Todos os threats têm disposição (mitigate / accept)
- [x] Riscos aceitos documentados no Accepted Risks Log
- [x] `threats_open: 0` confirmado
- [x] `status: secured` no frontmatter

**Approval:** verified 2026-06-15

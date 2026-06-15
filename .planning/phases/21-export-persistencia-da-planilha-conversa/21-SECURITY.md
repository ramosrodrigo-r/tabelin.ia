---
phase: 21
slug: export-persistencia-da-planilha-conversa
status: verified
threats_open: 0
asvs_level: 2
created: 2026-06-15
---

# Phase 21 — Security

> Contrato de segurança por fase: register de ameaças, riscos aceitos e trilha de auditoria.
> **Modo RETROACTIVE-STRIDE:** nenhum `<threat_model>` foi escrito no plan-time. O register
> abaixo foi construído a partir dos arquivos de implementação efetivamente entregues e
> cada mitigação foi verificada na fonte (grep + leitura), não em documentação.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser → `POST /api/workspace/state` | Auto-save debancado da planilha viva atravessa a rede ao servidor | `TableSpecPayload` (conteúdo da planilha do usuário) + cookie de sessão |
| Servidor (Server Component) → Browser | `WorkspaceLayout`/`WorkspacePage` injetam spec ativo + histórico persistido como props serializadas | Spec da planilha e trocas de conversa do usuário autenticado |
| Servidor → Prisma/DB | Helpers `getActiveSpreadsheetSpec`/`saveActiveSpreadsheetSpec`/`findUnifiedConversationExchanges` | Linhas `ConversationExchange` escopadas por `userId` |
| Browser → Excel/Sheets (export) | `buildCsv`/`buildXlsx` geram arquivo client-side, baixado via Blob | Conteúdo da planilha aberto por aplicativo de terceiros |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-21-01 | Spoofing / Elevation | `POST /api/workspace/state` | mitigate | `getSessionFromCookieHeader` verifica o cookie HMAC-assinado; sem sessão → 401 antes de qualquer escrita (`route.ts:15-18`) | closed |
| T-21-02 | Information Disclosure / IDOR (read) | `getActiveSpreadsheetSpec` / `findUnifiedConversationExchanges` | mitigate | `userId` derivado da sessão verificada (`layout.tsx:24`, `page.tsx:18`); queries Prisma escopadas por `where: { userId }` — `userId` NUNCA vem do input do cliente (`conversation-repository.ts:171,232`) | closed |
| T-21-03 | Tampering / IDOR (write) | `saveActiveSpreadsheetSpec` | mitigate | `saveActiveSpreadsheetSpec(user.id, ...)` usa o `user.id` da sessão; `deleteMany`/`create` filtram por `userId` — usuário não consegue gravar na planilha de outro (`route.ts:33`, `conversation-repository.ts:202-216`) | closed |
| T-21-04 | Tampering (input validation) | `POST /api/workspace/state` | mitigate | `tableSpecPayloadSchema.safeParse(body)` rejeita payload malformado → 422; limites `columns.min(1).max(26)`, `rowCount.max(200)`, `rows.max(200)` bloqueiam payload adversarial (`route.ts:27-30`, `schema.ts:45-50`) | closed |
| T-21-05 | Tampering (poisoned read) | `getActiveSpreadsheetSpec` | mitigate | Payload persistido revalidado com `tableSpecPayloadSchema.safeParse` na leitura; fail-closed → `null` → fallback `SAMPLE_SPEC` (`conversation-repository.ts:176-177`) | closed |
| T-21-06 | Tampering (CSV/Excel formula injection) | `buildCsv` / `buildXlsx` (export) | mitigate | `sanitizeCellForExport` prefixa `'` em células com lead perigoso `= + - @ TAB CR LF`, inclusive após remover neutralizadores iniciais; XLSX escreve cell-objects `{t:"s"}` (string forçada); ambos os caminhos passam por ele (`table-export.ts:41-45,79-83,96-99`) | closed |
| T-21-07 | Denial of Service (oversize persist) | `saveActiveSpreadsheetSpec` | mitigate | `guardActiveSpecSize` mede bytes UTF-8 reais (`Buffer.byteLength`) e LANÇA acima de `MAX_ACTIVE_SPEC_BYTES` (512 KB) antes de tocar o DB (`conversation-repository.ts:78-86,199`) | closed |
| T-21-08 | Repudiation / Data-loss silencioso (WR-03) | `saveActiveSpreadsheetSpec` → rota → cliente | mitigate | Falha de gravação PROPAGA (sem try/catch que engole) → rota mapeia para 500 (`route.ts:35-37`); cliente só avança `lastSavedRef` em `res.ok` (`workspace-state-context.tsx:223-225`) — save perdido não é marcado como salvo | closed |
| T-21-09 | Tampering / Data-loss em round-trip (CR-02) | `seedToGridState` / `tableSpecPayloadSchema` | mitigate | Dedupe de key na escrita (Set + sufixo) preserva colunas colidentes (`workspace-state-context.tsx:39-51`); `deriveColumnKey` compartilhado evita drift; `superRefine` rejeita keys efetivas duplicadas (`schema.ts:36-38,59-72`) | closed |
| T-21-10 | Tampering / Estado fantasma (CR-01) | `resetToSeed` auto-save race | mitigate | `resetToSeed` pré-marca `lastSavedRef` com o specJson do reset antes do dispatch → efeito de auto-save retorna cedo → "Nova conversa" não ressuscita a linha `unified_table` após o DELETE (`workspace-state-context.tsx:197-200,215`) | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-21-01 | — | `BETTER_AUTH_SECRET` faz fallback para o literal `"local-development-secret-change-me"` quando a env var está ausente (`session.ts:19`). Forja de token possível se o segredo de produção não for setado. **Fora do escopo da Phase 21** (camada de auth, Phase 18); as rotas de persistência apenas consomem a sessão verificada. Registrado para rastreabilidade, não introduzido nesta fase. | gsd-security-auditor | 2026-06-15 |

*Accepted risks do not resurface in future audit runs.*

---

## Unregistered Flags (novo attack surface)

Nenhuma flag de ameaça (`## Threat Flags`) foi declarada nos SUMMARYs da Phase 21 (21-01/21-02/21-03 não contêm a seção). Varredura independente do attack surface entregue:

- **`/api/workspace/import/route.ts`** apareceu na busca por endpoints, mas pertence à **Phase 19** (`git log`: commits `186f29c`/`6a369fd`, "feat(19-01)"), não foi tocado nesta fase — **fora de escopo**.
- **Export é 100% client-side** (`Blob` + `<a download>` / `XLSX.writeFile`, `table-export.ts:116-132`): não há endpoint de export no servidor, portanto **sem superfície de IDOR/information-disclosure de export server-side**. A única ameaça de export relevante (formula injection) está coberta por T-21-06.
- Nenhum endpoint novo da Phase 21 aceita `userId` do cliente — todos derivam o usuário da sessão verificada.

Resultado: nenhuma flag não-registrada que constitua novo attack surface da Phase 21.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-15 | 10 | 10 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-15

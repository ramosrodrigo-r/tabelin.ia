# Security Audit — Quick Task 260616-dw3 (Auth Gate Workspace)

**Phase:** quick-260616-dw3 — Auth gate / workspace preview travado
**Veredito:** PASS (0 BLOCKER, 0 WARNING)
**Threats fechados:** 3/3
**Data:** 2026-06-16
**Diff auditado:** 357ae58..HEAD

Implementação tratada como READ-ONLY. Nenhum arquivo de implementação foi modificado.

---

## Verificação dos threats declarados (PLAN.md `<threat_model>`)

| Threat ID | Categoria | Disposição | Status | Evidência |
|-----------|-----------|------------|--------|-----------|
| T-dw3-01 | Information Disclosure | mitigate | CLOSED | `layout.tsx:24-26` e `page.tsx:11-19` |
| T-dw3-02 | Elevation of Privilege | accept | CLOSED | rotas de mutação 401 sem sessão; overlay client-only |
| T-dw3-03 | Spoofing | mitigate | CLOSED | `auth-gate-modal.tsx:32-47` + `api/auth/[...all]/route.ts:119-127,257-263` |

### T-dw3-01 — Information Disclosure (CLOSED)

Verificação: o ramo deslogado nunca pode invocar função que receba `user.id`.

- `layout.tsx:24-26` — `initialSpec` usa operador condicional: `getActiveSpreadsheetSpec(user.id)` SÓ no ramo `user ?`; ramo `!user` recebe `SAMPLE_SPEC` (dado estático). Confirmado.
- `page.tsx:11-13` — guarda `if (!user) return <UnifiedChatTool initialExchanges={[]} />` ANTES de qualquer query. `findUnifiedConversationExchanges(user.id)` (linha 19) é inalcançável sem sessão. Confirmado.
- Grep em todo `src/app`, `src/components`, `src/features` (excluindo `__tests__`): os dois únicos call-sites de `getActiveSpreadsheetSpec`/`findUnifiedConversationExchanges` estão dentro de ramos guardados por `user`. Nenhum outro caminho.
- Props passadas a componentes client no ramo `!user`: `initialSpec=SAMPLE_SPEC` (demo), `initialExchanges=[]` (vazio), `Topbar user={undefined}`. Nenhuma PII serializada para o cliente sem sessão. Confirmado.

### T-dw3-02 — Elevation of Privilege (CLOSED — disposição `accept` validada)

A disposição é `accept`: o overlay é UX, a proteção real é server-side. Não bastava aceitar — verifiquei que burlar o overlay no client não dá acesso a dados nem mutações reais:

- O overlay (`auth-gate.tsx:30-32`) é puramente client; um atacante pode removê-lo via devtools. Por isso a defesa real precisa estar no servidor.
- RSC: dados reais só carregam com sessão (ver T-dw3-01). Sem cookie, só SAMPLE_SPEC chega ao cliente.
- Rotas de mutação verificadas — TODAS retornam 401 sem cookie de sessão válido:
  - `api/chat/unified/route.ts:275-277` → 401
  - `api/workspace/import/route.ts:66-68` → 401
  - `api/workspace/state/route.ts:15-17` → 401
  - `api/conversations/unified/route.ts:13-16` → 401
- Conclusão: remover o overlay expõe apenas a casca demo; nenhuma rota de leitura/escrita de dados reais é acessível sem sessão. Risco aceito é coerente com a implementação.

### T-dw3-03 — Spoofing (CLOSED)

Verificação: o modal reusa rotas de auth existentes, sem nova superfície.

- `auth-gate-modal.tsx:32-33` — endpoints são exatamente `/api/auth/sign-in/email` e `/api/auth/sign-up/email` (rotas pré-existentes). Nenhuma rota nova de auth foi criada (grep não encontra novo handler).
- `auth-gate-modal.tsx:43-47` — `fetch` POST com `content-type: application/json`, corpo JSON. Credenciais no body, nunca em querystring.
- As rotas reusadas mantêm as defesas existentes:
  - `route.ts:119-127` — `validateAuthPostOrigin` (origin/referer contra allow-list) → 403 se origem não permitida (anti-CSRF).
  - `route.ts:257-263` — cookie de sessão `httpOnly: true`, `sameSite: "lax"`, `secure` em produção, HMAC SHA-256 (`session.ts:35-37,61-69`).
- Sem log de senha no caminho do modal (grep `console.*` em auth-gate-modal/auth-gate: nenhum match).

---

## Verificações adicionais (`<also_check>`)

| Item | Resultado | Evidência |
|------|-----------|-----------|
| XSS via SAMPLE_SPEC / inputs do modal | OK | Sem `dangerouslySetInnerHTML`/`innerHTML`/`eval` em `features/unified-chat` ou `components/app`. Render via React (auto-escape). SAMPLE_SPEC é dado estático literal. |
| CSRF nas chamadas de auth | OK | `validateAuthPostOrigin` (origin/referer allow-list) + cookie `sameSite=lax`. Modal usa fetch same-origin. |
| Enumeração de usuário | OK | Mensagens de erro do modal são genéricas ("Nao foi possivel entrar. Confira email e senha." / "Nao foi possivel criar sua conta.") — não distinguem usuário inexistente de senha errada. Rota retorna 401 genérico. |
| Modal não-dispensável sem bypass | OK | Sem botão de fechar, sem handler de ESC, sem close-on-overlay-click (`auth-gate.tsx`, `auth-gate-modal.tsx`). Overlay `position: fixed; inset: 0; z-index: 100; pointer-events: auto` (`globals.css:226-236`) captura cliques. Teste cobre ausência de "Fechar". |

### Observação informativa (não-blocker)

A `Topbar` é renderizada FORA do `<AuthGate>` (layout.tsx:31, antes do overlay), portanto a marca "Tabelin.IA" e o link "Privacidade" ficam acessíveis no estado deslogado por cima/fora do overlay. Isto NÃO é bypass: quando `user` é undefined, a Topbar oculta menu de conta, "Sair" e "Nova conversa" (`topbar.tsx:83,126`); o único elemento clicável é `<a href="/privacidade">`, uma página estática pública sem dados. Sem exposição de PII nem rota de mutação. Comportamento intencional (link de privacidade sempre visível).

---

## Threat Flags (SUMMARY.md)

A SUMMARY.md desta quick task não contém seção `## Threat Flags`. Nenhuma superfície de ataque nova não-mapeada foi declarada pelo executor. A auditoria de diff não revelou nova superfície de auth além das rotas reusadas. **Unregistered flags: nenhum.**

---

## Cross-validation

- `pnpm exec vitest run` (auth-gate-modal + layout): 8/8 passam, incluindo asserções de segurança (endpoints corretos, ausência de "Fechar", ausência de redirect, preview com SAMPLE_SPEC + overlay).
- Grep confirma os dois únicos call-sites de funções com `user.id` guardados por sessão.
- Grep confirma 401 em todas as 4 rotas de mutação sem cookie.

## Veredito final

**PASS.** As três mitigações declaradas (T-dw3-01 mitigate, T-dw3-02 accept, T-dw3-03 mitigate) estão presentes e verificadas no código implementado. Nenhuma vulnerabilidade introduzida pelas mudanças. A task pode seguir.

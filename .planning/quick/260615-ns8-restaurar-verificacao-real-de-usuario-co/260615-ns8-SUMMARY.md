# Summary: Restaurar verificação real de usuário (Better Auth)

## What changed

### Task 1 — `apps/web/src/app/api/auth/[...all]/route.ts`
Reescrito por completo. Substitui o handler manual (que continha o branch
`catch` de `persistCredentials` que tratava qualquer falha do Prisma como
sign-in/sign-up bem-sucedido em dev, emitindo cookie de sessão sem registro no
banco) pelo handler oficial do Better Auth:

```ts
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth/config";
export const { GET, POST } = toNextJsHandler(auth.handler);
```

Removido: `persistCredentials`, `getOrigin`/`getRequestSourceOrigin`/
`getAllowedAuthOrigins`/`validateAuthPostOrigin`, `getSafeResetPath`/
`buildResetUrl`/`createResetLinkIfUserExists`, e os imports de
`@/server/auth/session`, `@/server/auth/password`,
`@/server/auth/reset-password`, `@/server/db/client`.

Commit: `8d073aa`

### Task 2 — `apps/web/src/server/auth/session.ts`
Reescrito para delegar a resolução de sessão ao Better Auth
(`auth.api.getSession`), removendo toda a lógica HMAC/base64url custom
(`createHmac`, `timingSafeEqual`, `SESSION_COOKIE`, `createSessionToken`,
`createSessionUser`, `verifySessionToken`, `normalizeEmail`).

- `getCurrentUser()`: usa `auth.api.getSession({ headers: await headers() })`.
- `getSessionFromCookieHeader(cookieHeader)`: agora **async**, constrói
  `Headers` a partir do cookie e chama `auth.api.getSession`.
- Tipo `SessionUser` (`{ id, email, name }`) preservado — `name` faz fallback
  para `email.split("@")[0]` quando `session.user.name` é `null`.

Atualizados os 4 call sites para `await`:
- `apps/web/src/app/api/chat/unified/route.ts:275`
- `apps/web/src/app/api/workspace/state/route.ts:15`
- `apps/web/src/app/api/conversations/unified/route.ts:13`
- `apps/web/src/app/api/workspace/import/route.ts:66`

`grep -rn "SESSION_COOKIE\|createSessionToken\|createSessionUser\|verifySessionToken\|normalizeEmail" apps/web/src` → vazio.

Commit: `6644603`

### Task 3 — código morto, testes, verificação
1. `apps/web/src/server/auth/password.ts` e
   `apps/web/src/server/auth/reset-password.ts` não tinham mais nenhum
   import após os Tasks 1-2 (confirmado via grep) — **deletados**. Better
   Auth com `emailAndPassword.enabled` faz seu próprio hashing scrypt e
   gerencia tokens de `Verification` nativamente.
2. `npm run typecheck` (apps/web) → **limpo**, sem nenhum erro apontando
   para `[...all]/route.ts`.
3. `npm run lint` (apps/web) → **limpo** (`eslint . --max-warnings=0`).
4. `npm run test` (apps/web) → **274 passed | 1 skipped (275)**, 23 arquivos.
   - `tests/auth.spec.ts` e `tests/auth-routes.test.ts` foram **removidos**:
     testavam exclusivamente o handler manual/HMAC que não existe mais
     (assinatura de `POST` mudou para `toNextJsHandler`, `createSessionToken`/
     `createSessionUser`/`normalizeEmail`/`verifySessionToken` não existem
     mais).
   - `tests/conversations-route.test.ts`, `tests/unified-route.test.ts`,
     `tests/workspace-state-route.test.ts`, `tests/workspace-import.test.ts`:
     trocaram `createSessionToken(createSessionUser(...))` (cookie HMAC
     custom) por `vi.mock("@/server/auth/session", ...)` com
     `getSessionFromCookieHeader` mockado — mesmo padrão já usado por
     `layout.test.tsx` (mocka `getCachedUser`). Cobertura de
     autenticado/não-autenticado preservada.

Commit: `5e42151`

## Verificação manual de segurança (Task 3.4)

**Não executada ao vivo** — Docker não está disponível neste ambiente
sandboxed (`docker compose up -d` → `command not found: docker`), então o
Postgres local não pôde ser levantado e `npm run dev` + chamadas reais a
`/api/auth/sign-in/email` não foram testados.

O que **foi** verificado estaticamente, cobrindo o ponto crítico ("nenhum
branch de fallback que crie sessão sem registro no banco"):

- Revisão de código do novo `route.ts`: 5 linhas, delega 100% ao
  `toNextJsHandler(auth.handler)` do Better Auth. Não há mais nenhum
  `try/catch` que mascare erro do Prisma como sucesso, nem construção manual
  de cookie/`NextResponse`.
- Revisão de `session.ts`: ambas as funções (`getCurrentUser` e
  `getSessionFromCookieHeader`) retornam `null` quando `session?.user` é
  ausente — sem fallback que sintetize um `SessionUser` a partir do
  email/nome informado.
- `auth.config.ts` configura `prismaAdapter` + `emailAndPassword.enabled` +
  `secret` + `trustedOrigins` — Better Auth aplica `originCheck` nativamente
  em endpoints state-changing (substitui `validateAuthPostOrigin` removido).
- `apps/web/src/app/(workspace)/workspace/layout.tsx` continua chamando
  `getCachedUser()` e fazendo `redirect("/sign-in")` quando `null` — caminho
  inalterado, agora alimentado pela sessão real do Better Auth.
- Confirmado que `.env` tem `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` e
  `DATABASE_URL` definidos (valores não lidos, apenas presença).
- `npm run test` passou integralmente com os mocks de `getSessionFromCookieHeader`,
  confirmando que os fluxos autenticado/não-autenticado das rotas de API
  (`chat/unified`, `workspace/state`, `workspace/import`,
  `conversations/unified`) continuam retornando 401 sem sessão e 200 com
  sessão válida.

**Pendente / requer DB ao vivo** (não coberto aqui):
- POST real em `/api/auth/sign-in/email` com credenciais de conta inexistente
  → confirmar 401/422 e ausência de cookie `better-auth.session_token`.
- Fluxo positivo real: sign-up → sign-in → cookie setado → `/workspace`
  acessível com nome correto no `Topbar`.
- Confirmar que `npm run dev` não lança erro de `BETTER_AUTH_SECRET` ausente
  (variável presente no `.env`, mas não testado em runtime).

Recomenda-se que o operador execute o passo 4 do Task 3 manualmente em um
ambiente com Docker/Postgres disponível antes de considerar a correção
totalmente fechada em produção.

## Notas

- Cookie de sessão muda de `tabelin_session` (HMAC custom) para o cookie
  nativo do Better Auth (`better-auth.session_token` por default). Sessões
  antigas ficam inválidas — esperado, sem migração necessária (conforme
  plano).
- `apps/web/src/app/(auth)/reset-password/page.tsx` faz fetch para
  `/api/auth/reset-password` enviando `{ token, password }`; o endpoint nativo
  do Better Auth espera `{ token, newPassword }`. Esse mismatch já existia
  antes desta mudança (a página não foi tocada, está fora do escopo do plano —
  "não adicionar... outros endpoints"), mas pode ser um bug latente a
  investigar separadamente.

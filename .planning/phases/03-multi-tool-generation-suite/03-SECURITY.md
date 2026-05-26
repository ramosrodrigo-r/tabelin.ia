---
phase: "03"
slug: multi-tool-generation-suite
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-26
---

# Phase 03 — Security: Multi-Tool Generation Suite

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Shared package → API routes | Schemas Zod importados por client e server — devem ser contratos puros, sem lógica server-only | Contratos de tipo (sem dados sensíveis) |
| Sidebar (client) → rotas de tool | Active state é puramente visual; autenticação real nos route handlers e Server Components | Nenhum dado sensível — apenas pathname |
| Client → API route handlers | Input não confiável: prompt do usuário pode conter tentativas de prompt injection | Prompt do usuário (não confiável) |
| API → OpenAI | Prompt construído no servidor — user input passado como `content` do user message, não como instrução de sistema | Prompt do usuário + instruções de sistema |
| API → getUserEntitlement | Entitlement verificado no servidor a cada request — não confia em claims do cliente | User ID (autenticado via sessão) |
| Browser → /api/tools/template/generate | Usuário Free pode tentar chamar diretamente; Pro gate no route handler, não apenas no componente | Prompt de template (Pro feature) |
| react-shiki input | Código gerado pelo AI passado para o highlighter com outputFormat "react" (padrão) | Código gerado (output do AI) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-03-01-01 | Tampering | `destructive-classifier.ts` — pattern matching | mitigate | Regex determinístico OR'd com campo `isDestructive` do AI — falso positivo aceitável, falso negativo não. Confirmado em `scripts-stream.ts:59-60` e `sql-stream.ts:47-48` | closed |
| T-03-01-02 | Elevation of Privilege | `sidebar.tsx` — active state | accept | Active state é `data-active` (CSS visual); acesso real verificado nos Server Components e route handlers de cada ferramenta | closed |
| T-03-01-03 | Tampering | `packages/shared` schemas — Zod `safeParse` | mitigate | Todos os schemas usam `.safeParse()` nos route handlers antes de qualquer processamento; inputs inválidos retornam 400 antes de reservar quota. Confirmado em 7 route handlers | closed |
| T-03-01-04 | Information Disclosure | `destructive-classifier.ts` — `import "server-only"` | mitigate | `import "server-only"` garante que o módulo não seja bundled para o cliente; Next.js lança erro de build em importação client-side acidental | closed |
| T-03-02-01 | Tampering | Todos os route handlers — Zod `safeParse` | mitigate | `safeParse` validado em todos os 5 novos route handlers (scripts, sql, regex/generate, regex/explain, template) antes de qualquer processamento | closed |
| T-03-02-02 | Tampering | `scripts-stream.ts`, `sql-stream.ts` — prompt injection | mitigate | Prompt do usuário passado como `role: "user"` content, separado das instruções de sistema (`role: "system"`). Modelo não executa o código — apenas retorna texto | closed |
| T-03-02-03 | Elevation of Privilege | `template/generate/route.ts` — Pro gate bypass | mitigate | `getUserEntitlement(user.id)` chamado na linha 18, antes de `reserveToolUse` na linha 31 — retorna 403 `code: "pro_required"` se não Pro. Client-side checks são suplementares | closed |
| T-03-02-04 | Denial of Service | Todos os routes — quota bypass via requests paralelas | accept | `reserveToolUse` usa `isolationLevel: Serializable` (herdado do quota-service da fase 2). Race conditions cobertas. Abuse safeguards existentes aplicam-se | closed |
| T-03-02-05 | Information Disclosure | Server AI streams — `import "server-only"` | mitigate | `import "server-only"` em todos os 4 novos streams (`scripts-stream.ts`, `sql-stream.ts`, `regex-stream.ts`, `template-stream.ts`) + `destructive-classifier.ts` | closed |
| T-03-02-06 | Tampering | SQL/Script output — classificação `isDestructive` | mitigate | `classifyDestructive` OR'd com campo `isDestructive` da resposta JSON do AI — falso negativo do AI compensado pelo classifier determinístico | closed |
| T-03-03-01 | Elevation of Privilege | `template-input-panel.tsx` — Pro gate client-side | accept | Gate visual é complementar ao 403 do route handler (T-03-02-03). Usuário Free que burle o componente ainda recebe 403 no servidor | closed |
| T-03-03-02 | Tampering | `react-shiki` — código gerado via `useShikiHighlighter` | accept | `useShikiHighlighter` com outputFormat padrão ("react") retorna `ReactElement` gerado internamente pelo Shiki — não usa `dangerouslySetInnerHTML` com input do usuário. Risco XSS é da lib, não do input | closed |
| T-03-03-03 | Tampering | `use-template-stream.ts` — tratamento de 403 `pro_required` | mitigate | Hook trata 403 com `code === "pro_required"` definindo `proBlocked=true`. `TemplateInputPanel` verifica `!isPro || proBlocked` antes de habilitar submit. Dupla verificação client-side | closed |
| T-03-03-04 | Information Disclosure | Server AI prompts expostos via delta events | accept | Delta events contêm apenas o código gerado pelo AI, não os prompts de sistema. Prompts ficam em `server/ai/*.ts` com `import "server-only"`. Código gerado é intencional para copiar | closed |
| T-03-03-05 | Denial of Service | `use-xxx-stream.ts` — NDJSON loop sem timeout | accept | Streaming limitado pelo timeout do Next.js route handler. Mesmo padrão da formula (fase 1, já em produção). Quota service aplica-se antes do stream iniciar | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-01-02 | Active state da sidebar é puramente visual (CSS `data-active`). Acesso real a qualquer ferramenta é protegido pelos Server Components e route handlers individuais. Não há bypass de segurança possível via manipulação do active state | gsd-secure-phase | 2026-05-26 |
| AR-03-02 | T-03-02-04 | Quota bypass via requests paralelas é coberto pelo `isolationLevel: Serializable` herdado do quota-service (fase 2). Abuse safeguards adicionais já existem. Risco residual aceito sem nova mitigação | gsd-secure-phase | 2026-05-26 |
| AR-03-03 | T-03-03-01 | Pro gate client-side no `template-input-panel.tsx` é camada de UX, não de segurança. O route handler retorna 403 para qualquer request não-Pro, independente do componente. Usuário que burle o componente não obtém acesso | gsd-secure-phase | 2026-05-26 |
| AR-03-04 | T-03-03-02 | `react-shiki` com outputFormat padrão não usa `dangerouslySetInnerHTML` com input do usuário. Qualquer vulnerabilidade XSS seria na biblioteca Shiki, não no código da aplicação. Risco delegado à lib, monitorado via atualizações de dependência | gsd-secure-phase | 2026-05-26 |
| AR-03-05 | T-03-03-04 | Delta events de streaming expõem o código gerado pelo AI — comportamento intencional (usuário deve ver e copiar o output). Prompts de sistema estão protegidos por `import "server-only"` e nunca chegam ao cliente | gsd-secure-phase | 2026-05-26 |
| AR-03-06 | T-03-03-05 | Loop NDJSON sem timeout explícito é controlado pelo timeout do runtime Next.js. Padrão idêntico ao da ferramenta Formula (fase 1) já em produção sem incidentes. Quota service previne abuse antes do stream iniciar | gsd-secure-phase | 2026-05-26 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-26 | 15 | 15 | 0 | gsd-secure-phase (short-circuit: register_authored_at_plan_time=true, threats_open=0) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-26

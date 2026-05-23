# Research Summary

**Domain:** Brazil-localized spreadsheet AI SaaS
**Researched:** 2026-05-23
**Confidence:** HIGH

## Key Findings

**Stack:** Use a TypeScript-first web SaaS stack: Next.js 16, React 19, Tailwind 4, Fastify 5, PostgreSQL 18, Prisma 7, Better Auth, OpenAI Responses API, and Mercado Pago for Brazil-native Pix/card checkout.

**Table Stakes:** Formula generation/explanation, platform and locale selectors, copy-ready outputs, scripts, SQL, regex, auth, quotas, Pix/card checkout, upload analysis, OCR image-to-table, charts/reports, and privacy cleanup.

**Watch Out For:** Wrong Brazilian formula syntax, quota race conditions, webhook/entitlement drift, provider retention vs local deletion promises, OCR without table reconstruction, and unsafe generated scripts or queries.

## Product Implications

- Tabelin.IA should compete on Brazil-specific correctness, not only breadth of tools.
- Formula locale controls must be visible in the first tool screen.
- Authentication, quota, and payment are MVP foundations because the PRD's monetization model depends on them.
- File analysis and OCR should be implemented after the generation/paywall foundation so privacy and quota controls are already in place.
- The app should use a shared "tool contract" model so formula, script, SQL, regex, file chat, and OCR tools share validation, quota, streaming, output, and copy behavior.

## Recommended Build Order

1. **Localized formula MVP:** Next.js workspace, auth shell, formula generation/explanation, locale/platform selectors, streaming output, copy feedback.
2. **Freemium and billing foundation:** Usage ledger, free-tier windows, Pro plan, Mercado Pago Pix/card checkout, webhook-driven entitlement.
3. **Additional generators:** Scripts, SQL, and regex using the shared tool contract framework.
4. **Spreadsheet file analysis:** CSV/XLSX upload validation, schema extraction, temporary file lifecycle, file chat, basic reports.
5. **OCR and charts:** Image-to-table reconstruction, TSV/CSV copy, Chart.js visualizations, executive reports.

## Open Questions for Phase Planning

- Should v1 be a single Next.js deployable app or a monorepo with separate Fastify API from day one?
- Which payment provider is final for recurring Pro billing in Brazil: Mercado Pago first, Stripe fallback, or another local provider?
- Will the product require zero data retention from LLM providers before launch, or is standard commercial API privacy acceptable for MVP?
- Should users have saved prompt/output history by default, or should privacy-first mode avoid retaining histories unless explicitly enabled?

## Research Artifacts

- `.planning/research/STACK.md`
- `.planning/research/FEATURES.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`

## Sources

- PRD.md
- https://nextjs.org/docs/app/getting-started/installation
- https://fastify.dev/docs/latest/Reference/LTS/
- https://www.postgresql.org/docs/current/index.htm
- https://www.prisma.io/docs/orm
- https://better-auth.com/docs/integrations/next
- https://platform.openai.com/docs/api-reference/responses/create
- https://platform.openai.com/docs/guides/images-vision
- https://platform.openai.com/docs/api-reference/files/create
- https://openai.com/enterprise-privacy/
- https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/payment-integration/pix
- https://docs.stripe.com/payments/pix?locale=pt-BR
- https://gptexcel.uk/
- https://gptexcel.uk/faq

---
*Research summary for: Tabelin.IA*
*Researched: 2026-05-23*

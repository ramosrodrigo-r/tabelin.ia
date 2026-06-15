# Phase 22: Limpeza Final - Context

**Gathered:** 2026-06-15  
**Status:** Ready for execution  

<domain>
## Phase Boundary
Esta fase abrange a limpeza final do repositório, englobando a remoção de todos os modelos Prisma órfãos, dependências do NPM sem uso, arquivos de mock/assets antigos, correção de erros e avisos de lint, e a validação final da suíte verde.

Requisitos cobertos: **CLEAN-08, CLEAN-09, CLEAN-10, CLEAN-11, CLEAN-12, QA-01, QA-02**.
</domain>

<decisions>
## Implementation Decisions

### Prisma Models Cleanup
- **D-01 (Orphaned Models):** Serão removidas as tabelas `ToolRequest`, `Entitlement`, `UsageLedger`, `BillingCheckout`, `UploadedFile`, `ChatMessage` e `PaymentEvent`.
- **D-02 (Data Preservation):** As tabelas `User`, `Session`, `Account`, `Verification` e `ConversationExchange` não serão modificadas, exceto pela remoção das relações de chave estrangeira com os modelos deletados. Isso garante a preservação dos dados de usuários existentes.

### Linting Correction
- **D-03 (Lint Rules compliance):** Resolver todos os avisos de variáveis não utilizadas em guards de exaustividade (`_exhaustive`) e destruturação (`_removed`) usando referências `void` explícitas. Parâmetros não utilizados serão renomeados ou prefixados com `_`.

### Dependency Removal
- **D-04 (Cleanup NPM):** Remover as dependências `@types/node-cron`, `node-cron` e `recharts` do package.json do frontend, pois os recursos que as consumiam foram desativados.
</decisions>

<canonical_refs>
## Canonical References
- [ROADMAP.md](file:///home/rodrigo/tabelin.ia/.planning/ROADMAP.md) — Phase 22 Success Criteria.
- [schema.prisma](file:///home/rodrigo/tabelin.ia/prisma/schema.prisma) — Banco de dados relacional.
</canonical_refs>

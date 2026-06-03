# Phase 9: Extraction Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 9-extraction-infrastructure
**Areas discussed:** Formato do texto extraído, XLSX multi-aba & amostragem, Reuso vs. refatoração, Contrato de erro & bytes (SEC-02)

---

## Formato do texto extraído

### CSV/XLSX — formato do texto plano
| Option | Description | Selected |
|--------|-------------|----------|
| Reusar formatSchemaForPrompt | Reutilizar serializador existente (schema+exemplos, anti-injection); consistente com File Analysis | ✓ |
| Tabela Markdown | Cabeçalho + N linhas como tabela Markdown; mais legível, mais tokens | |
| CSV/TSV bruto | Primeiras linhas cruas; fiel mas sem tipos e com ruído | |

### OCR — serialização de {headers, rows}
| Option | Description | Selected |
|--------|-------------|----------|
| Tabela Markdown | Converter headers+rows em tabela Markdown; legível p/ grounding | ✓ |
| TSV/CSV | Reusar formato delimitado do tool OCR | |
| Você decide | Planner escolhe | |

### Quantidade de amostra tabular
| Option | Description | Selected |
|--------|-------------|----------|
| Schema + ~10 linhas | Schema + ~10 linhas completas; equilíbrio grounding x tokens | ✓ |
| Só o schema | Apenas colunas+tipos+exemplos | |
| Schema + ~30 linhas | Mais linhas, mais tokens | |

**User's choice:** Reusar formatSchemaForPrompt / Tabela Markdown (OCR) / Schema + ~10 linhas
**Notes:** `formatSchemaForPrompt` hoje só inclui exemplos por coluna — anexar ~10 linhas completas é extensão a implementar.

---

## XLSX multi-aba & amostragem

### Tratamento de múltiplas abas
| Option | Description | Selected |
|--------|-------------|----------|
| Todas com rótulo | Extrair todas as abas, prefixadas por '## Aba: <nome>' | ✓ |
| Só a primeira aba | Mais simples/barato, perde outras abas silenciosamente | |
| Aba com mais dados | Heurística por linhas/células; pode errar intenção | |

### Limite de linhas por aba
| Option | Description | Selected |
|--------|-------------|----------|
| Cap menor (~200/aba) | Reduz tokens e reforça anti-DoS ao extrair todas as abas | ✓ |
| Reusar 1000 | Mantém MAX_ROWS do parser; mais dados/tokens | |
| Você decide | Planner decide | |

**User's choice:** Todas com rótulo / Cap ~200 linhas por aba
**Notes:** parser atual recebe `sheetName` único → iterar abas do workbook.

---

## Reuso vs. refatoração

### Estratégia de reuso dos extratores
| Option | Description | Selected |
|--------|-------------|----------|
| Novo módulo que envolve | server/extraction/ importa funções puras existentes sem tocar nas rotas/repos | ✓ |
| Extrair módulo compartilhado | Refatora lógica para módulo comum; mais limpo, mais risco de regressão | |
| Importar direto, sem camada | Menos arquivos, espalha responsabilidade | |

### Local do dispatcher
| Option | Description | Selected |
|--------|-------------|----------|
| server/extraction/ | Novo dir espelhando file-analysis/, dispatcher + 1 arquivo por formato | ✓ |
| server/ai/ | Junto dos processadores de IA; mistura extração com streaming | |
| Você decide | Planner decide | |

**User's choice:** Novo módulo server/extraction/ envolvendo funções puras; tools existentes intactos.
**Notes:** —

---

## Contrato de erro & validação de bytes (SEC-02)

### Contrato de erro
| Option | Description | Selected |
|--------|-------------|----------|
| Erros tipados com código | Discriminated union/result com códigos + mensagem pt-BR; UI mapeia código→UX | ✓ |
| throw Error com mensagem pt-BR | Simples; UI não ramifica por tipo | |
| Você decide | Planner decide | |

### Magic bytes
| Option | Description | Selected |
|--------|-------------|----------|
| Lib file-type | Detecção por assinatura, mantida, cobre edge cases; dependência nova | ✓ |
| Checagem manual de assinaturas | Sem dependência; mais código a manter | |
| Você decide | Planner decide | |

### Proteção ZIP bomb
| Option | Description | Selected |
|--------|-------------|----------|
| Cap de descompactação | Limitar tamanho descompactado + nº de entradas antes de abrir o workbook | ✓ |
| Confiar no MAX_ROWS | Não protege — xlsx descompacta tudo antes do parse | |
| Você decide | Planner decide | |

**User's choice:** Erros tipados com código / Lib file-type / Cap de descompactação
**Notes:** códigos previstos: SCANNED_PDF, INVALID_BYTES, ZIP_BOMB, EMPTY_EXTRACTION, UNSUPPORTED_TYPE.

---

## Claude's Discretion

- Limites numéricos exatos do cap anti-ZIP-bomb (tamanho descompactado / nº de entradas).
- Formato exato da tabela Markdown do OCR e do bloco de ~10 linhas de amostra.
- Nomes finais dos arquivos dentro de `server/extraction/`.

## Deferred Ideas

- Fallback OCR automático para PDFs escaneados (fora por EXT-06).
- Suporte a .docx/.odt, múltiplos arquivos por mensagem, redação automática de CPF/CNPJ (já em Future Requirements).

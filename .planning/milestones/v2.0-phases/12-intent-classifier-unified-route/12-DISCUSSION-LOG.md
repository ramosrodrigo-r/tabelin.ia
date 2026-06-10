# Phase 12: Intent Classifier & Unified Route - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 12-intent-classifier-unified-route
**Areas discussed:** Plataforma/dialeto, Override de intent, Arquivo no input único, Baixa confiança & 'tabela'

---

## Plataforma/dialeto sem aba

| Option | Description | Selected |
|--------|-------------|----------|
| Header + IA infere | Seletor persistente no header com defaults (Excel, pt-BR `;`, PostgreSQL); IA infere quando claro, header é override | ✓ |
| Só IA infere | Sem seletor; IA deduz tudo do texto | |
| Comando inline | Usuário define via slash (/contexto Sheets) | |

**User's choice:** Header + IA infere
**Notes:** Defaults sensatos no header, IA infere quando o sinal é claro, header serve de override (D-01/D-02).

---

## UX do override de intent

| Option | Description | Selected |
|--------|-------------|----------|
| Re-roda na hora | Override regenera imediatamente com o resolver correto, mesmo prompt | ✓ |
| Só re-rotula | Muda rótulo; usuário reenvia para regenerar | |
| Confirma antes | Pergunta "Regerar como SQL?" antes | |

**User's choice:** Re-roda na hora
**Notes:** Override é a correção de roteamento de um clique (D-03).

---

## Arquivo no input único

| Option | Description | Selected |
|--------|-------------|----------|
| Reusa paperclip v1.2 | Attach universal do v1.2; presença de arquivo influencia o intent; pede anexo se OCR/análise sem arquivo | ✓ |
| Zona de upload dedicada | Área de drop separada | |
| Botões de ação explícitos | Pills "Analisar arquivo"/"OCR" fora do roteamento automático | |

**User's choice:** Reusa paperclip v1.2
**Notes:** Reuso do mecanismo do v1.2; se intent dependente de arquivo sem anexo, IA pede para anexar (D-04/D-05).

---

## Baixa confiança & intent 'tabela'

| Option | Description | Selected |
|--------|-------------|----------|
| Melhor palpite + override | Gera com intent mais provável + pill de override visível; sem round-trip extra; 'tabela' vai a stub das Phases 13/14 | ✓ |
| Pergunta rápida se ambíguo | Abaixo de um limiar, uma pergunta de desambiguação antes de gerar | |
| Híbrido por limiar | Alta gera direto; muito baixa pergunta; média gera com aviso | |

**User's choice:** Melhor palpite + override
**Notes:** Preserva SLA de 2,5s (classificação embutida, intent primeiro no schema); intent `tabela` classificado e entregue a stub (D-06/D-07).

---

## Claude's Discretion

- Forma exata do pill, do dropdown de override e do seletor de header (seguir tema claro/componentes do workspace).
- Descoberta/sidebar: manter atalhos de tool acessíveis com chat unificado como default (UNI-07).
- Esquema Zod de classificação e mapeamento intent→toolKind (seguir ARCHITECTURE.md).

## Deferred Ideas

- Loop de clarificação → Phase 13.
- Geração/renderização da tabela interativa → Phase 14.
- Export CSV/XLSX e migração final da navegação → Phase 15.
- Chips de "próximo passo" e histórico unificado com filtro por tipo → Future (v2.x).

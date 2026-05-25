# Phase 2: Freemium Billing and Entitlements - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 02-freemium-billing-and-entitlements
**Areas discussed:** Regra exata de quota, Bloqueio e upgrade no workspace, Fluxo de checkout Pix/cartao, Estado Pro, suporte e prioridade

---

## Regra exata de quota

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| O que deve contar como uso de ferramenta? | Contar somente resposta validada com sucesso; Contar toda tentativa enviada para IA; Contar so quando o usuario copia o resultado; Outro | Contar somente resposta validada com sucesso. Reservar quota antes da IA e confirmar consumo so depois de validacao estruturada. |
| Explicacao de formula conta igual geracao? | Sim, toda chamada de ferramenta AI conta igual; Explicacao tem limite separado ou peso menor; Explicacao nao conta na fase 2; Outro | Sim. Generate e explain consomem o mesmo limite de 4 usos por 12h. |
| Como lidar com limite de 10 mensagens de chat em 30 dias? | Criar o modelo geral agora, mas aplicar chat so quando a feature existir; Implementar contador de chat invisivel agora; Adiar completamente QUOT-02; Outro | Criar ledger generica agora, mas aplicar chat so quando a feature existir. |
| Usuario Pro deve ser realmente ilimitado? | Ilimitado para produto, com salvaguardas antiabuso internas; Ilimitado com teto oculto alto; Ilimitado apenas em algumas ferramentas; Outro | Ilimitado para produto, com salvaguardas antiabuso internas. |
| Quer aprofundar quota ou seguir para bloqueio/upgrade no workspace? | Seguir para a proxima area; Mais perguntas sobre quota | Seguir para a proxima area. |

**Notes:** Falhas de provedor, erro 5xx e resposta invalida devem estornar/liberar a reserva.

---

## Bloqueio e upgrade no workspace

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| Quando o usuario Free atinge o limite de 4 usos em 12h, como o bloqueio deve aparecer? | Bloqueio inline no painel da ferramenta; Modal de upgrade; Banner global no topo + botao desabilitado; Outro | Bloqueio inline no painel da ferramenta. |
| O que a mensagem de limite deve mostrar ao usuario? | Contagem + horario de renovacao; Mensagem simples sem horario exato; Contagem + janela generica; Outro | Mensagem simples sem horario exato. |
| Para onde o CTA do bloqueio deve levar? | Checkout direto do Pro; Tela/resumo de planos antes do checkout; Popover inline com beneficios + botao de checkout; Outro | Checkout direto do Pro. |
| O usuario deve ver uso restante antes de bater no limite? | So mostrar quando bloquear; Mostrar contador compacto sempre; Avisar so no ultimo uso restante; Outro | Avisar so no ultimo uso restante. |
| Quer aprofundar bloqueio/upgrade ou seguir para checkout Pix/cartao? | Seguir para checkout Pix/cartao; Mais perguntas sobre bloqueio/upgrade | Seguir para checkout Pix/cartao. |

**Notes:** O usuario pediu que as proximas perguntas viessem sempre com uma opcao recomendada. A partir dai, as perguntas foram apresentadas nesse formato.

---

## Fluxo de checkout Pix/cartao

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| Qual deve ser o formato comercial do Pro no MVP? | Mensal Pro como plano principal; Mensal + anual desde o inicio; Creditos avulsos sem assinatura; Outro | Mensal + anual desde o inicio. |
| Quando o CTA do bloqueio leva ao checkout direto, qual ciclo deve ir pre-selecionado? | Mensal por padrao; Anual por padrao; Perguntar mensal/anual antes de criar checkout; Outro | Mensal por padrao. O usuario voltou atras de uma escolha inicial por anual e corrigiu para mensal. |
| Qual provedor deve ser o caminho principal da fase 2? | Mercado Pago como caminho principal; Mercado Pago principal + Stripe como fallback planejado; Comparar Mercado Pago e Stripe antes de decidir; Outro | Mercado Pago como caminho principal. |
| Depois que o usuario inicia o checkout, onde ele deve concluir o pagamento? | Redirecionar para Checkout Pro/hosted do Mercado Pago; Checkout transparente dentro do app; Comecar hosted, migrar para transparente depois; Outro | Redirecionar para checkout hospedado do Mercado Pago. |
| Apos o pagamento, quando o app deve liberar o Pro? | Somente apos webhook confirmado; Liberar imediatamente no retorno do checkout; Liberar temporariamente no retorno e reconciliar depois; Outro | Somente apos webhook confirmado. |
| Quer aprofundar checkout ou seguir para Estado Pro, suporte e prioridade? | Seguir para Estado Pro, suporte e prioridade; Mais perguntas sobre checkout | Seguir para Estado Pro, suporte e prioridade. |

**Notes:** A tela de retorno do checkout pode mostrar estado processando ate o webhook confirmar.

---

## Estado Pro, suporte e prioridade

| Question | Options Presented | User's Choice |
|----------|-------------------|---------------|
| Onde o usuario deve perceber que virou Pro? | Badge compacto no topo + estado no bloqueio desaparece; Card de plano visivel no workspace; Pagina de billing dedicada com pouca sinalizacao no workspace; Outro | Badge compacto no topo; bloqueios/avisos de quota somem. |
| Como os caminhos de suporte Pro devem aparecer no MVP? | Links simples em menu/area de conta: email e WhatsApp; Botoes de suporte sempre visiveis no workspace; Formulario interno de suporte; Outro | Links simples em menu/area de conta: email e WhatsApp. |
| Como representar processamento prioritario na fase 2? | Flag tecnica + texto discreto para Pro; Prometer respostas mais rapidas na UI; Nao mostrar prioridade ainda; Outro | Flag tecnica + texto discreto para Pro, sem promessa mensuravel. |
| Se o webhook revogar ou expirar o plano, como o usuario deve voltar ao Free? | Rebaixar automaticamente e mostrar aviso inline na proxima tentativa limitada; Mostrar banner global ate regularizar pagamento; Manter Pro ate intervencao manual; Outro | Rebaixar automaticamente e mostrar aviso inline na proxima tentativa limitada. |
| Quer aprofundar essa area ou gerar o CONTEXT.md da fase 2? | Gerar CONTEXT.md; Mais perguntas sobre Estado Pro, suporte e prioridade | Gerar CONTEXT.md. |

**Notes:** Prioridade deve ser verdadeira e discreta ate existir infraestrutura de priorizacao real.

---

## The Agent's Discretion

- Exact schema/table names, API payload names, and UI copy remain implementation discretion within the decisions captured in CONTEXT.md.
- Exact Pro prices were not decided; implementation should avoid hardcoding business values unless another approved source defines them.

## Deferred Ideas

- Stripe fallback unless Mercado Pago has a real blocker.
- Checkout transparente inside the app.
- Credits avulsos.
- Support form and always-visible support buttons.
- Measurable faster-processing promises before real infrastructure exists.
- Active chat/upload enforcement before those features exist.

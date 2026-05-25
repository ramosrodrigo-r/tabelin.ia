# Product Requirement Document (PRD)

## Project Name: Tabelin.IA (Nome Conceitual)
**Target Market:** Brasil (100% Localizado)
**Document Version:** 1.0.0
**Author:** Rodrigo
**Status:** Draft / Pronto para Engenharia

---

## 1. Visão Geral do Produto e Objetivos

### 1.1 Sumário Executivo
O **Tabelin.IA** é um SaaS de automação e produtividade focado em inteligência de planilhas e dados, construído como uma réplica funcional exata (1:1) das capacidades do *GPTExcel.uk*, mas otimizado cirurgicamente para as especificidades técnico-culturais do mercado brasileiro. O sistema traduz comandos em linguagem natural em fórmulas (com suporte a sintaxe brasileira do Excel), scripts (VBA, Apps Script), queries SQL e expressões regulares, além de permitir análise direta de arquivos e OCR de tabelas.

### 1.2 Objetivos de Negócio
* **Adoção:** Capturar o mercado de analistas de finanças, marketing, RH, contadores e administradores brasileiros que sofrem com a barreira linguística e sintática de ferramentas gringas.
* **Retenção:** Fornecer uma interface livre de fricção que se integre ao fluxo de trabalho diário do usuário.
* **Monetização:** Operar sob um modelo Freemium de alta conversão usando infraestrutura de pagamentos nativa brasileira (Pix e Cartão Nacional).

---

## 2. Personas e Público-Alvo

1.  **Mariana, Analista Financeira Júnior:** Trabalha em uma PME, passa 6 horas por dia no Excel em Português. Sabe o que quer extrair dos dados, mas se perde em aninhamentos complexos de `SE`, `PROCV` e `SOMASE`.
2.  **Thiago, Gestor de Tráfego/Growth Hacker:** Utiliza intensamente o Google Sheets e o Airtable para dashboards de marketing. Precisa criar automações rápidas via Google Apps Script, mas não tem background formal em desenvolvimento (JavaScript).
3.  **Carlos, Analista de Dados / BI:** Escreve queries SQL e Regex para limpar relatórios extraídos de ERPs legados. Precisa de agilidade para não reescrever estruturas básicas do zero.

---

## 3. Requisitos Funcionais (Mapeamento 1:1)

### Módulo A: Assistente de Fórmulas e Sintaxe Localizada
* **RF-01 (Geração de Fórmulas):** O sistema deve aceitar comandos em português (ex: "Quero somar a coluna B se a coluna C for 'Pago'") e gerar a fórmula correspondente.
    * *Seletor de Plataforma:* O usuário deve escolher entre Microsoft Excel, Google Sheets, Airtable ou LibreOffice Calc.
    * *Seletor de Idioma da Fórmula:* O usuário deve poder escolher explicitamente se deseja a fórmula em **Português (Brasil)** com separador `;` ou em **Inglês** com separador `,`.
* **RF-02 (Explicação de Fórmulas):** O usuário pode colar qualquer fórmula estruturada e o sistema deve retornar um passo a passo pedagógico em texto descritivo explicando a lógica de execução.

### Módulo B: Automação e Infraestrutura de Código (Scripts)
* **RF-03 (Gerador de Automações):** Interface conversacional dedicada para geração de scripts de automação.
    * *Outputs suportados:* VBA (Macro para Excel), Google Apps Script (JavaScript para Sheets), e Airtable Scripts.
* **RF-04 (Gerador de SQL):** Transformação de requisições de texto em queries SQL limpas. Deve permitir selecionar o dialeto (PostgreSQL, MySQL, SQL Server, Oracle, BigQuery).
* **RF-05 (Assistente de Regex):** Geração de padrões Regex (ex: capturar apenas CPFs válidos em uma string) e explicação de Regex existentes coladas pelo usuário.

### Módulo C: Análise de Dados Avançada e Upload de Arquivos
* **RF-06 (Análise Baseada em Arquivos):** Permitir o upload de arquivos `.csv` e `.xlsx` de até 5MB.
    * A IA deve ler o esquema de dados do arquivo e disponibilizar uma interface de chat para manipulação simbólica.
    * O motor deve gerar, sob comando: Tabelas Dinâmicas textuais, sugestão e plotagem de gráficos (Barra, Linha, Pizza via SVG estático ou Chart.js renderizado no front) e relatórios executivos de insights automáticos.
* **RF-07 (OCR de Tabelas via Imagem):** Upload de arquivos de imagem (`.png`, `.jpeg`). O sistema deve processar a imagem via OCR, mapear os eixos de colunas e linhas através de IA e disponibilizar uma tabela estruturada que pode ser copiada diretamente para a área de transferência do usuário (formato TSV/CSV aceito pelo Excel).

---

## 4. Requisitos Não-Funcionais e Regras de Negócio

### 4.1 Interface e Arquitetura de UI/UX
* **RNF-01 (Layout Sem Distração):** Design limpo, linear, focado em painéis laterais mudáveis (Sidebar de navegação entre as ferramentas: Fórmulas, Scripts, SQL, Regex, Análise de Arquivo).
* **RNF-02 (Acessibilidade de Cópia):** Botão de "Copiar Código / Fórmula" proeminente em todos os outputs gerados, com feedback visual imediato ("Copiado!").

### 4.2 Desempenho e Segurança
* **RNF-03 (Tempo de Resposta/Latência):** O tempo de resposta para a geração de fórmulas simples via streaming de LLM não deve ultrapassar 2.5 segundos para o início da renderização do texto.
* **RNF-04 (Privacidade de Dados Corporativos):** Arquivos carregados para análise no módulo de dados (RF-06) devem ser armazenados temporariamente na sessão do servidor e destruídos imediatamente após o encerramento do chat ou após 1 hora de inatividade. Os dados brutos não devem ser utilizados para retreinamento de modelos públicos (Uso de APIs com política de Data Privacy ativa, como a API da OpenAI/Anthropic em modo comercial).

### 4.3 Regras de Negócio e Monetização (Paywall Setup)
O modelo seguirá a estrutura de cotas estritas do GPTExcel original, rodando em fusos horários locais:

* **Plano Gratuito (Free Tier):**
    * Limite estrito de até 4 utilizações de ferramentas a cada 12 horas.
    * Limite de até 10 mensagens de chat de IA por mês (renovado a cada 30 dias).
    * Suporte a upload de arquivos limitado a 5MB, máximo de 5 arquivos por histórico.
* **Plano Pro (Pago — Foco em Assinatura Recorrente):**
    * Acesso ilimitado a todas as ferramentas (Fórmulas, Scripts, SQL, Regex, OCR).
    * Prioridade de processamento em servidores de alta velocidade.
    * Suporte técnico preferencial por e-mail/WhatsApp.
    * Geração avançada de templates de tabelas inteiras.

---

## 5. Arquitetura de TI e Stack Recomendada (Sugestão para Engenharia)

[ Frontend: Next.js / Tailwind CSS ]
                   │ (HTTPS / WSS)
                   ▼
   [ Backend API: Node.js (TS) / Fastify ou Python FastAPI ]
                   │
   ┌───────────────┴───────────────┐
   ▼                               ▼
[ Banco de Dados: PostgreSQL ]   [ Integração LLM via API ]

Gestão de usuários/planos       - OpenAI (GPT-4o mini/GPT-4o)

Logs de consumo de tokens       - Anthropic (Claude 3.5 Sonnet)
│
▼
[ Gateway de Pagamentos Local ]

Stripe

---

## 6. Plano de Lançamento e Roadmap de Desenvolvimento

* **Fase 1: Mínimo Produto Viável (MVP) — Semanas 1 a 4:** * Engine principal de geração e tradução de fórmulas localizadas (Português, separador de ponto e vírgula).
    * Painel básico de autenticação e controle de limites gratuitos (4 usos por 12 horas).
    * Integração com gateway de pagamento focando em checkout Pix rápido.
* **Fase 2: Expansão de Features — Semanas 5 a 8:**
    * Módulo de Scripts (VBA/Apps Script) e SQL.
    * Módulo de OCR de imagem para tabela.
* **Fase 3: Inteligência Analítica — Semanas 9 a 12:**
    * Upload e processamento de planilhas complexas para geração de gráficos e relatórios automatizados de BI.

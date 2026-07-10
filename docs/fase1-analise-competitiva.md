# Fase 1 — Análise competitiva e roadmap estratégico

**Data:** 2026-07-09 · **Produto:** ContractorOS AI · **Analisado:** Contractor Foreman (get.contractorforeman.com)

---

## 1. Leitura do concorrente

**Contractor Foreman:** $49/mês, 35+ módulos, trial 30 dias, garantia 100 dias.
Vende três coisas: **amplitude** ("tudo em um"), **preço** ("mais barato do setor") e **facilidade** ("mais fácil de usar").

**Público real deles:** general contractors e subs com equipe e obras longas — por isso têm RFI, inspections, submittals, bid management, purchase orders. Isso é gestão de OBRA.

**Nosso público:** power washing, cleaning, painting, flooring, small remodeling — **service contractors**: alto volume de jobs curtos, orçamento rápido, margem apertada, equipe de 1–5. Isso é gestão de JOB + VENDA.

> **Insight central:** Contractor Foreman é o concorrente errado para copiar. O análogo real dos nossos nichos é **Jobber / Housecall Pro** (field service). CF serve de referência de módulos financeiros; Jobber serve de referência de fluxo. Nossa cunha é o que nenhum dos dois tem: **IA de estimating com proteção de lucro**.

---

## 2. O job-to-be-done que ganhamos

Em home services, **quem responde primeiro fecha o job** (responder em minutos multiplica conversão). Todo o produto deve servir a um loop:

```
FOTO → ESTIMATE IA → PROPOSTA → APROVAÇÃO DO CLIENTE → PAGAMENTO
```

Metric norte: **propostas enviadas por semana por usuário** (secundárias: win rate, margem protegida).

Filtro de escopo — toda feature nova responde 3 perguntas:
1. Serve os 5 nichos?
2. Encurta o loop foto→pago?
3. Protege a margem?

**Menos de 2 sim → não constrói.**

---

## 3. Onde já vencemos (moats — proteger e divulgar)

| Vantagem | Eles têm? |
|---|---|
| Estimate por foto com IA (escopo, premissas, riscos, avisos) | ❌ |
| Motor determinístico baseado em livros de estimating US | ❌ |
| Índice de custo regional (Philadelphia ≠ King of Prussia) | ❌ |
| **Profit Protection** (alerta de margem + preço sugerido) | ❌ |
| Inteligência de mercado (faixa de concorrentes, price-to-beat) | ❌ |
| Envio por WhatsApp | ❌ |
| **Trilíngue EN/PT/ES** | ❌ (inglês) |
| Alarmes com semáforo + realtime | parcial |

> **Insight de distribuição:** trilíngue PT/ES + WhatsApp = cunha real na comunidade de contractors brasileiros/latinos nos EUA — mercado mal servido, onde o fundador tem rede. CF não compete aí. Vale explorar no marketing antes de qualquer feature nova.

---

## 4. Gaps que importam (adicionar) — priorizado

| # | Feature | Por quê (pro nosso ICP) | Esforço | Impacto | Modelo p/ implementar |
|---|---|---|---|---|---|
| P0-1 | **Ativar Stripe** (chave real no Vercel) | invoice → link de pagamento = fecha o loop; já está pronto no código | S (só chave) | Alto | usuário + Haiku |
| P0-2 | **Fotos persistentes por job (antes/depois)** | prova em disputa, marketing, requisito básico dos nichos (CF tem "Files & Photos") | M (Supabase Storage + galeria) | Alto | Opus (RLS/storage) |
| P0-3 | **Onboarding primeira-execução** | CF vende "fácil"; nosso pós-signup é dashboard vazio. 3 passos: empresa/nicho/margens → seed do price book do nicho → primeiro estimate em 10 min | M | Alto (ativação) | Sonnet |
| P1-1 | **Follow-up automático de proposta** | proposta enviada + 3 dias sem resposta → alarme + template WhatsApp de cobrança. Infra de alarmes já existe. Conversão pura | S–M | Alto | Sonnet |
| P1-2 | **Calendário semanal de jobs** | service contractor vive da agenda; temos datas, falta a visão | M | Alto | Sonnet |
| P1-3 | **Pedido de review Google pós-job** | nichos vivem de review; botão "job concluído → manda link de review por WhatsApp" | S | Alto | Haiku/Sonnet |
| P1-4 | **Jobs recorrentes** | cleaning/power washing = clientes mensais/trimestrais; recorrência + invoice automática (território Jobber, CF não tem foco) | M–L | Alto p/ 2 nichos | Opus |
| P2-1 | **Timecards simples** | equipe aponta horas → custo real de mão de obra alimenta Profit Protection (real vs estimado) | M | Médio | Sonnet |
| P2-2 | **Daily log leve** | nota + foto do dia no job (funde com P0-2) | S | Médio | Sonnet |
| P2-3 | **Export PDF financeiro** | relatório mensal por job / geral (print view já existe como padrão) | S | Médio | Sonnet |
| P3-1 | **Contas de equipe / papéis** | necessário só quando clientes tiverem crew; hoje solo é ok | L | Futuro | Opus |

---

## 5. Simplificar ou não fazer

**Simplificar:**
- **Wizard guiado room-by-room** → secundário. Power washing/cleaning não têm "cômodos". Aba IA já é default ✅; wizard fica como caminho de remodeling. Não deletar.
- **Landing:** adicionar prova (GIF do fluxo foto→estimate, depoimento). CF vende com Capterra; nós temos zero prova social hoje.

**Não fazer (lista de proteção de foco — recusar mesmo se parecer "grátis"):**
- Team chat (WhatsApp já resolve)
- RFI, submittals, inspections (mundo GC)
- Bid management (mundo GC)
- Purchase orders complexos (nossas despesas categorizadas bastam)
- Equipment/fleet tracking
- Copiar os 35 módulos — a amplitude deles é a fraqueza deles (complexidade); nossa profundidade de IA é a vantagem

---

## 6. Posicionamento e preço

- CF: *"gerencie toda sua operação"* por $49.
- Nós: *"a IA que fecha o orçamento em minutos e protege teu lucro"* — **um job mal precificado custa $500+; o app se paga no primeiro alerta**.
- Preço atual ($49 Pro) ok para paridade; considerar plano de entrada $29 (só estimates+propostas) para converter solo operators, upgrade para Pro (finanças, alarmes, CRM).
- Trial: métrica de ativação = **1º estimate enviado em 10 minutos** (o onboarding P0-3 existe para isso).

---

## 7. Riscos a monitorar

1. **Custo de IA por estimate** (fotos + modelo) — monitorar consumo no gateway; cachear onde der (mercado já cacheado ✅).
2. **Qualidade do autocomplete Census** — aceitável; se virar reclamação, upgrade p/ Google Places (chave do usuário).
3. **Sem contas de equipe** — ok agora; vira bloqueio quando o cliente típico tiver crew (P3).
4. **Offline no canteiro** — PWA ajuda; avaliar cache offline depois, não agora.

---

## 8. Ordem de execução sugerida (1 sessão = 1 item)

1. Stripe (usuário coloca a chave; validar link real) — 15 min
2. Fotos por job (Storage + galeria antes/depois) — 1 sessão Opus
3. Onboarding 3 passos + seed por nicho — 1 sessão Sonnet
4. Follow-up automático de proposta — 1 sessão Sonnet
5. Calendário semanal — 1 sessão Sonnet
6. Review request — ½ sessão Haiku/Sonnet
7. Recorrência (cleaning/PW) — 1–2 sessões Opus
8. Landing: GIF de prova + depoimentos — Fable (copy) + Sonnet (implementação)

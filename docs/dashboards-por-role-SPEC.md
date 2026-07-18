# Dashboards por Role — Spec reconstruída

> **Origem:** a solicitação original detalhada ("gráficos por cargo") foi feita em sessão de chat
> não recuperável no histórico. Este doc **reconstrói** a spec a partir do HANDOFF #1 + prática de
> gestão de construção nos EUA. **Revisar / corrigir** — é um ponto de partida, não a msg literal.
> Épico grande, sessão dedicada (não improvisar). Local: `/demand`. Visibilidade por role.

## Modelo de permissão (base)
- Tabela `employee_roles` (ou `profiles.role`) — 1 usuário pode ter 1+ roles.
- Relação N:N **funcionário ↔ supervisor ↔ projeto** (quem vê o quê).
- Cada role vê **só os gráficos do seu escopo**. GC/Contractor vê tudo.
- Cores de status padrão do app: 🟢 saudável · 🟡 atenção · 🔴 risco.

---

## 1. Contractor / GC (dono) — visão de negócio
**Objetivo:** dinheiro, pipeline e saúde geral num relance.

| Gráfico | Tipo | Métrica | Fonte |
|---|---|---|---|
| **Pipeline de vendas** | Funnel / barras empilhadas | estimates por status: rascunho → enviado → aprovado → perdido | `estimates.status` |
| **Margem por job** | Barras horizontais (cor por faixa) | margem % real vs `min_margin_pct` alvo | `estimates` + `job_transactions` |
| **Cashflow 90 dias** | Linha / área | entradas (depósitos+invoices) vs saídas (gastos) projetadas | `invoices`, `job_transactions`, `change_orders` |
| **Receita por trade** | Pizza / donut | faturamento por tipo de serviço | `estimates.trade` |
| **Win rate** | Gauge + tendência | % aprovados, por área e por tipo (residencial/comercial) | `estimates` + `clients` |

## 2. Estimator — precisão de orçamento
**Objetivo:** o quão certeiros são os orçamentos.

| Gráfico | Tipo | Métrica | Fonte |
|---|---|---|---|
| **Variância orçado vs real** | Barras divergentes (±%) | custo estimado vs custo real por job | `estimate_items` vs `job_transactions` |
| **Benchmark de preço** | Barras agrupadas | preço do item vs média regional / catálogo | `price_items` vs `default_price_items` |
| **Itens fora do catálogo** | Lista + contador | itens que a IA gerou (status pending) | `price_items.status='pending'` |
| **Acurácia ao longo do tempo** | Linha | erro médio de estimativa por mês (tendência) | histórico de jobs fechados |

## 3. PM (Project Manager) — execução
**Objetivo:** projeto no prazo e no orçamento.

| Gráfico | Tipo | Métrica | Fonte |
|---|---|---|---|
| **Budget vs Actual** | Barras lado a lado por categoria | orçado vs gasto (material/labor/equip) | `estimate_items` vs `job_transactions` |
| **Cronograma / Gantt** | Gantt | tarefas por fase, atrasos destacados | `job_tasks` (+ épico Scheduler) |
| **Burn rate** | Linha acumulada | gasto acumulado vs linha do orçamento | `job_transactions` |
| **Change orders** | Barras / timeline | impacto de aditivos no total | `change_orders` |
| **Tarefas por status** | Barras empilhadas | pendente/em andamento/concluído por job | `job_tasks` |

## 4. Superintendent / Construction Manager — multi-obra
**Objetivo:** vários canteiros de uma vez.

| Gráfico | Tipo | Métrica | Fonte |
|---|---|---|---|
| **Saúde por obra** | Grid de cards (semáforo) | prazo + orçamento + segurança por projeto | agregado |
| **Alocação de equipe** | Heatmap / barras | funcionários por obra por dia | `employees` + projeto |
| **Incidentes abertos** | Contador + lista (severidade) | por obra | `incidents` |

## 5. Safety Manager — segurança
**Objetivo:** inspeções e incidentes (liga ao épico #2 do HANDOFF).

| Gráfico | Tipo | Métrica | Fonte |
|---|---|---|---|
| **Incidentes por severidade** | Barras (🟢🟡🔴) | contagem no período | `incidents.severity` |
| **Checklist de inspeção** | Progresso por trade/job | % concluído, com foto de prova | épico Safety checklist |
| **Dias sem incidente** | Big number + tendência | contador | `incidents` |

## 6. Foreman — a obra do dia
**Objetivo:** o que fazer hoje, sem números financeiros.

| Gráfico | Tipo | Métrica | Fonte |
|---|---|---|---|
| **Tarefas de hoje** | Checklist visual + foto | tarefas do job atual | `job_tasks` |
| **Progresso do job** | Barra de % | tarefas concluídas / total | `job_tasks` |
| **Material em estoque** | Alertas reorder | itens abaixo do mínimo (+ loja mais barata) | `inventory_items` + `item_store_prices` |

## 7. Scheduler — cronograma
| Gráfico | Tipo | Métrica | Fonte |
|---|---|---|---|
| **Gantt geral** | Gantt multi-projeto | sobreposições e conflitos de recurso | épico Scheduler |
| **Capacidade da equipe** | Heatmap | horas alocadas vs disponíveis | `employees` |

## 8. Roles de leitura (Laborer / Inspector / Civil Engineer)
- **Laborer:** só "tarefas de hoje" + foto de prova (sem preço/margem). = modo aprendiz.
- **Inspector:** checklist de inspeção + status de aprovação por fase.
- **Civil Engineer:** takeoffs/quantidades determinísticas + specs, sem financeiro.

---

## Notas de implementação
- Biblioteca de gráficos: definir (Recharts é o padrão do ecossistema; validar com skill `dataviz`).
- Dados já existem para a maioria (estimates, job_transactions, job_tasks, incidents). Faltam:
  Gantt (épico Scheduler), Safety checklist (épico #2), relação roles↔projeto (épico #1).
- Reusar cores de status do app (🟢🟡🔴) e Plus Jakarta Sans.
- Cada card = 1 componente; loader por role no server (`/demand`), filtrando por permissão.

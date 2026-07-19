# Matriz de Responsabilidades & Acesso — ContractorOS AI

> Proposta para o épico #1 (cargos/permissões). **Você valida/ajusta**, depois eu
> implemento RLS por role no servidor. Nada aqui está aplicado ainda.
> Data: 2026-07-18.

## 1. Modelo proposto (por que agrupar)

Os 11 cargos de construção são muitos para o dono gerenciar um a um. Proposta:
**6 perfis de acesso**, cada cargo cai em um. Simples de atribuir, fácil de entender.

| Perfil de acesso | Cargos que entram | Ideia central |
|---|---|---|
| **Owner / GC** | Contractor, Construction Manager | Dono. Vê e edita **tudo** (inclui custo/margem). |
| **Sales (Vendedor)** | Salesperson *(novo)* | Vende. Cliente + estimate via wizard guiado + proposta. Vê **preço de venda**, NÃO vê custo/margem interna. |
| **Estimator** | Estimator, Civil Engineer | Orçamento. Estimate, catálogo, market intelligence, variância. **Vê custo/margem.** |
| **Ops (Obra)** | PM, Superintendent, Foreman, Scheduler | Executa. Cronograma, tarefas, equipe, budget vs actual, incidents. Vê custo do job, **não** o markup de venda. |
| **Crew (Campo)** | Laborer, Inspector, Safety Manager | Só tarefas do dia + safety + fotos. **Zero financeiro.** |
| **Subcontractor (externo)** | Subcontractor | **Sem login.** Só o estimate compartilhado por link (como já é hoje). |

> Regra de ouro: **1 usuário = 1 perfil.** Owner sempre existe (é você). Os outros
> você atribui aos funcionários que tiverem login.

## 2. Matriz de acesso (o "quem vê o quê")

Legenda: ✅ vê+edita · 👁️ só vê · 🔒 nada

| Recurso | Owner/GC | Sales | Estimator | Ops | Crew |
|---|:--:|:--:|:--:|:--:|:--:|
| Clientes / CRM | ✅ | ✅ | 👁️ | 👁️ | 🔒 |
| Estimate — criar/editar | ✅ | ✅ (wizard) | ✅ | 👁️ | 🔒 |
| **Custo / margem / markup** | ✅ | 🔒 | ✅ | custo👁️ markup🔒 | 🔒 |
| Preço de venda (total) | ✅ | ✅ | ✅ | 👁️ | 🔒 |
| Propostas | ✅ | ✅ | 👁️ | 🔒 | 🔒 |
| Market Intelligence | ✅ | 👁️ | ✅ | 🔒 | 🔒 |
| Financeiro (job costing, invoices) | ✅ | 🔒 | 👁️ | 👁️ | 🔒 |
| Tarefas / Cronograma (Gantt) | ✅ | 👁️ | 👁️ | ✅ | 👁️ (só as suas) |
| Safety checklist | ✅ | 🔒 | 🔒 | ✅ | ✅ |
| Inventory / lojas | ✅ | 🔒 | 👁️ | 👁️ | 🔒 |
| Equipe do projeto (atribuições) | ✅ | 🔒 | 🔒 | ✅ | 👁️ |
| Dashboard /demand (por role) | GC | vendas | variância | budget/prazo | 🔒 |
| Cadastros (funcionários/subs/forn.) | ✅ | 🔒 | 🔒 | 👁️ | 🔒 |
| Settings / Billing | ✅ | 🔒 | 🔒 | 🔒 | 🔒 |

## 3. Perguntas do estimate em CASCATA por role (seu insight)

Hoje: bloco único de perguntas estáticas antes do estimate, iguais para todos.
**Mudança:** cada pergunta ganha um **dono (audience)** e aparecem **uma de cada vez**
(cascata/wizard), só para quem precisa:

- **Sales (Vendedor)** — perguntas de **venda e cliente** que o pessoal de obra já
  sabe de cor e não precisa ver: expectativa do cliente, prazo desejado, orçamento
  do cliente, quem decide, concorrência, forma de pagamento, acesso ao imóvel.
- **Estimator / GC** — perguntas **técnicas**: medições, código aplicável,
  condições ocultas, responsabilidade por material, licenças.
- **Ops** — perguntas de **execução**: janela de trabalho, logística, equipe.

Cada `AdvisorQuestion` recebe `audience: perfil[]`. O wizard mostra só as do perfil
logado, uma por vez (com "por que importa"), e o **advisor de IA** (já feito) gera as
dinâmicas dentro do mesmo perfil. Isso deixa o vendedor com um roteiro guiado sem
poluir a tela de quem é técnico.

## 4. O que VOCÊ precisa decidir (checklist)

1. **Perfis (seção 1):** o agrupamento em 6 está bom? Junta/separa algum?
2. **Custo/margem:** confirmo que **Sales não vê**? E **Ops vê custo mas não o markup**?
3. **1 perfil por usuário** serve, ou alguém precisa de 2 (ex: dono que também vende)?
4. **Subcontractor:** fica só por link (sem login), certo? Ou quer dar login a eles?
5. **Ops vê só os projetos que supervisiona**, ou todos? (usa `project_assignments`)
6. **Crew vê só as próprias tarefas** — confirma?
7. **Perguntas em cascata:** me diga 3–5 perguntas que **só o vendedor** vê e 3–5 que
   **só o técnico** vê — eu monto o mapeamento.

> Responda esses 7 e eu implemento: coluna de perfil no funcionário, RLS por perfil
> (testada em staging antes de prod), colunas sensíveis protegidas, e o wizard em
> cascata por role.

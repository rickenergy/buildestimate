# Matriz de Responsabilidades & Acesso — ContractorOS AI

> Proposta para o épico #1 (cargos/permissões). Atualizado com as decisões do dono.
> Data: 2026-07-18. Nada aplicado ainda — implementação faseada abaixo.

## 1. Perfis de acesso (7)

**1 usuário = 1 perfil.** Cada cargo cai num perfil. Visibilidade de projeto por
**responsabilidade** (tabela `project_assignments`): quem só é responsável por 1
projeto, só vê 1. **Só GC e Project Manager veem TODOS os projetos.**

| Perfil | Cargos | Vê quais projetos | Financeiro |
|---|---|---|---|
| **Owner / GC** | Contractor, Construction Manager | **Todos** | Tudo (custo, margem, markup) |
| **Project Manager** | PM | **Todos** | Custo + budget vs actual (sem editar billing) |
| **Sales (Vendedor)** | Salesperson | Os seus | **Só preço de venda** (sem custo/margem) |
| **Estimator** | Estimator, Civil Engineer | Os seus | Custo + margem |
| **Field (Campo)** | Superintendent, Foreman, Scheduler | **Só os que é responsável** | Custo do job, **sem markup** |
| **Crew** | Laborer, Inspector, Safety | **Só os que é responsável** | 🔒 nada |
| **Subcontractor** | Subcontractor | **Só onde foi contratado** | **Só o que ELE recebe** (ver módulo próprio) |

## 2. Matriz de acesso

`✅ vê+edita · 👁️ só vê · 🔒 nada`

| Recurso | GC | PM | Sales | Estimator | Field | Crew | Sub |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Clientes / CRM | ✅ | 👁️ | ✅ | 👁️ | 🔒 | 🔒 | 🔒 |
| Estimate criar/editar | ✅ | 👁️ | ✅ wizard | ✅ | 👁️ | 🔒 | 🔒 |
| **Custo / margem / markup** | ✅ | custo👁️ | 🔒 | ✅ | custo👁️ markup🔒 | 🔒 | 🔒 |
| Preço de venda | ✅ | 👁️ | ✅ | ✅ | 👁️ | 🔒 | 🔒 |
| Propostas | ✅ | 👁️ | ✅ | 👁️ | 🔒 | 🔒 | 🔒 |
| Market Intelligence | ✅ | 👁️ | 👁️ | ✅ | 🔒 | 🔒 | 🔒 |
| Financeiro do job | ✅ | 👁️ | 🔒 | 👁️ | 👁️ | 🔒 | **só o dele** |
| Tarefas / Gantt | ✅ | ✅ | 👁️ | 👁️ | ✅ | 👁️ suas | 👁️ suas |
| Safety checklist | ✅ | ✅ | 🔒 | 🔒 | ✅ | ✅ | ✅ |
| Inventory / lojas | ✅ | 👁️ | 🔒 | 👁️ | 👁️ | 🔒 | 🔒 |
| Equipe do projeto | ✅ | ✅ | 🔒 | 🔒 | 👁️ | 👁️ | 🔒 |
| Dashboard /demand | GC | budget/prazo | vendas | variância | seu projeto | 🔒 | progresso dele |
| Cadastros | ✅ | 👁️ | 🔒 | 🔒 | 👁️ | 🔒 | 🔒 |
| Settings / Billing | ✅ | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 |

## 3. Perguntas do estimate em CASCATA por perfil

Cada `AdvisorQuestion` ganha `audience`. Aparecem **uma de cada vez** (wizard), só para
o perfil dono. Proposta inicial (você ajusta):

**Só o VENDEDOR vê** (venda + cliente — o pessoal de obra já sabe):
1. Qual orçamento o cliente tem em mente?
2. Qual a expectativa de prazo do cliente?
3. Quem decide o fechamento (só ele, ou sócio/cônjuge)?
4. Está pedindo orçamento a outras empresas? O que mais pesa — preço, prazo ou qualidade?
5. Forma de pagamento preferida / precisa de financiamento?
6. Como conheceu a empresa (indicação, Google, anúncio)?

**Só o TÉCNICO vê** (Estimator/GC):
1. Medidas confirmadas no local ou estimadas por foto?
2. Condições ocultas prováveis (idade do imóvel, sinais de água/dano)?
3. Material por conta de quem — contratante ou cliente?
4. Precisa licença/permit para este escopo?
5. Acesso ao local (escada, estacionamento, restrição de horário)?
6. Código aplicável / inspeção necessária?

## 4. Implementação faseada (baixo→alto risco)

1. **Fase A — perfil no usuário** (baixo risco): coluna `profiles.access_profile`
   (enum 7 perfis) + UI pra o dono atribuir. Sem gating ainda.
2. **Fase B — gating na tela** (médio): esconder cards/campos por perfil (client+server
   render). Reversível, não trava banco.
3. **Fase C — RLS por perfil** (alto): regras no banco por perfil + `project_assignments`.
   **Testar em branch/staging do Supabase antes de prod.** Colunas sensíveis
   (custo/margem) protegidas por view ou coluna-level.
4. **Fase D — wizard cascata** por `audience`.

> Faço A→B→C→D nessa ordem, cada uma verificada, sem pular pro RLS direto.

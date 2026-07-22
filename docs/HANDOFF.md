# ContractorOS AI — Handoff / Estado do Projeto

> Doc de continuidade. Leia isto ao começar sessão nova depois de `/clear`.
> Atualizado: **2026-07-20** (sessão grande: multi-tenancy, subs completo, blueprint takeoff Fase 1+2).

## ▶ COMECE AQUI (backup do que ficou pendente — 2026-07-20)

### 🔴 Config do DONO (bloqueia features prontas) — fazer primeiro
1. **RODAR `docs/pending-migrations.sql`** no SQL editor → https://supabase.com/dashboard/project/snvmpzlgngoohqovzeij/sql
   (cria `blueprints` + colunas `trade_map`/`trade_scopes` + `subcontractor_docs.file_path`). **Sem isso /blueprints e upload de docs quebram.**
2. **Colar 2 templates** de email (Supabase → Auth → Emails → Templates): `docs/emails/reset-password.html` (Reset Password) + `docs/emails/magic-link.html` (Magic Link).
3. Ligar Security → **"Password changed"** (toggle).
4. **Resend: verificar um domínio** (https://resend.com/domains) → trocar Sender de `onboarding@resend.dev` (hoje só entrega no gmail do dono) pro domínio → aí email chega a clientes/subs.
5. Config Stripe (`STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + webhook `/api/stripe/webhook` + eventos checkout.session.completed / customer.subscription.deleted) + `SUPABASE_SERVICE_ROLE_KEY` na Vercel.
6. VAPID (`npx web-push generate-vapid-keys` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
7. ✅ **JÁ FEITO pelo dono:** Confirm Email OFF · SMTP Resend (funciona, testado 200).

### ✅ Blueprint Fase 3 — FEITO (2026-07-21): takeoff → orçamento end-to-end
Fluxo completo agora: upload planta → mapear trades → escolher trade → escopo de works → selecionar → **campo "Solicitação do builder"** (IA lê e faz exatamente o pedido) → **Rodar takeoff** (IA lê cotas/tags/schedule → quantidade por work c/ `basis`+`confidence`, GC edita cada número) → **Gerar orçamento profissional** → cai no motor determinístico existente (`computeEstimate`→`saveEstimate`: catálogo + perda + mão de obra + crew + fator de localização + overhead/lucro/imposto) → abre `/estimate/[id]` (com `/proposal` e `/print` prontos).
- Novas actions em `app/actions/blueprints.ts`: `saveBuilderRequest`, `quantifyTrade`, `saveWorkQuantities`, `estimateFromBlueprint`. UI em `components/blueprint-detail.tsx`.
- **✅ Testado ao vivo (2026-07-21)** com planta de teste (A-101, 2 quartos + banheiro): fluxo inteiro rodou → orçamento "TEST A-101 — painting" $8,348.41, margem 16.67%, com payment schedule. Dados de teste já deletados da prod.
- **2 bugs achados/corrigidos no teste:**
  1. Tabela `blueprints` estava sem `page_count/pages/trade_map/trade_scopes` (o `create table if not exists` pulou porque a tabela já existia da Fase 1). Fix: `docs/fix-blueprints-columns.sql` (dono JÁ rodou). **Se recriar o banco, rodar esse ALTER.**
  2. `buildTradeScope`/`quantifyTrade` mandavam ZERO imagens quando os nºs de folha do `trade_map` (ex.: 101) não batiam com o índice da página (1..N) → IA quantificava às cegas (~15% conf). Fix (commit `490eedc`): fallback pra todas as páginas quando a interseção é vazia. Depois: conf 85-90%, lê cotas reais.
- **Refino menor:** `buildPainting` adiciona rodapé/trim por padrão mesmo quando a solicitação é só paredes+tetos — GC deleta a linha no editor. Se incomodar, passar `include_baseboard:false` em `estimateFromBlueprint`.
- **Dívida técnica (migrar depois):** pra não travar no MCP Supabase fora do ar, `builder_request` e `estimate_id` estão dentro do jsonb `blueprints.answers` (chaves `__builder_request`/`__estimate_id`); quantidades em `trade_scopes[trade].quantities`. Quando MCP voltar: criar colunas reais `builder_request text` + `estimate_id uuid references estimates(id)` e migrar (`app/actions/blueprints.ts` centraliza as chaves em consts).
- **Refino futuro (Fase 4):** calibração de escala por canvas (GC marca 1 medida conhecida → px→ft) pra subir precisão além do "ler cotas impressas"; feedback loop de correções do GC.

### 🟣 Módulo VIP — BID / Licitação (pedido do dono, futuro)
Módulo premium pra ganhar trabalhos maiores via **BID por licitação**. Objetivo: pegar um pacote de licitação (specs + plantas + bid form) → IA monta a proposta competitiva completa. Escopo a definir: importar bid docs, takeoff multi-trade do set inteiro, bid form/schedule of values, bid bond/insurance reqs, addenda, prazo, markup competitivo p/ ganhar mantendo margem, geração do pacote de submissão. Gate por plano (tier VIP). Reusa o motor de takeoff + estimate já pronto.

### 🟡 Código pendente (retomar aqui)
- **Push em eventos**: `notifyUser` existe mas nada dispara. Ligar em contrato assinado (RPC `sign_sub_contract`) e share respondido → precisa **Supabase DB Webhook → Edge Function → notifyUser** + VAPID.
- **PDF grande**: cap de 40 folhas; falta UX de "2º upload" pro resto.
- **RLS fino de custo/margem** quando Sales/Estimator ganharem acesso a estimates (hoje estimates = só dono).
- **Testes automatizados** dos fluxos novos (vitest só cobre takeoff determinístico).

### 🧹 Limpar (dados de teste no banco de PROD — criei testando ao vivo)
Contas `owner8842@buildestimate.app` + `member8844@buildestimate.app` (senha Teste123456), sub "Carlos Drywall LLC", 1 contrato assinado, 1 pagamento, membership do Joao, e blueprints de teste. **Deletar antes dos beta users reais.**

### Verificado ao vivo nesta sessão (logado, clicando)
Signup→home · checklist first-steps · convite (link curto) · aceitar→member home · nav reduzida · **RLS: membro não vê financeiro do dono** · contrato criar→assinar público→owner reflete · financeiro sub · docs compliance · Confirm-OFF entra direto · SMTP reset 200. Zero erro de console, zero bug de runtime.

---


## O que é
SaaS Next.js 16 mobile-first de **estimates com IA para contractors** nos EUA.
Objetivo central do dono: **profissionais que não dominam tecnologia gerenciam o
negócio com apoio de IA.** Trilíngue EN/PT/ES.

## Onde está tudo
| Item | Valor |
|---|---|
| Código local | `~/dev/buildestimate-ai` (FORA do iCloud — não mover pra Documents, corrompe node_modules) |
| GitHub | `github.com/rickenergy/buildestimate` (privado) |
| Deploy | Vercel projeto `buildestimate-ai` → **https://buildestimate-ai.vercel.app** (auto-deploy no push pra main) |
| Supabase | projeto `snvmpzlgngoohqovzeij` (org B Innovation Marketing) |
| Rodar dev | `cd ~/dev/buildestimate-ai && ./node_modules/.bin/next dev -p 3100` (porta 3000 = outro app do user) |
| Typecheck | `npx tsc --noEmit` (ignorar erros `cache-life.d 2`/`TS6200`) |

## Fluxo de deploy
Edito → `git commit` → `git push origin main` → Vercel deploya sozinho ~2min.
Migrations Supabase são aplicadas direto no banco (não passam pelo git).

## Stack / padrões
- Next 16 App Router · TS · Tailwind v4 · Supabase (RLS em tudo) · Vercel
- Server Actions pra mutations · `"use client"` só onde precisa
- **Regra "use server"**: arquivo `"use server"` só exporta funções async — consts/types compartilhados vão em módulo separado
- i18n: `lib/i18n/{en,pt,es}.ts` + `getDict(lang)`; muitos componentes usam labels trilíngues inline (padrão glossary)
- Fonte Plus Jakarta Sans · tema laranja/branco (Salesforce-Lightning) · dark mode via next-themes

## ✅ JÁ CONSTRUÍDO (funcional)
- **Auth**: email+senha (confirmação OFF, entra direto), Google (escondido atrás de `NEXT_PUBLIC_GOOGLE_ENABLED=true`), esqueci-senha (`/auth/reset`), termos obrigatórios no signup
- **Estimates**: wizard guiado, quick form, **AI estimate** (foto→draft), catálogo de preços, **"From catalog"** (adiciona serviço sem escrever), payment schedule (3 presets US), rules/requirements colapsável
- **IA auto-aprende**: item gerado fora do catálogo → salva em price_items (status pending)
- **Catálogo de preços**: 2 passos (serviço→itens), dedup live (aviso+highlight), aprovação pending/approved (badge âmbar)
- **Proposal público** `/p/[token]`: landing de conversão (banner+logo+preço gigante+escopo+licenças/seguros+payment schedule) + salvar PDF + assinatura de aceite
- **PDF** `/estimate/[id]/print`: branded (logo, banner c/ zoom+reposição, licenças/seguros no rodapé)
- **Compartilhar com subs**: escolhe subs+msg → link Sim(verde)/Não(vermelho) `/share/[token]` → status ao vivo → "mandar pro próximo"
- **Finance**: dashboard, cadastro guiado (foto+nota fiscal+desperdício/devolução/reaproveitamento), métricas de perda
- **Incidents**: `/incidents` (severidade verde/amarelo/vermelho, responsável, msg→email mailto)
- **Cadastros**: clientes (Lead→Customer auto ao aprovar estimate; modal detalhe c/ tel/whatsapp/maps/histórico), subcontratados (license+insurance), fornecedores, funcionários, lojas varejistas, inventário (alerta reorder)
- **CSV**: export em todos os cadastros + **import universal** (auto-mapeia colunas EN/PT/ES) em clientes/subs/fornecedores/funcionários/lojas
- **Branding**: settings com logo+banner (zoom+reposição), licenças/seguros multi-entrada, endereço/email/licença
- **Sidebar desktop** (md+): nav estruturado + submenu Manage; mobile mantém bottom nav
- **Demand**: market pulse (Census permits, seletor de região), demanda por área
- **Infra**: cron keep-alive (banco não pausa), cookies+privacy+terms, RLS+advisors OK

## 🔴 PENDENTES — o que ainda falta dos épicos grandes
1. **Sistema de cargos/permissões (N:N) + visibilidade por role.**
   - ✅ Feito: seletor de role + **dashboard GC** no /demand (`docs/dashboards-por-role-SPEC.md`); **roles estruturados** (`lib/roles.ts`); **atribuição N:N** (`project_assignments`, `ProjectTeamCard`).
   - ✅ **Multi-tenancy (Equipe & Convites):** org = user_id do dono; `org_members` + `org_invites` + RPCs `current_org`/`accept_org_invite`/`is_org_member`; `/settings/team` (dono gera link de convite, gerencia membros/perfis) + `/invite/[token]` (aceitar). 7 perfis em `lib/access-profiles.ts`. Modelo validado em `docs/roles-matrix.md`.
   - ✅ **RLS de membro (aditiva, aplicada em prod):** membro lê tabelas OPERACIONAIS (projects, project_assignments, job_tasks, safety_checks, job_photos, incidents) via `is_org_member(user_id)`. Policies do dono intactas. Financeiro/estimates/cadastros = **só dono** (sensível).
   - ✅ **Telas por perfil (2026-07-18):** view `org_jobs_lite` (jobs sem dinheiro p/ membros); **MemberHome** no /home (membro logado vê: tarefas de hoje, projetos atribuídos com progresso, incidentes — PM vê todos, Field/Crew/Sub só os atribuídos via employee link); **nav reduzida** p/ membro (Home+Settings). **Dashboards de todos os 7 roles no /demand** com dados reais (Estimator variância, PM budget vs actual, Superintendent saúde por obra, Safety, Foreman, Scheduler agenda 14d).
   - 🔴 Falta: gating fino de custo/margem nas telas do dono quando membro Sales/Estimator ganhar acesso a estimates; wizard de perguntas em cascata por perfil (`audience` — spec §3 do roles-matrix); vincular `org_members.employee_id` na UI de convite (hoje via SQL). **Testar fluxo de membro com conta secundária antes de convidar gente real.**
5. **Advisor dinâmico por voz + offline.** ✅ **COMPLETO (2026-07-18):** ditado por voz; advisor IA dinâmico; **wizard em cascata por perfil** (perguntas de vendedor vs técnicas, uma por vez, `audience` em lib/advisor); **offline** (sw.js cacheia telas visitadas, banner offline, fila localStorage sincroniza respostas ao reconectar).

## ✅ TAMBÉM 2026-07-18 (lote final)
- **Convite corrigido** — página em branco era client component fora do I18nProvider. Nova rota curta `/i/<nome-do-convidante>-<código>`, login respeita `?next=`, copiar com 1 clique.
- **Módulo Subcontractor COMPLETO** — score 0–100 real + tiers; lista rankeada; ficha `/subcontractors/[id]`; **fase 2**: checklist de docs de contratação US (`subcontractor_docs`: W-9/COI/licença/contrato/lien waiver/SOV, validade, "pronto para contratar"), score lê docs reais, **login do sub vinculado** (convite com select de vínculo, RLS sub-lê-shares-dele, home própria do sub sem valores), e **contrato assinável**: template US (`lib/contract-template`), `sub_contracts` + RPCs por token, card na ficha gera link público `/c/[token]` com assinatura eletrônica por nome digitado; e **financeiro do sub**: `sub_payments`, card na ficha (contratado/pago/a-pagar + barra por contrato + registrar pagamento) e bloco "Meus pagamentos" na home do sub logado (só o dinheiro DELE). Spec: `docs/subcontractor-module.md`.

## 🟡 EM ANDAMENTO — Blueprint takeoff assistido (Fase 1+2, 2026-07-20)
- **Fase 2 (feito):** `mapPlanTrades` lê o índice → mapeia todos os trades do conjunto; `buildTradeScope(trade)` agrega o escopo do trade escolhido em todas as folhas, fundamentado em `lib/takeoff-methods.ts` (metodologia dos livros: o que/como medir por trade, dedução de aberturas, demão/waste), com perguntas confiança-gated; `selectTradeWorks` (GC seleciona works). UI: 1 ler índice → 2 escolher trade → 3 escopo com seleção (texto/voz). Multi-folha PDF via pdfjs (`lib/pdf-render`).
- Fluxo antigo por-folha (`analyzeBlueprintPage`) continua como leitura secundária.

- Submenu **/blueprints**: upload de planta (imagem/PDF) → `blueprints` table.
- **`analyzeBlueprint`** (IA visão): retorna trades+confiança, escopo, e **perguntas confiança-gated** (tudo que não tem certeza — escala, uso do cômodo, alturas, símbolos — vira PERGUNTA ao GC, nunca chuta). GC responde (texto/voz) + escolhe o trade.
- `BlueprintDetail`: mostra planta, escopo, trades com % honesto, perguntas, escolha de trade.
- ⚠️ **PENDENTE: rodar `docs/pending-migrations.sql`** (MCP caiu — cria `blueprints` + `subcontractor_docs.file_path`). Sem isso, /blueprints e upload de doc quebram.
- 🔴 Falta (Fase 2+): calibração de escala (GC marca 1 medida → fator), medição de áreas, virar estimate via motor determinístico, rasterizar PDF (v1 lê só imagem). Plano: `docs/blueprint-takeoff-plan.md`.
- **Upload de PDF nos docs do sub** também entregou (📎 anexar / 📄 ver) — precisa a mesma migration.
- **Email de reset lindo**: `docs/emails/reset-password.html` — colar no Supabase Auth templates.

## ✅ CONCLUÍDO 2026-07-18 (sessão Claude Code)
- **#7 Store→inventory "mais barato por item"** — `item_store_prices` (RLS/FK/trigger, migration aplicada); badge "mais barato" no card + seção Preços por loja no dialog.
- **#8 Task mapping por serviço** — `TRADE_TASKS` (14 trades) + `getServiceTasks` (determinístico/IA grounded) + `ServiceTasksCard` no estimate.
- **#9 Market Intelligence real** — sinal externo de **Census permits** (YoY→tendência) no prompt + card. ("VIP estimate" não existia no código.)
- **#6 Premium** — `lib/premium` (planStatus), coroa `PremiumBadge` + `PlanCard` no settings, `/settings/billing` (Free vs Pro), **Stripe Checkout** (REST, sem SDK) + **webhook** (`/api/stripe/webhook`, verificação HMAC, flip plan via admin client), migration `stripe_customer_id`. → precisa config Stripe (abaixo).
- **#2 Safety checklist** — `lib/safety` (geral OSHA + por trade, trilíngue) + `safety_checks` (migration) + `SafetyChecklistCard` no estimate (toggle done, progresso; `photo_url` pronto).
- **#4 Push notifications** — `public/sw.js`, `lib/push` (web-push+VAPID), `push_subscriptions` (migration), actions (save/test/`notifyUser`), `PushToggle` no settings. → precisa config VAPID (abaixo).
- **#3 Scheduler/Gantt** — `job_tasks.start_date` (migration) + `setTaskDates` + `GanttChart` no estimate (timeline, barras por status, marcador hoje, edição de datas inline).
- **#1/#5 fundações** — ver acima (roles estruturados; ditado por voz).

## Pendente user (config, não código)
- **Stripe (#6):** `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` → Vercel; registrar webhook `…/api/stripe/webhook` no Stripe (eventos `checkout.session.completed`, `customer.subscription.deleted`). Opcional `STRIPE_PRICE_ID`.
- **Push (#4):** gerar VAPID (`npx web-push generate-vapid-keys`) → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto:) na Vercel.
- **`SUPABASE_SERVICE_ROLE_KEY`** → Vercel (usado pelo webhook Stripe / notifyUser).
- Leaked-password protection → Supabase Auth (1 toggle)
- **SMTP próprio** (Resend/SendGrid) → Supabase Auth → Emails
- Google consent: App name/logo + URLs privacy/terms no Google Cloud
- `NEXT_PUBLIC_SITE_URL=https://buildestimate-ai.vercel.app` → Vercel (recomendado)
- Custom domain Supabase (add-on pago) pra sumir "supabase.co" na tela do Google

## Notas técnicas / gotchas
- Banco foi **ZERADO** a pedido (só sobrou `default_price_items` seed 106). User cria conta nova pra testar.
- Coluna `clients.type` ficou órfã (Lead/Customer usa o `status` existente) — pode dropar.
- Telas auth-gated não dão pra testar sem login (não uso senha do user) — verifico por tsc+build; user confirma no deploy.
- RPCs de token (proposal + share) aparecem no advisor como públicas = INTENCIONAL (token 16 bytes).
- Migrations aditivas prontas mas UI parcial: `profiles.plan/trial_ends_at` (premium), `price_items.status`.

## Próximo passo sugerido
User escolhe um épico grande. Recomendado por valor: **(A) roles+permissões+dashboards por role** OU **(B) push notifications** OU **(C) advisor por voz**. Cada um = 1 sessão dedicada.

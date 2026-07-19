# ContractorOS AI — Handoff / Estado do Projeto

> Doc de continuidade. Leia isto ao começar sessão nova depois de `/clear`.
> Atualizado: 2026-07-17 (sessão do sidebar).

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
   - ✅ Feito: seletor de role + **dashboard GC** no /demand (`docs/dashboards-por-role-SPEC.md`); **roles estruturados** (`lib/roles.ts`, 11 cargos, datalist); **atribuição N:N** funcionário↔projeto↔supervisor (`project_assignments`, `ProjectTeamCard` no project detail).
   - 🔴 Falta (ALTO RISCO — decisão de produto + mexe em RLS de prod, precisa validar "quem vê o quê" antes): permissão/visibilidade real por role server-enforced; dados dos outros 10 dashboards.
5. **Advisor dinâmico por voz + offline.**
   - ✅ Feito: **ditado por voz** (`VoiceInput`); **advisor IA dinâmico** (`generateScopeQuestions` → perguntas específicas do job, resposta por voz/texto, salva em `advisor_answers`; `AiScopeQuestions` no estimate).
   - 🔴 Falta: captura/uso **offline com sync**.

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

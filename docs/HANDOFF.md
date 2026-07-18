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

## 🔴 PENDENTES — Épicos grandes (precisam sessão dedicada, NÃO improvisar)
1. **Sistema de cargos/permissões** — funcionário↔supervisor↔projeto (N:N), roles: Laborer, Inspector, Estimator, Safety Manager, Scheduler, PM, Construction Manager, Superintendent, Foreman, Civil Engineer, Contractor. Visibilidade por role. **Dashboards por role em /demand** (GC=pipeline+margem+cashflow / Estimator=variância+benchmarks / PM=budget vs actual+cronograma). Ver detalhes ricos de gráficos que o user descreveu no histórico do chat.
2. **Safety Manager smart checklist** — lista de inspeções/validações por trade+trabalho selecionado, flag ao concluir, pede foto.
3. **Scheduler / Gantt** — cronograma de execução.
4. **Push notifications** — VAPID + service worker + `push_subscriptions` + broadcast em settings (1 user / grupo subs / todos do projeto). Hoje só email mailto.
5. **Advisor dinâmico por voz + offline** — cliente fala/escreve/foto → IA analisa → gera perguntas relevantes do escopo → responde por voz(transcrição) ou texto → identifica necessidades ocultas. Perguntas fechadas que expandem. Funciona offline com sync.
6. **Premium gating + coroa** — DB pronta (`profiles.plan`, `trial_ends_at`). Falta Stripe + badge coroa (estilo Canva, tooltip "Premium" no hover) + bloqueio de features. Inventory marcado como "Premium (trial)".
7. **Store→inventory "mais barato por item"** — precisa relação item×loja×preço. Hoje: campo supplier + notes.
8. **Task mapping por serviço no estimate** — lista tarefas mapeadas por trade (lib/standards.ts adjacency); não-mapeado a IA alimenta.
9. **VIP estimate overhaul** + **Market Intelligence com dado real** (hoje ancorado no custo, mas modelo LLM).

## Pendente user (config, não código)
- STRIPE_SECRET_KEY → Vercel (payment links, código pronto)
- Leaked-password protection → Supabase Auth (1 toggle)
- **SMTP próprio** (Resend/SendGrid) → Supabase Auth → Emails — SEM isso reset de senha e emails não chegam pra terceiros
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

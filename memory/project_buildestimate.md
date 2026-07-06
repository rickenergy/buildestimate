# BuildEstimate AI — Contexto do Projeto

## O que é
PWA mobile-first de estimates para pequenos contractors (flooring, painting, drywall, tile, roofing, remodeling, landscaping, cleaning, handyman). Contractor conversa com IA (texto/voz/fotos) → estimate com materiais, labor, margem → proposta com link público e aceite.

## Stack
Next.js 16 App Router · TS · Tailwind v4 · shadcn/ui (preset nova) · Supabase (RLS) · AI SDK v7 via AI Gateway (`anthropic/claude-sonnet-5`)

## Supabase
- Projeto: `buildestimate-ai` (`snvmpzlgngoohqovzeij`), org B Innovation Marketing, us-east-1, free tier
- Tabelas: profiles, clients, estimates, estimate_items, price_items, default_price_items (seed ~60 itens), proposals, estimate_photos — RLS por user_id em tudo
- Proposta pública: RPCs security definer `get_proposal_by_token` / `accept_proposal` (token = capability, anon por design)
- Trigger `handle_new_user` cria profile no signup
- Buckets: photos (privado), logos (público, sem listing)

## Decisões de arquitetura
- IA nunca inventa números: tool `calculate_estimate` chama motor determinístico `lib/takeoff/*` (testes vitest 9/9)
- 2 tools no chat: `lookup_prices` + `calculate_estimate`; fotos vão direto ao modelo (visão)
- Preços: user `price_items` sobrescreve `default_price_items` por (trade, name)
- Overhead → profit → tax build-up; margin score healthy/medium/low vs `min_margin_pct` do perfil
- PDF da proposta = `window.print()` (sem lib)
- i18n: dicionários próprios `lib/i18n/{en,pt,es}.ts`, idioma no profile
- `proxy.ts` (Next 16) com default export — NÃO usar middleware.ts

## Usuários de teste
- teste@buildestimate.app / Teste123456 (dados demo: Maria Silva, estimate LVP 850 sqft aceito)
- binnovationmarketing@gmail.com / Teste123456 (TROCAR SENHA)
- Emails confirmados via SQL (`email_confirmed_at`); signup real exige confirmação por email

## Pendências
1. **AI_GATEWAY_API_KEY não configurada** — chat IA e "Gerar proposta com IA" não testados. Pegar em vercel.com → AI Gateway → API Keys, colar em `.env.local`
2. Deploy Vercel não feito (CLI não instalada; `npm i -g vercel`)
3. Advisor Supabase: habilitar "leaked password protection" no dashboard Auth
4. Fase 2: follow-up SMS/email, pagamento/depósito (Stripe), job costing, upload de foto → storage (hoje foto vai só pro modelo), takeoff de planta PDF

## Verificado (2026-07-06)
Build limpo · testes 9/9 · login/dashboard/estimates/clients/prices/settings 200 · página de estimate renderiza itens+margem · proposta pública renderiza e aceite via RPC move estimate+cliente para approved

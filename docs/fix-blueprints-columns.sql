-- ⚠️ RODAR NO SUPABASE SQL EDITOR:
-- https://supabase.com/dashboard/project/snvmpzlgngoohqovzeij/sql/new
--
-- PORQUÊ: a tabela `blueprints` já existia (Fase 1), então o
-- `create table if not exists` do pending-migrations.sql NÃO adicionou as
-- colunas da Fase 2/3. Resultado: upload de planta quebra ("Could not find the
-- 'page_count' column"). Isto adiciona as colunas que faltam. Idempotente.

alter table public.blueprints add column if not exists page_count int not null default 1;
alter table public.blueprints add column if not exists pages jsonb;
alter table public.blueprints add column if not exists trade_map jsonb;
alter table public.blueprints add column if not exists trade_scopes jsonb;
alter table public.blueprints add column if not exists updated_at timestamptz not null default now();

-- (re)cria o trigger de updated_at só se a função existir — evita erro
do $$
begin
  if exists (
    select 1 from pg_proc
    where proname = 'set_updated_at' and pronamespace = 'public'::regnamespace
  ) then
    drop trigger if exists set_blueprints_updated_at on public.blueprints;
    create trigger set_blueprints_updated_at before update on public.blueprints
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- força o PostgREST a recarregar o schema (senão a API demora a ver as colunas)
notify pgrst, 'reload schema';

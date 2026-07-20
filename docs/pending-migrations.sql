-- ⚠️ RODAR NO SUPABASE SQL EDITOR (o MCP estava fora quando construí):
-- https://supabase.com/dashboard/project/snvmpzlgngoohqovzeij/sql
-- Cola tudo e Run. Sem isso, upload de doc e o menu Plantas dão erro.

-- 1) Upload de PDF/foto nos docs de subcontratado
alter table public.subcontractor_docs add column if not exists file_path text;

-- 2) Blueprints / takeoff assistido
create table if not exists public.blueprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  file_path text not null,
  is_image boolean not null default true,
  status text not null default 'uploaded' check (status in ('uploaded','analyzed','takeoff','done')),
  analysis jsonb,
  answers jsonb,
  chosen_trade text,
  scale_ref jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blueprints_user_idx on public.blueprints (user_id);
create index if not exists blueprints_project_idx on public.blueprints (project_id);
alter table public.blueprints enable row level security;
drop policy if exists "own blueprints" on public.blueprints;
create policy "own blueprints" on public.blueprints
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists set_blueprints_updated_at on public.blueprints;
create trigger set_blueprints_updated_at before update on public.blueprints
  for each row execute function public.set_updated_at();

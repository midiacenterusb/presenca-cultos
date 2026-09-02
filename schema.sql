-- Presença nos Cultos — schema Supabase
-- Rode este script inteiro no SQL Editor do seu projeto Supabase.

create table if not exists membros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists dias_sem_culto (
  id uuid primary key default gen_random_uuid(),
  data date not null unique,
  motivo text
);

create table if not exists presencas (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  membro_id uuid not null references membros(id) on delete cascade,
  presente boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (data, membro_id)
);

create index if not exists idx_presencas_data on presencas(data);
create index if not exists idx_presencas_membro on presencas(membro_id);

-- Segurança: só o usuário autenticado (você) acessa os dados.
alter table membros enable row level security;
alter table dias_sem_culto enable row level security;
alter table presencas enable row level security;

create policy "auth pode tudo em membros" on membros
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "auth pode tudo em dias_sem_culto" on dias_sem_culto
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "auth pode tudo em presencas" on presencas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

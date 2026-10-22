create extension if not exists pgcrypto;

-- =========================
-- updated_at helper
-- =========================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================
-- bank_connections
-- =========================
create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null unique,
  institution_id text,
  institution_name text,
  access_token text not null,
  status text not null default 'active'
    check (status in ('active', 'disconnected', 'error')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bank_connections_user_id
  on public.bank_connections(user_id);

-- =========================
-- bank_accounts
-- keep user_id, but enforce it matches the parent connection
-- =========================
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.bank_connections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_account_id text not null unique,
  name text not null,
  official_name text,
  mask text,
  type text,
  subtype text,
  current_balance numeric(14,2),
  available_balance numeric(14,2),
  limit_balance numeric(14,2),
  iso_currency_code text not null default 'USD',
  unofficial_currency_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bank_accounts_user_id
  on public.bank_accounts(user_id);

create index if not exists idx_bank_accounts_connection_id
  on public.bank_accounts(connection_id);

-- =========================
-- enforce bank_accounts.user_id = parent connection user_id
-- =========================
create or replace function public.sync_bank_account_user_id()
returns trigger
language plpgsql
as $$
declare
  connection_user_id uuid;
begin
  select bc.user_id
    into connection_user_id
  from public.bank_connections bc
  where bc.id = new.connection_id;

  if connection_user_id is null then
    raise exception 'Invalid connection_id: %', new.connection_id;
  end if;

  if new.user_id is distinct from connection_user_id then
    raise exception 'bank_accounts.user_id must match bank_connections.user_id';
  end if;

  return new;
end;
$$;

-- =========================
-- triggers
-- =========================
drop trigger if exists trg_bank_connections_updated_at on public.bank_connections;
create trigger trg_bank_connections_updated_at
before update on public.bank_connections
for each row
execute function public.set_updated_at();

drop trigger if exists trg_bank_accounts_updated_at on public.bank_accounts;
create trigger trg_bank_accounts_updated_at
before update on public.bank_accounts
for each row
execute function public.set_updated_at();

drop trigger if exists trg_bank_accounts_user_id_match on public.bank_accounts;
create trigger trg_bank_accounts_user_id_match
before insert or update on public.bank_accounts
for each row
execute function public.sync_bank_account_user_id();

-- =========================
-- RLS
-- =========================
alter table public.bank_connections enable row level security;
alter table public.bank_accounts enable row level security;

-- =========================
-- bank_connections policies
-- =========================
drop policy if exists "Users can view own connections" on public.bank_connections;
create policy "Users can view own connections"
on public.bank_connections
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own connections" on public.bank_connections;
create policy "Users can insert own connections"
on public.bank_connections
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own connections" on public.bank_connections;
create policy "Users can update own connections"
on public.bank_connections
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own connections" on public.bank_connections;
create policy "Users can delete own connections"
on public.bank_connections
for delete
using (auth.uid() = user_id);

-- =========================
-- bank_accounts policies
-- =========================
drop policy if exists "Users can view own bank accounts" on public.bank_accounts;
create policy "Users can view own bank accounts"
on public.bank_accounts
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own bank accounts" on public.bank_accounts;
create policy "Users can insert own bank_accounts"
on public.bank_accounts
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own bank accounts" on public.bank_accounts;
create policy "Users can update own bank accounts"
on public.bank_accounts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own bank accounts" on public.bank_accounts;
create policy "Users can delete own bank accounts"
on public.bank_accounts
for delete
using (auth.uid() = user_id);

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'Freelancer',
  home_state text not null default 'California',
  income_style text not null default 'Mixed payouts',
  primary_focus text not null default 'Everything in one place',
  mileage_mode text not null default 'Sometimes',
  reserve_percent integer not null default 28 check (reserve_percent between 10 and 45),
  active_plan text not null default 'Pro' check (active_plan in ('Lite', 'Pro', 'Tax+')),
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null,
  institution_name text not null,
  external_account_id text not null,
  status text not null default 'active' check (status in ('active', 'disconnected', 'error')),
  read_only boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (provider, external_account_id)
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  vendor text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency_code text not null default 'USD',
  category text not null,
  ocr_confidence numeric(5, 2),
  status text not null default 'Needs review' check (status in ('Verified', 'Needs review')),
  storage_path text,
  note text not null default '',
  captured_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  connected_account_id uuid references public.connected_accounts (id) on delete set null,
  receipt_id uuid references public.receipts (id) on delete set null,
  external_id text,
  merchant text not null,
  amount numeric(12, 2) not null,
  currency_code text not null default 'USD',
  kind text not null check (kind in ('income', 'expense')),
  category text not null,
  deductible boolean not null default false,
  source text not null,
  sync_status text not null default 'manual' check (sync_status in ('manual', 'bank_sync', 'receipt_scan')),
  note text not null default '',
  occurred_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, external_id)
);

create table if not exists public.mileage_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  start_label text not null,
  end_label text not null,
  miles numeric(10, 2) not null check (miles >= 0),
  purpose text not null default '',
  classification text not null default 'Business' check (classification in ('Business', 'Mixed', 'Personal')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quarter_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tax_year integer not null,
  label text not null,
  due_date date not null,
  amount_due numeric(12, 2) not null default 0,
  reserve_target numeric(12, 2) not null default 0,
  status text not null default 'Upcoming' check (status in ('Complete', 'Next up', 'Upcoming')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, tax_year, label)
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  actor text not null default 'user',
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_transactions_user_date on public.transactions (user_id, occurred_at desc);
create index if not exists idx_transactions_user_kind on public.transactions (user_id, kind);
create index if not exists idx_receipts_user_date on public.receipts (user_id, captured_at desc);
create index if not exists idx_trips_user_date on public.mileage_trips (user_id, occurred_at desc);
create index if not exists idx_audit_events_user_date on public.audit_events (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_connected_accounts_updated_at on public.connected_accounts;
create trigger set_connected_accounts_updated_at
before update on public.connected_accounts
for each row execute procedure public.set_updated_at();

drop trigger if exists set_receipts_updated_at on public.receipts;
create trigger set_receipts_updated_at
before update on public.receipts
for each row execute procedure public.set_updated_at();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
before update on public.transactions
for each row execute procedure public.set_updated_at();

drop trigger if exists set_mileage_trips_updated_at on public.mileage_trips;
create trigger set_mileage_trips_updated_at
before update on public.mileage_trips
for each row execute procedure public.set_updated_at();

drop trigger if exists set_quarter_snapshots_updated_at on public.quarter_snapshots;
create trigger set_quarter_snapshots_updated_at
before update on public.quarter_snapshots
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'LedgerPilot User')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.receipts enable row level security;
alter table public.transactions enable row level security;
alter table public.mileage_trips enable row level security;
alter table public.quarter_snapshots enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "connected_accounts_manage_own" on public.connected_accounts;
create policy "connected_accounts_manage_own"
on public.connected_accounts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "receipts_manage_own" on public.receipts;
create policy "receipts_manage_own"
on public.receipts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "transactions_manage_own" on public.transactions;
create policy "transactions_manage_own"
on public.transactions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "mileage_trips_manage_own" on public.mileage_trips;
create policy "mileage_trips_manage_own"
on public.mileage_trips for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "quarter_snapshots_manage_own" on public.quarter_snapshots;
create policy "quarter_snapshots_manage_own"
on public.quarter_snapshots for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "audit_events_select_own" on public.audit_events;
create policy "audit_events_select_own"
on public.audit_events for select
using (auth.uid() = user_id);

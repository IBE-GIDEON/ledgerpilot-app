-- Finish Lancer database setup on a restored project.
-- Combines migrations 0004-0007. Every statement is safe to run more than once.
-- Paste into Supabase Dashboard > SQL Editor > Run.

-- ===== 20260422_0004_launch_access =====
alter table public.profiles
  add column if not exists billing_setup_complete boolean not null default false,
  add column if not exists payment_method_status text not null default 'missing'
    check (payment_method_status in ('missing', 'pending', 'ready')),
  add column if not exists subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'expired')),
  add column if not exists trial_started_at timestamptz not null default timezone('utc', now()),
  add column if not exists trial_ends_at timestamptz not null default timezone('utc', now() + interval '7 days');

update public.profiles
set
  billing_setup_complete = coalesce(billing_setup_complete, false),
  payment_method_status = coalesce(nullif(payment_method_status, ''), 'missing'),
  subscription_status = coalesce(nullif(subscription_status, ''), 'trialing'),
  trial_started_at = coalesce(trial_started_at, created_at, timezone('utc', now())),
  trial_ends_at = coalesce(
    trial_ends_at,
    coalesce(created_at, timezone('utc', now())) + interval '7 days'
  );

create index if not exists idx_profiles_trial_ends_at on public.profiles (trial_ends_at);


-- ===== 20260423_0005_bank_connection_security =====
alter table public.bank_connections
add column if not exists transactions_cursor text;

drop policy if exists "Users can view own connections" on public.bank_connections;
drop policy if exists "Users can insert own connections" on public.bank_connections;
drop policy if exists "Users can update own connections" on public.bank_connections;
drop policy if exists "Users can delete own connections" on public.bank_connections;


-- ===== 20260423_0006_receipt_storage =====
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "Users can view own receipt files" on storage.objects;
create policy "Users can view own receipt files"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can upload own receipt files" on storage.objects;
create policy "Users can upload own receipt files"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update own receipt files" on storage.objects;
create policy "Users can update own receipt files"
  on storage.objects for update
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete own receipt files" on storage.objects;
create policy "Users can delete own receipt files"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ===== 20260424_0007_billing_runtime =====
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_default_payment_method_id text,
  add column if not exists subscription_product_id text,
  add column if not exists subscription_store text;

create index if not exists idx_profiles_stripe_customer_id
  on public.profiles (stripe_customer_id);


-- Make the API see the new columns immediately.
notify pgrst, 'reload schema';

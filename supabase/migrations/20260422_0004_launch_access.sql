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

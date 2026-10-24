-- The currency each person tracks money in, chosen during onboarding (ISO 4217 code).
alter table public.profiles
  add column if not exists currency text not null default 'USD'
  check (currency ~ '^[A-Z]{3}$');

notify pgrst, 'reload schema';

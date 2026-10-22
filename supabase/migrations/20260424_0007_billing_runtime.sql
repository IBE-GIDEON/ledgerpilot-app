alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_default_payment_method_id text,
  add column if not exists subscription_product_id text,
  add column if not exists subscription_store text;

create index if not exists idx_profiles_stripe_customer_id
  on public.profiles (stripe_customer_id);

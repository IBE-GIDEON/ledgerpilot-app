alter table public.bank_connections
add column if not exists transactions_cursor text;

drop policy if exists "Users can view own connections" on public.bank_connections;
drop policy if exists "Users can insert own connections" on public.bank_connections;
drop policy if exists "Users can update own connections" on public.bank_connections;
drop policy if exists "Users can delete own connections" on public.bank_connections;

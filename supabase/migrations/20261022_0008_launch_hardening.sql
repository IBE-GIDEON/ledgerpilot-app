-- Launch hardening for Lancer (applied to the live project on 2026-10-22).

-- Trigger helpers: pin search_path so a caller can't redirect unqualified names.
alter function public.set_updated_at() set search_path = '';
alter function public.sync_bank_account_user_id() set search_path = '';

-- New-user trigger: rename the fallback display name and stop it being callable over the API.
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
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'Lancer User')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Triggers still fire; only direct calls via /rest/v1/rpc/handle_new_user are blocked.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

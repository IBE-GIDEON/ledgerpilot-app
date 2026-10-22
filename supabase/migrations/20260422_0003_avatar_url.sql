-- Add avatar_url to profiles table
alter table public.profiles 
add column if not exists avatar_url text;

-- Create a storage bucket for avatars if it doesn't exist
-- Note: This requires superuser or specific permissions, 
-- but we define it here for completeness. 
-- In a real Supabase environment, you might do this via the Dashboard.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Add RLS for storage (allow users to update their own avatar)
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Users can upload their own avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

create policy "Users can update their own avatar."
  on storage.objects for update
  using ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

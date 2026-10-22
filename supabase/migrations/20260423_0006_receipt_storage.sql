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

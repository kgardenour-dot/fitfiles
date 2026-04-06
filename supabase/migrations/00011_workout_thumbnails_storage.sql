-- Persistent workout thumbnails: public bucket + per-user folder RLS.

insert into storage.buckets (id, name, public, file_size_limit)
values ('workout-thumbnails', 'workout-thumbnails', true, 5242880)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- Read: thumbnails are referenced by stable public URLs in workout_links (RLS on rows).
drop policy if exists "workout_thumbnails_select_public" on storage.objects;
create policy "workout_thumbnails_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'workout-thumbnails');

-- Write: only inside {auth.uid()}/...
drop policy if exists "workout_thumbnails_insert_own" on storage.objects;
create policy "workout_thumbnails_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'workout-thumbnails'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "workout_thumbnails_update_own" on storage.objects;
create policy "workout_thumbnails_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'workout-thumbnails'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'workout-thumbnails'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "workout_thumbnails_delete_own" on storage.objects;
create policy "workout_thumbnails_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'workout-thumbnails'
    and split_part(name, '/', 1) = auth.uid()::text
  );

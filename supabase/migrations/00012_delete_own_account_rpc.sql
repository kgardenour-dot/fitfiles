-- Self-service account deletion: authenticated users only.
-- Removes workout-thumbnails storage objects, then deletes auth user (cascades public data).

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from storage.objects
  where bucket_id = 'workout-thumbnails'
    and split_part(name, '/', 1) = uid::text;

  delete from auth.users
  where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is
  'Permanently deletes the current user, storage files, and all cascaded app data.';

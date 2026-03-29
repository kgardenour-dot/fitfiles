-- Prevent transient local file URIs from being persisted as thumbnail URLs.
-- 1) Backfill/cleanup historical bad values.
-- 2) Add a DB-level CHECK constraint so direct writes cannot reintroduce them.

update public.workout_links
set thumbnail_url = null
where thumbnail_url ilike 'file://%';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_links_thumbnail_url_not_local_file'
      and conrelid = 'public.workout_links'::regclass
  ) then
    alter table public.workout_links
      add constraint workout_links_thumbnail_url_not_local_file
      check (
        thumbnail_url is null
        or thumbnail_url !~* '^file://'
      );
  end if;
end $$;

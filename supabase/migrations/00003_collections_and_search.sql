-- 1. Allow collections insert with just { name } — default user_id to current user
alter table public.collections alter column user_id set default auth.uid();

-- 2. Full-text search: add tsvector column for Supabase .textSearch()
alter table public.workout_links add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(notes, ''))
  ) stored;

create index if not exists idx_workout_links_search_vector
  on public.workout_links using gin(search_vector);

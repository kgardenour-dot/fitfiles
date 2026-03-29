-- Allow workout_links insert without explicit user_id (default to current user)
alter table public.workout_links alter column user_id set default auth.uid();

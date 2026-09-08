-- Allow workout_events inserts without an explicit user_id (default to current user).
alter table public.workout_events alter column user_id set default auth.uid();

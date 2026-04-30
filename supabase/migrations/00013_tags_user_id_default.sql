-- Allow tags insert to default user_id to the current user (RLS requires auth.uid() = user_id)
alter table public.tags alter column user_id set default auth.uid();

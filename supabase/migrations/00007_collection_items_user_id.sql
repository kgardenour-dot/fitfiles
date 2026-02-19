-- Add user_id to collection_items for explicit ownership and insert clarity
alter table public.collection_items
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Backfill existing rows: set user_id from the owning collection
update public.collection_items ci
set user_id = c.user_id
from public.collections c
where c.id = ci.collection_id
  and ci.user_id is null;

-- Make not null after backfill
alter table public.collection_items
  alter column user_id set not null;

-- Default for future inserts
alter table public.collection_items
  alter column user_id set default auth.uid();

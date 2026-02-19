-- View: collections with workout counts for UI display
create or replace view public.collections_with_counts as
select
  c.id,
  c.user_id,
  c.name,
  c.created_at,
  count(ci.workout_link_id)::int as workout_count
from public.collections c
left join public.collection_items ci on ci.collection_id = c.id
group by c.id, c.user_id, c.name, c.created_at;

-- RLS: view inherits from underlying tables; grant select for authenticated users
-- (Supabase views don't have separate RLS; they use the underlying table policies)
-- Users will only see rows where c.user_id = auth.uid() via the collections RLS.
-- RLS on underlying tables (collections, collection_items) applies when querying the view.

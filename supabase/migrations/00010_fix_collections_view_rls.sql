-- Ensure collections_with_counts respects caller RLS (per-user isolation)
create or replace view public.collections_with_counts
with (security_invoker = true) as
select
  c.id,
  c.user_id,
  c.name,
  c.created_at,
  count(ci.workout_link_id)::int as workout_count
from public.collections c
left join public.collection_items ci on ci.collection_id = c.id
group by c.id, c.user_id, c.name, c.created_at;

grant select on public.collections_with_counts to authenticated;

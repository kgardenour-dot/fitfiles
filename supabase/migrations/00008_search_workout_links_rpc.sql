-- RPC for server-side search of workout_links (full-text search, user-scoped)
create or replace function public.search_workout_links(
  p_query text,
  p_sort text default 'recent',
  p_limit int default 50,
  p_offset int default 0
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select json_agg(row_to_json(t))
  into result
  from (
    with filtered as (
      select wl.*
      from workout_links wl
      where wl.user_id = auth.uid()
        and (p_query is null or trim(p_query) = '' or wl.search_vector @@ websearch_to_tsquery('english', p_query))
        and (p_sort != 'favorites' or wl.is_favorite = true)
    )
    select
      wl.id, wl.user_id, wl.url, wl.title, wl.source_domain, wl.thumbnail_url, wl.notes,
      wl.duration_minutes, wl.is_favorite, wl.created_at, wl.updated_at, wl.last_opened_at,
      (
        select coalesce(
          json_agg(json_build_object('id', t.id, 'user_id', t.user_id, 'name', t.name, 'tag_type', t.tag_type, 'created_at', t.created_at)),
          '[]'::json
        )
        from workout_link_tags wlt
        join tags t on t.id = wlt.tag_id
        where wlt.workout_link_id = wl.id
      ) as tags
    from filtered wl
    order by
      case when p_sort = 'opened' then wl.last_opened_at else wl.created_at end desc nulls last
    limit p_limit
    offset p_offset
  ) t;
  return coalesce(result, '[]'::json);
end;
$$;

grant execute on function public.search_workout_links(text, text, int, int) to authenticated;
grant execute on function public.search_workout_links(text, text, int, int) to anon;

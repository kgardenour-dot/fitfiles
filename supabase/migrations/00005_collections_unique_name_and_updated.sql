-- 1. Add updated_at to collections for ordering
alter table public.collections add column if not exists updated_at timestamptz not null default now();

create trigger trg_collections_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

-- 2. Unique constraint: one collection name per user (enables friendly "That collection already exists" error)
create unique index if not exists idx_collections_user_name on public.collections(user_id, lower(trim(name)));

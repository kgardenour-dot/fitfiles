-- FitLinks: Initial Schema Migration
-- Personal workout-link library with tags, collections, and entitlements.

-- ============================================================
-- 0. Extensions
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. User Profiles (subscription readiness)
-- ============================================================
create table public.user_profiles (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  display_name text,
  plan_tier   text not null default 'free' check (plan_tier in ('free', 'pro')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

-- ============================================================
-- 2. Workout Links
-- ============================================================
create table public.workout_links (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  url              text not null,
  title            text not null default '',
  source_domain    text not null default '',
  thumbnail_url    text,
  notes            text,
  duration_minutes integer,
  is_favorite      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_opened_at   timestamptz,
  unique (user_id, url)
);

-- ============================================================
-- 3. Tags
-- ============================================================
create table public.tags (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  name      text not null,
  tag_type  text not null default 'custom'
            check (tag_type in ('duration','equipment','body_focus','difficulty','format','custom')),
  created_at timestamptz not null default now(),
  unique (user_id, name, tag_type)
);

-- ============================================================
-- 4. Workout-Link <-> Tags (join)
-- ============================================================
create table public.workout_link_tags (
  workout_link_id uuid not null references public.workout_links(id) on delete cascade,
  tag_id          uuid not null references public.tags(id) on delete cascade,
  primary key (workout_link_id, tag_id)
);

-- ============================================================
-- 5. Collections
-- ============================================================
create table public.collections (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  name      text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. Collection Items (join)
-- ============================================================
create table public.collection_items (
  collection_id   uuid not null references public.collections(id) on delete cascade,
  workout_link_id uuid not null references public.workout_links(id) on delete cascade,
  primary key (collection_id, workout_link_id)
);

-- ============================================================
-- 7. Workout Events (optional v1 — "mark as done" / "opened")
-- ============================================================
create table public.workout_events (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  workout_link_id uuid not null references public.workout_links(id) on delete cascade,
  event_type      text not null check (event_type in ('opened', 'done')),
  occurred_at     timestamptz not null default now()
);

-- ============================================================
-- 8. Indexes
-- ============================================================
-- Fast lookups by owner
create index idx_workout_links_user   on public.workout_links(user_id);
create index idx_tags_user            on public.tags(user_id);
create index idx_collections_user     on public.collections(user_id);
create index idx_workout_events_user  on public.workout_events(user_id);

-- Search support (trigram would be ideal; GIN on tsvector as baseline)
create index idx_workout_links_title_search
  on public.workout_links using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(notes,'')));

-- Join table lookups
create index idx_wlt_tag   on public.workout_link_tags(tag_id);
create index idx_ci_workout on public.collection_items(workout_link_id);

-- Sorting helpers
create index idx_workout_links_created  on public.workout_links(user_id, created_at desc);
create index idx_workout_links_opened   on public.workout_links(user_id, last_opened_at desc nulls last);
create index idx_workout_links_favorite on public.workout_links(user_id, is_favorite desc, created_at desc);

-- ============================================================
-- 9. updated_at trigger function
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_workout_links_updated_at
  before update on public.workout_links
  for each row execute function public.set_updated_at();

create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- 10. Row-Level Security
-- ============================================================

-- user_profiles
alter table public.user_profiles enable row level security;

create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = user_id);

-- workout_links
alter table public.workout_links enable row level security;

create policy "Users can view own workouts"
  on public.workout_links for select
  using (auth.uid() = user_id);

create policy "Users can insert own workouts"
  on public.workout_links for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workouts"
  on public.workout_links for update
  using (auth.uid() = user_id);

create policy "Users can delete own workouts"
  on public.workout_links for delete
  using (auth.uid() = user_id);

-- tags
alter table public.tags enable row level security;

create policy "Users can view own tags"
  on public.tags for select
  using (auth.uid() = user_id);

create policy "Users can insert own tags"
  on public.tags for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tags"
  on public.tags for update
  using (auth.uid() = user_id);

create policy "Users can delete own tags"
  on public.tags for delete
  using (auth.uid() = user_id);

-- workout_link_tags (ownership via referenced workout_link)
alter table public.workout_link_tags enable row level security;

create policy "Users can view own workout-tag links"
  on public.workout_link_tags for select
  using (
    exists (
      select 1 from public.workout_links wl
      where wl.id = workout_link_id and wl.user_id = auth.uid()
    )
  );

create policy "Users can insert own workout-tag links"
  on public.workout_link_tags for insert
  with check (
    exists (
      select 1 from public.workout_links wl
      where wl.id = workout_link_id and wl.user_id = auth.uid()
    )
  );

create policy "Users can delete own workout-tag links"
  on public.workout_link_tags for delete
  using (
    exists (
      select 1 from public.workout_links wl
      where wl.id = workout_link_id and wl.user_id = auth.uid()
    )
  );

-- collections
alter table public.collections enable row level security;

create policy "Users can view own collections"
  on public.collections for select
  using (auth.uid() = user_id);

create policy "Users can insert own collections"
  on public.collections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own collections"
  on public.collections for update
  using (auth.uid() = user_id);

create policy "Users can delete own collections"
  on public.collections for delete
  using (auth.uid() = user_id);

-- collection_items (ownership via referenced collection)
alter table public.collection_items enable row level security;

create policy "Users can view own collection items"
  on public.collection_items for select
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

create policy "Users can insert own collection items"
  on public.collection_items for insert
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

create policy "Users can delete own collection items"
  on public.collection_items for delete
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

-- workout_events
alter table public.workout_events enable row level security;

create policy "Users can view own events"
  on public.workout_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own events"
  on public.workout_events for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- 11. Auto-create user profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lock down plan_tier mutations to trusted billing sync only.
-- Includes:
-- 1) Service-role-only RPC for applying subscription tier updates
-- 2) Optional webhook event log for idempotency/traceability
-- 3) Trigger guard that blocks client-authenticated plan_tier changes

create table if not exists public.billing_webhook_events (
  event_id text primary key,
  provider text not null default 'revenuecat',
  event_type text,
  payload jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

revoke all on table public.billing_webhook_events from anon, authenticated;
grant all on table public.billing_webhook_events to service_role;

create or replace function public.apply_billing_plan_tier(
  p_user_id uuid,
  p_plan_tier text,
  p_event_id text default null,
  p_provider text default 'revenuecat',
  p_event_type text default null,
  p_payload jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and current_user <> 'postgres' then
    raise exception 'forbidden: service role required';
  end if;

  if p_plan_tier not in ('free', 'plus', 'pro') then
    raise exception 'invalid plan tier: %', p_plan_tier;
  end if;

  if p_event_id is not null then
    insert into public.billing_webhook_events (event_id, provider, event_type, payload, processed_at)
    values (p_event_id, p_provider, p_event_type, p_payload, now())
    on conflict (event_id) do nothing;

    -- Idempotent replay: event already processed.
    if not found then
      return;
    end if;
  end if;

  insert into public.user_profiles (user_id, plan_tier)
  values (p_user_id, p_plan_tier)
  on conflict (user_id) do update
    set plan_tier = excluded.plan_tier,
        updated_at = now();
end;
$$;

revoke all on function public.apply_billing_plan_tier(uuid, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_billing_plan_tier(uuid, text, text, text, text, jsonb) to service_role;

create or replace function public.guard_user_profiles_plan_tier()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(auth.role(), '') <> 'service_role'
       and current_user <> 'postgres'
       and new.plan_tier <> 'free' then
      raise exception 'plan_tier can only be set by billing sync';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.plan_tier is distinct from old.plan_tier
       and coalesce(auth.role(), '') <> 'service_role'
       and current_user <> 'postgres' then
      raise exception 'plan_tier can only be changed by billing sync';
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_profiles_plan_tier_guard on public.user_profiles;
create trigger trg_user_profiles_plan_tier_guard
  before insert or update on public.user_profiles
  for each row execute function public.guard_user_profiles_plan_tier();

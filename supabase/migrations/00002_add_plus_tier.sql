-- Add 'plus' tier to plan_tier check constraint
alter table public.user_profiles drop constraint if exists user_profiles_plan_tier_check;
alter table public.user_profiles add constraint user_profiles_plan_tier_check
  check (plan_tier in ('free', 'plus', 'pro'));

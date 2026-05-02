-- 003_subscription.sql
-- Profiles table for subscription management
-- Safe to re-run: all statements are idempotent

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'pro', 'founding')),
  stripe_customer_id text unique,
  subscription_end_date timestamptz,
  trial_end_date timestamptz,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create profile with 7-day trial on every new signup
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, trial_end_date)
  values (new.id, now() + interval '7 days')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Public RPC: founding member count (no auth required, count is public)
create or replace function get_founding_member_count()
returns integer
language sql
security definer
as $$
  select count(*)::integer from profiles where subscription_tier = 'founding';
$$;

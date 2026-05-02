-- 005_admin.sql
-- Add is_admin role to profiles table
-- Safe to re-run: all statements are idempotent

alter table profiles
  add column if not exists is_admin boolean not null default false;

-- Grant admin to the founding user (mkkakay@gmail.com)
-- Runs at migration time when the row may or may not exist yet;
-- the ON CONFLICT keeps it idempotent.
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = 'mkkakay@gmail.com'
  limit 1;

  if v_user_id is not null then
    insert into profiles (id, is_admin)
    values (v_user_id, true)
    on conflict (id) do update set is_admin = true;
  end if;
end;
$$;

-- RLS: admins can read all profiles (needed for admin dashboard)
drop policy if exists "Admins can read all profiles" on profiles;
create policy "Admins can read all profiles"
  on profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Migration 002: Saved Events Features
-- Adds status/notes/reminder to saved_events, registration_deadline to events,
-- and creates user_collections + collection_events tables

-- Add new columns to saved_events
alter table public.saved_events
  add column if not exists status text check (status in ('interested', 'registered', 'attended')),
  add column if not exists notes text,
  add column if not exists reminder_date timestamptz;

-- Add registration_deadline to events
alter table public.events
  add column if not exists registration_deadline timestamptz;

-- User collections table
create table if not exists public.user_collections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Collection events (many-to-many between collections and events)
create table if not exists public.collection_events (
  id uuid primary key default uuid_generate_v4(),
  collection_id uuid not null references public.user_collections(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (collection_id, event_id)
);

-- Enable RLS on new tables
alter table public.user_collections enable row level security;
alter table public.collection_events enable row level security;

-- RLS: users manage only their own collections
create policy "Users manage their own collections" on public.user_collections
  for all using (auth.uid() = user_id);

-- RLS: users manage collection_events for their own collections
create policy "Users manage their own collection events" on public.collection_events
  for all using (
    collection_id in (
      select id from public.user_collections where user_id = auth.uid()
    )
  );

-- Indexes
create index if not exists user_collections_user_id_idx on public.user_collections (user_id);
create index if not exists collection_events_collection_id_idx on public.collection_events (collection_id);

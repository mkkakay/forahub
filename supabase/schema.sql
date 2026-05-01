-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Events table
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  start_date timestamptz not null,
  end_date timestamptz,
  location text,
  organization text,
  sdg_goals integer[] not null default '{}',
  event_type text not null check (event_type in ('conference', 'side_event', 'webinar', 'training')),
  format text not null check (format in ('in_person', 'virtual', 'hybrid')),
  registration_url text,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

-- Saved events (user bookmarks)
create table public.saved_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

-- User alert preferences
create table public.user_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  sdg_goals integer[] not null default '{}',
  event_types text[] not null default '{}',
  regions text[] not null default '{}',
  email_alerts boolean not null default false,
  created_at timestamptz not null default now()
);

-- Row-level security
alter table public.events enable row level security;
alter table public.saved_events enable row level security;
alter table public.user_preferences enable row level security;

-- Events: public read, authenticated insert/update/delete
create policy "Events are publicly readable" on public.events
  for select using (true);

create policy "Authenticated users can manage events" on public.events
  for all using (auth.role() = 'authenticated');

-- Saved events: users manage their own
create policy "Users manage their own saved events" on public.saved_events
  for all using (auth.uid() = user_id);

-- User preferences: users manage their own
create policy "Users manage their own preferences" on public.user_preferences
  for all using (auth.uid() = user_id);

-- Indexes for common query patterns
create index events_start_date_idx on public.events (start_date);
create index events_event_type_idx on public.events (event_type);
create index events_format_idx on public.events (format);
create index events_is_featured_idx on public.events (is_featured);
create index saved_events_user_id_idx on public.saved_events (user_id);
create index user_preferences_user_id_idx on public.user_preferences (user_id);

-- Migration 002: Saved Events Features

-- Add new columns to saved_events
alter table public.saved_events
  add column if not exists status text check (status in ('interested', 'registered', 'attended')),
  add column if not exists notes text,
  add column if not exists reminder_date timestamptz;

-- Add registration_deadline to events
alter table public.events
  add column if not exists registration_deadline timestamptz;

-- User collections
create table if not exists public.user_collections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Collection events (many-to-many)
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

-- RLS policies
create policy "Users manage their own collections" on public.user_collections
  for all using (auth.uid() = user_id);

create policy "Users manage their own collection events" on public.collection_events
  for all using (
    collection_id in (
      select id from public.user_collections where user_id = auth.uid()
    )
  );

-- Indexes
create index if not exists user_collections_user_id_idx on public.user_collections (user_id);
create index if not exists collection_events_collection_id_idx on public.collection_events (collection_id);

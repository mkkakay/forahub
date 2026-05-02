-- 004_scraping.sql
-- Scraping infrastructure: sources, event metadata, deadlines, run logs
-- Safe to re-run: all statements are idempotent

-- ─── EXTEND EVENTS TABLE ────────────────────────────────────────────────────

-- Widen the event_type check to include consultation and summit
alter table events drop constraint if exists events_event_type_check;
alter table events add constraint events_event_type_check
  check (event_type in ('conference', 'side_event', 'webinar', 'training', 'consultation', 'summit'));

alter table events
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected')),
  add column if not exists source_url text,
  add column if not exists source_id text,
  add column if not exists confidence_score integer
    check (confidence_score between 1 and 5),
  add column if not exists quality_score integer
    check (quality_score between 0 and 5),
  add column if not exists event_brief text,
  add column if not exists parent_event_id uuid references events(id),
  add column if not exists parent_conference_name text,
  add column if not exists is_side_event boolean not null default false,
  add column if not exists is_recurring boolean not null default false,
  add column if not exists series_name text,
  add column if not exists sdg_inferred boolean not null default false,
  add column if not exists region text,
  add column if not exists cost_type text check (cost_type in ('free', 'paid')),
  add column if not exists cost_amount text,
  add column if not exists audience_level text
    check (audience_level in ('researchers', 'practitioners', 'policymakers', 'donors', 'all')),
  add column if not exists is_public boolean not null default true,
  add column if not exists expected_attendance text,
  add column if not exists speakers text[],
  add column if not exists language text not null default 'en',
  add column if not exists title_original text,
  add column if not exists description_original text;

-- Pre-existing manually curated events are considered published
update events set status = 'published'
where source_id is null and status = 'pending';

create index if not exists events_status_idx on events(status);
create index if not exists events_source_id_idx on events(source_id);
create index if not exists events_parent_event_id_idx on events(parent_event_id);
create index if not exists events_is_side_event_idx on events(is_side_event);
create index if not exists events_series_name_idx on events(series_name) where series_name is not null;

-- ─── SOURCES TABLE ──────────────────────────────────────────────────────────

create table if not exists sources (
  id text primary key,
  organization text not null,
  url text not null,
  source_type text not null
    check (source_type in ('website', 'rss', 'ical', 'pdf', 'twitter', 'linkedin', 'newsletter', 'youtube')),
  scrape_method text not null
    check (scrape_method in ('html', 'rss', 'ical', 'pdf', 'twitter', 'linkedin', 'newsletter', 'youtube')),
  scrape_frequency text not null
    check (scrape_frequency in ('hourly', 'daily', 'weekly')),
  primary_sdg_goals integer[] not null default '{}',
  region text,
  language text not null default 'en',
  requires_auth boolean not null default false,
  last_scraped_at timestamptz,
  consecutive_failures integer not null default 0,
  needs_attention boolean not null default false,
  total_events_found integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table sources enable row level security;

-- Service role can do everything; authenticated users can read
drop policy if exists "Service role full access on sources" on sources;
create policy "Service role full access on sources"
  on sources
  using (auth.role() = 'service_role');

drop policy if exists "Authenticated users can read sources" on sources;
create policy "Authenticated users can read sources"
  on sources for select
  using (auth.role() = 'authenticated');

-- ─── EVENT DEADLINES TABLE ──────────────────────────────────────────────────

create table if not exists event_deadlines (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  deadline_type text not null
    check (deadline_type in ('abstract', 'early_bird', 'travel_grant', 'side_event_proposal', 'registration')),
  deadline_date timestamptz not null,
  description text,
  created_at timestamptz not null default now()
);

alter table event_deadlines enable row level security;

drop policy if exists "Public can view event deadlines" on event_deadlines;
create policy "Public can view event deadlines"
  on event_deadlines for select
  using (true);

drop policy if exists "Service role full access on event_deadlines" on event_deadlines;
create policy "Service role full access on event_deadlines"
  on event_deadlines
  using (auth.role() = 'service_role');

create index if not exists event_deadlines_event_id_idx on event_deadlines(event_id);
create index if not exists event_deadlines_deadline_date_idx on event_deadlines(deadline_date);

-- ─── SCRAPING RUNS TABLE ────────────────────────────────────────────────────

create table if not exists scraping_runs (
  id uuid primary key default gen_random_uuid(),
  source_id text references sources(id),
  source_url text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  events_found integer not null default 0,
  events_inserted integer not null default 0,
  events_updated integer not null default 0,
  events_rejected integer not null default 0,
  events_pending_review integer not null default 0,
  error_message text,
  estimated_api_cost decimal(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

alter table scraping_runs enable row level security;

drop policy if exists "Service role full access on scraping_runs" on scraping_runs;
create policy "Service role full access on scraping_runs"
  on scraping_runs
  using (auth.role() = 'service_role');

create index if not exists scraping_runs_source_id_idx on scraping_runs(source_id);
create index if not exists scraping_runs_started_at_idx on scraping_runs(started_at);

-- ─── RPC: MONTHLY API COST ESTIMATE ─────────────────────────────────────────

create or replace function get_monthly_api_cost_estimate()
returns decimal
language sql
security definer
as $$
  select coalesce(sum(estimated_api_cost), 0)
  from scraping_runs
  where started_at >= date_trunc('month', now());
$$;

-- ─── RPC: SOURCES NEEDING ATTENTION ─────────────────────────────────────────

create or replace function get_sources_needing_attention()
returns table(id text, organization text, url text, consecutive_failures integer, last_scraped_at timestamptz)
language sql
security definer
as $$
  select id, organization, url, consecutive_failures, last_scraped_at
  from sources
  where needs_attention = true and is_active = true
  order by consecutive_failures desc;
$$;

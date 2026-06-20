-- Recurring-event engine (additive). A series row holds a parent rule (RFC
-- 5545 RRule) + the fields shared across occurrences. Each occurrence is a
-- REAL events row with new nullable columns, so every existing map / list /
-- detail / scraper-dedup read path keeps working unchanged.

CREATE TABLE IF NOT EXISTS event_series (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_slug                 text        NOT NULL REFERENCES organizations_directory(slug) ON DELETE CASCADE,
  created_by_user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- RRule (RFC 5545). Stored exactly as the rrule library serializes it.
  rrule                    text        NOT NULL,
  timezone                 text        NOT NULL DEFAULT 'UTC',
  -- Local time-of-day for each occurrence (HH:MM:SS, 24h). DTSTART in the
  -- rrule is set from (first-occurrence date) + start_time_local in the
  -- series timezone, then materialized in UTC.
  start_time_local         time        NOT NULL DEFAULT '09:00:00',
  duration_minutes         integer     NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  -- Series-level metadata.
  series_title             text        NOT NULL,
  series_description       text,
  -- Shared event-template fields. These are the values that get copied onto
  -- each materialized occurrence's row in `events`. Per-occurrence overrides
  -- live on the events row itself (and flip is_exception=true).
  organization             text        NOT NULL,
  registration_url         text,
  format                   text        NOT NULL DEFAULT 'in_person',
  location                 text,
  online_url               text,
  sdg_goals                integer[]   NOT NULL DEFAULT '{}',
  category                 text,
  event_type               text        NOT NULL DEFAULT 'webinar',
  -- Termination signals (encoded redundantly to the rrule so a UI can read
  -- them without parsing).
  until_date               timestamptz,
  occurrence_count         integer,
  -- Lifecycle.
  status                   text        NOT NULL DEFAULT 'active',  -- 'active' | 'cancelled'
  last_horizon_at          timestamptz,
  -- 24h cap audit. Same semantics as events.auto_published_at: this is the
  -- timestamp at which the series creation passed the trust check. The cap
  -- evaluator counts series rows + individual events rows.
  auto_published_at        timestamptz,
  auto_published_by_user_id uuid REFERENCES auth.users(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_series_org_slug_idx
  ON event_series(org_slug);
CREATE INDEX IF NOT EXISTS event_series_status_idx
  ON event_series(status)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS event_series_auto_published_at_idx
  ON event_series(auto_published_at DESC)
  WHERE auto_published_at IS NOT NULL;

-- Per-occurrence columns on events. All nullable so pre-existing 747 rows
-- stay unaffected.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS series_id        uuid REFERENCES event_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS occurrence_date  date,
  ADD COLUMN IF NOT EXISTS is_exception     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_cancelled     boolean NOT NULL DEFAULT false;

-- Idempotent generation: re-running the horizon roller never duplicates an
-- occurrence. Two rows with the same (series_id, occurrence_date) are
-- forbidden. Partial uniqueness (only when series_id is set) so non-series
-- events keep working with the same shape.
CREATE UNIQUE INDEX IF NOT EXISTS events_series_occurrence_unique
  ON events(series_id, occurrence_date)
  WHERE series_id IS NOT NULL AND occurrence_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_series_id_idx
  ON events(series_id)
  WHERE series_id IS NOT NULL;

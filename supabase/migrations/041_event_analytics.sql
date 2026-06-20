-- Per-user event analytics. Strictly user-linked logging — the consent
-- gate in app code ensures no rows land here unless the actor has
-- explicitly opted in (and the gate respects DNT/GPC headers as
-- auto-opt-out).
--
-- Schema notes:
--   - `action` is enumerated by the application; the CHECK keeps a stray
--     INSERT from polluting the dashboard's aggregator.
--   - `user_id` and `anonymous_id` are both nullable but at least one
--     must be set (consent gate enforces this at write time; CHECK
--     enforces it at the DB layer as defence-in-depth).
--   - `series_id` is COPIED from the event row at write time so series
--     rollups can be one indexed query instead of an events join.
--   - `referrer` is whitelisted/truncated by the app — never raw URL.

CREATE TABLE IF NOT EXISTS event_analytics_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  org_slug      text,
  series_id     uuid REFERENCES event_series(id) ON DELETE SET NULL,
  action        text        NOT NULL,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id  text,
  referrer      text,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_analytics_action_check
    CHECK (action IN ('view', 'save', 'unsave', 'registration_click')),
  CONSTRAINT event_analytics_identifier_check
    CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL)
);

-- Per-event time-series — the panel's "30/90-day trend" and "top events"
-- queries hit this.
CREATE INDEX IF NOT EXISTS event_analytics_event_id_occurred_at_idx
  ON event_analytics_events(event_id, occurred_at DESC);

-- Per-org rollup — the panel's totals (views + saves + clicks).
CREATE INDEX IF NOT EXISTS event_analytics_org_slug_occurred_at_idx
  ON event_analytics_events(org_slug, occurred_at DESC);

-- Per-series rollup — sums across every occurrence of a recurring series.
CREATE INDEX IF NOT EXISTS event_analytics_series_id_occurred_at_idx
  ON event_analytics_events(series_id, occurred_at DESC)
  WHERE series_id IS NOT NULL;

-- Retention prune index — the daily cron deletes WHERE occurred_at < cutoff.
CREATE INDEX IF NOT EXISTS event_analytics_occurred_at_idx
  ON event_analytics_events(occurred_at);

-- User-deletion path — DELETE FROM event_analytics_events WHERE user_id = ?
CREATE INDEX IF NOT EXISTS event_analytics_user_id_idx
  ON event_analytics_events(user_id)
  WHERE user_id IS NOT NULL;

-- Consent persistence on profiles. NULL = never decided (banner should
-- show). TRUE = consented at the timestamp. FALSE = explicitly declined
-- at the timestamp. Server-side write is gated on the user being the
-- one toggling their own row.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS analytics_consent       boolean,
  ADD COLUMN IF NOT EXISTS analytics_consent_at    timestamptz;

-- Add event_tier column to events for editorial curation
-- 'flagship' = apex global/regional convenings (UN summits, G7/G20, AU, OAS, COPs, WHA, etc.)
-- 'major' = significant but not apex (regional ministerials, large sector confs)
-- 'standard' = everything else (default)

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_tier text NOT NULL DEFAULT 'standard'
  CHECK (event_tier IN ('flagship', 'major', 'standard'));

CREATE INDEX IF NOT EXISTS idx_events_tier ON events(event_tier) WHERE event_tier != 'standard';

COMMENT ON COLUMN events.event_tier IS 'Editorial curation tier. flagship = apex global/regional convenings shown on the curated calendar.';

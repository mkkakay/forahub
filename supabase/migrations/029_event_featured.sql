-- events.is_featured already exists; add the explicit expiry and an index for fast lookups.
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS featured_until timestamptz;
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured, featured_until) WHERE is_featured = true;

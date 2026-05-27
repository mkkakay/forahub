ALTER TABLE events ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE events ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE events ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS geocode_status text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS geocode_error text;

CREATE INDEX IF NOT EXISTS idx_events_coords ON events(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_geocode_status ON events(geocode_status) WHERE geocode_status IS NOT NULL;

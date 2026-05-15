CREATE TABLE IF NOT EXISTS source_status (
  source_id text PRIMARY KEY,
  organization text,
  url text,
  last_attempted_at timestamptz,
  last_success_at timestamptz,
  consecutive_failures integer DEFAULT 0,
  last_error text,
  status text DEFAULT 'unknown',
  events_last_run integer DEFAULT 0,
  notes text,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_status_status ON source_status(status);
CREATE INDEX IF NOT EXISTS idx_source_status_last_attempted ON source_status(last_attempted_at DESC);

ALTER TABLE events ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'scraped';
ALTER TABLE events ADD COLUMN IF NOT EXISTS external_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_source_type_external_id ON events(source_type, external_id) WHERE external_id IS NOT NULL;

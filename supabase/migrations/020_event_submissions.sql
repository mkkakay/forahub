-- Phase 1 event submission flow: user-driven moderation on top of the existing scraper-driven status.

ALTER TABLE events ADD COLUMN IF NOT EXISTS submission_status text DEFAULT 'pending';
ALTER TABLE events ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid REFERENCES auth.users(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS submitter_email text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS submission_source text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

ALTER TABLE organization_overrides ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_events_submission_status ON events(submission_status);
CREATE INDEX IF NOT EXISTS idx_events_submitted_by ON events(submitted_by_user_id);

-- Backfill: existing scraped/imported events predate this moderation flow.
-- Mark them all as approved so they keep showing on the homepage. New rows
-- from the /submit form default to 'pending' until reviewed (or auto-approved
-- when the hosting org is verified).
UPDATE events SET submission_status = 'approved' WHERE submission_source IS NULL;

COMMENT ON COLUMN events.submission_status IS 'pending | approved | rejected | draft — gates display on the homepage.';
COMMENT ON COLUMN events.submission_source IS 'flyer_ai | url_ai | manual — null for scraper/import events.';
COMMENT ON COLUMN organization_overrides.is_verified IS 'When true, /submit events for this org auto-publish.';

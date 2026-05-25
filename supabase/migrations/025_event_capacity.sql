-- Optional event capacity + registration_full flag for the homepage badge.

ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity integer;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_full boolean DEFAULT false;

COMMENT ON COLUMN events.capacity IS 'Maximum attendees. NULL = unlimited / unknown.';
COMMENT ON COLUMN events.registration_full IS 'Set true when the host has indicated registration is closed/full.';

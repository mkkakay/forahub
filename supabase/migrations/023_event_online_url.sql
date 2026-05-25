-- Hybrid and Online events need a meeting link in addition to (or instead of) a physical address.

ALTER TABLE events ADD COLUMN IF NOT EXISTS online_url text;

COMMENT ON COLUMN events.online_url IS 'Meeting link for online or hybrid events (Zoom, Teams, Webex, etc.). Distinct from registration_url.';
